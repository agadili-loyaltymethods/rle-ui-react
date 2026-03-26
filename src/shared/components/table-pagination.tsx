import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function TablePagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px] text-foreground-secondary select-none">
      <span className="whitespace-nowrap min-w-[120px]">
        {start}–{end} of {totalItems.toLocaleString()}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          data-testid="table-pagination-prev"
          aria-label="Previous page"
          title="Previous page"
          className={cn(
            "inline-flex items-center justify-center min-w-[30px] h-[30px] px-1.5 border border-border rounded-[6px] bg-card text-foreground-secondary text-[13px] cursor-pointer transition-all duration-150",
            "hover:border-border-strong hover:bg-subtle",
            "disabled:opacity-35 disabled:cursor-default",
          )}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {/* Fixed-width container so arrows don't shift as page count changes */}
        <div className="flex items-center justify-center gap-0.5 w-[250px]">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (p === 1 || p === totalPages) return true;
              return Math.abs(p - page) <= 2;
            })
            .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
              if (idx > 0) {
                const prev = arr[idx - 1];
                if (prev !== undefined && p - prev > 1) acc.push("ellipsis");
              }
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-foreground-secondary">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  data-testid={`table-pagination-page-${item}`}
                  aria-label={`Go to page ${item}`}
                  className={cn(
                    "inline-flex items-center justify-center min-w-[30px] h-[30px] px-1.5 border rounded-[6px] text-[13px] cursor-pointer transition-all duration-150",
                    item === page
                      ? "bg-brand border-brand text-white font-semibold hover:bg-brand-hover hover:border-brand-hover"
                      : "border-border bg-card text-foreground-secondary hover:border-border-strong hover:bg-subtle",
                  )}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              ),
            )}
        </div>
        <button
          data-testid="table-pagination-next"
          aria-label="Next page"
          title="Next page"
          className={cn(
            "inline-flex items-center justify-center min-w-[30px] h-[30px] px-1.5 border border-border rounded-[6px] bg-card text-foreground-secondary text-[13px] cursor-pointer transition-all duration-150",
            "hover:border-border-strong hover:bg-subtle",
            "disabled:opacity-35 disabled:cursor-default",
          )}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {onPageSizeChange && (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="mr-1 text-foreground-muted text-xs">Per page</span>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              data-testid={`table-pagination-size-${size}`}
              aria-label={`Show ${size} per page`}
              className={cn(
                "inline-flex items-center justify-center h-[26px] px-2 border rounded text-xs cursor-pointer transition-all duration-150",
                size === pageSize
                  ? "bg-[var(--table-pagination-active)] border-brand text-brand-hover font-semibold"
                  : "border-border bg-card text-foreground-secondary hover:border-border-strong hover:bg-subtle",
              )}
              onClick={() => onPageSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
