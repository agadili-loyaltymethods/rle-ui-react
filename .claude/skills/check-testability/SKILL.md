# Testability Standards — Enforced During Implementation

**This is NOT a post-hoc audit.** These rules apply while writing or modifying any TSX/JSX component. Every interactive element you create or edit MUST meet these standards before the implementation is considered complete.

## When This Applies

- Creating a new component (page, feature component, shared component)
- Modifying an existing component that has interactive elements
- Adding buttons, inputs, links, selects, forms, or any clickable element
- Code review of UI changes

## The 6 Rules

### Rule 1: Every Interactive Element Needs `data-testid` + a Second Stable Attribute

Every `<button>`, `<input>`, `<select>`, `<textarea>`, `<form>`, and `<a>` MUST have:
1. A `data-testid` attribute
2. At least ONE additional stable attribute: `aria-label`, `aria-labelledby`, `id`, or `name`

```tsx
// WRONG — only one stable attribute
<button data-testid="save-btn">Save</button>

// CORRECT — data-testid + aria-label
<button data-testid="save-btn" aria-label="Save">Save</button>

// CORRECT — data-testid + id
<input data-testid="name-field" id="edit-field-name" />
```

### Rule 2: Business-Oriented Naming

`data-testid` values must describe WHAT the element does, not WHERE it is. Use the pattern: `{feature}-{action/element}` or `{feature}-{context}-{action}`.

```tsx
// WRONG
data-testid="btn-1"
data-testid="input-0"
data-testid="row-3"

// CORRECT
data-testid="purse-add"
data-testid="purse-field-name"
data-testid="purse-tab-general"
```

### Rule 3: No Fragile / Index-Based Selectors

Never use pure numbers or trailing index numbers in `data-testid`. If you need to distinguish items in a list, use the item's business ID.

```tsx
// WRONG
data-testid="item-0"
data-testid="row-1"
data-testid={`card-${index}`}

// CORRECT — use business identifier
data-testid={`purse-row-${policy._id}`}
data-testid={`purse-group-${groupName}`}
data-testid={`purse-card-edit-${item._id}`}
```

### Rule 4: Repeated Elements Need Dynamic `data-testid`

List rows, cards, and repeated interactive elements must use template literals with the item's unique ID.

```tsx
// WRONG — static testid in a loop
{items.map(item => <button data-testid="edit-btn">Edit</button>)}

// CORRECT — dynamic testid with item ID
{items.map(item => (
  <button
    data-testid={`${prefix}-edit-${item._id}`}
    aria-label={`Edit ${item.name}`}
  >
    Edit
  </button>
))}
```

### Rule 5: Accessibility Requirements

- Every `<button>` and `<a>` without visible text MUST have `aria-label`
- Every `<img>` MUST have `alt`
- Icon-only buttons MUST have both `aria-label` AND `title`

```tsx
// WRONG — icon button with no label
<button onClick={onEdit}><Pencil className="h-4 w-4" /></button>

// CORRECT
<button
  data-testid={`${prefix}-edit-${id}`}
  aria-label={`Edit ${name}`}
  title="Edit"
  onClick={onEdit}
>
  <Pencil className="h-4 w-4" />
</button>
```

### Rule 6: No Duplicate `data-testid` Values

Each `data-testid` must be unique within its file AND across the codebase for static values. Use dynamic IDs to ensure uniqueness in repeated contexts.

## `testIdPrefix` Convention

Every feature uses a consistent prefix for all its `data-testid` values. The prefix is defined in the feature's config object and used throughout:

| Feature | Prefix |
|---------|--------|
| Purse Policies | `purse` |
| Tier Groups | `tier` |
| Activity Templates | `activity` |
| Reward Policies | `reward` |

Pattern: `{prefix}-{element}`, `{prefix}-{action}`, `{prefix}-{context}-{element}`

Examples for prefix `purse`:
- Page: `purse-page`, `purse-edit-page`
- Buttons: `purse-add`, `purse-save`, `purse-cancel`, `purse-refresh`, `purse-back`
- Fields: `purse-field-name`, `purse-field-effectiveDate`
- Tabs: `purse-tab-general`, `purse-tab-expiration`
- Table: `purse-sort-name`, `purse-table-filter-toggle`, `purse-table-filter-{key}`
- Rows: `purse-row-{id}`, `purse-group-{groupName}`, `purse-period-{id}`
- Actions: `purse-actions-{id}-edit`, `purse-actions-{id}-delete`
- Cards: `purse-card-{id}`, `purse-card-edit-{id}`

## Verification

After completing any component implementation, run the audit script to confirm compliance:

```bash
# Scan the specific feature directory
node scripts/check-testability.mjs --dir src/features/{feature}

# Scan a specific file's parent directory
node scripts/check-testability.mjs --dir src/features/programs/components

# Full scan
node scripts/check-testability.mjs
```

The script checks all 6 rules and reports:
- Overall score (target: 100%)
- `data-testid` coverage
- Per-file issues with line numbers
- Cross-file duplicate detection

**A component is NOT complete until `check-testability` reports 0 issues for the changed files.**

## Checklist (Apply While Writing Code)

For every interactive element you write, verify:

- [ ] Has `data-testid` with business-oriented name using the feature prefix
- [ ] Has at least one additional stable attribute (`aria-label`, `id`, `name`)
- [ ] If in a loop/list, uses dynamic ID with business identifier (not index)
- [ ] If icon-only, has `aria-label` AND `title`
- [ ] `data-testid` value is unique (not duplicated elsewhere)
- [ ] `<img>` elements have `alt` attribute
