// src/features/audit-logs/components/condition-group-view.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConditionGroupView } from "./condition-group-view";
import type { ConditionGroup } from "../lib/parse-logic-json";

const simpleGroup: ConditionGroup = {
  operator: "and",
  rules: [
    {
      function: "eq",
      enabled: true,
      params: [
        { expr: "$.Context.activity.type", name: "Activity Type" },
        { expr: "'Accrual'", name: "Accrual" },
      ],
    },
    {
      function: "gte",
      enabled: true,
      params: [
        { expr: "$.Context.activity.value" },
        { expr: "10" },
      ],
    },
  ],
};

const nestedGroup: ConditionGroup = {
  operator: "and",
  rules: [
    {
      function: "eq",
      enabled: true,
      params: [
        { expr: "$.Context.activity.type", name: "Activity Type" },
        { expr: "'Accrual'" },
      ],
    },
    {
      group: {
        operator: "or",
        rules: [
          {
            function: "gte",
            enabled: true,
            params: [{ expr: "$.Context.activity.value" }, { expr: "10" }],
          },
          {
            function: "lte",
            enabled: true,
            params: [{ expr: "$.Context.activity.value" }, { expr: "100" }],
          },
        ],
      },
      enabled: true,
    },
  ],
};

const expressionGroup: ConditionGroup = {
  operator: "and",
  rules: [
    {
      function: "expression",
      enabled: true,
      params: [{ expr: "var dt = new Date(); dt.getHours() > 14" }],
    },
  ],
};

const disabledRule: ConditionGroup = {
  operator: "and",
  rules: [
    {
      function: "eq",
      enabled: false,
      params: [
        { expr: "$.Context.activity.type", name: "Activity Type" },
        { expr: "'Accrual'", name: "Accrual" },
      ],
    },
  ],
};

describe("ConditionGroupView", () => {
  it("renders ALL of label for AND operator", () => {
    render(<ConditionGroupView group={simpleGroup} />);
    expect(screen.getByText("ALL of:")).toBeInTheDocument();
  });

  it("renders rule with named params", () => {
    render(<ConditionGroupView group={simpleGroup} />);
    expect(screen.getByText("Activity Type")).toBeInTheDocument();
    expect(screen.getByText("equals")).toBeInTheDocument();
    expect(screen.getByText("Accrual")).toBeInTheDocument();
  });

  it("renders rule with guessed label for unnamed param", () => {
    render(<ConditionGroupView group={simpleGroup} />);
    // Raw expr shown in monospace, guessed label shown nearby
    expect(screen.getByText("$.Context.activity.value")).toBeInTheDocument();
    expect(screen.getByText(/~Activity Value/)).toBeInTheDocument();
  });

  it("renders nested groups", () => {
    render(<ConditionGroupView group={nestedGroup} />);
    expect(screen.getByText("ALL of:")).toBeInTheDocument();
    expect(screen.getByText("ANY of:")).toBeInTheDocument();
  });

  it("renders expression rules", () => {
    render(<ConditionGroupView group={expressionGroup} />);
    expect(screen.getByText(/Expression:/)).toBeInTheDocument();
    expect(screen.getByText(/dt\.getHours/)).toBeInTheDocument();
  });

  it("renders disabled rules with reduced opacity", () => {
    const { container } = render(<ConditionGroupView group={disabledRule} />);
    const disabledEl = container.querySelector("[data-disabled]");
    expect(disabledEl).toBeInTheDocument();
  });
});
