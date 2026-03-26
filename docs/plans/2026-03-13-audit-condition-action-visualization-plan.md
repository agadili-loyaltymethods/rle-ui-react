# Condition & Action Visualization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deserialize and visually render conditions/actions in audit trail snapshot diffs so changes are human-readable instead of raw JSON.

**Architecture:** The snapshot viewer's `DiffValue` component detects arrays with `logicJSON` fields and delegates to specialized renderers. A parsing utility handles deserialization with graceful fallback. Three new components handle conditions (recursive tree), actions (tiered list), and the diff orchestrator (matching + grouping).

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, existing UI primitives (Badge, cn, Button, Lucide icons).

**Design doc:** `docs/plans/2026-03-13-audit-condition-action-visualization-design.md`

---

### Task 1: Parse Logic JSON — Types & Parser

**Files:**
- Create: `src/features/audit-logs/lib/parse-logic-json.ts`
- Test: `src/features/audit-logs/lib/parse-logic-json.test.ts`

**Step 1: Write the failing tests**

```ts
// src/features/audit-logs/lib/parse-logic-json.test.ts
import { describe, it, expect } from "vitest";
import {
  parseLogicJSON,
  guessLabelFromPath,
  getOperatorSymbol,
  getParamTier,
  stripQuotes,
} from "./parse-logic-json";

describe("parseLogicJSON", () => {
  it("parses a condition group", () => {
    const json = JSON.stringify({
      group: {
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
        ],
      },
    });
    const result = parseLogicJSON(json);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("condition-group");
    if (result!.kind === "condition-group") {
      expect(result!.data.operator).toBe("and");
      expect(result!.data.rules).toHaveLength(1);
    }
  });

  it("parses an action list", () => {
    const json = JSON.stringify([
      {
        action: "addPoints",
        enabled: true,
        params: [
          { expr: "$.Context.member.purses[?(@.name == 'Main')]", name: "Main" },
          { expr: "1", name: "1" },
          { expr: "100", name: "100" },
        ],
      },
    ]);
    const result = parseLogicJSON(json);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("action-list");
    if (result!.kind === "action-list") {
      expect(result!.data).toHaveLength(1);
      expect(result!.data[0]!.action).toBe("addPoints");
    }
  });

  it("returns null for invalid JSON", () => {
    expect(parseLogicJSON("not json")).toBeNull();
  });

  it("returns null for valid JSON that is not a condition or action", () => {
    expect(parseLogicJSON(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseLogicJSON("")).toBeNull();
  });
});

describe("guessLabelFromPath", () => {
  it("extracts label from simple JSONPath", () => {
    expect(guessLabelFromPath("$.Context.activity.type")).toBe("Activity Type");
  });

  it("extracts label from JSONPath with filter", () => {
    expect(guessLabelFromPath("$.Context.member.purses[?(@.name == 'Points')]"))
      .toBe("Member Purses (Points)");
  });

  it("returns null for non-JSONPath strings", () => {
    expect(guessLabelFromPath("100")).toBeNull();
  });

  it("returns null for raw expressions", () => {
    expect(guessLabelFromPath("var x = 1")).toBeNull();
  });
});

describe("getOperatorSymbol", () => {
  it("maps known operators", () => {
    expect(getOperatorSymbol("eq")).toBe("=");
    expect(getOperatorSymbol("ne")).toBe("≠");
    expect(getOperatorSymbol("gt")).toBe(">");
    expect(getOperatorSymbol("gte")).toBe("≥");
    expect(getOperatorSymbol("lt")).toBe("<");
    expect(getOperatorSymbol("lte")).toBe("≤");
    expect(getOperatorSymbol("contains")).toBe("contains");
    expect(getOperatorSymbol("in")).toBe("in");
    expect(getOperatorSymbol("inl")).toBe("in list");
    expect(getOperatorSymbol("innl")).toBe("not in list");
  });

  it("returns the raw function name for unknown operators", () => {
    expect(getOperatorSymbol("customOp")).toBe("customOp");
  });
});

describe("stripQuotes", () => {
  it("strips surrounding single quotes", () => {
    expect(stripQuotes("'Accrual'")).toBe("Accrual");
  });

  it("strips surrounding double quotes", () => {
    expect(stripQuotes('"Accrual"')).toBe("Accrual");
  });

  it("leaves unquoted strings alone", () => {
    expect(stripQuotes("100")).toBe("100");
  });
});

describe("getParamTier", () => {
  it("returns 3 for code blocks", () => {
    expect(getParamTier([{ expr: "function() { return 1; }" }])).toBe(3);
  });

  it("returns 3 for arrow functions", () => {
    expect(getParamTier([{ expr: "() => 1" }])).toBe(3);
  });

  it("returns 3 for multiline expressions", () => {
    expect(getParamTier([{ expr: "var x = 1;\nreturn x;" }])).toBe(3);
  });

  it("returns 2 for long param strings", () => {
    const longExpr = "$.Context.member.purses[?(@.name == 'Very Long Purse Name That Goes On')]";
    expect(getParamTier([{ expr: longExpr }, { expr: "50" }])).toBe(2);
  });

  it("returns 1 for simple params", () => {
    expect(getParamTier([{ expr: "100" }, { expr: "1" }])).toBe(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/audit-logs/lib/parse-logic-json.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/features/audit-logs/lib/parse-logic-json.ts

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConditionParam {
  expr: string;
  name?: string;
  type?: string;
  errorMessage?: string;
  isValid?: boolean;
}

export interface ConditionRule {
  function: string;
  params: ConditionParam[];
  enabled?: boolean;
}

export interface ConditionGroup {
  operator: "and" | "or" | "none";
  rules: Array<ConditionRule | ConditionGroupWrapper>;
  enabled?: boolean;
}

export interface ConditionGroupWrapper {
  group: ConditionGroup;
  enabled?: boolean;
}

export interface ActionParam {
  expr: string;
  name?: string;
}

export interface ActionItem {
  action: string;
  params: ActionParam[];
  enabled?: boolean;
}

export type ParsedLogic =
  | { kind: "condition-group"; data: ConditionGroup }
  | { kind: "action-list"; data: ActionItem[] }
  | null;

// ── Type guards ────────────────────────────────────────────────────────────────

function isConditionGroup(obj: unknown): obj is { group: ConditionGroup } {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (!o.group || typeof o.group !== "object") return false;
  const g = o.group as Record<string, unknown>;
  return (
    typeof g.operator === "string" &&
    ["and", "or", "none"].includes(g.operator) &&
    Array.isArray(g.rules)
  );
}

function isActionList(obj: unknown): obj is ActionItem[] {
  if (!Array.isArray(obj)) return false;
  if (obj.length === 0) return false;
  return obj.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).action === "string" &&
      Array.isArray((item as Record<string, unknown>).params),
  );
}

// ── Parser ─────────────────────────────────────────────────────────────────────

export function parseLogicJSON(raw: string): ParsedLogic {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isConditionGroup(parsed)) {
      return { kind: "condition-group", data: parsed.group };
    }
    if (isActionList(parsed)) {
      return { kind: "action-list", data: parsed };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Operator symbols ───────────────────────────────────────────────────────────

const OPERATOR_SYMBOLS: Record<string, string> = {
  eq: "=",
  ne: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "in",
  inl: "in list",
  innl: "not in list",
  contains: "contains",
};

export function getOperatorSymbol(fn: string): string {
  return OPERATOR_SYMBOLS[fn] ?? fn;
}

// ── Label guessing from JSONPath ───────────────────────────────────────────────

export function guessLabelFromPath(expr: string): string | null {
  if (!expr.startsWith("$.")) return null;

  // Extract filter value if present: [?(@.name == 'Foo')] → "Foo"
  const filterMatch = expr.match(/\[\?\(@\.name\s*==\s*'([^']+)'\)\]/);
  const filterValue = filterMatch?.[1] ?? null;

  // Remove filter expressions and array accessors
  const cleaned = expr.replace(/\[.*?\]/g, "");

  // Take the last 2 segments after $. (e.g., "$.Context.activity.type" → ["activity", "type"])
  const segments = cleaned.split(".").filter(Boolean);
  // Skip "$" and "Context"
  const meaningful = segments.slice(
    segments[1]?.toLowerCase() === "context" ? 2 : 1,
  );

  if (meaningful.length === 0) return null;

  // Title-case each segment
  const label = meaningful
    .map((s) =>
      s.replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → words
        .replace(/^./, (c) => c.toUpperCase()),
    )
    .join(" ");

  if (filterValue) return `${label} (${filterValue})`;
  return label;
}

// ── String utilities ───────────────────────────────────────────────────────────

export function stripQuotes(s: string): string {
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

// ── Param complexity tier ──────────────────────────────────────────────────────

const CODE_PATTERNS = /function\s*\(|=>|\{|\n/;

export function getParamTier(params: Array<{ expr: string }>): 1 | 2 | 3 {
  for (const p of params) {
    if (CODE_PATTERNS.test(p.expr)) return 3;
  }
  const totalLen = params.reduce((sum, p) => sum + p.expr.length, 0);
  if (totalLen > 80) return 2;
  return 1;
}

// ── Rich field detection ───────────────────────────────────────────────────────

/** Check if a value is an array of objects with logicJSON (conditions or actions array). */
export function isLogicJSONArray(
  value: unknown,
): value is Array<{ _id?: string; name?: string; logicJSON?: string }> {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  return value.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "logicJSON" in item &&
      typeof (item as Record<string, unknown>).logicJSON === "string",
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/audit-logs/lib/parse-logic-json.test.ts`
Expected: ALL PASS

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 6: Commit**

