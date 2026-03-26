# Validation Rule Grouping (AND/OR) Design

## Problem

Activity template validation rules are a flat array of independent rules. Users cannot combine rules with AND/OR logic or group them into nested logical expressions.

## Data Model

Replace the flat `validationRules: ValidationRuleDef[]` with a tree structure:

```typescript
interface ValidationRuleGroup {
  id: string;
  operator: "and" | "or";
  children: (ValidationRuleDef | ValidationRuleGroup)[];
}
```

`ActivityTemplateConfig.validationRules` stays as the serialized format, but at runtime the edit page works with a root `ValidationRuleGroup` that wraps everything. A type guard `isGroup(node)` distinguishes groups from rules.

**Migration**: Existing flat arrays become `{ id, operator: "and", children: [...existingRules] }` — fully backward compatible.

## UI

The validation rules tab changes from a flat sidebar + detail panel to:

### Left sidebar → recursive tree

- Root group shows its operator as a toggle pill (AND / OR) at the top
- Each rule renders as a compact card (same as today — type badge + field names)
- Nested groups render as indented bordered cards with their own operator toggle
- Between items, a subtle "+" insert button appears on hover
- Each group has an "Add Rule" and "Add Group" button at the bottom
- Max 3 levels of nesting enforced ("Add Group" button hides at depth 3)

### Operator toggle

- Small pill between rules showing "AND" or "OR"
- Clicking toggles the group's operator (all connectors in that group change together)

### Right panel → rule detail (unchanged)

- Selecting a rule in the tree opens it in the detail panel exactly as today
- Selecting a group shows a minimal panel: operator toggle + delete group button

### Actions

- "Add Rule" — creates a new rule inside the current group
- "Add Group" — creates a nested group with AND operator and no children
- Delete group — removes the group, promoting its children to the parent (or deleting if empty)
- Delete rule — same as today

## Serialization

When saving, the root group serializes to the `validationRules` array. The group structure is stored as-is since this is `ext._meta` storage (free-form JSON). Old flat arrays are auto-wrapped on load.

## Validation

- Empty groups show a warning
- Rules validate the same as today (required fields, etc.)
- Error indicators propagate up — if a rule in a nested group has issues, parent groups show an error indicator too

## Constraints

- Default top-level operator: AND
- Max nesting depth: 3 levels
- Backward compatible with existing flat rule arrays
