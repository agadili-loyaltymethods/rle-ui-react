import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { AuditChangeList } from "./audit-change-list";
import type { AuditChange } from "../types/audit-log";

describe("AuditChangeList", () => {
  it("shows empty message when changes array is empty", () => {
    render(<AuditChangeList changes={[]} action="UPDATE" />);
    expect(screen.getByText("auditLogs.snapshot.noFieldChanges")).toBeInTheDocument();
  });

  it("shows empty message when changes is null-ish", () => {
    render(<AuditChangeList changes={null as unknown as AuditChange[]} action="UPDATE" />);
    expect(screen.getByText("auditLogs.snapshot.noFieldChanges")).toBeInTheDocument();
  });

  it("renders field names for UPDATE action", () => {
    const changes: AuditChange[] = [
      { field: "name", oldValue: "Old", newValue: "New" },
      { field: "status", oldValue: "active", newValue: "inactive" },
    ];
    render(<AuditChangeList changes={changes} action="UPDATE" />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
  });

  it("renders old and new values for UPDATE action", () => {
    const changes: AuditChange[] = [
      { field: "name", oldValue: "Old Name", newValue: "New Name" },
    ];
    render(<AuditChangeList changes={changes} action="UPDATE" />);
    expect(screen.getByText("Old Name")).toBeInTheDocument();
    expect(screen.getByText("New Name")).toBeInTheDocument();
  });

  it("hides old value column for CREATE action", () => {
    const changes: AuditChange[] = [
      { field: "name", oldValue: null, newValue: "Created" },
    ];
    render(<AuditChangeList changes={changes} action="CREATE" />);
    expect(screen.queryByText("Old Value")).not.toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("hides new value column for DELETE action", () => {
    const changes: AuditChange[] = [
      { field: "name", oldValue: "Deleted", newValue: null },
    ];
    render(<AuditChangeList changes={changes} action="DELETE" />);
    expect(screen.queryByText("New Value")).not.toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("renders null/undefined values as em dash", () => {
    const changes: AuditChange[] = [
      { field: "name", oldValue: null, newValue: undefined },
    ];
    render(<AuditChangeList changes={changes} action="UPDATE" />);
    const dashes = screen.getAllByText("\u2014");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders complex values as JSON", () => {
    const changes: AuditChange[] = [
      { field: "config", oldValue: { a: 1 }, newValue: { a: 2 } },
    ];
    render(<AuditChangeList changes={changes} action="UPDATE" />);
    expect(screen.getByText(/\"a\": 1/)).toBeInTheDocument();
    expect(screen.getByText(/\"a\": 2/)).toBeInTheDocument();
  });
});
