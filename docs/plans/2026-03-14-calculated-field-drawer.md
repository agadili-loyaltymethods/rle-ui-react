# Calculated Field Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `CalculatedFieldModal` with a right-side drawer that has an operator toolbar, expression textarea with autocomplete, and a searchable collapsible field palette.

**Architecture:** Rewrite `calculated-field-modal.tsx` as `calculated-field-drawer.tsx` — a full-height right-side panel using Radix Dialog with custom positioning. The expression textarea tracks cursor position via a ref. A `FieldPalette` sub-component renders collapsible, searchable field groups. An autocomplete dropdown filters fields as the user types. The edit page's import and props stay the same (rename only).

**Tech Stack:** React 19, Radix Dialog, Lucide icons, existing shared components (Input, Button, Badge, Select), `calc-expression.ts` utilities

---

### Task 1: Create the CalculatedFieldDrawer component shell

**Files:**
- Create: `src/features/programs/components/calculated-field-drawer.tsx`

**Step 1: Create the drawer with Radix Dialog right-side positioning**

Create the file with the same props interface as `CalculatedFieldModal` (renamed to `CalculatedFieldDrawerProps`), same state variables, same `useEffect` reset, same validation logic, same `handleSave`/filter handlers. Change only the Dialog.Content positioning from centered modal to right-side drawer:

```tsx
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ChevronDown, ChevronRight, Divide, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { generateObjectId } from "@/shared/lib/format-utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";
import { validateExpression } from "../lib/calc-expression";
import {
  CALC_KIND_OPTIONS,
  CALC_AGGREGATION_OPTIONS,
  CALC_SOURCE_OPTIONS,
  CALC_FILTER_OPERATOR_OPTIONS,
} from "../types/activity-template-config";
import type {
  CalculatedFieldDef,
  CalcFilter,
  CalcFilterOperator,
} from "../types/activity-template-config";
import type { FieldOption } from "@/shared/types/schema";
```

The Dialog.Content class should be:
```tsx
className="fixed right-0 top-0 z-[var(--z-modal)] h-full w-full max-w-[480px] border-l border-border bg-card shadow-modal flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
```

The internal layout is three sections:
1. **Header** — sticky top, border-b, title + X button
2. **Body** — `flex-1 overflow-y-auto p-6 space-y-4` — all form content goes here
3. **Footer** — sticky bottom, border-t, Cancel + Save buttons

Copy all the form state, validation, and save logic from `calculated-field-modal.tsx`. Add a `textareaRef = React.useRef<HTMLTextAreaElement>(null)` for cursor tracking.

**Step 2: Add the Basics section in the body**

Same as the modal: Name input, Label input (stacked vertically, not grid — drawer is narrow), Kind toggle, Description textarea.

**Step 3: Add the Expression section with operator toolbar**

After the divider, add:

```tsx
{/* Expression Section */}
<div>
  <label className="mb-1.5 block text-label font-medium text-foreground">
    Expression <span className="text-error">*</span>
  </label>
  {/* Operator toolbar */}
  <div className="flex gap-1 mb-2">
    {[
      { label: "+", value: " + " },
      { label: "−", value: " - " },
      { label: "×", value: " * " },
      { label: "÷", value: " / " },
      { label: "(", value: "(" },
      { label: ")", value: ")" },
    ].map((op) => (
      <button
        key={op.label}
        type="button"
        onClick={() => insertAtCursor(op.value)}
        className={cn(
          "h-8 w-8 rounded-md border border-border text-body-sm font-medium",
          "text-foreground-muted hover:bg-subtle hover:text-foreground",
          "transition-colors cursor-pointer flex items-center justify-center",
        )}
        data-testid={`calc-op-${op.label}`}
      >
        {op.label}
      </button>
    ))}
  </div>
  {/* Expression textarea */}
  <textarea
    ref={textareaRef}
    value={expression}
    onChange={(e) => setExpression(e.target.value)}
    onKeyDown={handleExpressionKeyDown}
    rows={3}
    placeholder={kind === "scalar" ? "e.g. value * 0.1" : "e.g. itemAmount"}
    data-testid="calc-field-expression"
    className={cn(
      "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm font-mono",
      "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
      "border",
      expressionError ? "border-error" : "border-[var(--input-border)]",
      "placeholder:text-foreground-muted resize-none",
      "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
    )}
  />
  {expressionError && <p className="mt-1 text-caption text-error">{expressionError}</p>}
</div>
```