```bash
git add src/features/audit-logs/lib/parse-logic-json.ts src/features/audit-logs/lib/parse-logic-json.test.ts
git commit -m "feat(audit): add logicJSON parser with types, label guessing, and tier detection"
```

---

### Task 2: Condition Group View — Recursive Tree Renderer

**Files:**
- Create: `src/features/audit-logs/components/condition-group-view.tsx`
- Test: `src/features/audit-logs/components/condition-group-view.test.tsx`

**Step 1: Write the failing tests**

```tsx
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
    expect(screen.getByText("=")).toBeInTheDocument();
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/audit-logs/components/condition-group-view.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```tsx
// src/features/audit-logs/components/condition-group-view.tsx
import { cn } from "@/shared/lib/cn";
import {
  getOperatorSymbol,
  guessLabelFromPath,
  stripQuotes,
} from "../lib/parse-logic-json";
import type {
  ConditionGroup,
  ConditionRule,
  ConditionGroupWrapper,
} from "../lib/parse-logic-json";

// ── Operator group labels ──────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  and: "ALL of:",
  or: "ANY of:",
  none: "NONE of:",
};

const GROUP_BORDER: Record<string, string> = {
  and: "border-brand/30",
  or: "border-accent-amber/40",
  none: "border-error/30",
};

