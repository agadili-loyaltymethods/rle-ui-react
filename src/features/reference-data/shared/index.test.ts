import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("reference-data/shared barrel export", () => {
  it("re-exports hooks", async () => {
    const mod = await import("./index");
    expect(mod.useEntitySchema).toBeDefined();
    expect(mod.useServerTable).toBeDefined();
    expect(mod.useBulkOperations).toBeDefined();
  });

  it("re-exports components", async () => {
    const mod = await import("./index");
    expect(mod.ServerTablePage).toBeDefined();
    expect(mod.EntityFormDrawer).toBeDefined();
    expect(mod.BulkEditDrawer).toBeDefined();
    expect(mod.BulkActionBar).toBeDefined();
    expect(mod.ExtFieldRenderer).toBeDefined();
    expect(mod.ExtTabBody).toBeDefined();
  });

  it("re-exports utility functions", async () => {
    const mod = await import("./index");
    expect(mod.buildColumns).toBeDefined();
    expect(mod.getColumnValue).toBeDefined();
    expect(mod.formatCellValue).toBeDefined();
    expect(mod.buildFormTabs).toBeDefined();
    expect(mod.buildFieldTabMap).toBeDefined();
    expect(mod.firstTabWithError).toBeDefined();
    expect(mod.tabErrorCounts).toBeDefined();
    expect(mod.flattenRhfErrors).toBeDefined();
    expect(mod.buildEntityFormZodSchema).toBeDefined();
    expect(mod.buildEntityDefaultValues).toBeDefined();
    expect(mod.flattenNested).toBeDefined();
    expect(mod.unflattenDotPaths).toBeDefined();
    expect(mod.summarizeNested).toBeDefined();
  });
});
