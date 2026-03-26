# Audit Trail: Condition & Action Visualization Design

**Date:** 2026-03-13
**Status:** Approved

## Problem

When viewing audit log entries for Rules and other entities, the `conditions` and `actions` arrays contain `logicJSON` strings — serialized expression trees and action definitions. These are currently rendered as raw JSON in the snapshot diff, making it nearly impossible to understand what actually changed.

## Goal

Deserialize and visually render conditions and actions inline within the audit trail snapshot diff, so changes are immediately obvious in human-readable form.

## Scope

All entity types that have conditions/actions arrays with `logicJSON` fields (Rule, Program, Flow, PursePolicy, etc.).

## Approach: Snapshot-level Deserialization

Intercept the snapshot viewer at the field level. When the diff encounters a field whose value is an array of objects containing `logicJSON`, render specialized components instead of raw JSON. Falls back to raw JSON for anything unparseable.

---

## Data Shapes

### Conditions (parsed from `logicJSON` string)

```ts
interface ConditionGroup {
  operator: "and" | "or" | "none";
  rules: Array<ConditionRule | { group: ConditionGroup; enabled?: boolean }>;
  enabled?: boolean;
}

interface ConditionRule {
  function: "eq" | "gt" | "gte" | "lt" | "lte" | "in" | "inl" | "innl" | "contains" | "expression" | "ne";
  params: Array<{ expr: string; name?: string; type?: string }>;
  enabled?: boolean;
}
```

### Actions (parsed from `logicJSON` string)

```ts
interface ActionItem {
  action: string;           // e.g., "addPoints", "upgrade", "customAction"
  params: Array<{ expr: string; name?: string }>;
  enabled?: boolean;
}
```

### Parse result

```ts
type ParsedLogic =
  | { kind: "condition-group"; data: ConditionGroup }
  | { kind: "action-list"; data: ActionItem[] }
  | null;  // unparseable → fallback to raw JSON
```

---

## Condition Renderer (`ConditionGroupView`)

Renders a parsed condition tree as nested, indented human-readable sentences.

### Visual structure

```
┌ ALL of:
│  ● Activity Type = "Accrual"
│  ● Expression: 111
│  ┌ ANY of:
│  │  ● Activity Value ≥ 10
│  │  ● Activity Value ≤ 100
│  └
└
```

### Rendering rules

- **Group node** (`operator`) → "ALL of:", "ANY of:", or "NONE of:" with a left border. Children indented inside.
- **Rule node** (`function` + `params`) → single line sentence:
  - LHS: `params[0].name` if present, else raw `params[0].expr` in monospace with a guessed label nearby (muted, italic, prefixed with "~")
  - Operator: mapped to symbol — `eq`→`=`, `ne`→`≠`, `gt`→`>`, `gte`→`≥`, `lt`→`<`, `lte`→`≤`, `in`→`in`, `inl`→`in list`, `innl`→`not in list`, `contains`→`contains`
  - RHS: `params[1].name` or `params[1].expr`, with quotes stripped from string literals (`'Accrual'`→`Accrual`)
- **Expression node** (`function: "expression"`) → "Expression: `{code}`" in monospace
- **Disabled rules** (`enabled: false`) → strikethrough + muted opacity

### Label guessing

When `name` is missing, attempt to extract a readable label from JSONPath:
- `$.Context.activity.type` → "Activity Type"
- `$.Context.member.purses[?(@.name == 'Points')]` → "Member Purses (Points)"

Show raw expression in monospace as the primary display, with the guessed label nearby in muted italic prefixed with `~`.

---

## Action Renderer (`ActionListView`)

Renders a parsed action array as a compact list with three rendering tiers.

### Tier 1 — Simple values (<~60 chars total)

Inline with `·` separators:
```
1. addPoints ✓    Points Purse · 1 · 100
```

### Tier 2 — Medium values (long JSONPath, >~80 chars total)

Inline but truncated, expandable to vertical:
```
2. transferIn ✓   $.Context.member.purses[?(@.na... · 50  ▸
```

### Tier 3 — Code blocks (functions, multi-line)

Always expanded vertically with monospace code block:
```
3. customAction ✓
   ┌──────────────────────────────────────────┐
   │ function actionParser(context, params) {  │
   │   var pts = context.activity.value * 2;   │
   │   return { points: pts };                 │
   │ }                                         │
   └──────────────────────────────────────────┘
```

