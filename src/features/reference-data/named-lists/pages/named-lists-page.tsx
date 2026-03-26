import { useState, useCallback, useMemo } from "react";
import { RefreshCw, AlertCircle, Pencil, Trash2, X, CheckCheck, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import { SearchBar } from "@/shared/components/search-bar";
import { TablePagination } from "@/shared/components/table-pagination";
import { ServerTable } from "@/shared/components/server-table";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { useUpdateEntity, useDeleteEntity } from "@/shared/hooks/use-api";
import { usePermissions } from "@/shared/hooks/use-permissions";
import { useUserExtLoader } from "@/shared/hooks/use-user-meta";
import { useEntitySchema } from "../../shared/hooks/use-entity-schema";
import { useServerTable } from "../../shared/hooks/use-server-table";
import { buildColumns } from "../../shared/lib/build-columns";
import { EntityFormDrawer } from "../../shared/components/entity-form-drawer";
import { useColumnChooser } from "@/shared/hooks/use-column-chooser";
import { ColumnChooserDropdown } from "@/shared/components/column-chooser-dropdown";
import {
  useEntityPreferences,
  getSavedEntityTableLayout,
  getSavedEntityFormTabOrder,
} from "../../shared/hooks/use-entity-preferences";
import { ServerTablePage } from "../../shared/components/server-table-page";
import { apiClient } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/cn";
import { namedListsConfig } from "../config/named-lists-config";
import type { NamedList } from "@/shared/types/reference-data";

type NamedListRecord = NamedList & Record<string, unknown>;

const PREFIX = namedListsConfig.testIdPrefix;

export default function NamedListsPage() {
  const extLoaded = useUserExtLoader();
  const schema = useEntitySchema("NamedList", namedListsConfig);
  const table = useServerTable<NamedListRecord>(namedListsConfig);
  const permissions = usePermissions(namedListsConfig.endpoint);

  const columns = useMemo(
    () => buildColumns(namedListsConfig, schema),
    [schema],
  );

  const { saveTableLayout, saveFormTabOrder } = useEntityPreferences("namedlist");

  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedEntityTableLayout("namedlist") : null),
    [extLoaded],
  );

  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedEntityFormTabOrder("namedlist") : undefined),
    [extLoaded],
  );

  const { columnOrder, activeColumns, chooser } = useColumnChooser({
    columns,
    savedLayout: savedTableLayout,
    onLayoutChange: saveTableLayout,
    schemaReady: !schema.isLoading,
  });

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.key, c])),
    [columns],
  );

  // ── Edit drawer state ──────────────────────────────────────────────
  const [editingEntity, setEditingEntity] = useState<NamedListRecord | null>(null);
  const updateMutation = useUpdateEntity(namedListsConfig.endpoint);

  const handleEdit = useCallback((entity: NamedListRecord) => {
    setEditingEntity(entity);
  }, []);

  const handleSave = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!editingEntity) return;
      await updateMutation.mutateAsync({ id: editingEntity._id, data: payload });
      toast.success("Changes saved");
      setEditingEntity(null);
      table.refetch();
    },
    [editingEntity, updateMutation, table],
  );

  const handleCancelForm = useCallback(() => {
    setEditingEntity(null);
  }, []);

  // ── Delete state ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteEntity(namedListsConfig.endpoint);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Deleted successfully");
      table.refetch();
    } catch {
      toast.error("Failed to delete named list");
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, table]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...table.selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteMutation.mutateAsync(id)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    setBulkDeleteConfirm(false);
    table.clearSelection();
    if (failed === 0) {
      toast.success(`Deleted ${succeeded} named lists`);
    } else if (succeeded === 0) {
      toast.error(`Failed to delete ${failed} named lists`);
    } else {
      toast.warning(`Deleted ${succeeded}/${ids.length} named lists. ${failed} failed.`);
    }
    table.refetch();
  }, [table, deleteMutation]);

  // ── Row-level refresh ──────────────────────────────────────────────
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const handleRefreshRow = useCallback(
    async (id: string) => {
      setRefreshingIds((prev) => new Set(prev).add(id));
      try {
        await apiClient.patch(`namedlist/refresh/${id}`);
        toast.success("Named list refreshed");
        table.refetch();
      } catch {
        toast.error("Failed to refresh named list");
      } finally {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [table],
  );

  // ── Bulk refresh ───────────────────────────────────────────────────
  const [bulkRefreshing, setBulkRefreshing] = useState(false);

  const handleBulkRefresh = useCallback(async () => {
    setBulkRefreshing(true);
    try {
      // Get org ObjectId from first data row
      const orgId = (table.data[0] as Record<string, unknown>)?.org as string | undefined;
      if (!orgId) {
        toast.error("Cannot determine org ID");
        setBulkRefreshing(false);
        return;
      }

      // Build queryParams from active column filters (legacy format)
      const queryParams: Record<string, { isIncluded: boolean; searchStr: string }> = {};
      for (const filter of table.columnFilters) {
        const val = filter.value;
        if (val == null || val === "") continue;

        // Check for negation wrapper: { __negated: true, __inner: actualValue }
        let actualVal: unknown = val;
        let isIncluded = true;
        if (
          typeof val === "object" &&
          val !== null &&
          "__negated" in val
        ) {
          isIncluded = false;
          actualVal = (val as { __negated: boolean; __inner: unknown }).__inner;
          if (actualVal == null || actualVal === "") continue;
        }

        // Array filter (enum multi-select) — use first value
        if (Array.isArray(actualVal) && actualVal.length > 0) {
          queryParams[filter.id] = { isIncluded, searchStr: String(actualVal[0]) };
        }
        // String filter
        else if (typeof actualVal === "string") {
          queryParams[filter.id] = { isIncluded, searchStr: actualVal };
        }
      }

      const payload: Record<string, unknown> = {
        ids: [...table.selectedIds],
        org: orgId,
        queryParams,
        isORQuery: false,
        isWildCardSearch: false,
      };

      await apiClient.patch("namedlist/refreshall", payload);
      toast.success(`Refreshing ${table.selectedIds.size} named lists`);
      table.clearSelection();
      table.refetch();
    } catch {
      toast.error("Failed to refresh named lists");
    } finally {
      setBulkRefreshing(false);
    }
  }, [table]);

  // ── Pagination ─────────────────────────────────────────────────────
  const page = table.pageIndex + 1;
  const handlePageChange = useCallback(
    (p: number) => table.onPageChange(p - 1),
    [table],
  );

  // ── Render row actions ─────────────────────────────────────────────
  const renderRowActions = useCallback(
    (entity: NamedListRecord) => {
      const isRefreshing = refreshingIds.has(entity._id);
      return (
        <div className="flex items-center justify-end gap-0.5">
          {permissions.canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              data-testid={`${PREFIX}-refresh-${entity._id}`}
              aria-label={`Refresh ${entity.name}`}
              title="Refresh"
              disabled={isRefreshing}
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshRow(entity._id);
              }}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
          )}
          {permissions.canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              data-testid={`${PREFIX}-edit-${entity._id}`}
              aria-label={`Edit ${entity.name}`}
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(entity);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {permissions.canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer text-error hover:text-error"
              data-testid={`${PREFIX}-delete-${entity._id}`}
              aria-label={`Delete ${entity.name}`}
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: entity._id, name: entity.name });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      );
    },
    [refreshingIds, permissions.canUpdate, permissions.canDelete, handleRefreshRow, handleEdit],
  );

  if (!extLoaded) {
    return <ServerTablePage.Skeleton config={namedListsConfig} />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title={namedListsConfig.pageTitle}
        icon={namedListsConfig.pageIcon}
        actions={
          <div className="flex items-center gap-3">
            <SearchBar
              value={table.searchQuery}
              onChange={table.onSearchChange}
              placeholder="Search named lists..."
              testIdPrefix={PREFIX}
              className="w-[var(--width-search-bar)]"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.refetch()}
              title="Refresh"
              className="cursor-pointer"
              data-testid={`${PREFIX}-refresh`}
              aria-label="Refresh list"
            >
              <RefreshCw className={cn("h-4 w-4", table.isFetching && "animate-spin")} />
            </Button>
            {/* No Add/Create button — creation is handled separately */}
          </div>
        }
      />

      {(table.error ?? schema.error) && (
        <div
          className="flex items-center gap-2 rounded-md border border-error bg-error-light px-4 py-3"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-error" />
          <span className="text-body-sm text-error">
            {(table.error ?? schema.error)?.message ?? "Failed to load data"}
          </span>
        </div>
      )}

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
            selectable={permissions.canUpdate || permissions.canDelete}
            selectedIds={table.selectedIds}
            onRowSelect={table.onRowSelect}
            onRowClick={permissions.canUpdate ? handleEdit : undefined}
            renderRowActions={renderRowActions}
            chooser={chooser}
            isLoading={table.isLoading || schema.isLoading}
            isFetching={table.isFetching && !table.isLoading}
            emptyMessage="No named lists found"
            testIdPrefix={PREFIX}
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

      {/* Custom bulk action bar — Refresh + Delete */}
      {table.selectedIds.size > 0 && (permissions.canUpdate || permissions.canDelete) && (
        <div
          data-testid="bulk-action-bar"
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-sticky)]",
            "flex items-center gap-3 px-4 py-2.5",
            "bg-card text-foreground border border-border rounded-[var(--button-radius)]",
            "shadow-[var(--shadow-modal)]",
            "animate-in slide-in-from-bottom-2 duration-200",
          )}
        >
          <span className="text-caption font-semibold whitespace-nowrap bg-brand text-foreground-inverse px-2.5 py-0.5 rounded-full tabular-nums">
            {table.selectedIds.size} selected
          </span>

          <div className="flex items-center gap-1.5">
            {table.selectedIds.size < table.totalCount && (
              <Button
                variant="outline"
                size="sm"
                onClick={table.selectAll}
                disabled={table.selectingAll}
                data-testid={`${PREFIX}-bulk-select-all`}
                aria-label="Select all"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {table.selectingAll ? "Selecting\u2026" : `All ${table.totalCount}`}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={table.invertSelection}
              data-testid={`${PREFIX}-bulk-invert`}
              aria-label="Invert selection"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Invert
            </Button>
            {permissions.canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRefresh}
                disabled={bulkRefreshing}
                data-testid={`${PREFIX}-bulk-refresh`}
                aria-label="Refresh selected"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", bulkRefreshing && "animate-spin")} />
                Refresh
              </Button>
            )}
            {permissions.canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-error hover:text-error cursor-pointer"
                onClick={() => setBulkDeleteConfirm(true)}
                data-testid={`${PREFIX}-bulk-delete`}
                aria-label="Delete selected"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={table.clearSelection}
            aria-label="Clear selection"
            data-testid={`${PREFIX}-bulk-clear`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Edit drawer — only Name and Type fields */}
      <EntityFormDrawer
        open={editingEntity !== null}
        entity={editingEntity}
        config={namedListsConfig}
        schema={schema}
        onSave={handleSave}
        onCancel={handleCancelForm}
        saving={updateMutation.isPending}
        savedTabOrder={savedFormTabOrder ?? undefined}
        onTabOrderChange={saveFormTabOrder}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Named List"
        itemName={deleteTarget?.name}
        description="Are you sure you want to delete this named list? This action cannot be undone."
        isPending={deleteMutation.isPending}
      />

      <DeleteConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${table.selectedIds.size} Named Lists`}
        description={`Are you sure you want to delete ${table.selectedIds.size} named lists? This action cannot be undone.`}
        isPending={deleteMutation.isPending}
      />

      <ColumnChooserDropdown chooser={chooser} columnOrder={columnOrder} columnMap={columnMap} />
    </div>
  );
}
