import { Skeleton } from "@/shared/ui/skeleton";

interface DataTableSkeletonProps {
  columnCount: number;
  rowCount?: number;
  testIdPrefix?: string;
}

function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  testIdPrefix = "table",
}: DataTableSkeletonProps) {
  return (
    <div data-testid={`${testIdPrefix}-skeleton`}>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center border-b border-[var(--table-border)] h-[var(--table-row-height)]"
        >
          {Array.from({ length: columnCount }).map((_, colIdx) => (
            <div key={colIdx} className="flex-1 px-3">
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export { DataTableSkeleton };
export type { DataTableSkeletonProps };
