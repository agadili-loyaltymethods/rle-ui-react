import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOnSearchChange = vi.fn();

vi.mock("@/features/reference-data/shared/hooks/use-server-table", () => ({
  useServerTable: vi.fn((_config: unknown, additionalQuery: unknown) => ({
    data: [],
    totalCount: 0,
    pageIndex: 0,
    pageSize: 25,
    isLoading: false,
    isFetching: false,
    error: null,
    searchQuery: "",
    onSearchChange: mockOnSearchChange,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    sorting: [],
    onSortChange: vi.fn(),
    columnFilters: [],
    onFilterChange: vi.fn(),
    refetch: vi.fn(),
    _additionalQuery: additionalQuery,
  })),
}));

import { renderHook, act, createWrapper } from "@/test-utils";
import { useAuditLogTable } from "./use-audit-logs";
import { useServerTable } from "@/features/reference-data/shared/hooks/use-server-table";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuditLogTable", () => {
  it("returns table data and filter helpers", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    expect(result.current.data).toEqual([]);
    expect(result.current.filters).toBeDefined();
    expect(result.current.setFilter).toBeTypeOf("function");
    expect(result.current.clearAllFilters).toBeTypeOf("function");
    expect(result.current.filterByBatch).toBeTypeOf("function");
  });

  it("initializes with empty filters", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    expect(result.current.filters).toEqual({
      entityType: "",
      action: "",
      source: "",
      datePreset: "all",
      dateFrom: "",
      dateTo: "",
      batchId: "",
    });
  });

  it("passes undefined additionalQuery when filters are empty", () => {
    renderHook(() => useAuditLogTable(), { wrapper });
    expect(vi.mocked(useServerTable)).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
    );
  });

  it("sets a filter via setFilter", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("entityType", "Program");
    });
    expect(result.current.filters.entityType).toBe("Program");
  });

  it("builds additionalQuery when entityType filter is set", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("entityType", "Rule");
    });
    const lastCall = vi.mocked(useServerTable).mock.calls.at(-1)!;
    expect(lastCall[1]).toEqual({ entityType: "Rule" });
  });

  it("builds additionalQuery with timestamp range for date filters", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("dateFrom", "2026-01-01");
      result.current.setFilter("dateTo", "2026-01-31");
    });
    const lastCall = vi.mocked(useServerTable).mock.calls.at(-1)!;
    expect(lastCall[1]).toEqual({
      timestamp: {
        $gte: "2026-01-01T00:00:00.000Z",
        $lte: "2026-01-31T23:59:59.999Z",
      },
    });
  });

  it("includes batchId in additionalQuery", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("batchId", "batch-123");
    });
    const lastCall = vi.mocked(useServerTable).mock.calls.at(-1)!;
    expect(lastCall[1]).toEqual({ batchId: "batch-123" });
  });

  it("clearAllFilters resets all filters to empty", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("entityType", "Program");
      result.current.setFilter("action", "DELETE");
      result.current.setFilter("source", "API");
    });
    act(() => {
      result.current.clearAllFilters();
    });
    expect(result.current.filters).toEqual({
      entityType: "",
      action: "",
      source: "",
      datePreset: "all",
      dateFrom: "",
      dateTo: "",
      batchId: "",
    });
  });

  it("filterByBatch clears all filters and sets batchId", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("entityType", "Program");
      result.current.setFilter("action", "UPDATE");
    });
    act(() => {
      result.current.filterByBatch("batch-456");
    });
    expect(result.current.filters).toEqual({
      entityType: "",
      action: "",
      source: "",
      datePreset: "all",
      dateFrom: "",
      dateTo: "",
      batchId: "batch-456",
    });
  });

  it("filterByBatch clears the search query", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.filterByBatch("batch-789");
    });
    expect(mockOnSearchChange).toHaveBeenCalledWith("");
  });

  it("combines multiple filters in additionalQuery", () => {
    const { result } = renderHook(() => useAuditLogTable(), { wrapper });
    act(() => {
      result.current.setFilter("entityType", "Rule");
      result.current.setFilter("action", "CREATE");
      result.current.setFilter("source", "API");
    });
    const lastCall = vi.mocked(useServerTable).mock.calls.at(-1)!;
    expect(lastCall[1]).toEqual({
      entityType: "Rule",
      action: "CREATE",
      source: "API",
    });
  });
});
