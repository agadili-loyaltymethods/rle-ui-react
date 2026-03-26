// src/features/audit-logs/components/condition-action-diff.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConditionActionDiff } from "./condition-action-diff";

const conditionLogicBefore = JSON.stringify({
  group: {
    operator: "and",
    rules: [
      { function: "eq", enabled: true, params: [{ expr: "$.Context.activity.type", name: "Activity Type" }, { expr: "'Accrual'" }] },
      { function: "gte", enabled: true, params: [{ expr: "$.Context.activity.value" }, { expr: "10" }] },
    ],
  },
});

const conditionLogicAfter = JSON.stringify({
  group: {
    operator: "and",
    rules: [
      { function: "eq", enabled: true, params: [{ expr: "$.Context.activity.type", name: "Activity Type" }, { expr: "'Accrual'" }] },
      { function: "gte", enabled: true, params: [{ expr: "$.Context.activity.value" }, { expr: "50" }] },
    ],
  },
});

const actionLogicBefore = JSON.stringify([
  { action: "addPoints", enabled: true, params: [{ expr: "Main", name: "Main" }, { expr: "100" }] },
]);

const actionLogicAfter = JSON.stringify([
  { action: "addPoints", enabled: true, params: [{ expr: "Main", name: "Main" }, { expr: "200" }] },
]);

describe("ConditionActionDiff", () => {
  it("renders changed conditions with before/after", () => {
    render(
      <ConditionActionDiff
        fieldKey="conditions"
        before={[{ _id: "c1", name: "Main", logicJSON: conditionLogicBefore }]}
        after={[{ _id: "c1", name: "Main", logicJSON: conditionLogicAfter }]}
      />,
    );
    expect(screen.getByText(/Main/)).toBeInTheDocument();
    expect(screen.getByText(/changed/i)).toBeInTheDocument();
  });

  it("renders added items", () => {
    render(
      <ConditionActionDiff
        fieldKey="actions"
        before={[]}
        after={[{ _id: "a1", name: "New", logicJSON: actionLogicAfter }]}
      />,
    );
    expect(screen.getByText(/added/i)).toBeInTheDocument();
  });

  it("renders removed items", () => {
    render(
      <ConditionActionDiff
        fieldKey="actions"
        before={[{ _id: "a1", name: "Old", logicJSON: actionLogicBefore }]}
        after={[]}
      />,
    );
    expect(screen.getByText(/removed/i)).toBeInTheDocument();
  });

  it("renders unchanged items collapsed", () => {
    render(
      <ConditionActionDiff
        fieldKey="conditions"
        before={[{ _id: "c1", name: "Same", logicJSON: conditionLogicBefore }]}
        after={[{ _id: "c1", name: "Same", logicJSON: conditionLogicBefore }]}
      />,
    );
    expect(screen.getByText(/auditLogs\.diff\.unchangedItems/i)).toBeInTheDocument();
  });

  it("expands unchanged items on click", () => {
    render(
      <ConditionActionDiff
        fieldKey="conditions"
        before={[{ _id: "c1", name: "Same", logicJSON: conditionLogicBefore }]}
        after={[{ _id: "c1", name: "Same", logicJSON: conditionLogicBefore }]}
      />,
    );
    const toggle = screen.getByText(/auditLogs\.diff\.unchangedItems/i);
    fireEvent.click(toggle);
    expect(screen.getByText("ALL of:")).toBeInTheDocument();
  });

  it("falls back to raw JSON for unparseable logicJSON", () => {
    render(
      <ConditionActionDiff
        fieldKey="conditions"
        before={[{ _id: "c1", name: "Bad", logicJSON: "not json" }]}
        after={[{ _id: "c1", name: "Bad", logicJSON: "also not json" }]}
      />,
    );
    // Should still render without crashing, showing raw text
    expect(screen.getByText(/Bad/)).toBeInTheDocument();
  });
});
