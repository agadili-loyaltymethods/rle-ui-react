/**
 * Generic server-side table page layout.
 *
 * Thin wrapper composing ServerTable with PageHeader, pagination,
 * BulkActionBar, EntityFormDrawer, BulkEditDrawer, and DeleteConfirmDialog.
 */

import { useState, useCallback, useMemo, type JSX } from "react";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import { SearchBar } from "@/shared/components/search-bar";
import { TablePagination } from "@/shared/components/table-pagination";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { ServerTable } from "@/shared/components/server-table";
import {
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "@/shared/hooks/use-api";
import { usePermissions } from "@/shared/hooks/use-permissions";
import { EntityFormDrawer } from "./entity-form-drawer";
import { BulkEditDrawer } from "./bulk-edit-drawer";
import { BulkActionBar } from "@/shared/components/bulk-action-bar";
import type {
  ServerTableConfig,
  ServerEntitySchemaData,
  TableLayout,
} from "../types/server-table-types";
import { useColumnChooser } from "@/shared/hooks/use-column-chooser";
import { ColumnChooserDropdown } from "@/shared/components/column-chooser-dropdown";
import type { ColumnDescriptor } from "../lib/build-columns";
import type { useServerTable } from "../hooks/use-server-table";
import type { useBulkOperations } from "../hooks/use-bulk-operations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServerTablePageProps<T extends { _id: string } & Record<string, unknown>> {
  config: ServerTableConfig;
  schema: ServerEntitySchemaData;
  table: ReturnType<typeof useServerTable<T>>;
  columns: ColumnDescriptor[];
  bulkOps: ReturnType<typeof useBulkOperations>;
  toolbarActions?: React.ReactNode;
  savedLayout?: TableLayout | null;
  onLayoutChange?: (layout: TableLayout) => void;
  savedTabOrder?: string[];
  onTabOrderChange?: (order: string[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ServerTablePage<T extends { _id: string } & Record<string, unknown>>({
  config,
  schema,
  table,
  columns,
  bulkOps,
  toolbarActions,
  savedLayout,
  onLayoutChange,
  savedTabOrder,
  onTabOrderChange,
}: ServerTablePageProps<T>): JSX.Element {
  // ── Permissions ────────────────────────────────────────────────────
  const permissions = usePermissions(config.endpoint);

  // ── Drawer/dialog state ─────────────────────────────────────────────
  const [editingEntity, setEditingEntity] = useState<T | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // ── Column chooser ────────────────────────────────────────────────
  const { columnOrder, activeColumns, chooser } = useColumnChooser({
    columns,
    savedLayout,
    onLayoutChange,
    schemaReady: !schema.isLoading,
  });

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.key, c])),
    [columns],
  );

  // ── CRUD mutations ──────────────────────────────────────────────────
  const createMutation = useCreateEntity(config.endpoint);
  const updateMutation = useUpdateEntity(config.endpoint);
  const deleteMutation = useDeleteEntity(config.endpoint);

  // ── Pagination (1-indexed for TablePagination) ────────────────────
  const page = table.pageIndex + 1;
  const handlePageChange = useCallback(
    (p: number) => table.onPageChange(p - 1),
    [table],
  );

  // ── Handlers ────────────────────────────────────────────────────────
  const singularTitle = config.singularTitle ?? config.pageTitle.replace(/s$/, "");

  const handleCreate = useCallback(() => {
    setEditingEntity(null);
    setIsCreating(true);
  }, []);

  const handleEdit = useCallback((entity: T) => {
    setEditingEntity(entity);
    setIsCreating(false);
  }, []);

  const handleSave = useCallback(
    async (payload: Record<string, unknown>) => {
      if (isCreating) {
        // Inject hiddenDefaults (static values or functions) into create payload
        const defaults = config.hiddenDefaults;
        const createPayload = defaults
          ? {
              ...payload,
              ...Object.fromEntries(
                Object.entries(defaults).map(([k, v]) => [k, typeof v === "function" ? (v as () => unknown)() : v]),
              ),
            }
          : payload;
        await createMutation.mutateAsync(createPayload);
        toast.success(`${singularTitle} created`);
      } else if (editingEntity) {
        const id = editingEntity._id;
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success("Changes saved");
      }
      setEditingEntity(null);
      setIsCreating(false);
      table.refetch();
    },
    [isCreating, editingEntity, createMutation, updateMutation, singularTitle, table, config.hiddenDefaults],
  );

  const handleCancelForm = useCallback(() => {
    setEditingEntity(null);
    setIsCreating(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Deleted successfully");
      table.refetch();
    } catch {
      toast.error("Failed to delete item");
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, table]);

  const handleBulkEdit = useCallback(
    async (update: Record<string, unknown>) => {
      const ids = [...table.selectedIds];
      await bulkOps.bulkUpdate.mutateAsync({ ids, update });
      setBulkEditOpen(false);
      table.clearSelection();
      toast.success(`Updated ${ids.length} items`);
    },
    [table, bulkOps.bulkUpdate],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = [...table.selectedIds];
    try {
      await bulkOps.bulkDelete.mutateAsync({ ids });
      setBulkDeleteConfirm(false);
      table.clearSelection();
      toast.success(`Deleted ${ids.length} items`);
    } catch {
      toast.error("Failed to delete items");
      setBulkDeleteConfirm(false);
    }
  }, [table, bulkOps.bulkDelete]);


  // ── Render ──────────────────────────────────────────────────────────
  const formDrawerOpen = isCreating || editingEntity !== null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title={config.pageTitle}
        icon={config.pageIcon}
        actions={
          <div className="flex items-center gap-3">
            <SearchBar
              value={table.searchQuery}
              onChange={table.onSearchChange}
              placeholder={`Search ${config.pageTitle.toLowerCase()}...`}
              testIdPrefix={config.testIdPrefix}
              className="w-[var(--width-search-bar)]"
            />
            {toolbarActions}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.refetch()}
              title="Refresh"
              className="cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {permissions.canCreate && (
              <Button
                onClick={handleCreate}
                data-testid={`${config.testIdPrefix}-add-new`}
                className="cursor-pointer"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add {singularTitle}
              </Button>
            )}
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

      {schema.extSchemaPartial && (
        <div
          className="flex items-center gap-2 rounded-md border border-warning bg-warning-light px-4 py-3"
          role="status"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-body-sm text-warning">
            Extension fields could not be loaded. Some columns and form fields
            may be missing.
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
            onEdit={permissions.canUpdate ? handleEdit : undefined}
            onDelete={permissions.canDelete ? (id) =>
              setDeleteTarget({
                id,
                name: String(
                  (table.data.find((e) => e._id === id) as Record<string, unknown>)?.name ?? id,
                ),
              }) : undefined
            }
            chooser={chooser}
            isLoading={table.isLoading || schema.isLoading}
            isFetching={table.isFetching && !table.isLoading}
            emptyMessage={`No ${config.pageTitle.toLowerCase()} found`}
            emptyAction={permissions.canCreate ?
              <Button
                variant="outline"
                size="sm"
                className="mt-2 cursor-pointer"
                onClick={handleCreate}
              >
                Add {singularTitle}
              </Button> : undefined
            }
            testIdPrefix={config.testIdPrefix}
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

      {(permissions.canUpdate || permissions.canDelete) && (
        <BulkActionBar
          count={table.selectedIds.size}
          totalCount={table.totalCount}
          onSelectAll={table.selectAll}
          selectingAll={table.selectingAll}
          onInvert={table.invertSelection}
          onEdit={permissions.canUpdate ? () => setBulkEditOpen(true) : undefined}
          onDelete={permissions.canDelete ? () => setBulkDeleteConfirm(true) : undefined}
          onClear={table.clearSelection}
        />
      )}

      <EntityFormDrawer
        open={formDrawerOpen}
        entity={editingEntity}
        config={config}
        schema={schema}
        onSave={handleSave}
        onCancel={handleCancelForm}
        saving={createMutation.isPending || updateMutation.isPending}
        savedTabOrder={savedTabOrder}
        onTabOrderChange={onTabOrderChange}
      />

      <BulkEditDrawer
        open={bulkEditOpen}
        selectedIds={table.selectedIds}
        items={table.data}
        config={config}
        schema={schema}
        onSave={handleBulkEdit}
        onCancel={() => setBulkEditOpen(false)}
        saving={bulkOps.bulkUpdate.isPending}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${singularTitle}`}
        itemName={deleteTarget?.name}
        description={`Are you sure you want to delete this ${singularTitle.toLowerCase()}? This action cannot be undone.`}
        isPending={deleteMutation.isPending}
      />

      <DeleteConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${table.selectedIds.size} ${config.pageTitle}`}
        description={`Are you sure you want to delete ${table.selectedIds.size} ${config.pageTitle.toLowerCase()}? This action cannot be undone.`}
        isPending={bulkOps.bulkDelete.isPending}
      />

      <ColumnChooserDropdown chooser={chooser} columnOrder={columnOrder} columnMap={columnMap} />
    </div>
  );
}

