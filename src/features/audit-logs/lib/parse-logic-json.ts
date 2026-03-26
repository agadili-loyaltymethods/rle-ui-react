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
  alias?: string;
  path?: string;
  /** Catch-all for any other properties that may exist on the raw JSON. */
  [key: string]: unknown;
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
  eq: "equals",
  ne: "not equals",
  neq: "not equals",
  gt: "greater than",
  gte: "greater than or equals",
  lt: "less than",
  lte: "less than or equals",
  in: "in",
  inl: "in list",
  innl: "not in list",
  nin: "not in",
  contains: "contains",
  sw: "starts with",
  ew: "ends with",
  bw: "between",
  it: "is true",
  bf: "is false",
  bt: "between",
  exists: "exists",
  notexists: "does not exist",
  regex: "matches pattern",
  expression: "expression",
};

export function getOperatorSymbol(fn: string): string {
  return OPERATOR_SYMBOLS[fn] ?? fn;
}

// ── Label guessing from JSONPath ───────────────────────────────────────────────

export function guessLabelFromPath(expr: string): string | null {
  if (!expr.startsWith("$.")) return null;

  // Extract filter value if present: [?(@.name == 'Foo')] -> "Foo"
  const filterMatch = expr.match(/\[\?\(@\.name\s*==\s*'([^']+)'\)\]/);
  const filterValue = filterMatch?.[1] ?? null;

  // Remove filter expressions and array accessors
  const cleaned = expr.replace(/\[.*?\]/g, "");

  // Take the last 2 segments after $. (e.g., "$.Context.activity.type" -> ["activity", "type"])
  const segments = cleaned.split(".").filter(Boolean);
  // Skip "$" and "Context"
  const meaningful = segments.slice(
    segments[1]?.toLowerCase() === "context" ? 2 : 1,
  );

  if (meaningful.length === 0) return null;

  // Title-case each segment
  const label = meaningful
    .map((s) =>
      s
        .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase -> words
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

// ── Rule-level diff ────────────────────────────────────────────────────────────

type RuleHighlight = "changed" | "added" | "removed";

/** Compare rules in two condition groups by index and return a highlight map. */
export function diffConditionRules(
  before: ConditionGroup,
  after: ConditionGroup,
): { beforeHighlights: Map<number, RuleHighlight>; afterHighlights: Map<number, RuleHighlight> } {
  const bMap = new Map<number, RuleHighlight>();
  const aMap = new Map<number, RuleHighlight>();

  const maxLen = Math.max(before.rules.length, after.rules.length);

  for (let i = 0; i < maxLen; i++) {
    const bRule = i < before.rules.length ? before.rules[i] : undefined;
    const aRule = i < after.rules.length ? after.rules[i] : undefined;

    if (bRule && !aRule) {
      bMap.set(i, "removed");
    } else if (!bRule && aRule) {
      aMap.set(i, "added");
    } else if (bRule && aRule) {
      const bStr = JSON.stringify(bRule);
      const aStr = JSON.stringify(aRule);
      if (bStr !== aStr) {
        bMap.set(i, "changed");
        aMap.set(i, "changed");
      }
    }
  }

  return { beforeHighlights: bMap, afterHighlights: aMap };
}

// ── Action-level diff ─────────────────────────────────────────────────────────

export type ActionHighlight = "changed" | "added" | "removed";

/** Compare action items in two action lists by index and return a highlight map. */
export function diffActionItems(
  before: ActionItem[],
  after: ActionItem[],
): { beforeHighlights: Map<number, ActionHighlight>; afterHighlights: Map<number, ActionHighlight> } {
  const bMap = new Map<number, ActionHighlight>();
  const aMap = new Map<number, ActionHighlight>();

  const maxLen = Math.max(before.length, after.length);

  for (let i = 0; i < maxLen; i++) {
    const bItem = i < before.length ? before[i] : undefined;
    const aItem = i < after.length ? after[i] : undefined;

    if (bItem && !aItem) {
      bMap.set(i, "removed");
    } else if (!bItem && aItem) {
      aMap.set(i, "added");
    } else if (bItem && aItem) {
      const bStr = JSON.stringify(bItem);
      const aStr = JSON.stringify(aItem);
      if (bStr !== aStr) {
        bMap.set(i, "changed");
        aMap.set(i, "changed");
      }
    }
  }

  return { beforeHighlights: bMap, afterHighlights: aMap };
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