Add the `insertAtCursor` helper function inside the component:

```typescript
const insertAtCursor = (text: string) => {
  const ta = textareaRef.current;
  if (!ta) { setExpression((prev) => prev + text); return; }
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = expression.slice(0, start);
  const after = expression.slice(end);
  const newExpr = before + text + after;
  setExpression(newExpr);
  // Restore cursor position after React re-render
  requestAnimationFrame(() => {
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.focus();
  });
};
```

**Step 4: Add the autocomplete dropdown for the expression**

Add state for the autocomplete:
```typescript
const [showAutocomplete, setShowAutocomplete] = React.useState(false);
const [autocompleteFilter, setAutocompleteFilter] = React.useState("");
const [autocompleteIndex, setAutocompleteIndex] = React.useState(0);
```

Build the list of all insertable fields (grouped flat for autocomplete):
```typescript
const allFieldOptions = React.useMemo(() => {
  const fields: { value: string; label: string; group: string }[] = [];
  for (const f of activityFieldOptions) {
    if (f.value.startsWith("lineItems.")) {
      fields.push({ value: f.value, label: f.label, group: "Line Items" });
    } else if (f.value.startsWith("tenderItems.")) {
      fields.push({ value: f.value, label: f.label, group: "Tender Items" });
    } else {
      fields.push({ value: f.value, label: f.label, group: "Activity" });
    }
  }
  for (const n of calcFieldNames) {
    fields.push({ value: n, label: n, group: "Calculated" });
  }
  return fields;
}, [activityFieldOptions, calcFieldNames]);
```

Derive the word currently being typed at the cursor to use as the autocomplete filter. On every expression change, extract the partial token at the cursor:

```typescript
const currentToken = React.useMemo(() => {
  const ta = textareaRef.current;
  if (!ta) return "";
  const pos = ta.selectionStart;
  const before = expression.slice(0, pos);
  const match = before.match(/[a-zA-Z_][\w.]*$/);
  return match ? match[0] : "";
}, [expression]);
```

Note: `currentToken` depends on cursor position which doesn't trigger re-renders. Instead, compute it inside the `onChange` handler and store it in state:

```typescript
const [cursorToken, setCursorToken] = React.useState("");

// In the onChange handler for expression:
const handleExpressionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const val = e.target.value;
  setExpression(val);
  const pos = e.target.selectionStart;
  const before = val.slice(0, pos);
  const match = before.match(/[a-zA-Z_][\w.]*$/);
  const token = match ? match[0] : "";
  setCursorToken(token);
  setShowAutocomplete(token.length > 0);
  setAutocompleteIndex(0);
};
```

Filter `allFieldOptions` by `cursorToken`:
```typescript
const autocompleteMatches = React.useMemo(() => {
  if (!cursorToken) return [];
  const lower = cursorToken.toLowerCase();
  return allFieldOptions.filter(
    (f) => f.value.toLowerCase().includes(lower) || f.label.toLowerCase().includes(lower),
  ).slice(0, 10);
}, [cursorToken, allFieldOptions]);
```

Add an `insertAutocompleteField` function that replaces the partial token with the full field name:
```typescript
const insertAutocompleteField = (fieldValue: string) => {
  const ta = textareaRef.current;
  if (!ta) return;
  const pos = ta.selectionStart;
  const before = expression.slice(0, pos);
  const after = expression.slice(pos);
  const tokenStart = before.search(/[a-zA-Z_][\w.]*$/);
  const newBefore = tokenStart >= 0 ? before.slice(0, tokenStart) : before;
  const newExpr = newBefore + fieldValue + after;
  setExpression(newExpr);
  setShowAutocomplete(false);
  setCursorToken("");
  requestAnimationFrame(() => {
    const newPos = newBefore.length + fieldValue.length;
    ta.selectionStart = ta.selectionEnd = newPos;
    ta.focus();
  });
};
```

Add keyboard navigation (`handleExpressionKeyDown`):
```typescript
const handleExpressionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (!showAutocomplete || autocompleteMatches.length === 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setAutocompleteIndex((i) => Math.min(i + 1, autocompleteMatches.length - 1));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setAutocompleteIndex((i) => Math.max(i - 1, 0));
  } else if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    const match = autocompleteMatches[autocompleteIndex];
    if (match) insertAutocompleteField(match.value);
  } else if (e.key === "Escape") {
    setShowAutocomplete(false);
  }
};
```

