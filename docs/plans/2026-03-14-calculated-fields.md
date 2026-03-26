# Calculated Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Calculations" tab to the activity template edit page where admins define calculated fields — scalar expressions or array aggregations that produce named results stored at `result.data.calc.{name}`.

**Architecture:** Extend `ActivityTemplateConfig` with a `calculatedFields` array. Build an expression parser for basic math with field references. Add a topological sort utility for dependency resolution. Create a Calculations tab with an ordered list and a create/edit modal. The expression input uses autocomplete for field names.

**Tech Stack:** React 19, Radix Tabs/Dialog, Zod, Vitest, Lucide icons, existing shared components (Input, Button, Badge, Select, MultiSelect)

---

### Task 1: Add types and Zod schemas for calculated fields

**Files:**
- Modify: `src/features/programs/types/activity-template-config.ts`

**Step 1: Add the interfaces and types**

After the `ValidationRuleDef` interface (line 49), add:

```typescript
// ── Calculated Fields ──

export interface CalcFilter {
  field: string;
  operator: CalcFilterOperator;
  value: string | number | string[];
}

export type CalcFilterOperator = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "nin";

export interface CalculatedFieldDef {
  id: string;
  name: string;
  label: string;
  description?: string;
  kind: "scalar" | "aggregate";
  expression: string;
  source?: "lineItems" | "tenderItems";
  aggregation?: "sum" | "count" | "min" | "max" | "avg";
  filters?: CalcFilter[];
  groupBy?: string;
}
```

**Step 2: Add Zod schemas**

After `validationRuleSchema` (line 84), add:

```typescript
export const calcFilterSchema = z.object({
  field: z.string().min(1, "Filter field is required"),
  operator: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "in", "nin"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const calculatedFieldSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[a-zA-Z_]\w*$/, "Must be a valid identifier"),
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  kind: z.enum(["scalar", "aggregate"]),
  expression: z.string().min(1, "Expression is required"),
  source: z.enum(["lineItems", "tenderItems"]).optional(),
  aggregation: z.enum(["sum", "count", "min", "max", "avg"]).optional(),
  filters: z.array(calcFilterSchema).optional(),
  groupBy: z.string().optional(),
});
```

**Step 3: Add `calculatedFields` to `ActivityTemplateConfig` interface**

Add after `validationRules` (line 19):

```typescript
  calculatedFields: CalculatedFieldDef[];
```

**Step 4: Add `calculatedFields` to the Zod config schema**

In `activityTemplateConfigSchema`, add after `validationRules`:

```typescript
  calculatedFields: z.array(calculatedFieldSchema),
```

**Step 5: Add constants**

After `CONDITION_OPERATOR_OPTIONS`, add:

```typescript
export const CALC_KIND_OPTIONS = [
  { value: "scalar", label: "Scalar" },
  { value: "aggregate", label: "Aggregate" },
] as const;

export const CALC_AGGREGATION_OPTIONS = [
  { value: "sum", label: "Sum" },
  { value: "count", label: "Count" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "avg", label: "Average" },
] as const;

export const CALC_SOURCE_OPTIONS = [
  { value: "lineItems", label: "Line Items" },
  { value: "tenderItems", label: "Tender Items" },
] as const;

export const CALC_FILTER_OPERATOR_OPTIONS = [
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "lte", label: "Less or Equal" },
  { value: "in", label: "In" },
  { value: "nin", label: "Not In" },
] as const;
```

**Step 6: Update all places that create default ActivityTemplateConfig objects**

Search the codebase for places that create `ActivityTemplateConfig` objects and add `calculatedFields: []` to each. Key locations:
- `src/features/programs/pages/activity-templates-page.tsx` — `handleBulkCreate` (line ~256)
- `src/features/programs/pages/activity-template-edit-page.tsx` — create mode initialization (look for `extensions: []` near `reasonCodes: []`)

**Step 7: Run type check**

