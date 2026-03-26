/**
 * Reusable server-side data table primitive.
 *
 * Extracted from ServerTablePage — renders column headers with sort/drag-reorder,
 * column filter row, row rendering with cell formatting, selection checkboxes
 * with Shift/Ctrl+click multi-select, skeleton loading, and empty state.
 *
 * Consumers provide data, state hooks, and optional custom cell renderers.
 */

import { useState, useCallback, useMemo, useRef, useEffect, type ReactNode, type JSX } from "react";
import { createPortal } from "react-dom";
import {
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  X,
  Settings,
} from "lucide-react";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { ColumnDescriptor, ColumnType } from "@/features/reference-data/shared/lib/build-columns";
import { getColumnValue, formatCellValue } from "@/features/reference-data/shared/lib/build-columns";
import type { ChooserState } from "@/shared/hooks/use-column-chooser";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServerTableProps<T extends { _id: string }> {
  data: T[];
  activeColumns: ColumnDescriptor[];
  sorting: SortingState;
  onSortChange: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  onFilterChange: (filters: ColumnFiltersState) => void;
  selectedIds?: Set<string>;
  onRowSelect?: (selection: Record<string, boolean>) => void;
  /** When false, hides the row-selection checkbox column. Defaults to true. */
  selectable?: boolean;
  onRowClick?: (entity: T) => void;
  renderRowActions?: (entity: T) => ReactNode;
  onEdit?: (entity: T) => void;
  onDelete?: (id: string) => void;
  cellRenderers?: Record<string, (value: unknown, row: T) => ReactNode>;
  chooser: ChooserState;
  isLoading?: boolean;
  isFetching?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  testIdPrefix?: string;
}

// ── Status badge variant mapping ──────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "success" | "error" | "warning" | "info" | "secondary"> = {
  active: "success",
  inactive: "error",
  expired: "error",
  disabled: "error",
  pending: "warning",
  future: "info",
  draft: "secondary",
};

