// src/features/audit-logs/components/action-list-view.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionListView } from "./action-list-view";
import type { ActionItem } from "../lib/parse-logic-json";

const simpleActions: ActionItem[] = [
  {
    action: "addPoints",
    enabled: true,
    params: [
      { expr: "$.Context.member.purses[?(@.name == 'Main')]", name: "Main" },
      { expr: "1", name: "1" },
      { expr: "100", name: "100" },
    ],
  },
  {
    action: "upgrade",
    enabled: true,
    params: [
      { expr: "$.Context.member.tiers[?(@.name == 'Gold')]", name: "Gold" },
    ],
  },
];

const disabledAction: ActionItem[] = [
  {
    action: "addBadge",
    enabled: false,
    params: [{ expr: "'GoldBadge'", name: "GoldBadge" }],
  },
];

const emptyParamAction: ActionItem[] = [
  {
    action: "addPoints",
    enabled: true,
    params: [
      { expr: "Main", name: "Main" },
      { expr: "", name: "" },
      { expr: "", name: "" },
    ],
  },
];

const codeAction: ActionItem[] = [
  {
    action: "customAction",
    enabled: true,
    params: [
      { expr: "function actionParser(ctx) {\n  return ctx.value * 2;\n}" },
    ],
  },
];

describe("ActionListView", () => {
  it("renders action type names", () => {
    render(<ActionListView actions={simpleActions} />);
    expect(screen.getByText("addPoints")).toBeInTheDocument();
    expect(screen.getByText("upgrade")).toBeInTheDocument();
  });

  it("renders simple params inline with dot separators", () => {
    render(<ActionListView actions={simpleActions} />);
    // Params rendered inline for tier 1
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders disabled actions with indicator", () => {
    render(<ActionListView actions={disabledAction} />);
    const disabledEl = screen.getByText("addBadge").closest("[data-disabled]");
    expect(disabledEl).toBeInTheDocument();
  });

  it("renders empty params as dash", () => {
    render(<ActionListView actions={emptyParamAction} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders code blocks for tier 3 actions", () => {
    render(<ActionListView actions={codeAction} />);
    expect(screen.getByText(/actionParser/)).toBeInTheDocument();
    // Should render as pre/code block
    const pre = screen.getByText(/actionParser/).closest("pre");
    expect(pre).toBeInTheDocument();
  });
});
