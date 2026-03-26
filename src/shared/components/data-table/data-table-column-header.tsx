import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  testIdPrefix?: string;
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  testIdPrefix = "table",
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div
        data-testid={`${testIdPrefix}-column-${column.id}`}
        className="text-label font-semibold text-foreground-secondary"
      >
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <button
      data-testid={`${testIdPrefix}-column-${column.id}`}
      aria-label={`Sort by ${title}`}
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 text-label font-semibold text-foreground-secondary",
        "hover:text-foreground transition-colors cursor-pointer select-none",
      )}
      onClick={() => column.toggleSorting(undefined, column.getCanMultiSort())}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

export { DataTableColumnHeader };
export type { DataTableColumnHeaderProps };