Run: `npm run build`
Expected: Type errors in the edit page where `calculatedFields` is now required but not yet handled. That's expected — Task 3 will fix those.

**Step 8: Commit**

```bash
git add src/features/programs/types/activity-template-config.ts src/features/programs/pages/activity-templates-page.tsx
git commit -m "feat: add CalculatedFieldDef types and Zod schemas"
```

---

### Task 2: Expression parser and dependency sort utilities

**Files:**
- Create: `src/features/programs/lib/calc-expression.ts`
- Create: `src/features/programs/lib/calc-expression.test.ts`

**Step 1: Create the expression parser**

The parser extracts field references from math expressions. It tokenizes the expression and identifies field references (dot-notation identifiers like `lineItems.itemAmount`, `ext.fb.storeRegion`, or calculated field names like `eligibleSpend`).

```typescript
/**
 * Expression utilities for calculated fields.
 * Supports basic math: +, -, *, /, parentheses, numeric literals, and field references.
 */

/** Token types in a calc expression. */
type TokenType = "field" | "number" | "operator" | "paren";

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = new Set(["+", "-", "*", "/"]);
const PARENS = new Set(["(", ")"]);
const FIELD_RE = /^[a-zA-Z_]\w*(\.\w+)*/;
const NUMBER_RE = /^\d+(\.\d+)?/;

/**
 * Tokenize a calc expression into tokens.
 * Throws on invalid characters.
 */
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (OPERATORS.has(ch)) { tokens.push({ type: "operator", value: ch }); i++; continue; }
    if (PARENS.has(ch)) { tokens.push({ type: "paren", value: ch }); i++; continue; }
    const numMatch = expr.slice(i).match(NUMBER_RE);
    if (numMatch) { tokens.push({ type: "number", value: numMatch[0] }); i += numMatch[0].length; continue; }
    const fieldMatch = expr.slice(i).match(FIELD_RE);
    if (fieldMatch) { tokens.push({ type: "field", value: fieldMatch[0] }); i += fieldMatch[0].length; continue; }
    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }
  return tokens;
}

/**
 * Extract field references from a calc expression.
 * Returns unique field names referenced in the expression.
 */
export function extractFieldRefs(expression: string): string[] {
  if (!expression.trim()) return [];
  const tokens = tokenize(expression);
  const fields = tokens.filter((t) => t.type === "field").map((t) => t.value);
  return [...new Set(fields)];
}

/**
 * Validate expression syntax. Returns null if valid, error message if invalid.
 */
export function validateExpression(expression: string): string | null {
  if (!expression.trim()) return "Expression is required";
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return "Expression is empty";
    // Check balanced parentheses
    let depth = 0;
    for (const t of tokens) {
      if (t.value === "(") depth++;
      if (t.value === ")") depth--;
      if (depth < 0) return "Unmatched closing parenthesis";
    }
    if (depth !== 0) return "Unmatched opening parenthesis";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid expression";
  }
}

/**
 * Compute dependencies of a calculated field on other calculated fields.
 * @param fieldRefs - field references extracted from the expression
 * @param calcFieldNames - set of all calculated field names in the template
 * @returns names of calculated fields this expression depends on
 */
export function computeDependencies(
  fieldRefs: string[],
  calcFieldNames: Set<string>,
): string[] {
  return fieldRefs.filter((ref) => calcFieldNames.has(ref));
}

/**
 * Topological sort of calculated fields by dependency order.
 * Returns sorted array or throws if circular dependency detected.
 */
export function topologicalSort(
  fields: { name: string; expression: string }[],
): string[] {
  const names = new Set(fields.map((f) => f.name));
  const deps = new Map<string, string[]>();
  for (const f of fields) {
    const refs = extractFieldRefs(f.expression);
    deps.set(f.name, computeDependencies(refs, names));
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected involving '${name}'`);
    }
    visiting.add(name);
    for (const dep of deps.get(name) ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const f of fields) visit(f.name);
  return sorted;
}