// ── Loading skeleton shown while user preferences load ────────────────────────

function ServerTablePageSkeleton({ config }: { config: ServerTableConfig }) {
  const singularTitle = config.singularTitle ?? config.pageTitle.replace(/s$/, "");
  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title={config.pageTitle}
        actions={
          <div className="flex items-center gap-3">
            <SearchBar value="" onChange={() => {}} placeholder={`Search ${config.pageTitle.toLowerCase()}...`} testIdPrefix={config.testIdPrefix} className="w-[var(--width-search-bar)]" />
            <Button variant="ghost" size="icon" disabled className="cursor-default">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button disabled className="cursor-default">
              <Plus className="mr-1.5 h-4 w-4" />
              Add {singularTitle}
            </Button>
          </div>
        }
      />
      <div className="flex flex-col flex-1 min-h-0 gap-0">
        <div className="flex-1 min-h-0 rounded-lg border border-border bg-card shadow-card flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-page">
                  <th className="h-12 w-9 px-1.5 bg-page border-b border-border" />
                  {Array.from({ length: 5 }, (_, i) => (
                    <th key={i} className="h-12 px-3.5 bg-page border-b border-border">
                      <div className="h-3 w-16 rounded bg-subtle animate-pulse" />
                    </th>
                  ))}
                  <th className="h-12 w-[88px] bg-page border-b border-border" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-subtle">
                    <td className="w-9 px-1.5 py-2 text-center">
                      <div className="h-4 w-4 rounded bg-subtle animate-pulse" />
                    </td>
                    {Array.from({ length: 5 }, (_, j) => (
                      <td key={j} className="h-14 px-3.5 py-2">
                        <div className="h-4 w-20 rounded bg-subtle animate-pulse" />
                      </td>
                    ))}
                    <td className="w-[88px] px-2 py-2">
                      <div className="h-4 w-12 rounded bg-subtle animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

ServerTablePage.Skeleton = ServerTablePageSkeleton;
