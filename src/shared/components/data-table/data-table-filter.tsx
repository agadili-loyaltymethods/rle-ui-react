import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Filter, X } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

type FilterType = "text" | "number-range" | "date-range" | "enum";

interface EnumOption {
  value: string;
  label: string;
}

interface DataTableFilterProps<TData> {
  column: Column<TData, unknown>;
  filterType: FilterType;
  enumOptions?: EnumOption[];
  testIdPrefix?: string;
}

function DataTableFilter<TData>({
  column,
  filterType,
  enumOptions = [],
  testIdPrefix = "table",
}: DataTableFilterProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const filterValue = column.getFilterValue();
  const hasFilter = filterValue !== undefined && filterValue !== "";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          data-testid={`${testIdPrefix}-filter-${column.id}`}
          type="button"
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-sm",
            "hover:bg-subtle transition-colors",
            hasFilter
              ? "text-brand"
              : "text-foreground-muted opacity-0 group-hover:opacity-100",
          )}
          aria-label={`Filter ${column.id}`}
        >
          <Filter className="h-3 w-3" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[var(--z-dropdown)] w-[240px] rounded-md border border-border bg-card p-3 shadow-dropdown"
          sideOffset={4}
          align="start"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
              Filter
            </span>
            {hasFilter && (
              <button
                type="button"
                data-testid={`${testIdPrefix}-filter-${column.id}-clear`}
                aria-label={`Clear ${column.id} filter`}
                className="text-caption text-brand hover:underline"
                onClick={() => {
                  column.setFilterValue(undefined);
                  setOpen(false);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {filterType === "text" && (
            <TextFilter column={column} testIdPrefix={testIdPrefix} />
          )}
          {filterType === "number-range" && (
            <NumberRangeFilter column={column} testIdPrefix={testIdPrefix} />
          )}
          {filterType === "date-range" && (
            <DateRangeFilter column={column} testIdPrefix={testIdPrefix} />
          )}
          {filterType === "enum" && (
            <EnumFilter
              column={column}
              options={enumOptions}
              testIdPrefix={testIdPrefix}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ── Text Filter ── */

function TextFilter<TData>({
  column,
  testIdPrefix,
}: {
  column: Column<TData, unknown>;
  testIdPrefix: string;
}) {
  const value = (column.getFilterValue() as string) ?? "";

  return (
    <div className="relative">
      <Input
        data-testid={`${testIdPrefix}-filter-${column.id}-input`}
        type="text"
        placeholder="Filter..."
        value={value}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        className="h-8 text-label"
      />
      {value && (
        <button
          type="button"
          data-testid={`${testIdPrefix}-filter-${column.id}-input-clear`}
          aria-label={`Clear ${column.id} text filter`}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
          onClick={() => column.setFilterValue(undefined)}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ── Number Range Filter ── */

function NumberRangeFilter<TData>({
  column,
  testIdPrefix,
}: {
  column: Column<TData, unknown>;
  testIdPrefix: string;
}) {
  const filterValue = (column.getFilterValue() as [number?, number?]) ?? [
    undefined,
    undefined,
  ];

  return (
    <div className="flex items-center gap-2">
      <Input
        data-testid={`${testIdPrefix}-filter-${column.id}-min`}
        type="number"
        placeholder="Min"
        value={filterValue[0] ?? ""}
        onChange={(e) => {
          const val = e.target.value ? Number(e.target.value) : undefined;
          column.setFilterValue([val, filterValue[1]]);
        }}
        className="h-8 text-label"
      />
      <span className="text-foreground-muted">-</span>
      <Input
        data-testid={`${testIdPrefix}-filter-${column.id}-max`}
        type="number"
        placeholder="Max"
        value={filterValue[1] ?? ""}
        onChange={(e) => {
          const val = e.target.value ? Number(e.target.value) : undefined;
          column.setFilterValue([filterValue[0], val]);
        }}
        className="h-8 text-label"
      />
    </div>
  );
}

/* ── Date Range Filter ── */

function DateRangeFilter<TData>({
  column,
  testIdPrefix,
}: {
  column: Column<TData, unknown>;
  testIdPrefix: string;
}) {
  const filterValue = (column.getFilterValue() as [string?, string?]) ?? [
    undefined,
    undefined,
  ];

  return (
    <div className="space-y-2">
      <Input
        data-testid={`${testIdPrefix}-filter-${column.id}-from`}
        type="date"
        value={filterValue[0] ?? ""}
        onChange={(e) => {
          column.setFilterValue([e.target.value || undefined, filterValue[1]]);
        }}
        className="h-8 text-label"
      />
      <Input
        data-testid={`${testIdPrefix}-filter-${column.id}-to`}
        type="date"
        value={filterValue[1] ?? ""}
        onChange={(e) => {
          column.setFilterValue([filterValue[0], e.target.value || undefined]);
        }}
        className="h-8 text-label"
      />
    </div>
  );
}

/* ── Enum Filter ── */

function EnumFilter<TData>({
  column,
  options,
  testIdPrefix,
}: {
  column: Column<TData, unknown>;
  options: EnumOption[];
  testIdPrefix: string;
}) {
  const selected = (column.getFilterValue() as string[]) ?? [];

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    column.setFilterValue(next.length > 0 ? next : undefined);
  };

  return (
    <div className="max-h-[var(--height-dropdown-sm)] space-y-1 overflow-y-auto">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 hover:bg-subtle"
        >
          <input
            data-testid={`${testIdPrefix}-filter-${column.id}-enum-${opt.value}`}
            aria-label={`Filter ${column.id} by ${opt.label}`}
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="h-3.5 w-3.5 rounded-sm border-border-strong accent-brand"
          />
          <span className="text-label text-foreground">{opt.label}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 w-full text-caption"
          onClick={() => column.setFilterValue(undefined)}
        >
          Clear selection
        </Button>
      )}
    </div>
  );
}

export { DataTableFilter };
export type { DataTableFilterProps, FilterType, EnumOption };
