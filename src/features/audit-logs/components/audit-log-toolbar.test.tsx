import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { AuditLogToolbar } from "./audit-log-toolbar";
import type { AuditLogFilters } from "../hooks/use-audit-logs";

const EMPTY_FILTERS: AuditLogFilters = {
  entityType: "",
  action: "",
  source: "",
  datePreset: "all",
  dateFrom: "",
  dateTo: "",
  batchId: "",
};

describe("AuditLogToolbar", () => {
  it("renders all filter controls", () => {
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByTestId("audit-filter-entity-type-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-action-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-source-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-date-preset")).toBeInTheDocument();
  });

  it("does not show clear button when no filters are active", () => {
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("audit-filter-clear")).not.toBeInTheDocument();
  });

  it("shows clear button when a filter is active", () => {
    render(
      <AuditLogToolbar
        filters={{ ...EMPTY_FILTERS, entityType: "Program" }}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByTestId("audit-filter-clear")).toBeInTheDocument();
  });

  it("calls onFilterChange when entity type is selected", async () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={onFilterChange}
        onClearAll={vi.fn()}
      />,
    );
    // Open the entity type dropdown
    fireEvent.click(screen.getByTestId("audit-filter-entity-type-trigger"));
    // Select "Rule" option
    fireEvent.click(await screen.findByTestId("audit-filter-entity-type-option-Rule"));
    expect(onFilterChange).toHaveBeenCalledWith("entityType", "Rule");
  });

  it("calls onFilterChange when action is selected", async () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={onFilterChange}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("audit-filter-action-trigger"));
    fireEvent.click(await screen.findByTestId("audit-filter-action-option-DELETE"));
    expect(onFilterChange).toHaveBeenCalledWith("action", "DELETE");
  });

  it("calls onFilterChange when source is selected", async () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={onFilterChange}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("audit-filter-source-trigger"));
    fireEvent.click(await screen.findByTestId("audit-filter-source-option-CASCADE"));
    expect(onFilterChange).toHaveBeenCalledWith("source", "CASCADE");
  });

  it("calls onFilterChange when date preset is changed", () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={onFilterChange}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId("audit-filter-date-preset"), {
      target: { value: "1m" },
    });
    expect(onFilterChange).toHaveBeenCalledWith("datePreset", "1m");
  });

  it("calls onClearAll when clear button is clicked", () => {
    const onClearAll = vi.fn();
    render(
      <AuditLogToolbar
        filters={{ ...EMPTY_FILTERS, action: "UPDATE" }}
        onFilterChange={vi.fn()}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByTestId("audit-filter-clear"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("shows entity type labels for compound names", () => {
    render(
      <AuditLogToolbar
        filters={EMPTY_FILTERS}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    // Open entity type dropdown to see options
    fireEvent.click(screen.getByTestId("audit-filter-entity-type-trigger"));
    expect(screen.getByTestId("audit-filter-entity-type-option-PursePolicy")).toHaveTextContent("auditLogs.entityTypes.PursePolicy");
    expect(screen.getByTestId("audit-filter-entity-type-option-TierPolicy")).toHaveTextContent("auditLogs.entityTypes.TierPolicy");
    expect(screen.getByTestId("audit-filter-entity-type-option-RuleFolder")).toHaveTextContent("auditLogs.entityTypes.RuleFolder");
    expect(screen.getByTestId("audit-filter-entity-type-option-ExtensionSchema")).toHaveTextContent("auditLogs.entityTypes.ExtensionSchema");
    expect(screen.getByTestId("audit-filter-entity-type-option-CustomExpression")).toHaveTextContent("auditLogs.entityTypes.CustomExpression");
    expect(screen.getByTestId("audit-filter-entity-type-option-NamedList")).toHaveTextContent("auditLogs.entityTypes.NamedList");
  });

  it("shows clear button when date preset is not 'all'", () => {
    render(
      <AuditLogToolbar
        filters={{ ...EMPTY_FILTERS, datePreset: "1m", dateFrom: "2026-02-14" }}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByTestId("audit-filter-clear")).toBeInTheDocument();
  });
});