// ── Type guard ─────────────────────────────────────────────────────────────────

function isGroupWrapper(
  rule: ConditionRule | ConditionGroupWrapper,
): rule is ConditionGroupWrapper {
  return "group" in rule;
}

// ── Param display ──────────────────────────────────────────────────────────────

function ParamValue({ expr, name }: { expr: string; name?: string }) {
  if (name) {
    return <span className="font-medium text-foreground">{name}</span>;
  }

  const guessed = guessLabelFromPath(expr);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <code className="font-mono text-foreground">{expr}</code>
      {guessed && (
        <span className="text-foreground-tertiary italic">~{guessed}</span>
      )}
    </span>
  );
}

// ── Rule line ──────────────────────────────────────────────────────────────────

function RuleLine({ rule }: { rule: ConditionRule }) {
  const isExpression = rule.function === "expression";
  const disabled = rule.enabled === false;

  if (isExpression) {
    const code = rule.params[0]?.expr ?? "";
    return (
      <div
        className={cn(
          "flex items-baseline gap-1.5 py-0.5",
          disabled && "opacity-40 line-through",
        )}
        data-disabled={disabled || undefined}
      >
        <span className="text-foreground-muted">Expression:</span>
        <code className="font-mono text-foreground break-all">{code}</code>
      </div>
    );
  }

  const lhs = rule.params[0];
  const rhs = rule.params[1];
  const op = getOperatorSymbol(rule.function);

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-1.5 py-0.5",
        disabled && "opacity-40 line-through",
      )}
      data-disabled={disabled || undefined}
    >
      {lhs && <ParamValue expr={lhs.expr} name={lhs.name} />}
      <span className="font-mono text-accent-violet font-medium">{op}</span>
      {rhs && (
        <ParamValue
          expr={stripQuotes(rhs.expr)}
          name={rhs.name ? stripQuotes(rhs.name) : undefined}
        />
      )}
    </div>
  );
}