/**
 * Sort calculated fields array by dependency order.
 * Returns a new sorted array.
 */
export function sortByDependencies(
  fields: { name: string; expression: string }[],
): typeof fields {
  const order = topologicalSort(fields);
  const byName = new Map(fields.map((f) => [f.name, f]));
  return order.map((name) => byName.get(name)!);
}

/**
 * Format an expression for human-readable display.
 * Replaces field references with their labels when available.
 */
export function formatExpression(
  expression: string,
  fieldLabels: Record<string, string>,
): string {
  if (!expression.trim()) return "";
  try {
    const tokens = tokenize(expression);
    return tokens
      .map((t) => {
        if (t.type === "field") return fieldLabels[t.value] ?? t.value;
        return t.value;
      })
      .join(" ");
  } catch {
    return expression;
  }
}
```

**Step 2: Write tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  tokenize,
  extractFieldRefs,
  validateExpression,
  computeDependencies,
  topologicalSort,
  sortByDependencies,
  formatExpression,
} from "./calc-expression";

describe("tokenize", () => {
  it("tokenizes a simple expression", () => {
    expect(tokenize("a + b")).toEqual([
      { type: "field", value: "a" },
      { type: "operator", value: "+" },
      { type: "field", value: "b" },
    ]);
  });

  it("handles dot-notation fields", () => {
    expect(tokenize("lineItems.itemAmount * lineItems.quantity")).toEqual([
      { type: "field", value: "lineItems.itemAmount" },
      { type: "operator", value: "*" },
      { type: "field", value: "lineItems.quantity" },
    ]);
  });

  it("handles numbers and parentheses", () => {
    expect(tokenize("(a + 2.5) * b")).toEqual([
      { type: "paren", value: "(" },
      { type: "field", value: "a" },
      { type: "operator", value: "+" },
      { type: "number", value: "2.5" },
      { type: "paren", value: ")" },
      { type: "operator", value: "*" },
      { type: "field", value: "b" },
    ]);
  });

  it("throws on invalid characters", () => {
    expect(() => tokenize("a & b")).toThrow("Unexpected character '&'");
  });
});

describe("extractFieldRefs", () => {
  it("extracts unique field references", () => {
    expect(extractFieldRefs("a + b * a - c")).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty expression", () => {
    expect(extractFieldRefs("")).toEqual([]);
  });

  it("handles dot-notation", () => {
    expect(extractFieldRefs("lineItems.itemAmount * lineItems.quantity")).toEqual([
      "lineItems.itemAmount",
      "lineItems.quantity",
    ]);
  });
});

describe("validateExpression", () => {
  it("returns null for valid expression", () => {
    expect(validateExpression("a + b * (c - d)")).toBeNull();
  });

  it("returns error for empty expression", () => {
    expect(validateExpression("")).toBe("Expression is required");
  });

  it("returns error for unmatched parens", () => {
    expect(validateExpression("(a + b")).toBe("Unmatched opening parenthesis");
    expect(validateExpression("a + b)")).toBe("Unmatched closing parenthesis");
  });

  it("returns error for invalid characters", () => {
    expect(validateExpression("a & b")).toContain("Unexpected character");
  });
});

describe("computeDependencies", () => {
  it("finds dependencies on other calc fields", () => {
    const calcNames = new Set(["eligibleSpend", "discountTotal"]);
    const refs = ["eligibleSpend", "value", "discountTotal"];
    expect(computeDependencies(refs, calcNames)).toEqual(["eligibleSpend", "discountTotal"]);
  });

  it("returns empty when no dependencies", () => {
    const calcNames = new Set(["x"]);
    expect(computeDependencies(["a", "b"], calcNames)).toEqual([]);
  });
});

describe("topologicalSort", () => {
  it("sorts by dependency order", () => {
    const fields = [
      { name: "netTotal", expression: "eligibleSpend - discountTotal" },
      { name: "eligibleSpend", expression: "value * 1" },
      { name: "discountTotal", expression: "value * 0.1" },
    ];
    const order = topologicalSort(fields);
    expect(order.indexOf("eligibleSpend")).toBeLessThan(order.indexOf("netTotal"));
    expect(order.indexOf("discountTotal")).toBeLessThan(order.indexOf("netTotal"));
  });

  it("throws on circular dependency", () => {
    const fields = [
      { name: "a", expression: "b + 1" },
      { name: "b", expression: "a + 1" },
    ];
    expect(() => topologicalSort(fields)).toThrow("Circular dependency");
  });

  it("handles independent fields", () => {
    const fields = [
      { name: "a", expression: "value + 1" },
      { name: "b", expression: "value + 2" },
    ];
    expect(topologicalSort(fields)).toHaveLength(2);
  });
});

describe("sortByDependencies", () => {
  it("returns fields in execution order", () => {
    const fields = [
      { name: "net", expression: "gross - tax" },
      { name: "gross", expression: "value * 1" },
      { name: "tax", expression: "value * 0.1" },
    ];
    const sorted = sortByDependencies(fields);
    expect(sorted[sorted.length - 1]!.name).toBe("net");
  });
});

describe("formatExpression", () => {
  it("replaces field refs with labels", () => {
    const labels = { value: "Transaction Value", discountAmount: "Discount" };
    expect(formatExpression("value - discountAmount", labels)).toBe(
      "Transaction Value - Discount",
    );
  });

  it("keeps unknown fields as-is", () => {
    expect(formatExpression("a + b", {})).toBe("a + b");
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run src/features/programs/lib/calc-expression.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/features/programs/lib/calc-expression.ts src/features/programs/lib/calc-expression.test.ts
git commit -m "feat: add expression parser and dependency sort for calculated fields"
```

