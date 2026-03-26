# Calculated Field Drawer Design

**Goal:** Replace the current `CalculatedFieldModal` with a right-side drawer that provides a better expression editing experience with a clickable field palette and autocomplete.

## Layout

Right-side drawer, ~480px wide (`--modal-width-lg` or custom token), full viewport height. Slides in from the right with a backdrop overlay. Content is vertically stacked and scrollable.

## Structure (top to bottom)

### 1. Header
- Title: "Add Calculated Field" / "Edit Calculated Field"
- X close button top-right
- Sticky at top

### 2. Basics Section
- **Name** — text input, validated identifier (`/^[a-zA-Z_]\w*$/`), unique check
- **Label** — text input, required
- **Kind** — segmented toggle: Scalar / Aggregate (same as current)
- **Description** — optional textarea, 2 rows

### 3. Expression Section
- **Operator toolbar** — row of small buttons: `+` `-` `*` `/` `(` `)` — each inserts the operator at the cursor position in the expression textarea
- **Expression textarea** — 3-4 rows, monospace font. Supports:
  - **Autocomplete**: typing triggers a dropdown (absolute positioned below cursor or below the textarea) that filters matching field names across all groups. Enter/click inserts the field name at cursor position.
  - **Click-to-insert**: clicking a field in the palette (section 4) inserts its reference at cursor position
- **Validation error** — shown below textarea when expression has syntax errors

### 4. Field Palette
- Takes remaining vertical space, scrollable independently
- **Search bar** at top — instant client-side filter across all sections
- **Collapsible sections** with chevron toggles:
  - "Activity Fields" — standard activity model fields from `activityFieldOptions`
  - "Line Item Fields" — fields starting with `lineItems.`
  - "Tender Item Fields" — fields starting with `tenderItems.`
  - "Calculated Fields" — other calc field names (for scalar cross-references)
- Each field rendered as a compact clickable row:
  - Field name in monospace, label in muted text to the right
  - Hover highlight, pointer cursor
  - Click inserts field reference at expression cursor

### 5. Aggregate-Only Section
Visible only when kind = "aggregate":
- **Source** — Select: Line Items / Tender Items
- **Aggregation** — Select: Sum / Count / Min / Max / Avg
- **Filters** — dynamic list of filter rows (field select + operator select + value input), Add/Remove buttons
- **Group By** — optional Select from source fields

### 6. Footer
- Sticky at bottom
- Cancel (ghost) + Add/Update (primary) buttons
- Add/Update disabled until form is valid

## Key Interactions

1. **Click field in palette** → inserts field name at cursor position in expression textarea
2. **Type in expression** → autocomplete dropdown filters matching fields, Enter/click inserts
3. **Click operator button** → inserts operator at cursor with spaces
4. **Search in palette** → filters fields across all collapsible sections
5. **Toggle kind** → shows/hides aggregate-specific controls

## Implementation Notes

- Use Radix Dialog with custom positioning (right-aligned, full height) rather than a new drawer primitive
- Expression textarea needs a ref for cursor position management (`selectionStart`/`selectionEnd`)
- Autocomplete dropdown positioned absolutely below the textarea
- Field palette sections default to expanded; collapse state is local
- The drawer replaces `calculated-field-modal.tsx` — the list component stays as-is
