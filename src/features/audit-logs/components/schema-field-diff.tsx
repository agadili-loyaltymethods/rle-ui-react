// src/features/audit-logs/components/schema-field-diff.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { deepEqual } from "../lib/deep-equal";

// ── Types ──────────────────────────────────────────────────────────────────────

type MatchKind = "changed" | "added" | "removed" | "unchanged";

interface FieldPair {
  kind: MatchKind;
  fieldName: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

// ── Parsing ────────────────────────────────────────────────────────────────────

/**
 * Extract the field map from a raw value.
 * - extSchema: { type: "object", properties: { ... } } → returns properties
 * - uiDef: { fieldName: { title, type, ... }, ... } → returns the object directly
 */
function extractFieldMap(
  raw: unknown,
  fieldKey: string,
): Record<string, Record<string, unknown>> | null {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;

  // extSchema has { type: "object", properties: { ... } }
  if (fieldKey === "extSchema" && obj.properties && typeof obj.properties === "object") {
    return obj.properties as Record<string, Record<string, unknown>>;
  }

  // uiDef / inclusionParams: flat map of field definitions
  if (fieldKey === "uiDef" || fieldKey === "inclusionParams") {
    const result: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        result[k] = v as Record<string, unknown>;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  return null;
}

// ── Matching ───────────────────────────────────────────────────────────────────

function matchFields(
  before: Record<string, Record<string, unknown>> | null,
  after: Record<string, Record<string, unknown>> | null,
): FieldPair[] {
  const pairs: FieldPair[] = [];
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const key of allKeys) {
    const bVal = before?.[key] ?? null;
    const aVal = after?.[key] ?? null;

    if (bVal && !aVal) {
      pairs.push({ kind: "removed", fieldName: key, before: bVal, after: null });
    } else if (!bVal && aVal) {
      pairs.push({ kind: "added", fieldName: key, before: null, after: aVal });
    } else if (bVal && aVal) {
      pairs.push({
        kind: deepEqual(bVal, aVal) ? "unchanged" : "changed",
        fieldName: key,
        before: bVal,
        after: aVal,
      });
    }
  }

  const order: Record<MatchKind, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  pairs.sort((a, b) => order[a.kind] - order[b.kind]);

  return pairs;
}

// ── Property rendering ─────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(String).join(", ")}]`;
  return String(v ?? "");
}