---

### Task 3: Add calculatedFields state to the edit page

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx`

**Step 1: Add state and initialization**

Add `calculatedFields` state alongside the other state variables (near `validationRules` state). Add it to:
- State declaration: `const [calculatedFields, setCalculatedFields] = React.useState<CalculatedFieldDef[]>([]);`
- Create mode initialization (where `setExtensions([])`, `setReasonCodes([])`, etc. are called)
- Edit mode initialization (where `config.extensions`, `config.reasonCodes`, etc. are loaded)
- Initial snapshot JSON (for dirty tracking)
- Current snapshot JSON (for dirty tracking)
- Save handler payload
- Import `CalculatedFieldDef` from the types file
- Import `Calculator` icon from lucide-react

**Step 2: Add the Calculations tab trigger**

In the tabs array (around line 2067), add a new entry after validation:

```typescript
{ value: "calculations", label: "Calculations", icon: Calculator },
```

Add a count badge like the other tabs:

```typescript
{tab.value === "calculations" && calculatedFields.length > 0 && (
  <Badge variant="secondary" className="ml-1">{calculatedFields.length}</Badge>
)}
```

**Step 3: Add a placeholder tab content**

Add after the validation `Tabs.Content`:

```tsx
<Tabs.Content value="calculations" className="outline-none">
  <div className="rounded-lg border border-border bg-card p-6">
    <p className="text-body-sm text-foreground-muted">
      Calculations tab — coming in Task 4.
    </p>
  </div>
</Tabs.Content>
```

**Step 4: Run type check**

Run: `npm run build`
Expected: No type errors (all `ActivityTemplateConfig` objects now include `calculatedFields`)

**Step 5: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.tsx
git commit -m "feat: add calculatedFields state and Calculations tab placeholder"
```

---

### Task 4: Build the calculated field list component

**Files:**
- Create: `src/features/programs/components/calculated-field-list.tsx`

**Step 1: Create the component**

This component renders the ordered list of calculated fields with dependency badges, add/edit/delete controls, and human-readable formula summaries.

