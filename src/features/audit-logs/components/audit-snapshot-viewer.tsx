import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  isLogicJSONArray,
  parseLogicJSON,
  diffConditionRules,
  diffActionItems,
} from "../lib/parse-logic-json";
import type { ConditionGroup, ActionItem, ActionHighlight } from "../lib/parse-logic-json";
import { ConditionGroupView } from "./condition-group-view";
import type { RuleHighlight } from "./condition-group-view";
import { ActionListView } from "./action-list-view";
import { SchemaFieldColumnView, isSchemaField } from "./schema-field-diff";
import { deepEqual } from "../lib/deep-equal";
import type { AuditLog } from "../types/audit-log";

interface AuditSnapshotViewerProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  action: AuditLog["action"];
}

// ── Types ──────────────────────────────────────────────────────────────────────

type DiffKind = "unchanged" | "added" | "removed" | "changed";

interface DiffEntry {
  key: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
}

function buildDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffEntry[] {
  const HIDDEN_KEYS = new Set(["events"]);

  const entries: DiffEntry[] = [];
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const key of allKeys) {
    if (HIDDEN_KEYS.has(key)) continue;
    const inBefore = before != null && key in before;
    const inAfter = after != null && key in after;
    const bVal = inBefore ? before![key] : undefined;
    const aVal = inAfter ? after![key] : undefined;

    if (inBefore && !inAfter) {
      entries.push({ key, kind: "removed", before: bVal, after: undefined });
    } else if (!inBefore && inAfter) {
      entries.push({ key, kind: "added", before: undefined, after: aVal });
    } else if (deepEqual(bVal, aVal)) {
      entries.push({ key, kind: "unchanged", before: bVal, after: aVal });
    } else {
      entries.push({ key, kind: "changed", before: bVal, after: aVal });
    }
  }

  // Sort: changed/added/removed first, then unchanged
  const order: Record<DiffKind, number> = {
    changed: 0,
    added: 1,
    removed: 2,
    unchanged: 3,
  };
  entries.sort((a, b) => order[a.kind] - order[b.kind]);

  return entries;
}

function formatJson(value: unknown): string {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

// ── Diff row styles ────────────────────────────────────────────────────────────

const kindStyles: Record<DiffKind, { row: string; before: string; after: string; indicator: string }> = {
  unchanged: {
    row: "",
    before: "text-foreground-secondary",
    after: "text-foreground-secondary",
    indicator: "",
  },
  changed: {
    row: "",
    before: "bg-error-light/40 text-error",
    after: "bg-success-light/40 text-success",
    indicator: "text-warning",
  },
  added: {
    row: "",
    before: "text-foreground-tertiary",
    after: "bg-success-light/40 text-success",
    indicator: "text-success",
  },
  removed: {
    row: "",
    before: "bg-error-light/40 text-error",
    after: "text-foreground-tertiary",
    indicator: "text-error",
  },
};

const INDICATOR: Record<DiffKind, string> = {
  unchanged: "",
  changed: "~",
  added: "+",
  removed: "-",
};

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyJsonButton({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  const { t } = useTranslation("programs");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => { /* clipboard not available (permissions/non-HTTPS) — fail silently */ },
    );
  }, [data]);

  if (!data) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 cursor-pointer"
      title={t("auditLogs.snapshot.copyJson", { label })}
      onClick={handleCopy}
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-success" />
        : <Copy className="h-3.5 w-3.5" />
      }
    </Button>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DiffValue({ value, className }: { value: unknown; className?: string }) {
  const text = formatJson(value);
  if (!text) return <span className="text-foreground-tertiary italic">—</span>;

  const isMultiline = text.includes("\n");
  if (isMultiline) {
    return (
      <pre className={cn("whitespace-pre-wrap break-all font-mono text-caption", className)}>
        {text}
      </pre>
    );
  }
  return (
    <span className={cn("font-mono text-caption", className)}>{text}</span>
  );
}

// ── Logic item matching (for column-aligned conditions/actions) ──────────────

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

function matchLogicItems(before: LogicItem[], after: LogicItem[]): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  const matchedAfterIds = new Set<string>();

  for (const b of before) {
    const key = b._id || b.name || "";
    const a = after.find((x) => (x._id || x.name || "") === key);
    if (a) {
      matchedAfterIds.add(a._id || a.name || "");
      const same = b.logicJSON === a.logicJSON;
      pairs.push({ kind: same ? "unchanged" : "changed", name: b.name || key, before: b, after: a });
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

  const order: Record<MatchKind, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  pairs.sort((a, b) => order[a.kind] - order[b.kind]);
  return pairs;
}

/** Render a single side (before or after) of a logic item. */
function LogicCellContent({
  item,
  ruleHighlights,
  actionHighlights,
  counterpartItem,
  side,
}: {
  item: LogicItem;
  ruleHighlights?: Map<number, RuleHighlight>;
  actionHighlights?: Map<number, ActionHighlight>;
  counterpartItem?: LogicItem;
  side?: "before" | "after";
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
        side={side}
      />
    );
  }

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
      side={side}
    />
  );
}

