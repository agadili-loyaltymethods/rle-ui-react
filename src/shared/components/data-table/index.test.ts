import { describe, it, expect } from "vitest";

describe("data-table barrel export", () => {
  it("re-exports all data table components", async () => {
    const mod = await import("./index");
    expect(mod.DataTable).toBeDefined();
    expect(mod.DataTableColumnHeader).toBeDefined();
    expect(mod.DataTableRowActions).toBeDefined();
    expect(mod.DataTableFilter).toBeDefined();
    expect(mod.DataTablePagination).toBeDefined();
    expect(mod.DataTableToolbar).toBeDefined();
    expect(mod.DataTableSkeleton).toBeDefined();
    expect(mod.DataTableEmpty).toBeDefined();
  });
});
