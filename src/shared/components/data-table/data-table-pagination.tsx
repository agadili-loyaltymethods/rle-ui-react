import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format-utils";

interface DataTablePaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  testIdPrefix?: string;
}

function DataTablePagination({
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  testIdPrefix = "table",
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalCount);

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  // Generate page numbers with ellipsis
  const pages = React.useMemo(() => {
    const result: (number | "ellipsis")[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) result.push(i);
    } else {
      // Always show first page
      result.push(0);

      if (pageIndex > 2) {
        result.push("ellipsis");
      }

      // Pages around current
      const rangeStart = Math.max(1, pageIndex - 1);
      const rangeEnd = Math.min(totalPages - 2, pageIndex + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) {
        result.push(i);
      }

      if (pageIndex < totalPages - 3) {
        result.push("ellipsis");
      }

      // Always show last page
      result.push(totalPages - 1);
    }

    return result;
  }, [pageIndex, totalPages]);

  return (
    <div
      data-testid={`${testIdPrefix}-pagination`}
      className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
    >
      {/* Showing X-Y of Z */}
      <div className="text-label text-foreground-muted">
        Showing{" "}
        <span className="font-medium text-foreground">
          {formatNumber(start)}-{formatNumber(end)}
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground">{formatNumber(totalCount)}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-label text-foreground-muted">Rows:</span>
            <select
              data-testid={`${testIdPrefix}-pagination-page-size`}
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-sm border border-border bg-card px-2 text-label text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            data-testid={`${testIdPrefix}-pagination-prev`}
            aria-label="Previous page"
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(pageIndex - 1)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
              canPrev
                ? "text-foreground hover:bg-subtle"
                : "text-foreground-muted opacity-50 cursor-not-allowed",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((page, idx) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-label text-foreground-muted"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                data-testid={`${testIdPrefix}-pagination-page-${page}`}
                aria-label={`Go to page ${page + 1}`}
                type="button"
                onClick={() => onPageChange(page)}
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center rounded-sm px-1.5 text-label font-medium transition-colors",
                  page === pageIndex
                    ? "bg-brand text-foreground-inverse"
                    : "text-foreground hover:bg-subtle",
                )}
              >
                {page + 1}
              </button>
            ),
          )}

          <button
            data-testid={`${testIdPrefix}-pagination-next`}
            aria-label="Next page"
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(pageIndex + 1)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
              canNext
                ? "text-foreground hover:bg-subtle"
                : "text-foreground-muted opacity-50 cursor-not-allowed",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export { DataTablePagination };
export type { DataTablePaginationProps };