Props:
```typescript
interface CalculatedFieldListProps {
  fields: CalculatedFieldDef[];
  onChange: (fields: CalculatedFieldDef[]) => void;
  onEdit: (field: CalculatedFieldDef) => void;
  fieldLabels: Record<string, string>;  // for human-readable expression display
}
```

Features:
- Shows each field as a card with: name, label, kind badge (Scalar/Aggregate), formatted expression summary, dependency badges
- Add button at the top
- Edit button (pencil icon) and Delete button (trash icon) per field
- Delete confirmation when field has dependents
- Empty state with "No calculations defined" message
- Fields displayed in dependency order (already sorted by parent)

Use the same card/list styling patterns as the validation rules list in the validation tab. Reference the existing validation rules rendering in the edit page for consistent styling.

**Step 2: Run type check**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/programs/components/calculated-field-list.tsx
git commit -m "feat: create calculated field list component with dependency badges"
```

---

### Task 5: Build the calculated field create/edit modal

**Files:**
- Create: `src/features/programs/components/calculated-field-modal.tsx`

**Step 1: Create the modal component**

Props:
```typescript
interface CalculatedFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CalculatedFieldDef | null;  // null = create mode
  existingNames: string[];           // for uniqueness validation
  activityFieldOptions: FieldOption[];   // standard + ext fields for autocomplete
  sourceFieldOptions: Record<string, FieldOption[]>; // per source array fields
  calcFieldNames: string[];          // other calculated field names for scalar autocomplete
  onSave: (field: CalculatedFieldDef) => void;
}
```

**Modal layout:**

Section 1 — Basics:
- Name input (validated identifier)
- Label input
- Kind toggle: Scalar / Aggregate (radio or segmented control)
- Description textarea (optional)

Section 2 — Formula (conditional on kind):

**Scalar mode:**
- Expression input (text input with inline validation)
- Below the input: a hint showing available field names that can be referenced (activity fields + other calc fields)
- Live validation error display

**Aggregate mode:**
- Source picker: Select with Line Items / Tender Items options
- Per-item expression input (same as scalar but scoped to source fields)
- Aggregation picker: Select with Sum/Count/Min/Max/Avg
- Filter section: list of filter rows with Add/Remove
  - Each filter: field select + operator select + value input
- Group-by picker: optional Select from source array fields

Use Radix Dialog, same patterns as `ExtensionFieldModal` in the edit page.

**Step 2: Run type check**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/programs/components/calculated-field-modal.tsx
git commit -m "feat: create calculated field modal with scalar and aggregate modes"
```

---

### Task 6: Wire calculated field list and modal into the edit page

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx`

**Step 1: Import components**

```typescript
import { CalculatedFieldList } from "../components/calculated-field-list";
import { CalculatedFieldModal } from "../components/calculated-field-modal";
import { sortByDependencies, extractFieldRefs, computeDependencies } from "../lib/calc-expression";
```

**Step 2: Add modal state**

```typescript
const [calcFieldModalOpen, setCalcFieldModalOpen] = React.useState(false);
const [editingCalcField, setEditingCalcField] = React.useState<CalculatedFieldDef | null>(null);
```

**Step 3: Add handlers**

```typescript
const handleSaveCalcField = (field: CalculatedFieldDef) => {
  setCalculatedFields((prev) => {
    const idx = prev.findIndex((f) => f.id === field.id);
    const updated = idx >= 0
      ? prev.map((f) => (f.id === field.id ? field : f))
      : [...prev, field];
    // Re-sort by dependencies
    try {
      return sortByDependencies(updated) as CalculatedFieldDef[];
    } catch {
      // If circular dependency, keep unsorted (validation will catch it)
      return updated;
    }
  });
  setCalcFieldModalOpen(false);
  setEditingCalcField(null);
};

const handleEditCalcField = (field: CalculatedFieldDef) => {
  setEditingCalcField(field);
  setCalcFieldModalOpen(true);
};

