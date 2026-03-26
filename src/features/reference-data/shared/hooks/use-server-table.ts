/**
 * Hook for managing server-side table state: pagination, sorting, filtering,
 * search, and row selection.
 *
 * Internally uses useEntityList with computed query params so all data
 * operations happen on the server.
 */

import { useState, useCallback, useMemo, useEffect, useRef, type RefObject } from "react";
import type {
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";
import { useEntityList } from "@/shared/hooks/use-api";
import { apiClient } from "@/shared/lib/api-client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ServerTableConfig } from "../types/server-table-types";

const DEFAULT_PAGE_SIZE = 25;
const EMPTY_ARRAY: unknown[] = [];

/** Escape special regex characters so user input is treated as a literal string. */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a MongoDB query object from search + column filters + additional query. */
export function buildQuery(
  config: ServerTableConfig,
  searchQuery: string,
  columnFilters: ColumnFiltersState,
  additionalQuery?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const conditions: Record<string, unknown>[] = [];

  // Global search → $or across searchFields with regex
  if (searchQuery.trim() && config.searchFields?.length) {
    conditions.push({
      $or: config.searchFields.map((field) => ({
        [field]: { $regex: escapeRegex(searchQuery.trim()), $options: "i" },
      })),
    });
  }

  // Build a set of date/number field names so we can avoid $regex on them
  const dateFields = new Set<string>();
  const numberFields = new Set<string>();
  for (const col of config.coreColumns) {
    if (col.type === "date") dateFields.add(col.field);
    if (col.type === "number") numberFields.add(col.field);
  }

  // Column filters
  for (const filter of columnFilters) {
    const val = filter.value;
    if (val == null || val === "") continue;

    // Check for negation wrapper: { __negated: true, __inner: actualValue }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let actualVal: any = val;
    let negated = false;
    if (
      typeof val === "object" &&
      val !== null &&
      "__negated" in val
    ) {
      negated = true;
      actualVal = (val as { __negated: boolean; __inner: unknown }).__inner;
      if (actualVal == null || actualVal === "") continue;
    }

    // Array value → $in / $nin (enum multi-select)
    if (Array.isArray(actualVal) && actualVal.length > 0) {
      conditions.push({ [filter.id]: { [negated ? "$nin" : "$in"]: actualVal } });
    }
    // Operator-based filter { op, value } for date/number columns
    else if (
      typeof actualVal === "object" &&
      actualVal !== null &&
      "op" in actualVal &&
      "value" in actualVal
    ) {
      const { op, value: rawVal } = actualVal as { op: string; value: string };
      if (!rawVal) continue;

      if (dateFields.has(filter.id)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawVal)) continue;
        const mongoOp: Record<string, string> = {
          ">": "$gt", "<": "$lt", ">=": "$gte", "<=": "$lte",
        };
        if (op === "=") {
          if (negated) {
            // NOT equal to this date → outside the day range
            conditions.push({
              $or: [
                { [filter.id]: { $lt: rawVal + "T00:00:00.000Z" } },
                { [filter.id]: { $gt: rawVal + "T23:59:59.999Z" } },
              ],
            });
          } else {
            conditions.push({
              [filter.id]: {
                $gte: rawVal + "T00:00:00.000Z",
                $lte: rawVal + "T23:59:59.999Z",
              },
            });
          }
        } else if (mongoOp[op]) {
          const ts = op === ">" || op === ">="
            ? rawVal + "T00:00:00.000Z"
            : rawVal + "T23:59:59.999Z";
          if (negated) {
            conditions.push({ [filter.id]: { $not: { [mongoOp[op]]: ts } } });
          } else {
            conditions.push({ [filter.id]: { [mongoOp[op]]: ts } });
          }
        }
      } else if (numberFields.has(filter.id)) {
        const n = Number(rawVal);
        if (isNaN(n)) continue;
        const mongoOp: Record<string, string> = {
          ">": "$gt", "<": "$lt", ">=": "$gte", "<=": "$lte",
        };
        if (op === "=") {
          conditions.push({ [filter.id]: negated ? { $ne: n } : n });
        } else if (mongoOp[op]) {
          if (negated) {
            conditions.push({ [filter.id]: { $not: { [mongoOp[op]]: n } } });
          } else {
            conditions.push({ [filter.id]: { [mongoOp[op]]: n } });
          }
        }
      }
    }
    // ObjectId wrapper from populated reference context menu filter
    else if (typeof actualVal === "object" && actualVal !== null && "__objectId" in actualVal) {
      const oid = (actualVal as { __objectId: string }).__objectId;
      conditions.push({ [filter.id]: negated ? { $ne: oid } : oid });
    }
    // Object with min/max → range filter
    else if (typeof actualVal === "object" && actualVal !== null && !Array.isArray(actualVal)) {
      const range = actualVal as { min?: string | number; max?: string | number };
      const cond: Record<string, unknown> = {};
      if (range.min != null && range.min !== "") cond.$gte = range.min;
      if (range.max != null && range.max !== "") cond.$lte = range.max;
      if (Object.keys(cond).length > 0) {
        if (negated) {
          conditions.push({ [filter.id]: { $not: cond } });
        } else {
          conditions.push({ [filter.id]: cond });
        }
      }
    }
    // String value — text fields use case-insensitive regex;
    // ObjectId-shaped strings (24-char hex, e.g. populated refs) use exact match
    else if (typeof actualVal === "string") {
      if (dateFields.has(filter.id) || numberFields.has(filter.id)) {
        continue;
      }
      if (/^[a-f\d]{24}$/i.test(actualVal)) {
        // Exact ObjectId match (populated reference fields like createdBy/updatedBy)
        conditions.push({ [filter.id]: negated ? { $ne: actualVal } : actualVal });
      } else {
        const regexCond = { $regex: escapeRegex(actualVal), $options: "i" };
        if (negated) {
          conditions.push({ [filter.id]: { $not: regexCond } });
        } else {
          conditions.push({ [filter.id]: regexCond });
        }
      }
    }
    // Boolean
    else if (typeof actualVal === "boolean") {
      conditions.push({ [filter.id]: negated ? !actualVal : actualVal });
    }
  }

  // Additional query — one condition per key
  if (additionalQuery) {
    for (const [key, value] of Object.entries(additionalQuery)) {
      if (value != null) {
        conditions.push({ [key]: value });
      }
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

/** Convert TanStack sorting state to express-restify-mongoose sort string. */
function buildSort(sorting: SortingState, defaultSort?: string): string {
  if (sorting.length === 0) return defaultSort ?? "name";
  const s = sorting[0];
  if (!s) return defaultSort ?? "name";
  return s.desc ? `-${s.id}` : s.id;
}

export function useServerTable<T extends { _id: string }>(
  config: ServerTableConfig,
  additionalQuery?: Record<string, unknown>,
) {
  // ── UI state ────────────────────────────────────────────────────────
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sorting, setSorting] = useState<SortingState>(
    config.defaultSort
      ? [{ id: config.defaultSort, desc: false }]
      : [],
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search — update the query value 300ms after the user stops typing
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Reset page when additionalQuery changes (compare by serialized value)
  const additionalQueryKey = additionalQuery ? JSON.stringify(additionalQuery) : "";
  const prevAdditionalQueryKey = useRef(additionalQueryKey);
  useEffect(() => {
    if (prevAdditionalQueryKey.current !== additionalQueryKey) {
      prevAdditionalQueryKey.current = additionalQueryKey;
      setPageIndex(0);
    }
  }, [additionalQueryKey]);

  // ── Computed query params ───────────────────────────────────────────
  const query = useMemo(
    () => buildQuery(config, debouncedSearch, columnFilters, additionalQuery),
    [config, debouncedSearch, columnFilters, additionalQuery],
  );

  const sortString = useMemo(
    () => buildSort(sorting, config.defaultSort),
    [sorting, config.defaultSort],
  );

  const queryParams = useMemo(
    () => ({
      query: query ? JSON.stringify(query) : undefined,
      sort: sortString,
      skip: pageIndex * pageSize,
      limit: pageSize,
      populate: config.populate?.join(","),
      select: config.select,
    }),
    [query, sortString, pageIndex, pageSize, config.populate, config.select],
  );

  // ── Data fetch ──────────────────────────────────────────────────────
  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
    error: listError,
    refetch,
  } = useEntityList<T>(config.endpoint, queryParams, {
    placeholderData: keepPreviousData,
  });

  // ── Count fetch (separate endpoint for accurate total) ──────────────
  const countQueryKey = useMemo(
    () => [config.endpoint, "count", query ? JSON.stringify(query) : ""],
    [config.endpoint, query],
  );

  const { data: countData, error: countError } = useQuery({
    queryKey: countQueryKey,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (query) params.query = JSON.stringify(query);
      const resp = await apiClient.get<{ count: number }>(
        `${config.endpoint}/count`,
        { params },
      );
      return resp.data.count ?? 0;
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = countData ?? listData?.meta.totalCount ?? 0;

  // ── Handlers ────────────────────────────────────────────────────────
  const onPageChange = useCallback((page: number) => {
    setPageIndex(page);
  }, []);

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPageIndex(0);
  }, []);

  const onSortChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPageIndex(0);
  }, []);

  const onSearchChange = useCallback((q: string) => {
    setSearchInput(q);
    setPageIndex(0);
  }, []);

  const onFilterChange = useCallback((filters: ColumnFiltersState) => {
    setColumnFilters(filters);
    setPageIndex(0);
  }, []);

  const onRowSelect = useCallback((selection: RowSelectionState) => {
    setSelectedIds(new Set(Object.keys(selection).filter((k) => selection[k])));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Select all (across pages) ─────────────────────────────────────
  const [selectingAll, setSelectingAll] = useState(false);
  const selectAllAbort: RefObject<AbortController | null> = useRef(null);

  const selectAll = useCallback(async () => {
    setSelectingAll(true);
    selectAllAbort.current?.abort();
    const ctrl = new AbortController();
    selectAllAbort.current = ctrl;
    try {
      // API caps at 500 per request — paginate to collect all IDs
      const PAGE = 500;
      const allIds: string[] = [];
      let skip = 0;
      let done = false;
      while (!done) {
        const params: Record<string, string> = {
          select: "_id",
          limit: String(PAGE),
          skip: String(skip),
        };
        if (query) params.query = JSON.stringify(query);
        const resp = await apiClient.get<{ _id: string }[]>(
          config.endpoint,
          { params, signal: ctrl.signal },
        );
        for (const item of resp.data) {
          allIds.push(item._id);
        }
        if (resp.data.length < PAGE) {
          done = true;
        } else {
          skip += PAGE;
        }
      }
      setSelectedIds(new Set(allIds));
    } catch (err) {
      if ((err as Error).name !== "CanceledError") {
        throw err;
      }
    } finally {
      setSelectingAll(false);
    }
  }, [config.endpoint, query]);

  // ── Invert selection (current page only) ──────────────────────────
  const invertSelection = useCallback(() => {
    const items = (listData?.data ?? EMPTY_ARRAY) as T[];
    const next = new Set<string>();
    for (const item of items) {
      if (!selectedIds.has(item._id)) {
        next.add(item._id);
      }
    }
    setSelectedIds(next);
  }, [listData, selectedIds]);

  // Surface whichever error fired first (list or count)
  const error = listError ?? countError ?? null;

  const data = (listData?.data ?? EMPTY_ARRAY) as T[];

  return useMemo(
    () => ({
      data,
      totalCount,
      isLoading: listLoading,
      isFetching: listFetching,
      error,
      pageIndex,
      pageSize,
      onPageChange,
      onPageSizeChange,
      sorting,
      onSortChange,
      searchQuery: searchInput,
      onSearchChange,
      columnFilters,
      onFilterChange,
      selectedIds,
      onRowSelect,
      clearSelection,
      selectAll,
      selectingAll,
      invertSelection,
      refetch,
    }),
    [
      data,
      totalCount,
      listLoading,
      listFetching,
      error,
      pageIndex,
      pageSize,
      onPageChange,
      onPageSizeChange,
      sorting,
      onSortChange,
      searchInput,
      onSearchChange,
      columnFilters,
      onFilterChange,
      selectedIds,
      onRowSelect,
      clearSelection,
      selectAll,
      selectingAll,
      invertSelection,
      refetch,
    ],
  );
}