// ── Recursive group ────────────────────────────────────────────────────────────

interface ConditionGroupViewProps {
  group: ConditionGroup;
  className?: string;
}

export function ConditionGroupView({ group, className }: ConditionGroupViewProps) {
  const label = GROUP_LABELS[group.operator] ?? `${group.operator}:`;
  const borderColor = GROUP_BORDER[group.operator] ?? "border-border";

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
        {label}
      </span>
      <div className={cn("border-l-2 pl-3 flex flex-col gap-0.5", borderColor)}>
        {group.rules.map((rule, i) => {
          if (isGroupWrapper(rule)) {
            return (
              <div
                key={i}
                className={cn(rule.enabled === false && "opacity-40")}
                data-disabled={rule.enabled === false || undefined}
              >
                <ConditionGroupView group={rule.group} />
              </div>
            );
          }
          return <RuleLine key={i} rule={rule} />;
        })}
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/audit-logs/components/condition-group-view.test.tsx`
Expected: ALL PASS

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 6: Commit**

```bash
git add src/features/audit-logs/components/condition-group-view.tsx src/features/audit-logs/components/condition-group-view.test.tsx
git commit -m "feat(audit): add ConditionGroupView recursive tree renderer"
```

---

### Task 3: Action List View — Tiered Renderer

**Files:**
- Create: `src/features/audit-logs/components/action-list-view.tsx`
- Test: `src/features/audit-logs/components/action-list-view.test.tsx`

**Step 1: Write the failing tests**

```tsx
// src/features/audit-logs/components/action-list-view.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/audit-logs/components/action-list-view.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```tsx
// src/features/audit-logs/components/action-list-view.tsx
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import {
  getParamTier,
  stripQuotes,
  guessLabelFromPath,
} from "../lib/parse-logic-json";
import type { ActionItem, ActionParam } from "../lib/parse-logic-json";

// ── Param value display ────────────────────────────────────────────────────────

function ParamInline({ param }: { param: ActionParam }) {
  if (!param.expr) {
    return <span className="text-foreground-tertiary">—</span>;
  }
  const display = param.name || stripQuotes(param.expr);
  return <span className="text-foreground">{display}</span>;
}

function ParamExpanded({ param, index }: { param: ActionParam; index: number }) {
  const label = param.name || `Param ${index + 1}`;
  const isEmpty = !param.expr;

  if (isEmpty) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-foreground-muted text-caption">{label}:</span>
        <span className="text-foreground-tertiary text-caption">—</span>
      </div>
    );
  }

  const guessed = !param.name ? guessLabelFromPath(param.expr) : null;
  const isPath = param.expr.startsWith("$.");

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-foreground-muted text-caption">{label}:</span>
      {isPath ? (
        <span className="inline-flex items-baseline gap-1.5">
          <code className="font-mono text-caption text-foreground">{param.expr}</code>
          {guessed && (
            <span className="text-caption text-foreground-tertiary italic">~{guessed}</span>
          )}
        </span>
      ) : (
        <span className="text-caption text-foreground">{stripQuotes(param.expr)}</span>
      )}
    </div>
  );
}

// ── Single action row ──────────────────────────────────────────────────────────

