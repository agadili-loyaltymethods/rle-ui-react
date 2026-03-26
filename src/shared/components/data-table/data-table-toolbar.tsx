import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Table } from "@tanstack/react-table";
import {
  Columns3,
  Download,
  Rows3,
  Rows4,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { SearchBar } from "@/shared/components/search-bar";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

type Density = "comfortable" | "compact";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  onExport?: () => void;
  testIdPrefix?: string;
}

function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  density,
  onDensityChange,
  onExport,
  testIdPrefix = "table",
}: DataTableToolbarProps<TData>) {
  // Collect active filters
  const activeFilters = table
    .getAllColumns()
    .filter((col) => col.getFilterValue() !== undefined)
    .map((col) => ({
      id: col.id,
      label: typeof col.columnDef.header === "string" ? col.columnDef.header : col.id,
    }));

  return (
    <div
      data-testid={`${testIdPrefix}-toolbar`}
      className="flex flex-wrap items-center gap-3 px-4 py-3"
    >
      {/* Search */}
      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search..."
        testIdPrefix={testIdPrefix}
        className="w-full max-w-[var(--width-popover-sm)]"
      />

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <Badge
              key={f.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {f.label}
              <button
                type="button"
                data-testid={`${testIdPrefix}-clear-filter-${f.id}`}
                aria-label={`Clear ${f.label} filter`}
                onClick={() => {
                  const col = table.getColumn(f.id);
                  col?.setFilterValue(undefined);
                }}
                className="rounded-full p-0.5 hover:bg-foreground-muted/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-clear-all-filters`}
              aria-label="Clear all filters"
              className="text-caption text-brand hover:underline"
              onClick={() => table.resetColumnFilters()}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {/* Column visibility */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`${testIdPrefix}-columns-toggle`}
              aria-label="Toggle columns"
            >
              <Columns3 className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[var(--z-dropdown)] min-w-[160px] rounded-md border border-border bg-card p-1 shadow-dropdown"
              align="end"
              sideOffset={4}
            >
              <div className="px-2 py-1.5 text-caption font-semibold text-foreground-muted uppercase tracking-wide">
                Toggle columns
              </div>
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenu.CheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) =>
                    column.toggleVisibility(!!checked)
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-label text-foreground outline-none focus:bg-subtle"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      column.getIsVisible()
                        ? "border-brand bg-brand text-white"
                        : "border-border-strong",
                    )}
                  >
                    {column.getIsVisible() && (
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Density toggle */}
        <Button
          variant="ghost"
          size="icon"
          data-testid={`${testIdPrefix}-density-toggle`}
          onClick={() =>
            onDensityChange(
              density === "comfortable" ? "compact" : "comfortable",
            )
          }
          aria-label={
            density === "comfortable"
              ? "Switch to compact view"
              : "Switch to comfortable view"
          }
        >
          {density === "comfortable" ? (
            <Rows3 className="h-4 w-4" />
          ) : (
            <Rows4 className="h-4 w-4" />
          )}
        </Button>

        {/* Export */}
        {onExport && (
          <Button
            variant="ghost"
            size="icon"
            data-testid={`${testIdPrefix}-export`}
            onClick={onExport}
            aria-label="Export"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export { DataTableToolbar };
export type { DataTableToolbarProps, Density };
