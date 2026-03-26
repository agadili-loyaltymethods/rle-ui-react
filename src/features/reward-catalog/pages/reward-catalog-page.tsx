/**
 * Rewards Catalog page — main entry point for reward policy management.
 *
 * Composes ServerTable primitives with custom reward-specific components:
 * card grid view, custom form/bulk-edit drawers, stats bar, quick search,
 * and fullscreen mode.
 */

import { useMemo, useCallback, useEffect, useState } from "react";
import { Gift, RefreshCw, Plus, Maximize2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { ServerTable } from "@/shared/components/server-table";
import { TablePagination } from "@/shared/components/table-pagination";
import { SearchBar } from "@/shared/components/search-bar";
import { BulkActionBar } from "@/shared/components/bulk-action-bar";
import { ColumnChooserDropdown } from "@/shared/components/column-chooser-dropdown";
import { useUIStore } from "@/shared/stores/ui-store";
import { useAuthStore } from "@/shared/stores/auth-store";
import { usePermissions } from "@/shared/hooks/use-permissions";
import { useServerTable } from "@/features/reference-data/shared/hooks/use-server-table";
import { useEntitySchema } from "@/features/reference-data/shared/hooks/use-entity-schema";
import { buildColumns } from "@/features/reference-data/shared/lib/build-columns";
import { useColumnChooser } from "@/shared/hooks/use-column-chooser";
import { useRewardCatalogStore } from "../hooks/use-reward-catalog-store";
import {
  useCreateRewardCatalogItem,
  useUpdateRewardCatalogItem,
  useDeleteRewardCatalogItem,
  useBulkUpdateRewardPolicies,
  useBulkDeleteRewardPolicies,
} from "../hooks/use-rewards";
import {
  useRewardPreferences,
  useUserExtLoader,
  getSavedTableLayout,
  getSavedFormTabOrder,
  getSavedFilterStatus,
  getSavedExpirationSince,
  getSavedCustomDateRange,
} from "../hooks/use-reward-preferences";
import { rewardConfig } from "../config/reward-config";
import { buildRewardCellRenderers } from "../lib/reward-cell-renderers";
import { StatsBar } from "../components/stats-bar";
import { RewardsToolbar } from "../components/rewards-toolbar";
import { RewardsCardGrid } from "../components/rewards-card-grid";
import RewardFormDrawer from "../components/reward-form-drawer";
import BulkEditDrawer from "../components/bulk-edit-drawer";
import { useCatalogConfig } from "../hooks/use-catalog-config";
import { QuickSearch } from "../components/quick-search";
import type {
  RewardCatalogItem,
  ExpirationSince,
  CustomDateRange,
  TableLayout,
} from "../types/reward-policy";

// ── Helpers ─────────────────────────────────────────────────────────────────

function expirationSinceDate(since: ExpirationSince): string | null {
  if (since === "all" || since === "custom") return null;
  const d = new Date();
  switch (since) {
    case "1m":
      d.setMonth(d.getMonth() - 1);
      break;
    case "3m":
      d.setMonth(d.getMonth() - 3);
      break;
    case "6m":
      d.setMonth(d.getMonth() - 6);
      break;
    case "1y":
      d.setFullYear(d.getFullYear() - 1);
      break;
  }
  return d.toISOString();
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function RewardCatalogPage() {
  // ── Stores ────────────────────────────────────────────────────────────
  const store = useRewardCatalogStore();
  const currentProgram = useUIStore((s) => s.currentProgram);
  const currentOrg = useUIStore((s) => s.currentOrg);
  const user = useAuthStore((s) => s.user);
  const permissions = usePermissions("rewardpolicies");
  const { config: catalogConfig } = useCatalogConfig();
  const cellRenderers = useMemo(
    () => buildRewardCellRenderers(catalogConfig.cardImageField),
    [catalogConfig.cardImageField],
  );

  // ── Preferences ───────────────────────────────────────────────────────
  const extLoaded = useUserExtLoader();
  const prefs = useRewardPreferences();

  const [prefsRestored, setPrefsRestored] = useState(false);
  useEffect(() => {
    if (!extLoaded || prefsRestored) return;

    const savedFilter = getSavedFilterStatus();
    if (savedFilter.length > 0) store.setFilterStatus(savedFilter);

    const savedSince = getSavedExpirationSince();
    if (
      savedSince &&
      ["1m", "3m", "6m", "1y", "all", "custom"].includes(savedSince)
    ) {
      store.setExpirationSince(savedSince as ExpirationSince);
    }

    const savedRange = getSavedCustomDateRange();
    if (savedRange) store.setCustomDateRange(savedRange);

    setPrefsRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extLoaded]);

  // ── Table layout preferences ──────────────────────────────────────────
  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedTableLayout() : null),
    [extLoaded],
  );
  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedFormTabOrder() : null),
    [extLoaded],
  );

  const handleLayoutChange = useCallback(
    (layout: TableLayout) => {
      prefs.saveTableLayout(layout);
    },
    [prefs],
  );

  const handleTabOrderChange = useCallback(
    (order: string[]) => {
      prefs.saveFormTabOrder(order);
    },
    [prefs],
  );

  const handleFilterStatusChange = useCallback(
    (status: typeof store.filterStatus) => {
      store.setFilterStatus(status);
      prefs.saveFilterStatus(status);
    },
    [store, prefs],
  );

  const handleExpirationSinceChange = useCallback(
    (value: ExpirationSince) => {
      store.setExpirationSince(value);
      prefs.saveExpirationSince(value);
    },
    [store, prefs],
  );

  const handleCustomDateRangeChange = useCallback(
    (range: CustomDateRange) => {
      store.setCustomDateRange(range);
      prefs.saveCustomDateRange(range);
    },
    [store, prefs],
  );

  // ── Build additionalQuery from filter state ───────────────────────────
  // Round `now` to the nearest minute so the memo produces a stable value
  // across re-renders that happen within the same minute.
  const stableNow = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString();
  }, [store.filterStatus, store.expirationSince, store.customDateRange]);

  const additionalQuery = useMemo(() => {
    const q: Record<string, unknown> = {
      "ext._meta.subType": "RewardsCatalog",
    };
    const now = stableNow;

    // Status filter
    if (store.filterStatus.length > 0 && store.filterStatus.length < 3) {
      const statusConditions: Record<string, unknown>[] = [];
      for (const status of store.filterStatus) {
        if (status === "active") {
          statusConditions.push({
            effectiveDate: { $lte: now },
            expirationDate: { $gte: now },
          });
        } else if (status === "expired") {
          statusConditions.push({ expirationDate: { $lt: now } });
        } else if (status === "future") {
          statusConditions.push({ effectiveDate: { $gt: now } });
        }
      }
      if (statusConditions.length === 1) {
        Object.assign(q, statusConditions[0]);
      } else if (statusConditions.length > 1) {
        q.$or = statusConditions;
      }
    }

    // Date range filters — merge with status conditions, keeping the
    // stricter bound when both set the same operator (e.g. two $gte values).
    const mergeField = (
      field: string,
      op: string,
      value: string,
      pickMax: boolean,
    ) => {
      const existing = (q[field] as Record<string, string> | undefined)?.[op];
      const keep =
        existing && pickMax
          ? existing > value
            ? existing
            : value
          : existing && !pickMax
            ? existing < value
              ? existing
              : value
            : value;
      q[field] = { ...((q[field] as object) ?? {}), [op]: keep };
    };

    if (store.expirationSince === "custom") {
      if (store.customDateRange.start) {
        mergeField(
          "expirationDate",
          "$gte",
          new Date(store.customDateRange.start).toISOString(),
          true,
        );
      }
      if (store.customDateRange.end) {
        mergeField(
          "effectiveDate",
          "$lte",
          new Date(store.customDateRange.end + "T23:59:59.999Z").toISOString(),
          false,
        );
      }
    } else {
      const sinceDate = expirationSinceDate(store.expirationSince);
      if (sinceDate) {
        mergeField("effectiveDate", "$lte", now, false);
        mergeField("expirationDate", "$gte", sinceDate, true);
      }
    }

    return q;
  }, [store.filterStatus, store.expirationSince, store.customDateRange]);

  // ── Server table + schema ─────────────────────────────────────────────
  type RewardRow = RewardCatalogItem & Record<string, unknown>;
  const schema = useEntitySchema("RewardPolicy", rewardConfig);
  const table = useServerTable<RewardRow>(rewardConfig, additionalQuery);
  const columns = useMemo(
    () => buildColumns(rewardConfig, schema),
    [schema],
  );

  const { columnOrder, activeColumns, chooser } = useColumnChooser({
    columns,
    savedLayout: savedTableLayout,
    onLayoutChange: handleLayoutChange,
    schemaReady: !schema.isLoading,
  });

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.key, c])),
    [columns],
  );

  // ── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useCreateRewardCatalogItem();
  const updateMutation = useUpdateRewardCatalogItem();
  const deleteMutation = useDeleteRewardCatalogItem();
  const bulkUpdateMutation = useBulkUpdateRewardPolicies();
  const bulkDeleteMutation = useBulkDeleteRewardPolicies();

  // ── Pagination (1-indexed for TablePagination) ────────────────────────
  const page = table.pageIndex + 1;
  const handlePageChange = useCallback(
    (p: number) => table.onPageChange(p - 1),
    [table],
  );

  // ── CRUD handlers ─────────────────────────────────────────────────────

  const handleSaveReward = useCallback(
    async (reward: RewardCatalogItem) => {
      store.setSaving(true);
      try {
        if (store.editingReward) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, createdAt, createdBy, updatedAt, updatedBy, ...updateData } = reward;
          await updateMutation.mutateAsync({ id: _id, data: updateData });
          store.setEditingReward(null);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, org: _org, ...createData } = reward;
          await createMutation.mutateAsync(createData);
          store.setIsCreating(false);
        }
        table.refetch();
      } catch (err) {
        const apiErr = err as { details?: unknown[]; message?: string };
        if (!apiErr?.details?.length) {
          const msg = apiErr?.message;
          toast.error(typeof msg === "string" ? msg : String(err));
        }
        throw err;
      } finally {
        store.setSaving(false);
      }
    },
    [store, updateMutation, createMutation, table],
  );

  const handleConfirmDelete = useCallback(async () => {
    const id = store.deleteTarget;
    if (!id) return;
    store.setSaving(true);
    try {
      await deleteMutation.mutateAsync(id);
      store.setDeleteTarget(null);
      table.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      store.setDeleteTarget(null);
    } finally {
      store.setSaving(false);
    }
  }, [store, deleteMutation, table]);

  const handleBulkDelete = useCallback(async () => {
    store.setSaving(true);
    try {
      const ids = [...table.selectedIds];
      await bulkDeleteMutation.mutateAsync(ids);
      table.clearSelection();
      store.setBulkDeleteConfirm(false);
      table.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      store.setBulkDeleteConfirm(false);
    } finally {
      store.setSaving(false);
    }
  }, [store, table, bulkDeleteMutation]);

  const handleBulkEdit = useCallback(
    async (update: Record<string, unknown>) => {
      const ids = [...table.selectedIds];
      await bulkUpdateMutation.mutateAsync({ ids, update });
      store.setBulkEditOpen(false);
      table.clearSelection();
      table.refetch();
    },
    [store, table, bulkUpdateMutation],
  );

  const handleEditReward = useCallback(
    (entity: RewardRow) => {
      store.setEditingReward(entity as RewardCatalogItem);
    },
    [store],
  );

  // ── Fullscreen Esc handler ──────────────────────────────────────────
  useEffect(() => {
    if (!store.fullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") store.setFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [store.fullscreen, store]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col gap-3 flex-1 min-h-0",
        store.fullscreen && "fixed inset-0 z-[var(--z-modal)] bg-page p-6",
      )}
      data-testid="page-reward-catalog"
    >
      {/* Header — three rows in normal mode */}
      {!store.fullscreen && (
        <div className="flex flex-col gap-2">
          {/* Row 1: title + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Gift className="h-6 w-6 text-brand" />
              <h1 className="text-2xl font-bold text-foreground">
                Rewards Catalog
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => table.refetch()}
                disabled={table.isFetching}
                title="Reload"
                data-testid="rewards-refresh"
                className="cursor-pointer"
              >
                <RefreshCw
                  className={cn(
                    "h-[18px] w-[18px]",
                    table.isFetching && "animate-spin",
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => store.setFullscreen(true)}
                title="Fullscreen"
                data-testid="rewards-fullscreen"
                className="cursor-pointer"
              >
                <Maximize2 className="h-[18px] w-[18px]" />
              </Button>
              {permissions.canCreate && (
                <Button
                  onClick={() => store.setIsCreating(true)}
                  data-testid="rewards-add"
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Reward
                </Button>
              )}
            </div>
          </div>
          {/* Row 2: stats tiles */}
          <StatsBar />
          {/* Row 3: search + filters */}
          <div className="flex items-center gap-2">
            <SearchBar
              value={table.searchQuery}
              onChange={table.onSearchChange}
              placeholder="Search rewards..."
              testIdPrefix="rewards"
              className="flex-1 min-w-0"
            />
            <RewardsToolbar
              filterStatus={store.filterStatus}
              onFilterStatusChange={handleFilterStatusChange}
              expirationSince={store.expirationSince}
              onExpirationSinceChange={handleExpirationSinceChange}
              customDateRange={store.customDateRange}
              onCustomDateRangeChange={handleCustomDateRangeChange}
              viewMode={store.viewMode}
              onViewModeChange={store.setViewMode}
            />
          </div>
        </div>
      )}

      {/* Fullscreen-only toolbar */}
      {store.fullscreen && (
        <div className="flex items-center gap-2">
          <SearchBar
            value={table.searchQuery}
            onChange={table.onSearchChange}
            placeholder="Search rewards..."
            testIdPrefix="rewards"
            className="flex-1 min-w-0"
          />
          <RewardsToolbar
            filterStatus={store.filterStatus}
            onFilterStatusChange={handleFilterStatusChange}
            expirationSince={store.expirationSince}
            onExpirationSinceChange={handleExpirationSinceChange}
            customDateRange={store.customDateRange}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            viewMode={store.viewMode}
            onViewModeChange={store.setViewMode}
            onAdd={() => store.setIsCreating(true)}
            onReload={() => table.refetch()}
            onExitFullscreen={() => store.setFullscreen(false)}
          />
        </div>
      )}

      {/* Error banner */}
      {(table.error ?? schema.error) && (
        <div
          className="flex items-center justify-between rounded-md border border-error bg-error-light px-4 py-3"
          role="alert"
        >
          <span className="text-body-sm text-error">
            {(table.error ?? schema.error)?.message ?? "Failed to load data"}
          </span>
        </div>
      )}

      {/* Content */}
      {store.viewMode === "list" ? (
        <div className="flex flex-col flex-1 min-h-0 gap-0">
          <div className="flex-1 min-h-0 rounded-lg border border-border bg-card shadow-card flex flex-col overflow-hidden">
            <TablePagination
              page={page}
              totalItems={table.totalCount}
              pageSize={table.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={table.onPageSizeChange}
            />

            <ServerTable
              data={table.data}
              activeColumns={activeColumns}
              sorting={table.sorting}
              onSortChange={table.onSortChange}
              columnFilters={table.columnFilters}
              onFilterChange={table.onFilterChange}
              selectedIds={table.selectedIds}
              onRowSelect={table.onRowSelect}
              onRowClick={permissions.canUpdate ? handleEditReward : undefined}
              onEdit={permissions.canUpdate ? handleEditReward : undefined}
              onDelete={permissions.canDelete ? (id) => store.setDeleteTarget(id) : undefined}
              cellRenderers={cellRenderers}
              chooser={chooser}
              isLoading={table.isLoading || schema.isLoading}
              isFetching={table.isFetching && !table.isLoading}
              emptyMessage="No rewards found"
              emptyAction={permissions.canCreate ?
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 cursor-pointer"
                  onClick={() => store.setIsCreating(true)}
                >
                  Add Reward
                </Button> : undefined
              }
              testIdPrefix="rewards"
            />

            <TablePagination
              page={page}
              totalItems={table.totalCount}
              pageSize={table.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={table.onPageSizeChange}
            />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 rounded-lg border border-border bg-card shadow-card overflow-hidden transition-opacity",
            table.isFetching && !table.isLoading && "opacity-60 pointer-events-none",
          )}
        >
          <TablePagination
            page={page}
            totalItems={table.totalCount}
            pageSize={table.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={table.onPageSizeChange}
          />
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <RewardsCardGrid
              rewards={table.data as RewardCatalogItem[]}
              selectedIds={table.selectedIds}
              onSelect={(id) => {
                const next: Record<string, boolean> = {};
                for (const existingId of table.selectedIds) {
                  next[existingId] = true;
                }
                if (next[id]) {
                  delete next[id];
                } else {
                  next[id] = true;
                }
                table.onRowSelect(next);
              }}
              onEdit={permissions.canUpdate ? (reward) => store.setEditingReward(reward) : undefined}
              onDelete={permissions.canDelete ? (id) => store.setDeleteTarget(id) : undefined}
              page={1}
              pageSize={table.pageSize}
              schemaData={schema}
              cardImageField={catalogConfig.cardImageField}
              pricingMode={catalogConfig.pricingMode}
              tierLevelFields={catalogConfig.tierLevelFields}
            />
          </div>
          <TablePagination
            page={page}
            totalItems={table.totalCount}
            pageSize={table.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={table.onPageSizeChange}
          />
        </div>
      )}

      {/* Bulk action bar */}
      {table.selectedIds.size > 0 && (permissions.canUpdate || permissions.canDelete) && (
        <BulkActionBar
          count={table.selectedIds.size}
          totalCount={table.totalCount}
          onSelectAll={table.selectAll}
          selectingAll={table.selectingAll}
          onInvert={table.invertSelection}
          onEdit={permissions.canUpdate ? () => store.setBulkEditOpen(true) : undefined}
          onDelete={permissions.canDelete ? () => store.setBulkDeleteConfirm(true) : undefined}
          onClear={table.clearSelection}
        />
      )}

      {/* Reward form drawer */}
      <RewardFormDrawer
        open={store.isCreating || store.editingReward !== null}
        reward={store.editingReward}
        onSave={handleSaveReward}
        onCancel={() => {
          store.setIsCreating(false);
          store.setEditingReward(null);
        }}
        nextSortOrder={0}
        saving={store.saving}
        savedTabOrder={savedFormTabOrder ?? undefined}
        onTabOrderChange={handleTabOrderChange}
        programId={currentProgram ?? ""}
        orgId={currentOrg ?? user?.org ?? ""}
        intendedUse={catalogConfig.intendedUse}
      />

      {/* Bulk edit drawer */}
      {store.bulkEditOpen && (
        <BulkEditDrawer
          open={store.bulkEditOpen}
          selectedIds={table.selectedIds}
          rewards={table.data as RewardCatalogItem[]}
          schemaData={schema}
          onSave={handleBulkEdit}
          onCancel={() => store.setBulkEditOpen(false)}
          saving={store.saving}
        />
      )}

      {/* Quick search */}
      {store.quickSearchOpen && (
        <QuickSearch
          rewards={table.data as RewardCatalogItem[]}
          onSelect={(reward) => {
            store.setQuickSearchOpen(false);
            store.setEditingReward(reward);
          }}
          onClose={() => store.setQuickSearchOpen(false)}
        />
      )}

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={store.deleteTarget !== null}
        onClose={() => store.setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Reward"
        description="Are you sure you want to delete this reward? This action cannot be undone."
        isPending={store.saving}
        data-testid="rewards-delete-confirm"
      />

      {/* Bulk delete confirmation */}
      <DeleteConfirmDialog
        open={store.bulkDeleteConfirm}
        onClose={() => store.setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Rewards"
        description={`Are you sure you want to delete ${table.selectedIds.size} selected reward(s)?`}
        isPending={store.saving}
        confirmLabel="Delete All"
        data-testid="rewards-bulk-delete-confirm"
      />

      {/* Column chooser dropdown */}
      <ColumnChooserDropdown
        chooser={chooser}
        columnOrder={columnOrder}
        columnMap={columnMap}
      />

      {/* Saving overlay */}
      {store.saving && (
        <div className="fixed inset-0 z-[var(--z-modal)] bg-black/20 pointer-events-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}
    </div>
  );
}