function ActionRow({ action, index }: { action: ActionItem; index: number }) {
  const tier = getParamTier(action.params);
  const disabled = action.enabled === false;
  const [expanded, setExpanded] = useState(tier === 3);

  // For tier 3, always render expanded with code block
  if (tier === 3) {
    const codeParam = action.params.find((p) => /function\s*\(|=>|\{|\n/.test(p.expr));
    return (
      <div
        className={cn("flex flex-col gap-1", disabled && "opacity-40")}
        data-disabled={disabled || undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-caption text-foreground-tertiary">{index + 1}.</span>
          <Badge variant="secondary">{action.action}</Badge>
          <span className={cn("text-caption", disabled ? "text-error" : "text-success")}>
            {disabled ? "✗" : "✓"}
          </span>
        </div>
        {action.params.map((p, i) =>
          p === codeParam ? (
            <pre
              key={i}
              className="ml-6 overflow-auto rounded-md bg-subtle p-2 font-mono text-caption text-foreground-secondary"
            >
              {p.expr}
            </pre>
          ) : (
            <div key={i} className="ml-6">
              <ParamExpanded param={p} index={i} />
            </div>
          ),
        )}
      </div>
    );
  }

  // Tier 1 & 2: inline params with optional expand
  const needsExpand = tier === 2;

  return (
    <div
      className={cn("flex flex-col", disabled && "opacity-40")}
      data-disabled={disabled || undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-caption text-foreground-tertiary">{index + 1}.</span>
        <Badge variant="secondary">{action.action}</Badge>
        <span className={cn("text-caption", disabled ? "text-error" : "text-success")}>
          {disabled ? "✗" : "✓"}
        </span>
        <span className="flex items-center gap-1 text-caption text-foreground-secondary overflow-hidden">
          {action.params.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 shrink-0">
              {i > 0 && <span className="text-foreground-tertiary">·</span>}
              <ParamInline param={p} />
            </span>
          ))}
        </span>
        {needsExpand && (
          <button
            type="button"
            className="shrink-0 text-foreground-muted hover:text-foreground cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {expanded && (
        <div className="ml-6 mt-1 flex flex-col gap-0.5">
          {action.params.map((p, i) => (
            <ParamExpanded key={i} param={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ActionListViewProps {
  actions: ActionItem[];
  className?: string;
}

export function ActionListView({ actions, className }: ActionListViewProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {actions.map((action, i) => (
        <ActionRow key={i} action={action} index={i} />
      ))}
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/audit-logs/components/action-list-view.test.tsx`
Expected: ALL PASS

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 6: Commit**

```bash
git add src/features/audit-logs/components/action-list-view.tsx src/features/audit-logs/components/action-list-view.test.tsx
git commit -m "feat(audit): add ActionListView tiered renderer"
```

---

### Task 4: Condition/Action Diff Orchestrator

**Files:**
- Create: `src/features/audit-logs/components/condition-action-diff.tsx`
- Test: `src/features/audit-logs/components/condition-action-diff.test.tsx`

**Step 1: Write the failing tests**

```tsx
// src/features/audit-logs/components/condition-action-diff.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText(/1 unchanged/i)).toBeInTheDocument();
  });

  it("expands unchanged items on click", async () => {
    const user = userEvent.setup();
    render(
      <ConditionActionDiff
        fieldKey="conditions"
        before={[{ _id: "c1", name: "Same", logicJSON: conditionLogicBefore }]}
        after={[{ _id: "c1", name: "Same", logicJSON: conditionLogicBefore }]}
      />,
    );
    const toggle = screen.getByText(/1 unchanged/i);
    await user.click(toggle);
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/audit-logs/components/condition-action-diff.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```tsx
// src/features/audit-logs/components/condition-action-diff.tsx
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { parseLogicJSON } from "../lib/parse-logic-json";
import { ConditionGroupView } from "./condition-group-view";
import { ActionListView } from "./action-list-view";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LogicItem {
  _id?: string;
  name?: string;
  logicJSON?: string;
}

type MatchKind = "changed" | "added" | "removed" | "unchanged";

interface MatchedPair {
  kind: MatchKind;
  name: string;
  before: LogicItem | null;
  after: LogicItem | null;
}

// ── Matching ───────────────────────────────────────────────────────────────────

function matchItems(before: LogicItem[], after: LogicItem[]): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  const matchedAfterIds = new Set<string>();

  for (const b of before) {
    const key = b._id || b.name || "";
    const a = after.find((x) => (x._id || x.name || "") === key);
    if (a) {
      matchedAfterIds.add(a._id || a.name || "");
      const same = b.logicJSON === a.logicJSON;
      pairs.push({
        kind: same ? "unchanged" : "changed",
        name: b.name || key,
        before: b,
        after: a,
      });
    } else {
      pairs.push({ kind: "removed", name: b.name || key, before: b, after: null });
    }
  }

  for (const a of after) {
    const key = a._id || a.name || "";
    if (!matchedAfterIds.has(key)) {
      pairs.push({ kind: "added", name: a.name || key, before: null, after: a });
    }
  }

  // Sort: changed first, then added, removed, unchanged
  const order: Record<MatchKind, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  pairs.sort((a, b) => order[a.kind] - order[b.kind]);

  return pairs;
}

// ── Rendered logic block ───────────────────────────────────────────────────────

function RenderedLogic({ item }: { item: LogicItem }) {
  if (!item.logicJSON) {
    return <span className="text-caption text-foreground-tertiary italic">No logic defined</span>;
  }

  const parsed = parseLogicJSON(item.logicJSON);
  if (!parsed) {
    return (
      <pre className="overflow-auto rounded-md bg-subtle p-2 font-mono text-caption text-foreground-secondary max-h-40">
        {item.logicJSON}
      </pre>
    );
  }

  if (parsed.kind === "condition-group") {
    return <ConditionGroupView group={parsed.data} />;
  }

  return <ActionListView actions={parsed.data} />;
}

// ── Diff item row ──────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<MatchKind, string> = {
  changed: "text-warning",
  added: "text-success",
  removed: "text-error",
  unchanged: "text-foreground-muted",
};

function DiffPairRow({ pair }: { pair: MatchedPair }) {
  if (pair.kind === "added") {
    return (
      <div className="rounded-md bg-success-light/30 p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-caption font-medium text-foreground">{pair.name}</span>
          <span className="text-caption text-success font-medium">added</span>
        </div>
        <RenderedLogic item={pair.after!} />
      </div>
    );
  }

  if (pair.kind === "removed") {
    return (
      <div className="rounded-md bg-error-light/30 p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-caption font-medium text-foreground">{pair.name}</span>
          <span className="text-caption text-error font-medium">removed</span>
        </div>
        <RenderedLogic item={pair.before!} />
      </div>
    );
  }

  // Changed — show before and after side by side
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-caption font-medium text-foreground">{pair.name}</span>
        <span className={cn("text-caption font-medium", BADGE_STYLES[pair.kind])}>
          {pair.kind}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-error-light/20 p-2">
          <div className="mb-1 text-caption font-medium text-error">Before</div>
          <RenderedLogic item={pair.before!} />
        </div>
        <div className="rounded-md bg-success-light/20 p-2">
          <div className="mb-1 text-caption font-medium text-success">After</div>
          <RenderedLogic item={pair.after!} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ConditionActionDiffProps {
  fieldKey: string;
  before: LogicItem[];
  after: LogicItem[];
}

export function ConditionActionDiff({ fieldKey, before, after }: ConditionActionDiffProps) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const pairs = matchItems(before, after);

  const changed = pairs.filter((p) => p.kind !== "unchanged");
  const unchanged = pairs.filter((p) => p.kind === "unchanged");

  return (
    <div className="flex flex-col gap-2">
      {changed.map((pair, i) => (
        <DiffPairRow key={pair.name || i} pair={pair} />
      ))}

      {unchanged.length > 0 && (
        <button
          type="button"
          className="flex items-center gap-1.5 text-caption text-foreground-muted hover:text-foreground cursor-pointer py-1"
          onClick={() => setShowUnchanged((v) => !v)}
        >
          {showUnchanged
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
          {unchanged.length} unchanged {fieldKey.replace(/s$/, "")}{unchanged.length !== 1 ? "s" : ""}
        </button>
      )}

      {showUnchanged && unchanged.map((pair, i) => (
        <div key={pair.name || i} className="rounded-md bg-subtle/50 p-3">
          <div className="mb-1.5 text-caption font-medium text-foreground-muted">{pair.name}</div>
          <RenderedLogic item={pair.after ?? pair.before!} />
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/audit-logs/components/condition-action-diff.test.tsx`
Expected: ALL PASS

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 6: Commit**

```bash
git add src/features/audit-logs/components/condition-action-diff.tsx src/features/audit-logs/components/condition-action-diff.test.tsx
git commit -m "feat(audit): add ConditionActionDiff orchestrator with matching and grouping"
```

---

### Task 5: Integrate into Snapshot Viewer

**Files:**
- Modify: `src/features/audit-logs/components/audit-snapshot-viewer.tsx`

**Step 1: Add imports and detection**

At the top of `audit-snapshot-viewer.tsx`, add:

```tsx
import { isLogicJSONArray } from "../lib/parse-logic-json";
import { ConditionActionDiff } from "./condition-action-diff";
```

**Step 2: Modify InlineDiffTable to handle rich fields**

In the `InlineDiffTable` component, replace the row rendering inside `visible.map(...)` with logic that checks for `isLogicJSONArray`. When a field's before or after value is a logicJSON array, render a full-width `<tr>` with `colSpan={4}` containing a `ConditionActionDiff` instead of the regular Before/After cells.

Replace the body of `visible.map((entry) => { ... })` with:

```tsx
{visible.map((entry) => {
  const styles = kindStyles[entry.kind];
  const beforeIsLogic = isLogicJSONArray(entry.before);
  const afterIsLogic = isLogicJSONArray(entry.after);

  // Rich field: conditions/actions arrays with logicJSON
  if (beforeIsLogic || afterIsLogic) {
    return (
      <tr
        key={entry.key}
        className={cn(
          "border-b border-subtle last:border-b-0",
          entry.kind !== "unchanged" && "bg-subtle/30",
        )}
      >
        <td className={cn("w-6 px-1.5 py-2 text-center font-mono text-caption font-bold align-top", styles.indicator)}>
          {INDICATOR[entry.kind]}
        </td>
        <td colSpan={3} className="px-3 py-2 align-top">
          <div className="mb-1 font-mono text-caption text-foreground">{entry.key}</div>
          <ConditionActionDiff
            fieldKey={entry.key}
            before={(beforeIsLogic ? entry.before : []) as Array<{ _id?: string; name?: string; logicJSON?: string }>}
            after={(afterIsLogic ? entry.after : []) as Array<{ _id?: string; name?: string; logicJSON?: string }>}
          />
        </td>
      </tr>
    );
  }

  // Regular field (existing rendering)
  return (
    <tr
      key={entry.key}
      className={cn(
        "border-b border-subtle last:border-b-0",
        entry.kind !== "unchanged" && "bg-subtle/30",
        styles.row,
      )}
    >
      <td className={cn("w-6 px-1.5 py-2 text-center font-mono text-caption font-bold", styles.indicator)}>
        {INDICATOR[entry.kind]}
      </td>
      <td className="px-3 py-2 font-mono text-caption text-foreground align-top">
        {entry.key}
      </td>
      <td className={cn("px-3 py-2 align-top", styles.before)}>
        <DiffValue value={entry.before} className={styles.before} />
      </td>
      <td className={cn("px-3 py-2 align-top", styles.after)}>
        <DiffValue value={entry.after} className={styles.after} />
      </td>
    </tr>
  );
})}
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Manual visual verification**

1. Navigate to `http://localhost:4000/audit-trail`
2. Click a Rule UPDATE entry that has conditions/actions changes
3. Verify the Snapshots section renders conditions as readable trees and actions as compact lists instead of raw JSON
4. Verify unchanged items show as collapsed summary
5. Verify fallback to raw JSON for entities without logicJSON

**Step 5: Commit**

```bash
git add src/features/audit-logs/components/audit-snapshot-viewer.tsx
git commit -m "feat(audit): integrate condition/action visualization into snapshot viewer"
```

---

### Task 6: Push and verify

**Step 1: Run full test suite for audit-logs**

Run: `npx vitest run src/features/audit-logs/`
Expected: All new and existing tests pass (pre-existing dependency failures excluded)

**Step 2: Type-check entire project**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Push**

```bash
git push
```
