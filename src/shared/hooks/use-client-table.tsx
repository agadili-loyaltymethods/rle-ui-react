/**
 * useClientTable — shared hook for client-side sort, filter, and pagination
 * of in-memory table data.
 *
 * Supports two modes:
 * - **Controlled** (page/pageSize/onPageChange/onPageSizeChange provided): the
 *   parent owns pagination state.
 * - **Uncontrolled** (those props omitted): pagination state is managed locally,
 *   defaulting to page 1 / pageSize 25.
 */

import { useState, useMemo, useEffect, useCallback, type JSX } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortDir = "asc" | "desc";

export interface UseClientTableOptions<T> {
  items: T[];
  getDisplayValue: (item: T, key: string) => string;
  getSortValue: (item: T, key: string) => string | number;
  /** Controlled mode: current page (1-based) */
  page?: number;
  /** Page size — used as default when uncontrolled */
  pageSize?: number;
  /** Controlled mode: page change handler */
  onPageChange?: (page: number) => void;
  /** Controlled mode: page-size change handler */
  onPageSizeChange?: (size: number) => void;
  /** Extra dependencies that should trigger a page reset to 1 */
  pageResetDeps?: unknown[];
}

export interface UseClientTableResult<T> {
  // Sort
  sort: { key: string; dir: SortDir } | null;
  toggleSort: (key: string) => void;

  // Filters
  columnFilters: Record<string, string>;
  setColumnFilter: (key: string, value: string) => void;
  filtersVisible: boolean;
  setFiltersVisible: (v: boolean | ((prev: boolean) => boolean)) => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;

  // Processed data
  processedItems: T[];
  paginatedItems: T[];

  // Pagination (works for both controlled & uncontrolled)
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}

// ---------------------------------------------------------------------------
// renderSortIcon — standalone, no hook state needed
// ---------------------------------------------------------------------------

export function renderSortIcon(
  key: string,
  sort: { key: string; dir: SortDir } | null,
): JSX.Element | null {
  if (sort?.key === key) {
    return sort.dir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  }
  return <ArrowUpDown className="h-3 w-3 text-foreground-tertiary" />;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useClientTable<T>(
  options: UseClientTableOptions<T>,
): UseClientTableResult<T> {
  const {
    items,
    getDisplayValue,
    getSortValue,
    page: controlledPage,
    pageSize: controlledPageSize,
    onPageChange,
    onPageSizeChange,
    pageResetDeps = [],
  } = options;

  const isControlled = controlledPage !== undefined && onPageChange !== undefined;

  // Sort state
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);

  // Filter state
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Uncontrolled pagination state
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(controlledPageSize ?? 25);

  const page = isControlled ? controlledPage : localPage;
  const pageSize = isControlled ? (controlledPageSize ?? 25) : localPageSize;
  const setPage = isControlled ? onPageChange : setLocalPage;
  const setPageSize = isControlled
    ? (onPageSizeChange ?? (() => {}))
    : setLocalPageSize;

  // Toggle sort: null → asc → desc → null
  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.dir === "asc") return { key, dir: "desc" };
        return null;
      }
      return { key, dir: "asc" };
    });
  }, []);

  // Filter helpers
  const setColumnFilter = useCallback((key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasActiveFilters = useMemo(
    () => Object.values(columnFilters).some((v) => v.trim()),
    [columnFilters],
  );

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setFiltersVisible(false);
  }, []);

  // Process items: filter → sort
  const processedItems = useMemo(() => {
    let result = [...items];

    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v.trim());
    if (activeFilters.length) {
      result = result.filter((item) =>
        activeFilters.every(([key, filterVal]) => {
          const display = getDisplayValue(item, key).toLowerCase();
          return display.includes(filterVal.trim().toLowerCase());
        }),
      );
    }

    if (sort) {
      const { key, dir } = sort;
      result.sort((a, b) => {
        const va = getSortValue(a, key);
        const vb = getSortValue(b, key);
        let cmp = 0;
        if (typeof va === "number" && typeof vb === "number") {
          cmp = va - vb;
        } else {
          cmp = String(va).localeCompare(String(vb));
        }
        return dir === "desc" ? -cmp : cmp;
      });
    }

    return result;
  }, [items, columnFilters, sort, getDisplayValue, getSortValue]);

  // Paginate
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedItems.slice(start, start + pageSize);
  }, [processedItems, page, pageSize]);

  // Auto-reset page to 1 when sort/filters/custom deps change.
  // Serialize pageResetDeps into a stable string key rather than spreading
  // into the dep array (React requires fixed-length dependency arrays).
  const resetKey = JSON.stringify(pageResetDeps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [sort, columnFilters, resetKey]);

  return {
    sort,
    toggleSort,
    columnFilters,
    setColumnFilter,
    filtersVisible,
    setFiltersVisible,
    hasActiveFilters,
    clearAllFilters,
    processedItems,
    paginatedItems,
    page,
    pageSize,
    setPage,
    setPageSize,
  };
}