function getStatusVariant(status: string): "success" | "error" | "warning" | "info" | "secondary" {
  return STATUS_VARIANT[status.toLowerCase()] ?? "secondary";
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({
  colKey,
  sorting,
}: {
  colKey: string;
  sorting: { id: string; desc: boolean }[];
}) {
  const active = sorting[0];
  if (active?.id === colKey) {
    return active.desc ? (
      <ArrowDown className="h-3 w-3" />
    ) : (
      <ArrowUp className="h-3 w-3" />
    );
  }
  return <ArrowUpDown className="h-3 w-3 text-foreground-tertiary" />;
}

const cellCls =
  "h-14 px-3.5 py-2 align-middle text-[13px] text-foreground whitespace-nowrap";

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_SET = new Set<string>();
const NOOP_SELECT = () => {};

export function ServerTable<T extends { _id: string } & Record<string, unknown>>({
  data,
  activeColumns,
  sorting,
  onSortChange,
  columnFilters,
  onFilterChange,
  selectedIds = EMPTY_SET,
  onRowSelect = NOOP_SELECT,
  selectable = true,
  onRowClick,
  renderRowActions,
  onEdit,
  onDelete,
  cellRenderers,
  chooser,
  isLoading,
  isFetching,
  emptyMessage = "No items found",
  emptyAction,
  testIdPrefix,
}: ServerTableProps<T>): JSX.Element {
  const hasActions = !!(renderRowActions || onEdit || onDelete);

  // ── Column filter UI state ─────────────────────────────────────────
  const [filtersVisible, setFiltersVisible] = useState(false);

  type OpFilter = { op: string; value: string };

  // Unwrap negation wrapper to get the raw filter value
  const unwrap = (val: unknown): { inner: unknown; negated: boolean } => {
    if (typeof val === "object" && val !== null && "__negated" in val) {
      return { inner: (val as unknown as { __inner: unknown }).__inner, negated: true };
    }
    return { inner: val, negated: false };
  };

  const filterMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of columnFilters) {
      const { inner } = unwrap(f.value);
      if (typeof inner === "string") map[f.id] = inner;
      // ObjectId wrapper from populated reference context menu filter
      else if (typeof inner === "object" && inner !== null && "__objectId" in inner) {
        map[f.id] = (inner as unknown as { __display: string }).__display;
      }
    }
    return map;
  }, [columnFilters]);

  const opFilterMap = useMemo(() => {
    const map: Record<string, OpFilter> = {};
    for (const f of columnFilters) {
      const { inner } = unwrap(f.value);
      if (typeof inner === "object" && inner !== null && "op" in inner) {
        map[f.id] = inner as OpFilter;
      }
    }
    return map;
  }, [columnFilters]);

  // Track which columns have negation active
  const [negatedCols, setNegatedCols] = useState<Set<string>>(new Set());

  const toggleNegation = useCallback(
    (colKey: string) => {
      // Compute the new negation state before updating either piece of state
      const willNegate = !negatedCols.has(colKey);

      setNegatedCols((prev) => {
        const next = new Set(prev);
        if (next.has(colKey)) next.delete(colKey);
        else next.add(colKey);
        return next;
      });

      // Re-wrap existing filter value with updated negation
      const existing = columnFilters.find((f) => f.id === colKey);
      if (existing) {
        const { inner } = unwrap(existing.value);
        const next = columnFilters.filter((f) => f.id !== colKey);
        const wrapped = willNegate
          ? { __negated: true, __inner: inner }
          : inner;
        next.push({ id: colKey, value: wrapped as string });
        onFilterChange(next);
      }
    },
    [columnFilters, negatedCols, onFilterChange],
  );

  const hasActiveFilters = columnFilters.length > 0;

  const setColumnFilter = useCallback(
    (colKey: string, value: string) => {
      const next = columnFilters.filter((f) => f.id !== colKey);
      if (value.trim()) {
        const wrapped = negatedCols.has(colKey)
          ? { __negated: true, __inner: value }
          : value;
        next.push({ id: colKey, value: wrapped as string });
      }
      onFilterChange(next);
    },
    [columnFilters, negatedCols, onFilterChange],
  );

  const setOpFilter = useCallback(
    (colKey: string, op: string, value: string) => {
      const next = columnFilters.filter((f) => f.id !== colKey);
      if (value) {
        const inner = { op, value };
        const wrapped = negatedCols.has(colKey)
          ? { __negated: true, __inner: inner }
          : inner;
        next.push({ id: colKey, value: wrapped as unknown as string });
      }
      onFilterChange(next);
    },
    [columnFilters, negatedCols, onFilterChange],
  );

  // Track operator choices per column (persists even when value is cleared)
  const [opChoices, setOpChoices] = useState<Record<string, string>>({});

  const clearAllFilters = useCallback(() => {
    onFilterChange([]);
    setOpChoices({});
    setNegatedCols(new Set());
  }, [onFilterChange]);

  // ── Right-click context menu for cell filtering ──────────────────
  type CtxMenu = {
    x: number;
    y: number;
    colKey: string;
    colType: ColumnType;
    rawValue: unknown;
    displayValue: string;
  };
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const handleCellContextMenu = useCallback(
    (e: React.MouseEvent, col: ColumnDescriptor, value: unknown) => {
      if (col.filterable === false || value == null || value === "") return;
      e.preventDefault();
      e.stopPropagation();
      // Read displayed text from the DOM so custom cell renderers (e.g. user) are respected
      const td = (e.target as HTMLElement).closest("td");
      const domText = td?.textContent?.trim() ?? "";
      setCtxMenu({
        x: e.clientX,
        y: e.clientY,
        colKey: col.key,
        colType: col.type,
        rawValue: value,
        displayValue: domText || formatCellValue(value, col.type),
      });
    },
    [],
  );

  const applyCtxFilter = useCallback(
    (action: { op?: string; negate: boolean }) => {
      if (!ctxMenu) return;
      const { colKey, colType, rawValue } = ctxMenu;

      // Ensure filter row is visible
      setFiltersVisible(true);

      // Set or clear negation for this column
      setNegatedCols((prev) => {
        const next = new Set(prev);
        if (action.negate) next.add(colKey);
        else next.delete(colKey);
        return next;
      });

      if (colType === "date" || colType === "date-time" || colType === "number" || colType === "integer") {
        // Extract the raw string/number value for operator filters
        let filterVal: string;
        if (colType === "date" || colType === "date-time") {
          // Extract YYYY-MM-DD from ISO string without timezone conversion.
          // Prefer slicing the raw ISO string directly to avoid UTC shift via new Date().
          const raw = String(rawValue);
          const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
          if (isoMatch) {
            filterVal = isoMatch[1]!;
          } else {
            // Fallback: parse and extract in local timezone
            const d = new Date(raw);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            filterVal = isNaN(d.getTime()) ? raw : `${y}-${m}-${day}`;
          }
        } else {
          filterVal = String(rawValue);
        }
        const op = action.op ?? "=";
        setOpChoices((prev) => ({ ...prev, [colKey]: op }));
        // Use the inner setOpFilter logic — apply negation wrapping
        const inner = { op, value: filterVal };
        const wrapped = action.negate ? { __negated: true, __inner: inner } : inner;
        const next = columnFilters.filter((f) => f.id !== colKey);
        next.push({ id: colKey, value: wrapped as unknown as string });
        onFilterChange(next);
      } else {
        // Text/string filter
        // For populated references (objects with _id), store both _id and display name
        const isPopulated = typeof rawValue === "object" && rawValue !== null && "_id" in rawValue;
        const filterVal = isPopulated
          ? { __objectId: (rawValue as { _id: string })._id, __display: ctxMenu.displayValue }
          : String(rawValue);
        const wrapped = action.negate ? { __negated: true, __inner: filterVal } : filterVal;
        const next = columnFilters.filter((f) => f.id !== colKey);
        next.push({ id: colKey, value: wrapped as string });
        onFilterChange(next);
      }

      setCtxMenu(null);
    },
    [ctxMenu, columnFilters, onFilterChange],
  );

  // Close context menu on click-away, scroll, or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  // ── Selection helpers ─────────────────────────────────────────────
  const lastClickedId = useRef<string | null>(null);

  const allSelected =
    data.length > 0 && data.every((r) => selectedIds.has(r._id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onRowSelect({});
    } else {
      const selection: Record<string, boolean> = {};
      for (const item of data) {
        selection[item._id] = true;
      }
      onRowSelect(selection);
    }
  }, [allSelected, data, onRowSelect]);

  const handleSelectRow = useCallback(
    (id: string, e: React.MouseEvent) => {
      const ids = data.map((r) => r._id);

      if (e.shiftKey && lastClickedId.current) {
        const anchorIdx = ids.indexOf(lastClickedId.current);
        const clickIdx = ids.indexOf(id);
        if (anchorIdx !== -1 && clickIdx !== -1) {
          const start = Math.min(anchorIdx, clickIdx);
          const end = Math.max(anchorIdx, clickIdx);
          const next: Record<string, boolean> = {};
          for (const existingId of selectedIds) {
            next[existingId] = true;
          }
          for (let i = start; i <= end; i++) {
            const rowId = ids[i];
            if (rowId) next[rowId] = true;
          }
          onRowSelect(next);
          lastClickedId.current = id;
          return;
        }
      }

      const next: Record<string, boolean> = {};
      for (const existingId of selectedIds) {
        next[existingId] = true;
      }
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      onRowSelect(next);
      lastClickedId.current = id;
    },
    [data, selectedIds, onRowSelect],
  );

  // ── Sort handler ──────────────────────────────────────────────────
  const handleToggleSort = useCallback(
    (key: string) => {
      const current = sorting[0];
      if (current?.id === key) {
        if (current.desc) {
          onSortChange([]);
        } else {
          onSortChange([{ id: key, desc: true }]);
        }
      } else {
        onSortChange([{ id: key, desc: false }]);
      }
    },
    [sorting, onSortChange],
  );

  // ── Render helpers ─────────────────────────────────────────────────
  const skeletonRows = useMemo(
    () => (isLoading ? Array.from({ length: 5 }, (_, i) => i) : null),
    [isLoading],
  );

  const isRefetching = isFetching && !isLoading;
  const colSpan = activeColumns.length + (selectable ? 1 : 0) + 1;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="min-w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-page">
              {selectable && (
                <th className="z-[4] h-12 w-9 px-1.5 text-center bg-page shadow-[2px_0_4px_rgba(0,0,0,0.06)] sticky left-0 border-b border-border">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    data-testid={testIdPrefix ? `${testIdPrefix}-select-all` : "server-table-select-all"}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded-sm border-border-strong accent-brand cursor-pointer"
                  />
                </th>
              )}

              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "z-[3] h-12 px-3.5 text-left text-[11px] font-semibold text-foreground-muted uppercase tracking-[0.5px] whitespace-nowrap select-none bg-page border-b border-border",
                    col.sortable && "cursor-pointer",
                    sorting[0]?.id === col.key && "text-foreground",
                    chooser.dragOverCol === col.key && "border-l-2 border-brand",
                  )}
                  draggable
                  onDragStart={() => chooser.handleDragStart(col.key)}
                  onDragOver={(e) => chooser.handleDragOver(e, col.key)}
                  onDrop={() => chooser.handleDrop(col.key)}
                  onDragEnd={chooser.handleDragEnd}
                  onClick={() => col.sortable && handleToggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <SortIcon colKey={col.key} sorting={sorting} />
                    )}
                  </span>
                </th>
              ))}

              <th className="sticky right-0 z-[4] h-12 w-[88px] px-2 text-right bg-page border-b border-border shadow-[-2px_0_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-end gap-0.5">
                  <Button
                    ref={chooser.btnRef}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    title="Choose columns"
                    onClick={chooser.openChooser}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 cursor-pointer",
                      hasActiveFilters && "text-brand",
                    )}
                    title={filtersVisible ? "Hide filters" : "Show filters"}
                    onClick={() => {
                      if (filtersVisible && hasActiveFilters) {
                        clearAllFilters();
                      } else {
                        setFiltersVisible((v) => !v);
                      }
                    }}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </th>
            </tr>

            {/* Filter row */}
            {filtersVisible && (
              <tr>
                {selectable && (
                  <th className="z-[4] sticky left-0 h-10 w-9 bg-card shadow-[2px_0_4px_rgba(0,0,0,0.06)] border-b border-border" />
                )}
                {activeColumns.map((col) => (
                  <th
                    key={col.key}
                    className="z-[3] h-10 px-1.5 bg-card border-b border-border"
                  >
                    {col.filterable !== false && (col.cellRenderer === "user" || col.cellRenderer === "named-ref" ? (
                      /* Populated ref columns — read-only, only settable via right-click context menu */
                      <div className="flex items-center gap-0.5">
                        {filterMap[col.key] ? (
                          <>
                            <button
                              type="button"
                              data-testid={testIdPrefix ? `${testIdPrefix}-filter-negate-${col.key}` : `filter-negate-${col.key}`}
                              aria-label={negatedCols.has(col.key) ? `Remove negation for ${col.label}` : `Negate ${col.label} filter`}
                              title={negatedCols.has(col.key) ? "Negated — click to match" : "Click to negate (NOT)"}
                              className={cn(
                                "flex h-7 shrink-0 items-center justify-center rounded-[6px] border px-1 text-[10px] font-bold cursor-pointer transition-colors",
                                negatedCols.has(col.key)
                                  ? "border-error bg-error/10 text-error"
                                  : "border-border bg-page text-foreground-muted hover:border-foreground-muted",
                              )}
                              onClick={() => toggleNegation(col.key)}
                            >
                              NOT
                            </button>
                            <span className="flex-1 h-7 px-2 flex items-center border border-border rounded-[6px] bg-subtle text-caption text-foreground truncate">
                              {filterMap[col.key]}
                            </span>
                            <button
                              type="button"
                              data-testid={testIdPrefix ? `${testIdPrefix}-filter-clear-${col.key}` : `filter-clear-${col.key}`}
                              aria-label={`Clear ${col.label} filter`}
                              className="flex h-7 w-5 shrink-0 items-center justify-center text-foreground-muted hover:text-foreground cursor-pointer"
                              title="Clear filter"
                              onClick={() => setColumnFilter(col.key, "")}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <span className="flex-1 h-7 px-2 flex items-center border border-transparent rounded-[6px] text-caption text-foreground-tertiary italic">
                            Right-click to filter
                          </span>
                        )}
                      </div>
                    ) : col.type === "date" || col.type === "number" ? (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          data-testid={testIdPrefix ? `${testIdPrefix}-filter-negate-${col.key}` : `filter-negate-${col.key}`}
                          aria-label={negatedCols.has(col.key) ? `Remove negation for ${col.label}` : `Negate ${col.label} filter`}
                          title={negatedCols.has(col.key) ? "Negated — click to match" : "Click to negate (NOT)"}
                          className={cn(
                            "flex h-7 shrink-0 items-center justify-center rounded-[6px] border px-1 text-[10px] font-bold cursor-pointer transition-colors",
                            negatedCols.has(col.key)
                              ? "border-error bg-error/10 text-error"
                              : "border-border bg-page text-foreground-muted hover:border-foreground-muted",
                          )}
                          onClick={() => toggleNegation(col.key)}
                        >
                          NOT
                        </button>
                        <select
                          data-testid={testIdPrefix ? `${testIdPrefix}-filter-op-${col.key}` : `filter-op-${col.key}`}
                          aria-label={`${col.label} filter operator`}
                          className="h-7 w-12 shrink-0 border border-border rounded-[6px] bg-page text-xs text-foreground cursor-pointer focus:outline-none focus:border-brand"
                          value={opChoices[col.key] ?? opFilterMap[col.key]?.op ?? "="}
                          onChange={(e) => {
                            const op = e.target.value;
                            setOpChoices((prev) => ({ ...prev, [col.key]: op }));
                            const curVal = opFilterMap[col.key]?.value ?? "";
                            if (curVal) setOpFilter(col.key, op, curVal);
                          }}
                        >
                          <option value="=">=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&ge;</option>
                          <option value="<=">&le;</option>
                        </select>
                        <input
                          type={col.type === "date" ? "date" : "number"}
                          data-testid={testIdPrefix ? `${testIdPrefix}-filter-value-${col.key}` : `filter-value-${col.key}`}
                          aria-label={`${col.label} filter value`}
                          className="min-w-0 flex-1 h-7 px-1.5 border border-border rounded-[6px] bg-page text-xs text-foreground font-normal focus:outline-none focus:border-brand"
                          value={opFilterMap[col.key]?.value ?? ""}
                          onChange={(e) => {
                            const op = opChoices[col.key] ?? opFilterMap[col.key]?.op ?? "=";
                            setOpFilter(col.key, op, e.target.value);
                          }}
                        />
                        {opFilterMap[col.key]?.value && (
                          <button
                            type="button"
                            data-testid={testIdPrefix ? `${testIdPrefix}-filter-clear-${col.key}` : `filter-clear-${col.key}`}
                            aria-label={`Clear ${col.label} filter`}
                            className="flex h-7 w-5 shrink-0 items-center justify-center text-foreground-muted hover:text-foreground cursor-pointer"
                            title="Clear filter"
                            onClick={() => {
                              setOpFilter(col.key, "=", "");
                              setOpChoices((prev) => {
                                const next = { ...prev };
                                delete next[col.key];
                                return next;
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          data-testid={testIdPrefix ? `${testIdPrefix}-filter-negate-${col.key}` : `filter-negate-${col.key}`}
                          aria-label={negatedCols.has(col.key) ? `Remove negation for ${col.label}` : `Negate ${col.label} filter`}
                          title={negatedCols.has(col.key) ? "Negated — click to match" : "Click to negate (NOT)"}
                          className={cn(
                            "flex h-7 shrink-0 items-center justify-center rounded-[6px] border px-1 text-[10px] font-bold cursor-pointer transition-colors",
                            negatedCols.has(col.key)
                              ? "border-error bg-error/10 text-error"
                              : "border-border bg-page text-foreground-muted hover:border-foreground-muted",
                          )}
                          onClick={() => toggleNegation(col.key)}
                        >
                          NOT
                        </button>
                        <input
                          type="text"
                          data-testid={testIdPrefix ? `${testIdPrefix}-filter-text-${col.key}` : `filter-text-${col.key}`}
                          aria-label={`Filter ${col.label}`}
                          className="min-w-0 flex-1 h-7 px-2 border border-border rounded-[6px] bg-page text-xs text-foreground font-normal placeholder:text-foreground-tertiary placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-brand"
                          placeholder={`Filter ${col.label.toLowerCase()}...`}
                          value={filterMap[col.key] ?? ""}
                          onChange={(e) =>
                            setColumnFilter(col.key, e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </th>
                ))}
                <th className="sticky right-0 z-[4] h-10 bg-card shadow-[-2px_0_4px_rgba(0,0,0,0.06)] border-b border-border px-2 text-right">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      title="Clear all filters"
                      onClick={() => {
                        clearAllFilters();
                        setFiltersVisible(false);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </th>
              </tr>
            )}
          </thead>
          <tbody
            className={cn(
              "transition-opacity duration-150",
              isRefetching && "opacity-50",
            )}
          >
            {skeletonRows?.map((i) => (
              <tr key={`skeleton-${i}`} className="border-b border-subtle">
                {selectable && (
                  <td className="sticky left-0 z-[1] w-9 px-1.5 py-2 text-center bg-card shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                    <div className="h-4 w-4 rounded bg-subtle animate-pulse" />
                  </td>
                )}
                {activeColumns.map((col) => (
                  <td
                    key={col.key}
                    className="h-14 px-3.5 py-2 align-middle"
                  >
                    <div className="h-4 w-20 rounded bg-subtle animate-pulse" />
                  </td>
                ))}
                <td className="sticky right-0 z-[1] w-[88px] px-2 py-2 bg-card shadow-[-2px_0_4px_rgba(0,0,0,0.06)]">
                  <div className="h-4 w-12 rounded bg-subtle animate-pulse ml-auto" />
                </td>
              </tr>
            ))}

            {!skeletonRows &&
              data.map((entity) => {
                const id = entity._id;
                const selected = selectable && selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      "border-b border-subtle cursor-pointer transition-colors duration-150 outline-none",
                      selected
                        ? "bg-[var(--table-selected)] hover:bg-[var(--table-selected-hover)]"
                        : "hover:bg-subtle",
                    )}
                    data-testid={
                      testIdPrefix ? `${testIdPrefix}-row-${id}` : undefined
                    }
                    tabIndex={0}
                    onClick={() => onRowClick?.(entity)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick?.(entity);
                      }
                    }}
                  >
                    {selectable && (
                      <td
                        className={cn(
                          "sticky left-0 z-[1] w-9 px-1.5 py-2 text-center shadow-[2px_0_4px_rgba(0,0,0,0.06)] outline-none select-none",
                          selected
                            ? "bg-[var(--table-selected)]"
                            : "bg-card",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(id, e);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          readOnly
                          data-testid={testIdPrefix ? `${testIdPrefix}-select-row-${id}` : `select-row-${id}`}
                          aria-label={`Select row ${id}`}
                          className="h-4 w-4 rounded-sm border-border-strong accent-brand cursor-pointer pointer-events-none"
                        />
                      </td>
                    )}

                    {activeColumns.map((col) => {
                      const value = getColumnValue(
                        entity as Record<string, unknown>,
                        col,
                      );
                      const ctxHandler = (e: React.MouseEvent) =>
                        handleCellContextMenu(e, col, value);
                      // Custom cell renderer
                      if (col.cellRenderer && cellRenderers?.[col.cellRenderer]) {
                        return (
                          <td key={col.key} className={cellCls} onContextMenu={ctxHandler}>
                            {cellRenderers[col.cellRenderer]!(value, entity)}
                          </td>
                        );
                      }
                      // Built-in user display name (populated ref)
                      if (col.cellRenderer === "user") {
                        let display = "";
                        if (value && typeof value === "object" && "_id" in value) {
                          const u = value as { empName?: string; login?: string; _id: string };
                          display = u.empName || u.login || u._id;
                        } else if (typeof value === "string") {
                          display = value;
                        }
                        return (
                          <td key={col.key} className={cellCls} onContextMenu={ctxHandler}>
                            {display}
                          </td>
                        );
                      }
                      // Built-in named ref (populated ref with name field, e.g. org)
                      if (col.cellRenderer === "named-ref") {
                        let display = "";
                        if (value && typeof value === "object" && "_id" in value) {
                          const ref = value as { name?: string; _id: string };
                          display = ref.name || ref._id;
                        } else if (typeof value === "string") {
                          display = value;
                        }
                        return (
                          <td key={col.key} className={cellCls} onContextMenu={ctxHandler}>
                            {display}
                          </td>
                        );
                      }
                      // Built-in status badge
                      if (col.cellRenderer === "status-badge" && value != null) {
                        return (
                          <td key={col.key} className={cellCls} onContextMenu={ctxHandler}>
                            <Badge variant={getStatusVariant(String(value))}>
                              {String(value)}
                            </Badge>
                          </td>
                        );
                      }
                      // Built-in boolean checkbox (read-only)
                      if (col.type === "boolean") {
                        return (
                          <td key={col.key} className={cn(cellCls, "text-center")} onContextMenu={ctxHandler}>
                            <input
                              type="checkbox"
                              checked={!!value}
                              readOnly
                              tabIndex={-1}
                              data-testid={testIdPrefix ? `${testIdPrefix}-bool-${col.key}-${id}` : `bool-${col.key}-${id}`}
                              className="pointer-events-none h-4 w-4 accent-brand"
                              aria-label={`${col.label}: ${value ? "Yes" : "No"}`}
                            />
                          </td>
                        );
                      }
                      // Generic fallback
                      return (
                        <td key={col.key} className={cellCls} onContextMenu={ctxHandler}>
                          {formatCellValue(value, col.type)}
                        </td>
                      );
                    })}

                    <td
                      className={cn(
                        "sticky right-0 z-[1] w-[88px] px-2 py-2 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]",
                        selected
                          ? "bg-[var(--table-selected)]"
                          : "bg-card",
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderRowActions ? (
                        renderRowActions(entity)
                      ) : hasActions ? (
                        <div className="flex items-center justify-end gap-0.5">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer"
                              title="Edit"
                              onClick={() => onEdit(entity)}
                              data-testid={
                                testIdPrefix
                                  ? `${testIdPrefix}-edit-${id}`
                                  : undefined
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-error hover:text-error hover:bg-[#FEF2F2] cursor-pointer"
                              title="Delete"
                              onClick={() => onDelete(id)}
                              data-testid={
                                testIdPrefix
                                  ? `${testIdPrefix}-delete-${id}`
                                  : undefined
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

            {!skeletonRows && data.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-12 text-center text-body-sm text-foreground-secondary"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span>{emptyMessage}</span>
                    <span className="text-xs text-foreground-tertiary">
                      Try adjusting your filters or search criteria
                    </span>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Right-click filter context menu */}
      {ctxMenu && createPortal(
        <CellFilterMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          colType={ctxMenu.colType}
          displayValue={ctxMenu.displayValue}
          onAction={applyCtxFilter}
        />,
        document.body,
      )}
    </div>
  );
}

// ── Cell filter context menu ──────────────────────────────────────────────────

function CellFilterMenu({
  x,
  y,
  colType,
  displayValue,
  onAction,
}: {
  x: number;
  y: number;
  colType: ColumnType;
  displayValue: string;
  onAction: (action: { op?: string; negate: boolean }) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const truncated = displayValue.length > 24 ? displayValue.slice(0, 24) + "..." : displayValue;
  const isDateOrNumber =
    colType === "date" || colType === "date-time" || colType === "number" || colType === "integer";

  // Clamp position so menu stays within viewport, update on every x/y change
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    // Use requestAnimationFrame so the DOM has rendered and we can measure
    const id = requestAnimationFrame(() => {
      const el = menuRef.current;
      if (!el) { setPos({ left: x, top: y }); return; }
      const rect = el.getBoundingClientRect();
      let left = x;
      let top = y;
      if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
      if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
      if (left < 8) left = 8;
      if (top < 8) top = 8;
      setPos({ left, top });
    });
    return () => cancelAnimationFrame(id);
  }, [x, y]);

  const itemCls =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground hover:bg-subtle cursor-pointer rounded-[4px] transition-colors";
  const separatorCls = "my-1 h-px bg-border";

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] max-w-[280px] rounded-lg border border-border bg-card p-1 shadow-dropdown"
      style={{ left: pos.left, top: pos.top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold text-foreground-muted uppercase tracking-wide truncate">
        {truncated}
      </div>
      <div className={separatorCls} />

      {/* Include / Exclude — all column types */}
      <button className={itemCls} data-testid="ctx-filter-include" aria-label="Filter by this value" onClick={() => onAction({ op: "=", negate: false })}>
        <Filter className="h-3.5 w-3.5 text-brand" />
        <span>Filter by this value</span>
      </button>
      <button className={itemCls} data-testid="ctx-filter-exclude" aria-label="Exclude this value" onClick={() => onAction({ op: "=", negate: true })}>
        <X className="h-3.5 w-3.5 text-error" />
        <span>Exclude this value</span>
      </button>

      {/* Operator-based actions for date / number */}
      {isDateOrNumber && (
        <>
          <div className={separatorCls} />
          <button className={itemCls} data-testid="ctx-filter-gt" aria-label="Greater than" onClick={() => onAction({ op: ">", negate: false })}>
            <span className="w-3.5 text-center text-[13px] font-bold text-foreground-muted">&gt;</span>
            <span>Greater than</span>
          </button>
          <button className={itemCls} data-testid="ctx-filter-lt" aria-label="Less than" onClick={() => onAction({ op: "<", negate: false })}>
            <span className="w-3.5 text-center text-[13px] font-bold text-foreground-muted">&lt;</span>
            <span>Less than</span>
          </button>
          <button className={itemCls} data-testid="ctx-filter-gte" aria-label="Greater than or equal" onClick={() => onAction({ op: ">=", negate: false })}>
            <span className="w-3.5 text-center text-[13px] font-bold text-foreground-muted">&ge;</span>
            <span>Greater than or equal</span>
          </button>
          <button className={itemCls} data-testid="ctx-filter-lte" aria-label="Less than or equal" onClick={() => onAction({ op: "<=", negate: false })}>
            <span className="w-3.5 text-center text-[13px] font-bold text-foreground-muted">&le;</span>
            <span>Less than or equal</span>
          </button>
        </>
      )}
    </div>
  );
}
