import { describe, it, expect } from "vitest";
import { renderHook, act } from "@/test-utils";
import { useClientTable, renderSortIcon } from "./use-client-table";

interface TestItem {
  id: string;
  name: string;
  age: number;
}

const testItems: TestItem[] = [
  { id: "1", name: "Charlie", age: 30 },
  { id: "2", name: "Alice", age: 25 },
  { id: "3", name: "Bob", age: 35 },
  { id: "4", name: "Diana", age: 28 },
];

function getDisplayValue(item: TestItem, key: string): string {
  return String(item[key as keyof TestItem] ?? "");
}

function getSortValue(item: TestItem, key: string): string | number {
  const val = item[key as keyof TestItem];
  return typeof val === "number" ? val : String(val ?? "");
}

describe("useClientTable", () => {
  it("returns all expected properties", () => {
    const { result } = renderHook(() =>
      useClientTable({
        items: testItems,
        getDisplayValue,
        getSortValue,
      }),
    );

    expect(result.current.sort).toBeNull();
    expect(typeof result.current.toggleSort).toBe("function");
    expect(result.current.columnFilters).toEqual({});
    expect(typeof result.current.setColumnFilter).toBe("function");
    expect(result.current.filtersVisible).toBe(false);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.processedItems).toHaveLength(4);
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
  });

  it("returns all items as paginatedItems when within page size", () => {
    const { result } = renderHook(() =>
      useClientTable({
        items: testItems,
        getDisplayValue,
        getSortValue,
      }),
    );

    expect(result.current.paginatedItems).toHaveLength(4);
  });

  describe("sorting", () => {
    it("toggleSort cycles null -> asc -> desc -> null", () => {
      const { result } = renderHook(() =>
        useClientTable({
          items: testItems,
          getDisplayValue,
          getSortValue,
        }),
      );

      expect(result.current.sort).toBeNull();

      act(() => result.current.toggleSort("name"));
      expect(result.current.sort).toEqual({ key: "name", dir: "asc" });

      act(() => result.current.toggleSort("name"));
      expect(result.current.sort).toEqual({ key: "name", dir: "desc" });

      act(() => result.current.toggleSort("name"));
      expect(result.current.sort).toBeNull();
    });

    it("sorts items ascending by name", () => {
      const { result } = renderHook(() =>
        useClientTable({
          items: testItems,
          getDisplayValue,
          getSortValue,
        }),
      );

      act(() => result.current.toggleSort("name"));

      const names = result.current.processedItems.map((i) => i.name);
      expect(names).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
    });

    it("sorts items descending by age", () => {
      const { result } = renderHook(() =>
        useClientTable({
          items: testItems,
          getDisplayValue,
          getSortValue,
        }),
      );

      act(() => result.current.toggleSort("age"));
      act(() => result.current.toggleSort("age"));

      const ages = result.current.processedItems.map((i) => i.age);
      expect(ages).toEqual([35, 30, 28, 25]);
    });
  });

  describe("filtering", () => {
    it("filters items by column value", () => {
      const { result } = renderHook(() =>
        useClientTable({
          items: testItems,
          getDisplayValue,
          getSortValue,
        }),
      );

      act(() => result.current.setColumnFilter("name", "ali"));
      expect(result.current.processedItems).toHaveLength(1);
      expect(result.current.processedItems[0]!.name).toBe("Alice");
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("clearAllFilters clears all filters and hides filter row", () => {
      const { result } = renderHook(() =>
        useClientTable({
          items: testItems,
          getDisplayValue,
          getSortValue,
        }),
      );

      act(() => {
        result.current.setColumnFilter("name", "bob");
        result.current.setFiltersVisible(true);
      });

      act(() => result.current.clearAllFilters());
      expect(result.current.columnFilters).toEqual({});
      expect(result.current.filtersVisible).toBe(false);
      expect(result.current.processedItems).toHaveLength(4);
    });
  });

  describe("pagination", () => {
    it("paginates items correctly", () => {
      const { result } = renderHook(() =>
        useClientTable({
          items: testItems,
          getDisplayValue,
          getSortValue,
          pageSize: 2,
        }),
      );

      expect(result.current.paginatedItems).toHaveLength(2);
      expect(result.current.pageSize).toBe(2);

      act(() => result.current.setPage(2));
      expect(result.current.paginatedItems).toHaveLength(2);
    });
  });
});

describe("renderSortIcon", () => {
  it("returns an icon element for asc sort", () => {
    const icon = renderSortIcon("name", { key: "name", dir: "asc" });
    expect(icon).not.toBeNull();
  });

  it("returns an icon element for desc sort", () => {
    const icon = renderSortIcon("name", { key: "name", dir: "desc" });
    expect(icon).not.toBeNull();
  });

  it("returns a default icon when sort is on a different column", () => {
    const icon = renderSortIcon("name", { key: "age", dir: "asc" });
    expect(icon).not.toBeNull();
  });

  it("returns a default icon when sort is null", () => {
    const icon = renderSortIcon("name", null);
    expect(icon).not.toBeNull();
  });
});