Render the autocomplete dropdown positioned absolutely below the textarea:
```tsx
{/* Autocomplete dropdown */}
{showAutocomplete && autocompleteMatches.length > 0 && (
  <div className="relative">
    <div className="absolute left-0 right-0 top-0 z-10 rounded-md border border-border bg-card shadow-modal max-h-[var(--height-dropdown-max)] overflow-y-auto">
      {autocompleteMatches.map((match, i) => (
        <button
          key={match.value}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertAutocompleteField(match.value); }}
          className={cn(
            "flex w-full items-center justify-between px-3 py-1.5 text-left cursor-pointer",
            i === autocompleteIndex ? "bg-subtle" : "hover:bg-subtle",
          )}
        >
          <span className="text-body-sm font-mono text-foreground truncate">{match.value}</span>
          <span className="text-caption text-foreground-muted ml-2 shrink-0">{match.group}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

Place this immediately after the expression textarea (before the error message). Use `onMouseDown` with `preventDefault()` so the textarea doesn't lose focus.

**Step 5: Add the Field Palette section**

After the autocomplete / expression error, add a searchable collapsible field palette:

```tsx
{/* Field Palette */}
<div>
  <label className="mb-1.5 block text-label font-medium text-foreground">Fields</label>
  <div className="relative mb-2">
    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted pointer-events-none" />
    <input
      type="text"
      value={paletteSearch}
      onChange={(e) => setPaletteSearch(e.target.value)}
      placeholder="Search fields..."
      className={cn(
        "w-full bg-[var(--input-bg)] text-foreground text-body-sm",
        "rounded-[var(--input-radius)] pl-8 pr-3 py-1.5",
        "border border-[var(--input-border)]",
        "placeholder:text-foreground-muted",
        "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
      )}
      data-testid="calc-palette-search"
    />
  </div>
  <div className="rounded-lg border border-border overflow-hidden">
    {paletteGroups.map((group) => (
      <FieldGroup
        key={group.label}
        label={group.label}
        fields={group.fields}
        search={paletteSearch}
        onInsert={insertAtCursor}
      />
    ))}
  </div>
