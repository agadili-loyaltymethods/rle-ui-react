# Calculated Fields for Activity Templates — Design

**Date**: 2026-03-14

## Problem

Activity templates need a way to define calculated fields — formulas that compute values from incoming activity data. These are stored as configuration metadata and will later be deployed as executable JavaScript functions in the Arli API engine. Results are written to `result.data.calc.{fieldName}` on the activity.

## Use Cases

- **Eligible earn**: Sum `lineItems.itemAmount * lineItems.quantity`, excluding items where type is alcohol/tobacco, minus discounts and taxes, to produce a dollar amount for points conversion.
- **Category breakouts**: Group line item totals by product category (food, beverage, etc.) to produce subtotals per category.
- **Simple field mapping**: Map or transform a top-level activity field (e.g., wager amount minus credits for a gaming transaction).

## Data Model

New `calculatedFields: CalculatedFieldDef[]` array on `ActivityTemplateConfig`, parallel to `extensions`, `reasonCodes`, and `validationRules`.

```typescript
interface CalculatedFieldDef {
  id: string;
  name: string;              // output key → result.data.calc.{name}
  label: string;             // human-readable display name
  description?: string;
  kind: "scalar" | "aggregate";

  // Math expression using field refs + basic arithmetic (+, -, *, /, parens)
  // Scalar: references activity fields + other calc fields (e.g., "value - discountAmount")
  // Aggregate: references fields within the source array (e.g., "itemAmount * quantity")
  expression: string;

  // Aggregate-only fields
  source?: "lineItems" | "tenderItems";
  aggregation?: "sum" | "count" | "min" | "max" | "avg";
  filters?: CalcFilter[];
  groupBy?: string;          // field within source array; produces breakout object
}

interface CalcFilter {
  field: string;             // field within the source array
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "nin";
  value: string | number | string[];
}
```

### Dependency Resolution

- Dependencies are auto-computed by parsing field references in `expression` and matching against other calculated field `name` values.
- Execution order resolved via topological sort.
- Circular dependencies flagged as validation errors.
- The `calculatedFields` array is stored in execution order (topological sort result).

### Output Location

All calculated field results are written to `result.data.calc.{name}`:
- Scalar fields produce a single value (number or string).
- Aggregate fields with `groupBy` produce a breakout object (e.g., `{ food: 150, beverage: 75 }`).
- Aggregate fields without `groupBy` produce a single number.

## UI Design

### New "Calculations" Tab

A new tab on the activity template edit page, alongside General, Fields, Reason Codes, and Validation.

**Tab contents:**

1. **Ordered list** of calculated fields in execution order (auto-sorted by dependencies).
2. **Add button** opens a modal to create a new calculated field.
3. Each field card shows:
   - Name and label
   - Kind badge (Scalar / Aggregate)
   - Human-readable formula summary
   - Dependency indicators (badges showing which other calc fields it references)
4. Click to edit, inline delete with confirmation.
5. If a user tries to delete a field that others depend on, a warning shows which fields would break.

### Create/Edit Modal

**Basics section:**
- Name (identifier, validated: `^[a-zA-Z_]\w*$`)
- Label (display name)
- Kind toggle: Scalar / Aggregate
- Description (optional)

**Formula section — Scalar:**
- Expression input with autocomplete for:
  - Standard activity fields (from model schema)
  - Template extension fields (`ext.{namespace}.{field}`)
  - Other calculated field names
- Supports `+`, `-`, `*`, `/`, parentheses
- Live validation of expression syntax

**Formula section — Aggregate:**
- Source picker: Line Items / Tender Items
- Per-item expression input (autocomplete scoped to source array fields)
- Aggregation picker: Sum / Count / Min / Max / Avg
- Filter builder: add/remove filter conditions (field, operator, value) with AND logic
- Optional group-by field picker (for breakout results)

**Validation on save:**
- Expression parsed and validated
- Circular dependency check
- Invalid field references flagged
- Name uniqueness check

### Dependency Visualization

- Each calculated field shows dependencies as small badges (e.g., "uses: eligibleSpend, discountTotal").
- The list auto-sorts topologically on add/edit.
- Deleting a field that others depend on shows a warning listing affected fields.

## Storage

Stored in `ext._meta` as part of `ActivityTemplateConfig`, same pattern as extensions and validation rules. Bulk edit supports "Copy from template" for calculated fields.

## Not in Scope (Future Iterations)

- JavaScript editor escape hatch for complex formulas
- Runtime preview/simulation with sample data
- Deployment translation to Arli API JavaScript functions
- Earn rate calculations (separate metadata layer)
- Additional aggregation sources beyond lineItems/tenderItems

## Files to Create/Modify

- `src/features/programs/types/activity-template-config.ts` — add `CalculatedFieldDef`, `CalcFilter` types, Zod schemas
- `src/features/programs/pages/activity-template-edit-page.tsx` — add Calculations tab
- `src/features/programs/components/calculated-field-modal.tsx` — create/edit modal
- `src/features/programs/components/calculated-field-list.tsx` — ordered list with dependency badges
- `src/features/programs/lib/calc-expression-parser.ts` — expression parsing, validation, dependency extraction
- `src/features/programs/lib/calc-dependency-sort.ts` — topological sort for execution order