### Complexity detection heuristic

- **Tier 3**: Any param `expr` contains `function`, `=>`, `{`, or `\n`
- **Tier 2**: Total param string length > ~80 chars
- **Tier 1**: Everything else

### Parameter display

- Label: `params[n].name` if present, otherwise "Param {n+1}"
- Value: `params[n].expr` with quotes stripped from string literals, raw JSONPath in monospace with guessed label nearby
- Empty params (`expr: ""`) shown as "—" in muted text
- Enabled/disabled shown as ✓/✗ indicator

### Diff for code blocks (Tier 3)

Diff at the text level — show code block with changed lines highlighted rather than marking the entire block as changed.

---

## Diff Orchestrator (`ConditionActionDiff`)

Takes `before` and `after` arrays (each containing `{_id, name, logicJSON}` items) and produces a grouped diff view.

### Matching

Items matched by `_id` (preferred) or by `name` (fallback) — not by array index, since items can be reordered.

### Grouping

Results grouped into: changed, added, removed, unchanged.

- **Changed**: Both before and after exist, parsed `logicJSON` differs. Show both rendered trees/lists — before in red-tinted background, after in green-tinted background.
- **Added**: Only in after. Full rendered view in green-tinted background.
- **Removed**: Only in before. Full rendered view in red-tinted background.
- **Unchanged**: Collapsed summary — "2 unchanged conditions" — expandable on click.

### Layout

Renders as a full-width row spanning both Before and After columns in the diff table:

```
conditions
┌──────────────────────────────────────────────────────────┐
│ ● "Main Condition" — changed                             │
│   Before:                          After:                │
│   ALL of:                          ALL of:               │
│     Activity Type = Accrual          Activity Type = Accrual  │
│     Activity Value ≥ 10              Activity Value ≥ 50      │ ← highlighted
│                                                          │
│ ▸ 1 unchanged condition                                  │
└──────────────────────────────────────────────────────────┘
```

---

## Integration into Snapshot Viewer

### Detection in `DiffValue`

Before falling back to JSON rendering, `DiffValue` checks:

1. If the field key is `conditions` or `actions` and the value is an array of objects with `logicJSON` → render through `ConditionActionDiff`
2. If the value is a string that `parseLogicJSON()` successfully parses → render inline through `ConditionGroupView` or `ActionListView`
3. Otherwise → existing JSON fallback

### Full-width rendering

Since conditions/actions need more width than a typical diff cell, `ConditionActionDiff` renders as a full-width row spanning both Before and After columns.

---

## File Structure

### New files

```
src/features/audit-logs/
  lib/
    parse-logic-json.ts          # parseLogicJSON(), guessLabelFromPath(),
                                 # operator symbols map, param complexity detection
  components/
    condition-group-view.tsx      # Recursive tree renderer for condition groups
    action-list-view.tsx          # Tiered action list renderer
    condition-action-diff.tsx     # Orchestrator: matches items, groups diffs,
                                 # renders full-width diff block
```

### Modified files

```
  components/
    audit-snapshot-viewer.tsx     # DiffValue checks for rich fields,
                                 # delegates to ConditionActionDiff
```

### Component hierarchy

```
AuditSnapshotViewer
  └─ InlineDiffTable
       └─ DiffValue (per cell)
            ├─ ConditionActionDiff (for conditions/actions arrays)
            │    ├─ ConditionGroupView (recursive, per matched pair)
            │    └─ ActionListView (per matched pair)
            └─ existing JSON/text fallback (for everything else)
```

### No new dependencies

Everything uses existing primitives (Badge, cn, Lucide icons). Code blocks for Tier 3 actions use styled `<pre>` — no syntax highlighting library.

---

## Testing

- **Unit tests** for `parse-logic-json.ts`: parsing valid/invalid logicJSON, label guessing from JSONPath, complexity tier detection
- **Component tests** for renderers: snapshot tests with sample data from legacy test fixtures, verifying correct rendering of all operator types, nested groups, disabled rules, all three action tiers
- **Edge cases**: malformed logicJSON (graceful fallback to raw JSON), empty conditions/actions arrays, conditions with only expression nodes (no structured rules)