/** Render all properties of a field definition, highlighting ones that differ from counterpart. */
function FieldProperties({
  def,
  counterpart,
}: {
  def: Record<string, unknown>;
  counterpart?: Record<string, unknown> | null;
  side?: "before" | "after";
}) {

  return (
    <div className="flex flex-col gap-0.5">
      {Object.entries(def).map(([k, v]) => {
        const val = formatValue(v);
        const counterVal = counterpart ? formatValue(counterpart[k]) : null;
        const isChanged = counterpart != null && (!(k in counterpart) || counterVal !== val);

        return (
          <div
            key={k}
            className={cn(
              "flex items-baseline gap-1.5 py-0.5",
              isChanged && "bg-warning-light rounded px-1.5 -mx-1.5 border-l-2 border-warning",
            )}
          >
            <span className="text-caption text-foreground-muted">{k}:</span>
            <span className="text-caption text-foreground font-medium">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Simple property list without highlights (for added/removed/unchanged). */
function FieldDefView({ def }: { def: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-0.5">
      {Object.entries(def).map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-1.5 py-0.5">
          <span className="text-caption text-foreground-muted">{k}:</span>
          <span className="text-caption text-foreground">{formatValue(v)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Diff pair row ──────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<MatchKind, string> = {
  changed: "text-warning",
  added: "text-success",
  removed: "text-error",
  unchanged: "text-foreground-muted",
};

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <span className="text-caption text-foreground-tertiary italic">{label}</span>
    </div>
  );
}

function DiffPairRow({ pair }: { pair: FieldPair }) {
  const { t } = useTranslation("programs");

  if (pair.kind === "added") {
    return (
      <div className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-caption font-medium text-foreground">{pair.fieldName}</span>
          <span className="text-caption text-success font-medium">{t("auditLogs.diff.added")}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-subtle/50 p-2">
            <div className="mb-1 text-caption font-medium text-foreground-muted">{t("auditLogs.snapshot.before")}</div>
            <EmptyPanel label={t("auditLogs.snapshot.fieldDidNotExist")} />
          </div>
          <div className="rounded-md bg-success-light/20 p-2">
            <div className="mb-1 text-caption font-medium text-success">{t("auditLogs.snapshot.after")}</div>
            <FieldDefView def={pair.after!} />
          </div>
        </div>
      </div>
    );
  }

  if (pair.kind === "removed") {
    return (
      <div className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-caption font-medium text-foreground">{pair.fieldName}</span>
          <span className="text-caption text-error font-medium">{t("auditLogs.diff.removed")}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-error-light/20 p-2">
            <div className="mb-1 text-caption font-medium text-error">{t("auditLogs.snapshot.before")}</div>
            <FieldDefView def={pair.before!} />
          </div>
          <div className="rounded-md bg-subtle/50 p-2">
            <div className="mb-1 text-caption font-medium text-foreground-muted">{t("auditLogs.snapshot.after")}</div>
            <EmptyPanel label={t("auditLogs.snapshot.fieldRemoved")} />
          </div>
        </div>
      </div>
    );
  }

  // Changed — side-by-side Before / After (matching conditions diff style)
  if (pair.kind === "changed") {
    return (
      <div className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-caption font-medium text-foreground">{pair.fieldName}</span>
          <span className={cn("text-caption font-medium", BADGE_STYLES[pair.kind])}>{t("auditLogs.diff.changed")}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-error-light/20 p-2">
            <div className="mb-1 text-caption font-medium text-error">{t("auditLogs.snapshot.before")}</div>
            <FieldProperties def={pair.before!} counterpart={pair.after} side="before" />
          </div>
          <div className="rounded-md bg-success-light/20 p-2">
            <div className="mb-1 text-caption font-medium text-success">{t("auditLogs.snapshot.after")}</div>
            <FieldProperties def={pair.after!} counterpart={pair.before} side="after" />
          </div>
        </div>
      </div>
    );
  }

  // Unchanged
  return (
    <div className="rounded-md bg-subtle/50 p-3">
      <div className="mb-1.5 text-caption font-medium text-foreground-muted">{pair.fieldName}</div>
      <FieldDefView def={pair.after ?? pair.before!} />
    </div>
  );
}

// ── JSON string diff (for query and similar single-object JSON strings) ────────

function parseJsonString(raw: unknown): unknown | null {
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as unknown; } catch { return null; }
  }
  if (typeof raw === "object" && raw !== null) return raw;
  return null;
}

/**
 * Simple line-level diff: mark each line as same/changed/added/removed.
 * Uses index-based alignment with LCS-like matching for best results.
 */
function computeLineDiff(
  bLines: string[],
  aLines: string[],
): { before: Array<{ text: string; kind: "same" | "removed" | "changed" }>; after: Array<{ text: string; kind: "same" | "added" | "changed" }> } {
  const bSet = new Set(bLines);
  const aSet = new Set(aLines);

  // Walk both arrays aligned by index
  const maxLen = Math.max(bLines.length, aLines.length);
  const before: Array<{ text: string; kind: "same" | "removed" | "changed" }> = [];
  const after: Array<{ text: string; kind: "same" | "added" | "changed" }> = [];

  for (let i = 0; i < maxLen; i++) {
    const bLine = i < bLines.length ? bLines[i] : undefined;
    const aLine = i < aLines.length ? aLines[i] : undefined;

    if (bLine !== undefined && aLine !== undefined) {
      if (bLine === aLine) {
        before.push({ text: bLine, kind: "same" });
        after.push({ text: aLine, kind: "same" });
      } else {
        // Lines at same position differ
        before.push({ text: bLine, kind: aSet.has(bLine) ? "same" : "changed" });
        after.push({ text: aLine, kind: bSet.has(aLine) ? "same" : "changed" });
      }
    } else if (bLine !== undefined) {
      before.push({ text: bLine, kind: "removed" });
    } else if (aLine !== undefined) {
      after.push({ text: aLine, kind: "added" });
    }
  }

  return { before, after };
}

/** Render JSON lines with per-line diff highlighting. */
function JsonDiffLines({ lines }: {
  lines: Array<{ text: string; kind: string }>;
  side?: "before" | "after";
}) {
  return (
    <pre className="overflow-auto font-mono text-caption whitespace-pre break-all">
      {lines.map((line, i) => {
        const isHighlighted = line.kind !== "same";
        const highlightClass = "bg-warning-light/60 text-warning";

        return (
          <div
            key={i}
            className={cn(
              "px-1 -mx-1 rounded-sm",
              isHighlighted ? highlightClass : "text-foreground-secondary",
            )}
          >
            {line.text}
          </div>
        );
      })}
    </pre>
  );
}

/** Side-by-side formatted JSON diff with line-level highlighting. */
function JsonStringDiff({ before, after }: { before: unknown; after: unknown }) {
  const { t } = useTranslation("programs");
  const bParsed = parseJsonString(before);
  const aParsed = parseJsonString(after);

  if (bParsed == null && aParsed == null) return null;

  const bJson = bParsed != null ? JSON.stringify(bParsed, null, 2) : null;
  const aJson = aParsed != null ? JSON.stringify(aParsed, null, 2) : null;

  // Both exist — side-by-side diff with line highlighting
  if (bJson != null && aJson != null) {
    const isChanged = bJson !== aJson;
    if (!isChanged) {
      return (
        <div className="rounded-md border border-border p-3">
          <pre className="overflow-auto font-mono text-caption text-foreground-secondary whitespace-pre-wrap break-all">
            {aJson}
          </pre>
        </div>
      );
    }

    const bLines = bJson.split("\n");
    const aLines = aJson.split("\n");
    const diff = computeLineDiff(bLines, aLines);

    return (
      <div className="rounded-md border border-border p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-subtle/30 p-2">
            <div className="mb-1 text-caption font-medium text-error">{t("auditLogs.snapshot.before")}</div>
            <JsonDiffLines lines={diff.before} side="before" />
          </div>
          <div className="rounded-md bg-subtle/30 p-2">
            <div className="mb-1 text-caption font-medium text-success">{t("auditLogs.snapshot.after")}</div>
            <JsonDiffLines lines={diff.after} side="after" />
          </div>
        </div>
      </div>
    );
  }

  // Only one side exists
  const json = aJson ?? bJson!;
  const isAdded = aJson != null;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className={cn("rounded-md p-2", isAdded ? "bg-subtle/50" : "bg-subtle/30")}>
          <div className={cn("mb-1 text-caption font-medium", isAdded ? "text-foreground-muted" : "text-error")}>
            {t("auditLogs.snapshot.before")}
          </div>
          {isAdded
            ? <EmptyPanel label={t("auditLogs.snapshot.fieldDidNotExist")} />
            : <pre className="overflow-auto font-mono text-caption text-foreground-secondary whitespace-pre break-all">{json}</pre>}
        </div>
        <div className={cn("rounded-md p-2", isAdded ? "bg-subtle/30" : "bg-subtle/50")}>
          <div className={cn("mb-1 text-caption font-medium", isAdded ? "text-success" : "text-foreground-muted")}>
            {t("auditLogs.snapshot.after")}
          </div>
          {isAdded
            ? <pre className="overflow-auto font-mono text-caption text-foreground-secondary whitespace-pre break-all">{json}</pre>
            : <EmptyPanel label={t("auditLogs.snapshot.fieldRemoved")} />}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SchemaFieldDiffProps {
  fieldKey: string;
  before: unknown;
  after: unknown;
}

export function SchemaFieldDiff({ fieldKey, before, after }: SchemaFieldDiffProps) {
  const { t } = useTranslation("programs");
  const [showUnchanged, setShowUnchanged] = useState(false);

  // For `query`: render as side-by-side JSON diff (single object, not a field map)
  if (fieldKey === "query") {
    return <JsonStringDiff before={before} after={after} />;
  }

  const beforeMap = extractFieldMap(before, fieldKey);
  const afterMap = extractFieldMap(after, fieldKey);

  // If we can't parse either side, fall back to null (caller renders raw JSON)
  if (!beforeMap && !afterMap) return null;

  const pairs = matchFields(beforeMap, afterMap);
  const changed = pairs.filter((p) => p.kind !== "unchanged");
  const unchanged = pairs.filter((p) => p.kind === "unchanged");

  return (
    <div className="flex flex-col gap-2">
      {changed.map((pair, i) => (
        <DiffPairRow key={pair.fieldName || i} pair={pair} />
      ))}

      {unchanged.length > 0 && (
        <button
          type="button"
          data-testid="audit-schema-toggle-unchanged-fields-btn"
          aria-label="Toggle unchanged schema fields visibility"
          className="flex items-center gap-1.5 text-caption text-foreground-muted hover:text-foreground cursor-pointer py-1"
          onClick={() => setShowUnchanged((v) => !v)}
        >
          {showUnchanged
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
          {t("auditLogs.diff.unchangedFields", { count: unchanged.length })}
        </button>
      )}

      {showUnchanged && unchanged.map((pair, i) => (
        <DiffPairRow key={pair.fieldName || i} pair={pair} />
      ))}
    </div>
  );
}

// ── Column-aligned view (renders one side for table column alignment) ────────

/** Render one side of a field-map diff pair. */
function FieldPairSideView({ pair, side }: { pair: FieldPair; side: "before" | "after" }) {
  const { t } = useTranslation("programs");
  const def = side === "before" ? pair.before : pair.after;
  const counterpart = side === "before" ? pair.after : pair.before;

  if (!def) {
    return (
      <span className="text-caption text-foreground-tertiary italic">
        {side === "before" ? t("auditLogs.snapshot.fieldDidNotExist") : t("auditLogs.snapshot.fieldRemoved")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-caption font-medium text-foreground">{pair.fieldName}</span>
        {pair.kind !== "unchanged" && (
          <span className={cn("text-caption font-medium", BADGE_STYLES[pair.kind])}>{pair.kind}</span>
        )}
      </div>
      {pair.kind === "changed" ? (
        <FieldProperties def={def} counterpart={counterpart} side={side} />
      ) : (
        <FieldDefView def={def} />
      )}
    </div>
  );
}

/** Render one side of a JSON query diff. */
function QueryColumnView({ before, after, side }: { before: unknown; after: unknown; side: "before" | "after" }) {
  const bParsed = parseJsonString(before);
  const aParsed = parseJsonString(after);
  const bJson = bParsed != null ? JSON.stringify(bParsed, null, 2) : null;
  const aJson = aParsed != null ? JSON.stringify(aParsed, null, 2) : null;

  const myJson = side === "before" ? bJson : aJson;
  const otherJson = side === "before" ? aJson : bJson;

  if (myJson == null) {
    return <span className="text-caption text-foreground-tertiary italic">{side === "before" ? "—" : "—"}</span>;
  }

  // No diff needed — identical or only one side
  if (otherJson == null || myJson === otherJson) {
    return (
      <pre className="overflow-auto font-mono text-caption text-foreground-secondary whitespace-pre break-all">
        {myJson}
      </pre>
    );
  }

  // Compute line diff and show just this side
  const bLines = bJson!.split("\n");
  const aLines = aJson!.split("\n");
  const diff = computeLineDiff(bLines, aLines);

  return <JsonDiffLines lines={side === "before" ? diff.before : diff.after} side={side} />;
}

/**
 * Render one side (before or after) of a schema field diff, for use in table columns.
 * Both `before` and `after` values are needed to compute the diff, but only `side` is rendered.
 */
export function SchemaFieldColumnView({
  fieldKey,
  before,
  after,
  side,
}: {
  fieldKey: string;
  before: unknown;
  after: unknown;
  side: "before" | "after";
}) {
  const { t } = useTranslation("programs");

  if (fieldKey === "query") {
    return <QueryColumnView before={before} after={after} side={side} />;
  }

  const beforeMap = extractFieldMap(before, fieldKey);
  const afterMap = extractFieldMap(after, fieldKey);

  if (!beforeMap && !afterMap) return null;

  const pairs = matchFields(beforeMap, afterMap);
  const changed = pairs.filter((p) => p.kind !== "unchanged");

  if (changed.length === 0) {
    return <span className="text-caption text-foreground-tertiary italic">{t("auditLogs.snapshot.noChanges")}</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {changed.map((pair) => (
        <FieldPairSideView key={pair.fieldName} pair={pair} side={side} />
      ))}
    </div>
  );
}

// ── Detection ──────────────────────────────────────────────────────────────────

const SCHEMA_FIELD_KEYS = new Set(["extSchema", "uiDef", "query", "inclusionParams"]);

/** Check if a diff entry key is a schema field that should use rich rendering. */
export function isSchemaField(key: string): boolean {
  return SCHEMA_FIELD_KEYS.has(key);
}
