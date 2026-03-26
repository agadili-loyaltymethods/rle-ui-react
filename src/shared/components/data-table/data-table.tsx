import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/shared/lib/cn";
import {
  DataTableToolbar,
  type Density,
} from "@/shared/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/shared/components/data-table/data-table-pagination";
import { DataTableSkeleton } from "@/shared/components/data-table/data-table-skeleton";
import { DataTableEmpty } from "@/shared/components/data-table/data-table-empty";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  totalCount?: number;
  pageSize?: number;
  pageIndex?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sorting: SortingState) => void;
  onFilterChange?: (filters: ColumnFiltersState) => void;
  onRowSelect?: (selection: RowSelectionState) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  testIdPrefix?: string;
  enableRowSelection?: boolean;
  enableMultiSort?: boolean;
  enableColumnResizing?: boolean;
  onExport?: () => void;
  getRowId?: (row: TData) => string;
}

function DataTable<TData>({
  columns,
  data,
  totalCount,
  pageSize = 25,
  pageIndex = 0,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  onRowSelect,
  isLoading = false,
  emptyMessage = "No data found",
  emptyActionLabel,
  onEmptyAction,
  testIdPrefix = "table",
  enableRowSelection = false,
  enableMultiSort = false,
  enableColumnResizing = false,
  onExport,
  getRowId,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [searchValue, setSearchValue] = React.useState("");
  const [density, setDensity] = React.useState<Density>("comfortable");

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onSortChange?.(next);
      return next;
    });
  };

  const handleFilterChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    setColumnFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onFilterChange?.(next);
      return next;
    });
  };

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    setRowSelection((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Defer parent notification to avoid setState-during-render warning
      queueMicrotask(() => onRowSelect?.(next));
      return next;
    });
  };

  const resolvedTotalCount = totalCount ?? data.length;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: searchValue,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleFilterChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onGlobalFilterChange: setSearchValue,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: onSortChange ? undefined : getSortedRowModel(),
    getFilteredRowModel: onFilterChange ? undefined : getFilteredRowModel(),
    enableRowSelection,
    enableMultiSort,
    enableColumnResizing,
    columnResizeMode: enableColumnResizing ? "onChange" : undefined,
    getRowId,
    manualPagination: !!onPageChange,
    manualSorting: !!onSortChange,
    manualFiltering: !!onFilterChange,
    pageCount: onPageChange
      ? Math.ceil(resolvedTotalCount / pageSize)
      : undefined,
  });

  const { rows } = table.getRowModel();

  // Virtual scrolling
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowHeight = density === "comfortable" ? 48 : 36;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div
      data-testid={`${testIdPrefix}-table`}
      className="rounded-lg border border-border bg-card"
    >
      {/* Toolbar */}
      <DataTableToolbar
        table={table}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        density={density}
        onDensityChange={setDensity}
        onExport={onExport}
        testIdPrefix={testIdPrefix}
      />

      {/* Table */}
      {isLoading ? (
        <DataTableSkeleton
          columnCount={columns.length}
          testIdPrefix={testIdPrefix}
        />
      ) : rows.length === 0 ? (
        <DataTableEmpty
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          testIdPrefix={testIdPrefix}
        />
      ) : (
        <div className="overflow-x-auto">
          <div
            ref={parentRef}
            className="max-h-[var(--height-table-max)] overflow-y-auto"
          >
            <table className="w-full border-collapse">
              {/* Header */}
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="bg-[var(--table-header-bg)] border-b border-[var(--table-border)]"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          "group px-3 text-left font-normal",
                          density === "comfortable"
                            ? "h-[var(--table-row-height)]"
                            : "h-9",
                        )}
                        style={
                          enableColumnResizing
                            ? { width: header.getSize() }
                            : undefined
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {enableColumnResizing && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                              "opacity-0 group-hover:opacity-100 bg-brand",
                              header.column.getIsResizing() && "opacity-100",
                            )}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              {/* Body with virtual scrolling */}
              <tbody>
                {totalHeight > 0 && virtualRows[0] && virtualRows[0].start > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ height: virtualRows[0].start }}
                    />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      data-testid={`${testIdPrefix}-row-${row.id}`}
                      className={cn(
                        "border-b border-[var(--table-border)] transition-colors",
                        "hover:bg-[var(--table-hover)]",
                        row.getIsSelected() && "bg-brand-light",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          data-testid={`${testIdPrefix}-cell-${cell.column.id}-${row.id}`}
                          className={cn(
                            "px-3 text-body-sm text-foreground",
                            density === "comfortable"
                              ? "h-[var(--table-row-height)]"
                              : "h-9",
                          )}
                          style={
                            enableColumnResizing
                              ? { width: cell.column.getSize() }
                              : undefined
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {totalHeight > 0 && virtualRows.length > 0 && (() => {
                  const lastVirtualRow = virtualRows[virtualRows.length - 1];
                  const paddingBottom = lastVirtualRow
                    ? totalHeight - lastVirtualRow.end
                    : 0;
                  return paddingBottom > 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        style={{ height: paddingBottom }}
                      />
                    </tr>
                  ) : null;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && rows.length > 0 && (
        <div className="border-t border-[var(--table-border)]">
          <DataTablePagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={resolvedTotalCount}
            onPageChange={onPageChange ?? (() => {})}
            onPageSizeChange={onPageSizeChange}
            testIdPrefix={testIdPrefix}
          />
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
