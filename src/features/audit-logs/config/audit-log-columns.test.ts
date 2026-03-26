import { describe, it, expect } from "vitest";
import { buildAuditLogColumns } from "./audit-log-columns";

describe("buildAuditLogColumns", () => {
  it("returns an array of column descriptors", () => {
    const columns = buildAuditLogColumns();
    expect(Array.isArray(columns)).toBe(true);
    expect(columns.length).toBeGreaterThan(0);
  });

  it("includes the timestamp column", () => {
    const columns = buildAuditLogColumns();
    const ts = columns.find((c) => c.key === "timestamp");
    expect(ts).toBeDefined();
    expect(ts!.label).toBe("Date/Time");
    expect(ts!.cellRenderer).toBe("date-time");
  });

  it("includes the action column with action-badge renderer", () => {
    const columns = buildAuditLogColumns();
    const action = columns.find((c) => c.key === "action");
    expect(action).toBeDefined();
    expect(action!.cellRenderer).toBe("action-badge");
  });

  it("includes the changes column with change-count renderer", () => {
    const columns = buildAuditLogColumns();
    const changes = columns.find((c) => c.key === "changes");
    expect(changes).toBeDefined();
    expect(changes!.cellRenderer).toBe("change-count");
    expect(changes!.filterable).toBe(false);
  });

  it("marks source column as not visible by default", () => {
    const columns = buildAuditLogColumns();
    const source = columns.find((c) => c.key === "source");
    expect(source).toBeDefined();
    expect(source!.defaultVisible).toBe(false);
  });

  it("marks all columns as sortable", () => {
    const columns = buildAuditLogColumns();
    for (const col of columns) {
      expect(col.sortable).toBe(true);
    }
  });

  it("sets source to core for all columns", () => {
    const columns = buildAuditLogColumns();
    for (const col of columns) {
      expect(col.source).toBe("core");
    }
  });
});
