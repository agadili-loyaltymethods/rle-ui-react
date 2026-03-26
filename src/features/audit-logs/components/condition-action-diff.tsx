// src/features/audit-logs/components/condition-action-diff.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { parseLogicJSON, diffConditionRules, diffActionItems } from "../lib/parse-logic-json";
import type { ConditionGroup, ActionItem, ActionHighlight } from "../lib/parse-logic-json";
import { ConditionGroupView } from "./condition-group-view";
import type { RuleHighlight } from "./condition-group-view";
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

function RenderedLogic({
  item,
  ruleHighlights,
  actionHighlights,
  counterpartItem,
}: {
  item: LogicItem;
  ruleHighlights?: Map<number, RuleHighlight>;
  actionHighlights?: Map<number, ActionHighlight>;
  counterpartItem?: LogicItem;
}) {
  const { t } = useTranslation("programs");
  if (!item.logicJSON) {
    return <span className="text-caption text-foreground-tertiary italic">{t("auditLogs.snapshot.noLogicDefined")}</span>;
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
    // Parse counterpart for list-level diffing
    const counterpartParsed = counterpartItem?.logicJSON
      ? parseLogicJSON(counterpartItem.logicJSON)
      : null;
    const counterpartGroup =
      counterpartParsed?.kind === "condition-group" ? counterpartParsed.data : undefined;

    return (
      <ConditionGroupView
        group={parsed.data}
        ruleHighlights={ruleHighlights}
        counterpartGroup={counterpartGroup}
      />
    );
  }

  // Parse counterpart actions for diff highlighting
  const counterpartParsed = counterpartItem?.logicJSON
    ? parseLogicJSON(counterpartItem.logicJSON)
    : null;
  const counterpartActions =
    counterpartParsed?.kind === "action-list" ? counterpartParsed.data : undefined;

  return (
    <ActionListView
      actions={parsed.data}
      highlights={actionHighlights}
      counterpartActions={counterpartActions}
    />
  );
}

// ── Diff item row ──────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<MatchKind, string> = {
  changed: "text-warning",
  added: "text-success",
  removed: "text-error",
  unchanged: "text-foreground-muted",
};

function DiffPairRow({ pair }: { pair: MatchedPair }) {
  const { t } = useTranslation("programs");

  if (pair.kind === "added") {
    return (
      <div className="rounded-md bg-success-light/30 p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-caption font-medium text-foreground">{pair.name}</span>
          <span className="text-caption text-success font-medium">{t("auditLogs.diff.added")}</span>
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
          <span className="text-caption text-error font-medium">{t("auditLogs.diff.removed")}</span>
        </div>
        <RenderedLogic item={pair.before!} />
      </div>
    );
  }

  // Changed — show before and after side by side, with rule/action-level highlights
  let beforeRuleHighlights: Map<number, RuleHighlight> | undefined;
  let afterRuleHighlights: Map<number, RuleHighlight> | undefined;
  let beforeActionHighlights: Map<number, ActionHighlight> | undefined;
  let afterActionHighlights: Map<number, ActionHighlight> | undefined;

  // Compute item-level diff for condition groups or action lists
  if (pair.before?.logicJSON && pair.after?.logicJSON) {
    const bParsed = parseLogicJSON(pair.before.logicJSON);
    const aParsed = parseLogicJSON(pair.after.logicJSON);
    if (bParsed?.kind === "condition-group" && aParsed?.kind === "condition-group") {
      const diff = diffConditionRules(
        bParsed.data as ConditionGroup,
        aParsed.data as ConditionGroup,
      );
      beforeRuleHighlights = diff.beforeHighlights;
      afterRuleHighlights = diff.afterHighlights;
    }
    if (bParsed?.kind === "action-list" && aParsed?.kind === "action-list") {
      const diff = diffActionItems(
        bParsed.data as ActionItem[],
        aParsed.data as ActionItem[],
      );
      beforeActionHighlights = diff.beforeHighlights;
      afterActionHighlights = diff.afterHighlights;
    }
  }

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
          <div className="mb-1 text-caption font-medium text-error">{t("auditLogs.snapshot.before")}</div>
          <RenderedLogic item={pair.before!} ruleHighlights={beforeRuleHighlights} actionHighlights={beforeActionHighlights} counterpartItem={pair.after!} />
        </div>
        <div className="rounded-md bg-success-light/20 p-2">
          <div className="mb-1 text-caption font-medium text-success">{t("auditLogs.snapshot.after")}</div>
          <RenderedLogic item={pair.after!} ruleHighlights={afterRuleHighlights} actionHighlights={afterActionHighlights} counterpartItem={pair.before!} />
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
  const { t } = useTranslation("programs");
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
          data-testid={`audit-diff-toggle-unchanged-${fieldKey}-btn`}
          aria-label={`Toggle unchanged ${fieldKey} visibility`}
          className="flex items-center gap-1.5 text-caption text-foreground-muted hover:text-foreground cursor-pointer py-1"
          onClick={() => setShowUnchanged((v) => !v)}
        >
          {showUnchanged
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
          {t("auditLogs.diff.unchangedItems", { count: unchanged.length, item: fieldKey.replace(/s$/, "") })}
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
