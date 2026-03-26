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

// ── List parsing ──────────────────────────────────────────────────────────────

/** Try to parse a value as a JSON array of strings (used by inl/innl operators). */
function tryParseList(value: string): string[] | null {
  const s = value.trim();
  if (!s.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(String);
  } catch {
    return null;
  }
}

type ListItemKind = "same" | "added" | "removed";

function diffLists(
  thisItems: string[],
  otherItems: string[] | null,
): Array<{ value: string; kind: ListItemKind }> {
  if (!otherItems) {
    return thisItems.map((v) => ({ value: v, kind: "same" as const }));
  }
  const otherSet = new Set(otherItems);
  const thisSet = new Set(thisItems);

  const result: Array<{ value: string; kind: ListItemKind }> = [];

  // Items in this list
  for (const v of thisItems) {
    result.push({ value: v, kind: otherSet.has(v) ? "same" : "added" });
  }

  // Items only in the other list (removed from this perspective)
  for (const v of otherItems) {
    if (!thisSet.has(v)) {
      result.push({ value: v, kind: "removed" });
    }
  }

  return result;
}

const LIST_ITEM_STYLES: Record<ListItemKind, string> = {
  same: "bg-subtle text-foreground",
  added: "bg-success-light text-on-success font-medium",
  removed: "bg-error-light text-on-error line-through",
};

function ListValuePills({ items }: { items: Array<{ value: string; kind: ListItemKind }> }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      {items.map((item, i) => (
        <span
          key={`${item.value}-${i}`}
          className={cn(
            "inline-block rounded-pill px-2 py-0.5 text-caption",
            LIST_ITEM_STYLES[item.kind],
          )}
        >
          {item.value}
        </span>
      ))}
    </span>
  );
}

// ── Rule line ──────────────────────────────────────────────────────────────────

const LIST_OPERATORS = new Set(["inl", "innl", "in", "nin"]);

function RuleLine({
  rule,
  counterpart,
}: {
  rule: ConditionRule;
  /** The matching rule from the other side of a diff (for list comparison). */
  counterpart?: ConditionRule;
}) {
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

  // For list operators, try to parse and diff the RHS arrays
  const isList = LIST_OPERATORS.has(rule.function);
  const rhsExpr = rhs?.name ?? rhs?.expr ?? "";
  const listItems = isList ? tryParseList(rhsExpr) : null;
  const counterpartRhsExpr = counterpart?.params[1]?.name ?? counterpart?.params[1]?.expr ?? "";
  const counterpartList = isList && counterpart ? tryParseList(counterpartRhsExpr) : null;

  const diffedList = listItems ? diffLists(listItems, counterpartList) : null;

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
      {diffedList ? (
        <ListValuePills items={diffedList} />
      ) : rhs ? (
        <ParamValue
          expr={stripQuotes(rhs.expr)}
          name={rhs.name ? stripQuotes(rhs.name) : undefined}
        />
      ) : null}
    </div>
  );
}

// ── Recursive group ────────────────────────────────────────────────────────────

export type RuleHighlight = "changed" | "added" | "removed";

interface ConditionGroupViewProps {
  group: ConditionGroup;
  className?: string;
  /** Map of rule index → highlight kind for diff visualization. */
  ruleHighlights?: Map<number, RuleHighlight>;
  /** The matching group from the other side of a diff (for list value comparison). */
  counterpartGroup?: ConditionGroup;
  /** Which side of the diff this view is on (controls changed highlight color). */
  side?: DiffSide;
}

export type DiffSide = "before" | "after";

function getRuleHighlightStyle(highlight: RuleHighlight, side?: DiffSide): string {
  if (highlight === "changed") {
    return side === "after"
      ? "bg-success-light rounded px-1.5 -mx-1.5 border-l-2 border-success"
      : "bg-error-light rounded px-1.5 -mx-1.5 border-l-2 border-error";
  }
  if (highlight === "added") return "bg-success-light rounded px-1.5 -mx-1.5 border-l-2 border-success";
  return "bg-error-light rounded px-1.5 -mx-1.5 border-l-2 border-error line-through opacity-60";
}

export function ConditionGroupView({ group, className, ruleHighlights, counterpartGroup, side }: ConditionGroupViewProps) {
  const label = GROUP_LABELS[group.operator] ?? `${group.operator}:`;
  const borderColor = GROUP_BORDER[group.operator] ?? "border-border";

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
        {label}
      </span>
      <div className={cn("border-l-2 pl-3 flex flex-col gap-0.5", borderColor)}>
        {group.rules.map((rule, i) => {
          const highlight = ruleHighlights?.get(i);
          const highlightCls = highlight ? getRuleHighlightStyle(highlight, side) : undefined;
          const counterpartRule = counterpartGroup?.rules[i];

          if (isGroupWrapper(rule)) {
            return (
              <div
                key={i}
                className={cn(
                  rule.enabled === false && "opacity-40",
                  highlightCls,
                )}
                data-disabled={rule.enabled === false || undefined}
                data-highlight={highlight ?? undefined}
              >
                <ConditionGroupView group={rule.group} />
              </div>
            );
          }

          // Get counterpart rule for list diffing (only if it's also a plain rule, not a group)
          const counterpartPlainRule =
            highlight === "changed" && counterpartRule && !isGroupWrapper(counterpartRule)
              ? counterpartRule
              : undefined;

          return (
            <div key={i} className={highlightCls} data-highlight={highlight ?? undefined}>
              <RuleLine rule={rule} counterpart={counterpartPlainRule} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