</div>
```

Add state:
```typescript
const [paletteSearch, setPaletteSearch] = React.useState("");
```

Build palette groups:
```typescript
const paletteGroups = React.useMemo(() => {
  const activity: FieldOption[] = [];
  const lineItems: FieldOption[] = [];
  const tenderItems: FieldOption[] = [];
  for (const f of activityFieldOptions) {
    if (f.value.startsWith("lineItems.")) lineItems.push(f);
    else if (f.value.startsWith("tenderItems.")) tenderItems.push(f);
    else activity.push(f);
  }
  const calc = calcFieldNames.map((n) => ({ value: n, label: n, fieldType: "number" as const }));

  return [
    { label: "Activity Fields", fields: activity },
    { label: "Line Item Fields", fields: lineItems },
    { label: "Tender Item Fields", fields: tenderItems },
    ...(calc.length > 0 ? [{ label: "Calculated Fields", fields: calc }] : []),
  ].filter((g) => g.fields.length > 0);
}, [activityFieldOptions, calcFieldNames]);
```

**Step 6: Create the FieldGroup sub-component**

Define `FieldGroup` as a function inside the same file (above the main export):

```tsx
function FieldGroup({
  label,
  fields,
  search,
  onInsert,
}: {
  label: string;
  fields: FieldOption[];
  search: string;
  onInsert: (text: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);

  const filtered = React.useMemo(() => {
    if (!search) return fields;
    const lower = search.toLowerCase();
    return fields.filter(
      (f) => f.value.toLowerCase().includes(lower) || f.label.toLowerCase().includes(lower),
    );
  }, [fields, search]);

  if (filtered.length === 0) return null;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-subtle cursor-pointer"
      >
        <span className="text-caption font-medium text-foreground-muted uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-caption-xs">{filtered.length}</Badge>
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />}
        </div>
      </button>
      {expanded && (
        <div className="pb-1">
          {filtered.map((f) => (
            <button
              key={f.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onInsert(f.value); }}
              className="flex w-full items-center justify-between px-3 py-1 text-left hover:bg-subtle cursor-pointer group"
              data-testid={`calc-palette-field-${f.value}`}
            >
              <span className="text-body-sm font-mono text-foreground truncate">{f.value}</span>
              {f.label !== f.value && (
                <span className="text-caption text-foreground-muted ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 7: Keep the aggregate-only sections**

After the field palette, render the aggregate-only sections (Source, Aggregation, Filters, Group By) — copy these directly from the existing modal with no changes.

**Step 8: Run type check**

Run: `npm run build`
Expected: No type errors in the new file

**Step 9: Commit**

```bash
git add src/features/programs/components/calculated-field-drawer.tsx
git commit -m "feat: create calculated field drawer with expression builder and field palette"
```

---

### Task 2: Swap the modal for the drawer in the edit page

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx`
- Delete: `src/features/programs/components/calculated-field-modal.tsx`

**Step 1: Update the import**

Change:
```typescript
import { CalculatedFieldModal } from "../components/calculated-field-modal";
```
To:
```typescript
import { CalculatedFieldDrawer } from "../components/calculated-field-drawer";
```

**Step 2: Replace the component usage**

Find the `<CalculatedFieldModal ... />` block (around line 2941) and rename it to `<CalculatedFieldDrawer ... />`. All props remain exactly the same.

**Step 3: Delete the old modal file**

```bash
rm src/features/programs/components/calculated-field-modal.tsx
```

**Step 4: Run type check and tests**

Run: `npm run build && npx vitest run src/features/programs/`
Expected: No type errors, all tests pass

**Step 5: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.tsx
git add -u src/features/programs/components/calculated-field-modal.tsx
git commit -m "refactor: replace calculated field modal with drawer"
```

---

### Task 3: Add bulk edit support for calculated fields

**Files:**
- Modify: `src/features/programs/pages/activity-templates-page.tsx`

**Step 1: Check if a bulk edit drawer exists**

Search the codebase for `bulk-edit`, `BulkEdit`, or `bulkEdit` in the programs feature. If a bulk edit drawer component exists, add a "Copy from template" section for calculated fields following the same pattern as validation rules.

If no bulk edit drawer exists yet, skip this task — it will be added when the bulk edit drawer is created.

**Step 2: Run type check**

Run: `npm run build`
Expected: No errors

**Step 3: Commit (if changes were made)**

```bash
git add -A src/features/programs/
git commit -m "feat: add calculated fields to bulk edit drawer"
```

---

### Task 4: Add tests for calculated fields UI

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.test.tsx`

**Step 1: Add `calculatedFields: []` to all test fixture configs**

Search for every `ActivityTemplateConfig` object in the test file (look for `validationRules: []` or `validationRules: [`) and add `calculatedFields: []` after each `validationRules` entry. There are approximately 15-20 occurrences.

**Step 2: Add test for Calculations tab visibility**

```typescript
it("renders the Calculations tab", async () => {
  render(<ActivityTemplateEditPage />, { wrapper: MemoryRouterWrapper });
  await waitFor(() => {
    expect(screen.getByTestId("activity-template-tab-calculations")).toBeInTheDocument();
  });
});
```

**Step 3: Add test for calculated field count badge**

Create a test fixture with calculated fields populated and verify the badge appears on the tab:

```typescript
it("shows count badge on Calculations tab when fields exist", async () => {
  // Override the mock to return a config with calculated fields
  const configWithCalc = {
    ...mockConfig,
    calculatedFields: [
      { id: "cf-1", name: "eligibleSpend", label: "Eligible Spend", kind: "scalar" as const, expression: "value * 1" },
    ],
  };
  vi.mocked(useActivityTemplate).mockReturnValue({
    config: configWithCalc,
    configs: [configWithCalc],
    isLoading: false,
  } as ReturnType<typeof useActivityTemplate>);

  render(<ActivityTemplateEditPage />, { wrapper: MemoryRouterWrapper });
  await waitFor(() => {
    const tab = screen.getByTestId("activity-template-tab-calculations");
    expect(tab).toBeInTheDocument();
    // Badge should show "1"
    expect(within(tab).getByText("1")).toBeInTheDocument();
  });
});
```

**Step 4: Run tests**

Run: `npx vitest run src/features/programs/`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.test.tsx
git commit -m "test: add tests for Calculations tab and calculated field count badge"
```