const MATCH_BADGE_CLASS: Record<MatchKind, string> = {
  changed: "text-warning",
  added: "text-success",
  removed: "text-error",
  unchanged: "",
};

const MATCH_BADGE_KEY: Record<MatchKind, string> = {
  changed: "auditLogs.diff.changed",
  added: "auditLogs.diff.added",
  removed: "auditLogs.diff.removed",
  unchanged: "",
};

function InlineDiffTable({
  diff,
  showUnchanged,
  before,
  after,
}: {
  diff: DiffEntry[];
  showUnchanged: boolean;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const { t } = useTranslation("programs");
  const visible = showUnchanged ? diff : diff.filter((d) => d.kind !== "unchanged");
  const unchangedCount = diff.filter((d) => d.kind === "unchanged").length;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border bg-subtle">
            <th className="w-6 px-1.5 py-2 text-center font-medium text-foreground-muted" />
            <th className="px-3 py-2 text-left font-medium text-foreground-muted">{t("auditLogs.snapshot.field")}</th>
            <th className="px-3 py-2 text-left font-medium text-foreground-muted">
              <span className="inline-flex items-center gap-1.5">
                {t("auditLogs.snapshot.before")}
                <CopyJsonButton data={before} label={t("auditLogs.snapshot.before").toLowerCase()} />
              </span>
            </th>
            <th className="px-3 py-2 text-left font-medium text-foreground-muted">
              <span className="inline-flex items-center gap-1.5">
                {t("auditLogs.snapshot.after")}
                <CopyJsonButton data={after} label={t("auditLogs.snapshot.after").toLowerCase()} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry) => {
            const styles = kindStyles[entry.kind];
            const beforeIsLogic = isLogicJSONArray(entry.before);
            const afterIsLogic = isLogicJSONArray(entry.after);

            // Rich field: conditions/actions arrays with logicJSON
            if (beforeIsLogic || afterIsLogic) {
              const bItems = (beforeIsLogic ? entry.before : []) as LogicItem[];
              const aItems = (afterIsLogic ? entry.after : []) as LogicItem[];
              const pairs = matchLogicItems(bItems, aItems);

              return pairs.map((pair, pi) => {
                // Compute item-level highlights for changed pairs
                let beforeRuleHighlights: Map<number, RuleHighlight> | undefined;
                let afterRuleHighlights: Map<number, RuleHighlight> | undefined;
                let beforeActionHighlights: Map<number, ActionHighlight> | undefined;
                let afterActionHighlights: Map<number, ActionHighlight> | undefined;

                if (pair.kind === "changed" && pair.before?.logicJSON && pair.after?.logicJSON) {
                  const bParsed = parseLogicJSON(pair.before.logicJSON);
                  const aParsed = parseLogicJSON(pair.after.logicJSON);
                  if (bParsed?.kind === "condition-group" && aParsed?.kind === "condition-group") {
                    const d = diffConditionRules(bParsed.data as ConditionGroup, aParsed.data as ConditionGroup);
                    beforeRuleHighlights = d.beforeHighlights;
                    afterRuleHighlights = d.afterHighlights;
                  }
                  if (bParsed?.kind === "action-list" && aParsed?.kind === "action-list") {
                    const d = diffActionItems(bParsed.data as ActionItem[], aParsed.data as ActionItem[]);
                    beforeActionHighlights = d.beforeHighlights;
                    afterActionHighlights = d.afterHighlights;
                  }
                }

                const badgeKey = MATCH_BADGE_KEY[pair.kind];
                const badgeClass = MATCH_BADGE_CLASS[pair.kind];

                return (
                  <tr
                    key={`${entry.key}-${pair.name || pi}`}
                    className={cn(
                      "border-b border-subtle last:border-b-0",
                      pair.kind !== "unchanged" && "bg-subtle/30",
                    )}
                  >
                    <td className={cn("w-6 px-1.5 py-2 text-center font-mono text-caption font-bold align-top", styles.indicator)}>
                      {pi === 0 ? INDICATOR[entry.kind] : ""}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {pi === 0 && <div className="font-mono text-caption text-foreground">{entry.key}</div>}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-caption font-medium text-foreground">{pair.name}</span>
                        {badgeKey && (
                          <span className={cn("text-caption font-medium", badgeClass)}>{t(badgeKey)}</span>
                        )}
                      </div>
                    </td>
                    <td className={cn("px-3 py-2 align-top", pair.kind === "removed" && "bg-error-light/20")}>
                      {pair.before ? (
                        <LogicCellContent
                          item={pair.before}
                          ruleHighlights={beforeRuleHighlights}
                          actionHighlights={beforeActionHighlights}
                          counterpartItem={pair.after ?? undefined}
                          side="before"
                        />
                      ) : (
                        <span className="text-caption text-foreground-tertiary italic">—</span>
                      )}
                    </td>
                    <td className={cn("px-3 py-2 align-top", pair.kind === "added" && "bg-success-light/20")}>
                      {pair.after ? (
                        <LogicCellContent
                          item={pair.after}
                          ruleHighlights={afterRuleHighlights}
                          actionHighlights={afterActionHighlights}
                          counterpartItem={pair.before ?? undefined}
                          side="after"
                        />
                      ) : (
                        <span className="text-caption text-foreground-tertiary italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              });
            }

            // Rich field: extSchema / uiDef / inclusionParams / query
            if (isSchemaField(entry.key) && entry.kind !== "unchanged") {
              return (
                <tr
                  key={entry.key}
                  className={cn(
                    "border-b border-subtle last:border-b-0",
                    "bg-subtle/30",
                  )}
                >
                  <td className={cn("w-6 px-1.5 py-2 text-center font-mono text-caption font-bold align-top", styles.indicator)}>
                    {INDICATOR[entry.kind]}
                  </td>
                  <td className="px-3 py-2 font-mono text-caption text-foreground align-top">
                    {entry.key}
                  </td>
                  <td className={cn("px-3 py-2 align-top", styles.before)}>
                    <SchemaFieldColumnView
                      fieldKey={entry.key}
                      before={entry.before}
                      after={entry.after}
                      side="before"
                    />
                  </td>
                  <td className={cn("px-3 py-2 align-top", styles.after)}>
                    <SchemaFieldColumnView
                      fieldKey={entry.key}
                      before={entry.before}
                      after={entry.after}
                      side="after"
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

          {!showUnchanged && unchangedCount > 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-2 text-center text-caption text-foreground-tertiary italic">
                {t("auditLogs.snapshot.unchangedFieldsHidden", { count: unchangedCount })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Rich rendering for single snapshots (CREATE / DELETE) ───────────────────────

// ── Main component ─────────────────────────────────────────────────────────────

const EMPTY_OBJ: Record<string, unknown> = {};

export function AuditSnapshotViewer({ before, after, action }: AuditSnapshotViewerProps) {
  const { t } = useTranslation("programs");
  const [showUnchanged, setShowUnchanged] = useState(false);

  // For CREATE: treat as all "added" (before = empty)
  // For DELETE: treat as all "removed" (after = empty)
  // For UPDATE: normal diff
  const effectiveBefore = action === "CREATE" ? EMPTY_OBJ : before;
  const effectiveAfter = action === "DELETE" ? EMPTY_OBJ : after;

  const diff = useMemo(
    () => (effectiveBefore && effectiveAfter ? buildDiff(effectiveBefore, effectiveAfter) : null),
    [effectiveBefore, effectiveAfter],
  );

  if (diff) {
    const changedCount = diff.filter((d) => d.kind !== "unchanged").length;
    const unchangedCount = diff.filter((d) => d.kind === "unchanged").length;
    const snapshotData = action === "CREATE" ? after : action === "DELETE" ? before : null;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-caption text-foreground-muted">
            {action === "UPDATE"
              ? t("auditLogs.snapshot.changedAndUnchanged", { changed: changedCount, unchanged: unchangedCount })
              : t("auditLogs.snapshot.fieldCount", { count: changedCount })}
          </span>
          <div className="flex items-center gap-2">
            {unchangedCount > 0 && action === "UPDATE" && (
              <button
                type="button"
                data-testid="audit-snapshot-toggle-unchanged-btn"
                aria-label="Toggle unchanged fields visibility"
                className="text-caption text-brand hover:underline cursor-pointer"
                onClick={() => setShowUnchanged((v) => !v)}
              >
                {showUnchanged ? t("auditLogs.snapshot.hideUnchanged") : t("auditLogs.snapshot.showAllFields")}
              </button>
            )}
            {snapshotData && <CopyJsonButton data={snapshotData} label="snapshot" />}
          </div>
        </div>
        <InlineDiffTable
          diff={diff}
          showUnchanged={action !== "UPDATE" || showUnchanged}
          before={effectiveBefore as Record<string, unknown>}
          after={effectiveAfter as Record<string, unknown>}
        />
      </div>
    );
  }

  // Fallback: no data to display
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <span className="text-body-sm text-foreground-tertiary">{t("auditLogs.snapshot.noSnapshotData")}</span>
    </div>
  );
}