const handleAddCalcField = () => {
  setEditingCalcField(null);
  setCalcFieldModalOpen(true);
};
```

**Step 4: Build field labels map for display**

```typescript
const calcFieldLabels = React.useMemo(() => {
  const labels: Record<string, string> = {};
  // Standard activity fields
  for (const opt of activityFieldOptions ?? []) {
    labels[opt.value] = opt.label;
  }
  // Template extension fields
  for (const ext of extensions) {
    labels[`ext.${fieldName}.${ext.name}`] = ext.label;
  }
  // Other calculated fields
  for (const cf of calculatedFields) {
    labels[cf.name] = cf.label;
  }
  return labels;
}, [activityFieldOptions, extensions, fieldName, calculatedFields]);
```

**Step 5: Replace the placeholder tab content**

Replace the calculations tab placeholder with:

```tsx
<Tabs.Content value="calculations" className="outline-none">
  <div className="rounded-lg border border-border bg-card p-6">
    <CalculatedFieldList
      fields={calculatedFields}
      onChange={setCalculatedFields}
      onEdit={handleEditCalcField}
      onAdd={handleAddCalcField}
      fieldLabels={calcFieldLabels}
    />
  </div>
</Tabs.Content>
```

**Step 6: Add the modal**

Add near the other modals (ExtensionFieldModal, etc.):

```tsx
<CalculatedFieldModal
  open={calcFieldModalOpen}
  onOpenChange={(open) => {
    setCalcFieldModalOpen(open);
    if (!open) setEditingCalcField(null);
  }}
  field={editingCalcField}
  existingNames={calculatedFields.filter((f) => f.id !== editingCalcField?.id).map((f) => f.name)}
  activityFieldOptions={activityFieldOptions ?? []}
  sourceFieldOptions={{
    lineItems: lineItemFieldOptions,
    tenderItems: tenderItemFieldOptions,
  }}
  calcFieldNames={calculatedFields.filter((f) => f.id !== editingCalcField?.id).map((f) => f.name)}
  onSave={handleSaveCalcField}
/>
```

Note: `lineItemFieldOptions` and `tenderItemFieldOptions` need to be derived from the model schema. Use the existing `useModelFieldOptions` hook or filter from `activityFieldOptions` for fields starting with `lineItems.` and `tenderItems.`.

**Step 7: Run type check and existing tests**

Run: `npm run build && npx vitest run src/features/programs/`
Expected: No new type errors, existing tests still pass

**Step 8: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.tsx
git commit -m "feat: wire calculated field list and modal into edit page"
```

---

### Task 7: Add bulk edit support for calculated fields

**Files:**
- Modify: `src/features/programs/components/activity-template-bulk-edit-drawer.tsx`
- Modify: `src/features/programs/pages/activity-templates-page.tsx`

**Step 1: Add "Copy from template" for calculated fields in the bulk edit drawer**

Follow the same pattern as validation rules — add a `calculatedFieldsSourceId` state, a source options list filtering templates with `calculatedFields.length > 0`, and a Select dropdown in a BulkField wrapper.

**Step 2: Update the page's bulk edit save handler**

Add handling for `calculatedFields` in the merge/replace logic, same pattern as `validationRules` and `extensions`.

**Step 3: Run type check**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/programs/components/activity-template-bulk-edit-drawer.tsx src/features/programs/pages/activity-templates-page.tsx
git commit -m "feat: add calculated fields to bulk edit drawer with copy-from-template"
```

---

### Task 8: Add tests for calculated fields UI

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.test.tsx`

**Step 1: Add test for Calculations tab visibility**

Verify the "Calculations" tab exists and can be clicked.

**Step 2: Add test for calculated field count badge**

Verify the tab shows a count badge when calculated fields exist in the config.

**Step 3: Run tests**

Run: `npx vitest run src/features/programs/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.test.tsx
git commit -m "test: add tests for Calculations tab and calculated field list"
```
