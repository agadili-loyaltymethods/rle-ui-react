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
import type { ActionItem, ActionParam, ActionHighlight } from "../lib/parse-logic-json";

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

// ── Full param properties (for diff view) ─────────────────────────────────────

/** Show all properties of a param, highlighting those that differ from counterpart. */
function ParamAllProperties({
  param,
  counterpartParam,
  index,
}: {
  param: ActionParam;
  counterpartParam?: ActionParam;
  index: number;
}) {
  // Collect all keys from both param and counterpart
  const allKeys = new Set([
    ...Object.keys(param),
    ...(counterpartParam ? Object.keys(counterpartParam) : []),
  ]);

  // Filter to relevant keys (skip inherited/prototype keys)
  const keys = [...allKeys].filter((k) => k !== "constructor" && k !== "__proto__");

  return (
    <div className="ml-6 flex flex-col gap-0.5">
      <span className="text-caption text-foreground-muted font-medium">Param {index + 1}:</span>
      {keys.map((k) => {
        const val = String((param as Record<string, unknown>)[k] ?? "");
        const counterVal = counterpartParam
          ? String((counterpartParam as Record<string, unknown>)[k] ?? "")
          : undefined;
        const isChanged =
          counterpartParam != null &&
          (!(k in param) || !(k in counterpartParam) || val !== counterVal);

        return (
          <div
            key={k}
            className={cn(
              "ml-4 flex items-baseline gap-1.5 py-0.5",
              isChanged && "bg-warning-light rounded px-1.5 -mx-1.5 border-l-2 border-warning",
            )}
          >
            <span className="text-caption text-foreground-muted">{k}:</span>
            <span className="text-caption text-foreground font-medium break-all">
              {val || <span className="text-foreground-tertiary italic">empty</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Highlight styles ──────────────────────────────────────────────────────────

export type DiffSide = "before" | "after";

function getHighlightStyle(highlight: ActionHighlight, side?: DiffSide): string {
  if (highlight === "changed") {
    return side === "after"
      ? "border-l-2 border-success bg-success-light/20 pl-2"
      : "border-l-2 border-error bg-error-light/20 pl-2";
  }
  if (highlight === "added") return "border-l-2 border-success bg-success-light/20 pl-2";
  return "border-l-2 border-error bg-error-light/20 pl-2";
}

// ── Single action row ──────────────────────────────────────────────────────────

function ActionRow({
  action,
  index,
  highlight,
  counterpartAction,
  side,
}: {
  action: ActionItem;
  index: number;
  highlight?: ActionHighlight;
  counterpartAction?: ActionItem;
  side?: DiffSide;
}) {
  const tier = getParamTier(action.params);
  const disabled = action.enabled === false;
  const [expanded, setExpanded] = useState(tier === 3);

  // When highlighted as "changed", show full param properties with diff
  if (highlight === "changed" && counterpartAction) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 rounded-md py-1.5 px-2",
          getHighlightStyle(highlight, side),
          disabled && "opacity-40",
        )}
        data-disabled={disabled || undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-caption text-foreground-tertiary">{index + 1}.</span>
          <Badge variant="secondary">{action.action}</Badge>
          <span className={cn("text-caption", disabled ? "text-error" : "text-success")}>
            {disabled ? "✗" : "✓"}
          </span>
        </div>
        {action.params.map((p, i) => (
          <ParamAllProperties
            key={i}
            param={p}
            counterpartParam={counterpartAction.params[i]}
            index={i}
          />
        ))}
      </div>
    );
  }

  // For tier 3, always render expanded with code block
  if (tier === 3) {
    const codeParam = action.params.find((p) => /function\s*\(|=>|\{|\n/.test(p.expr));
    return (
      <div
        className={cn(
          "flex flex-col gap-1",
          highlight && getHighlightStyle(highlight, side),
          highlight && "rounded-md py-1.5 px-2",
          disabled && "opacity-40",
        )}
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
      className={cn(
        "flex flex-col",
        highlight && getHighlightStyle(highlight, side),
        highlight && "rounded-md py-1.5 px-2",
        disabled && "opacity-40",
      )}
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
            data-testid="action-list-expand-params-btn"
            aria-label={expanded ? "Collapse parameters" : "Expand parameters"}
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
  highlights?: Map<number, ActionHighlight>;
  counterpartActions?: ActionItem[];
  side?: DiffSide;
}

export function ActionListView({
  actions,
  className,
  highlights,
  counterpartActions,
  side,
}: ActionListViewProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {actions.map((action, i) => (
        <ActionRow
          key={i}
          action={action}
          index={i}
          highlight={highlights?.get(i)}
          counterpartAction={counterpartActions?.[i]}
          side={side}
        />
      ))}
    </div>
  );
}
