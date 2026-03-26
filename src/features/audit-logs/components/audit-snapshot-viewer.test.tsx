import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { AuditSnapshotViewer } from "./audit-snapshot-viewer";

describe("AuditSnapshotViewer", () => {
  it("shows field as added for CREATE action", () => {
    render(
      <AuditSnapshotViewer before={null} after={{ name: "Test" }} action="CREATE" />,
    );
    // Should show "name" field with + indicator (added)
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("shows field as removed for DELETE action", () => {
    render(
      <AuditSnapshotViewer before={{ name: "Test" }} after={null} action="DELETE" />,
    );
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows inline diff table for UPDATE action", () => {
    render(
      <AuditSnapshotViewer
        before={{ name: "Old" }}
        after={{ name: "New" }}
        action="UPDATE"
      />,
    );
    expect(screen.getByText("auditLogs.snapshot.before")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.after")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("shows fallback when no data is available", () => {
    render(
      <AuditSnapshotViewer before={null} after={null} action="UPDATE" />,
    );
    expect(screen.getByText("auditLogs.snapshot.noSnapshotData")).toBeInTheDocument();
  });

  it("shows field values for CREATE", () => {
    render(
      <AuditSnapshotViewer before={null} after={{ name: "Test" }} action="CREATE" />,
    );
    expect(screen.getByText(/"Test"/)).toBeInTheDocument();
  });

  it("shows field values for DELETE", () => {
    render(
      <AuditSnapshotViewer before={{ name: "Test" }} after={null} action="DELETE" />,
    );
    expect(screen.getByText(/"Test"/)).toBeInTheDocument();
  });

  it("shows changed and unchanged counts for UPDATE", () => {
    render(
      <AuditSnapshotViewer
        before={{ name: "Old", desc: "Same" }}
        after={{ name: "New", desc: "Same" }}
        action="UPDATE"
      />,
    );
    expect(screen.getByText(/auditLogs\.snapshot\.changedAndUnchanged/)).toBeInTheDocument();
  });

  it("shows field count for CREATE", () => {
    render(
      <AuditSnapshotViewer before={null} after={{ name: "Test" }} action="CREATE" />,
    );
    expect(screen.getByText(/auditLogs\.snapshot\.fieldCount/)).toBeInTheDocument();
  });

  it("shows copy button for CREATE snapshot", () => {
    render(
      <AuditSnapshotViewer before={null} after={{ name: "Test" }} action="CREATE" />,
    );
    expect(screen.getAllByTitle(/auditLogs\.snapshot\.copyJson/).length).toBeGreaterThan(0);
  });
});
