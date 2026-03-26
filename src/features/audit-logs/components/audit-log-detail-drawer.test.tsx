import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { AuditLogDetailDrawer } from "./audit-log-detail-drawer";
import type { AuditLog } from "../types/audit-log";

function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    _id: "audit-1",
    org: "testorg",
    entityType: "Program",
    entityId: "prog-1",
    entityName: "Test Program",
    action: "UPDATE",
    before: { name: "Old" },
    after: { name: "New" },
    changes: [{ field: "name", oldValue: "Old", newValue: "New" }],
    userId: { _id: "user-1", login: "admin", empName: "Admin User" },
    userName: "admin",
    userRole: "admin",
    timestamp: "2026-03-01T12:00:00Z",
    source: "API",
    version: 1,
    ...overrides,
  };
}

describe("AuditLogDetailDrawer", () => {
  it("renders nothing when auditLog is null", () => {
    const { container } = render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={null}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the action badge and entity type", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog()}
      />,
    );
    expect(screen.getByText("UPDATE")).toBeInTheDocument();
    expect(screen.getByText("Program")).toBeInTheDocument();
  });

  it("renders entity name", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({ entityName: "My Program" })}
      />,
    );
    expect(screen.getByText(/My Program/)).toBeInTheDocument();
  });

  it("displays resolved user name from populated userId object", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({
          userId: { _id: "u1", login: "jdoe", empName: "Jane Doe" },
        })}
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("falls back to login when empName is not available", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({
          userId: { _id: "u1", login: "jdoe" },
        })}
      />,
    );
    expect(screen.getByText("jdoe")).toBeInTheDocument();
  });

  it("falls back to userName when userId is a string", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({ userId: "user-1", userName: "fallback-user" })}
      />,
    );
    expect(screen.getByText("fallback-user")).toBeInTheDocument();
  });

  it("shows metadata fields", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({
          entityId: "ent-123",
          changeReason: "Bug fix",
          ticketReference: "JIRA-456",
        })}
      />,
    );
    expect(screen.getByText("auditLogs.detail.entityId")).toBeInTheDocument();
    expect(screen.getByText("ent-123")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.detail.changeReason")).toBeInTheDocument();
    expect(screen.getByText("Bug fix")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.detail.ticketReference")).toBeInTheDocument();
    expect(screen.getByText("JIRA-456")).toBeInTheDocument();
  });

  it("shows changes section for UPDATE action", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog()}
      />,
    );
    expect(screen.getByText(/auditLogs\.detail\.changesCount/)).toBeInTheDocument();
  });

  it("hides changes section for CREATE action", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({ action: "CREATE", changes: [] })}
      />,
    );
    expect(screen.queryByText(/Changes/)).not.toBeInTheDocument();
  });

  it("shows snapshots section", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog()}
      />,
    );
    expect(screen.getByText("auditLogs.detail.snapshots")).toBeInTheDocument();
  });

  it("shows batch link when batchId is present", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({ batchId: "batch-123" })}
        onFilterByBatch={vi.fn()}
      />,
    );
    expect(
      screen.getByText("auditLogs.detail.viewRelatedEntries"),
    ).toBeInTheDocument();
  });

  it("hides batch link when batchId is absent", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({ batchId: undefined })}
        onFilterByBatch={vi.fn()}
      />,
    );
    expect(
      screen.queryByText("auditLogs.detail.viewRelatedEntries"),
    ).not.toBeInTheDocument();
  });

  it("calls onFilterByBatch and closes drawer when batch link is clicked", () => {
    const onFilterByBatch = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={onOpenChange}
        auditLog={makeAuditLog({ batchId: "batch-123" })}
        onFilterByBatch={onFilterByBatch}
      />,
    );
    fireEvent.click(screen.getByText("auditLogs.detail.viewRelatedEntries"));
    expect(onFilterByBatch).toHaveBeenCalledWith("batch-123");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("displays source badge", () => {
    render(
      <AuditLogDetailDrawer
        open={true}
        onOpenChange={vi.fn()}
        auditLog={makeAuditLog({ source: "CASCADE" })}
      />,
    );
    expect(screen.getByText("CASCADE")).toBeInTheDocument();
  });
});
