import * as React from "react";
import { useNavigate } from "react-router";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUIStore } from "@/shared/stores/ui-store";
import { useEntityList, type ListQueryParams } from "@/shared/hooks/use-api";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { SearchBar } from "@/shared/components/search-bar";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { formatNumber } from "@/shared/lib/format-utils";
import { ViewToggle, type ViewMode } from "./view-toggle";
import { Card, CardContent } from "@/shared/ui/card";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface PolicyListConfig<T> {
  title: string;
  testIdPrefix: string;
  endpoint: string;
  basePath: string;
  columns: ColumnDef<T, unknown>[];
  renderCard: (item: T, actions: { onEdit: () => void; onDelete: () => void }) => React.ReactNode;
}

interface PolicyListPageProps<T> {
  config: PolicyListConfig<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useDelete: () => { mutateAsync: (id: string) => Promise<any>; isPending: boolean };
}

function TableActionsCell<T extends { _id: string }>({
  item,
  onEdit,
  onDelete,
  testIdPrefix,
}: {
  item: T;
  onEdit: () => void;
  onDelete: () => void;
  testIdPrefix: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded p-1 text-foreground-muted hover:bg-subtle hover:text-foreground"
          data-testid={`${testIdPrefix}-actions-${item._id}`}
          aria-label={`Actions for ${item._id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[var(--z-dropdown)] min-w-36 rounded-md border border-border bg-card p-1 shadow-md"
          align="end"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-body-sm text-foreground outline-none hover:bg-subtle"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-body-sm text-error outline-none hover:bg-subtle"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const VIEW_MODE_KEY = "rcx.ui.policyViewMode";

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "card" || stored === "list") return stored;
  } catch { /* noop */ }
  return "list";
}

export function PolicyListPage<T extends { _id: string; name?: string }>({
  config,
  useDelete,
}: PolicyListPageProps<T>) {
  const navigate = useNavigate();
  const currentProgram = useUIStore((s) => s.currentProgram);
  const [viewMode, setViewMode] = React.useState<ViewMode>(getStoredViewMode);
  const [deleteItem, setDeleteItem] = React.useState<T | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");

  const deleteMutation = useDelete();

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const sortParam = sorting.length > 0
    ? sorting.map((s) => (s.desc ? `-${s.id}` : s.id)).join(",")
    : undefined;

  const queryObj: Record<string, unknown> = currentProgram ? { program: currentProgram } : {};
  if (search.trim()) {
    queryObj.name = { $regex: search.trim(), $options: "i" };
  }

  const queryParams: ListQueryParams = {
    query: Object.keys(queryObj).length > 0 ? JSON.stringify(queryObj) : undefined,
    sort: sortParam,
    skip: pageIndex * pageSize,
    limit: pageSize,
    enabled: !!currentProgram,
  };

  const { data, isLoading } = useEntityList<T>(config.endpoint, queryParams);
  const items = data?.data ?? [];
  const totalCount = data?.meta.totalCount ?? 0;

  // Wire actions column with real edit/delete handlers
  const wiredColumns = React.useMemo<ColumnDef<T, unknown>[]>(
    () =>
      config.columns.map((col) =>
        col.id === "actions"
          ? {
              ...col,
              cell: ({ row }) => (
                <TableActionsCell
                  item={row.original}
                  onEdit={() => handleEdit(row.original)}
                  onDelete={() => handleDelete(row.original)}
                  testIdPrefix={config.testIdPrefix}
                />
              ),
            }
          : col,
      ),
    [config.columns, config.testIdPrefix],
  );

  const handleCreate = () => {
    navigate(config.basePath + "/new");
  };

  const handleEdit = (item: T) => {
    navigate(config.basePath + "/" + item._id);
  };

  const handleDelete = (item: T) => {
    setDeleteItem(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      await deleteMutation.mutateAsync(deleteItem._id);
      toast.success(`${config.title.replace(/s$/, "")} deleted`);
      setDeleteItem(null);
    } catch {
      toast.error(`Failed to delete ${config.title.replace(/s$/, "").toLowerCase()}`);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageIndex(0);
  };

  const handleSortChange = (newSorting: SortingState) => {
    setSorting(newSorting);
    setPageIndex(0);
  };

  if (!currentProgram) {
    return (
      <NoProgramBanner
        context={config.title.toLowerCase()}
        data-testid={`${config.testIdPrefix}-no-program`}
      />
    );
  }

  return (
    <div data-testid={`${config.testIdPrefix}-page`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h3 text-foreground">{config.title}</h1>
        <div className="flex items-center gap-3">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder={`Search ${config.title.toLowerCase()}...`}
            testIdPrefix={config.testIdPrefix}
            className="w-[var(--width-search-bar)]"
          />
          <ViewToggle value={viewMode} onChange={handleViewModeChange} />
          <Button onClick={handleCreate} data-testid={`${config.testIdPrefix}-add`}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <DataTable
          columns={wiredColumns}
          data={items}
          totalCount={totalCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }}
          onSortChange={handleSortChange}
          isLoading={isLoading}
          emptyMessage={`No ${config.title.toLowerCase()} found`}
          emptyActionLabel="Add"
          onEmptyAction={handleCreate}
          testIdPrefix={config.testIdPrefix}
          getRowId={(row) => (row as T)._id}
        />
      ) : (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent>
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-2/3 rounded bg-subtle" />
                      <div className="h-3 w-1/2 rounded bg-subtle" />
                      <div className="h-3 w-full rounded bg-subtle" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
              <p className="text-body text-foreground-muted mb-4">No {config.title.toLowerCase()} found</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) =>
                  config.renderCard(item, {
                    onEdit: () => handleEdit(item),
                    onDelete: () => handleDelete(item),
                  }),
                )}
              </div>
              {/* Simple pagination for card view */}
              {totalCount > pageSize && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-body-sm text-foreground-muted">
                    Page {formatNumber(pageIndex + 1)} of {formatNumber(Math.ceil(totalCount / pageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(pageIndex + 1) * pageSize >= totalCount}
                    onClick={() => setPageIndex((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <DeleteConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${config.title.replace(/s$/, "")}`}
        itemName={deleteItem?.name}
        isPending={deleteMutation.isPending}
        data-testid={`${config.testIdPrefix}-delete-confirm`}
      />
    </div>
  );
}

export type { PolicyListConfig };
