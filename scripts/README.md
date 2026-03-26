# scripts/check-testability.mjs

A static analysis tool that scans all `.tsx` / `.jsx` files and audits every interactive element against UI test automation guidelines.

---

## Run Commands

```bash
# Full src/ audit
npm run audit:testability

# Scope to a specific feature folder
npm run audit:testability -- --dir src/features/reward-catalog
npm run audit:testability -- --dir src/features/programs
npm run audit:testability -- --dir src/shared/components

# CI mode — outputs JSON and exits with code 1 if issues found
npm run audit:testability:json
npm run audit:testability:json -- --dir src/features/reward-catalog > report.json
```

---

## What It Validates

The script checks every `<button>`, `<input>`, `<select>`, `<textarea>`, `<form>`, `<a>`, and `<img>` element against 5 rules:

### Rule 1 — `data-testid` present
Every interactive element must have a `data-testid` attribute so test automation can locate it reliably.

```tsx
// ✗ fails
<button onClick={save}>Save</button>

// ✓ passes
<button data-testid="rewards-save" onClick={save}>Save</button>
```

### Rule 2 — Second stable attribute
If `data-testid` exists, the element must also have a **second** stable identifier from: `id`, `aria-label`, `aria-labelledby`, or `name`. This prevents tests from relying on a single selector.

```tsx
// ✗ only one stable attr
<button data-testid="rewards-save">Save</button>

// ✓ two stable attrs
<button data-testid="rewards-save" aria-label="Save reward">Save</button>
```

### Rule 3 — No fragile / index-based naming
`data-testid` values must not be pure numbers or end in a digit index (e.g. `btn-0`, `item-2`). These break when list order changes.

```tsx
// ✗ fragile
<button data-testid="btn-0">First</button>

// ✓ business-oriented
<button data-testid="rewards-add-first">First</button>
```

### Rule 4 — Dynamic testids for repeated elements *(informational)*
List rows and repeated items should use template literals or expressions so each element gets a unique, ID-based testid. The script flags these as `dynamic` (good practice, not a hard failure).

```tsx
// ✓ dynamic — each row is uniquely identifiable
<tr data-testid={`reward-row-${reward._id}`}>
```

### Rule 5 — Accessibility on `<button>` and `<a>`
Buttons and links must have at least one of: `aria-label`, `role`, or `id` so screen readers and accessibility tools can identify them.

```tsx
// ✗ no accessibility attr
<button onClick={close}><X /></button>

// ✓
<button onClick={close} aria-label="Close dialog"><X /></button>
```

### `<img>` alt check
Every `<img>` element must have an `alt` attribute (empty string is acceptable for decorative images).

```tsx
// ✗ fails
<img src={reward.imageUrl} />

// ✓ passes
<img src={reward.imageUrl} alt={reward.name} />
// or for decorative:
<img src={decorative.png} alt="" />
```

---

## Output

### Header Panel
A box showing scan scope, file count, element count, overall score (with progress bar), `data-testid` coverage (with progress bar), and total issue count.

```
╔════════════════════════════════════════════════════════════════════════╗
║  ⬡  UI Testability Audit                                               ║
╠════════════════════════════════════════════════════════════════════════╣
║  Scanned     src/features/reward-catalog                               ║
║  Files       12  tsx/jsx                                               ║
║  Elements    35  interactive                                           ║
║  ──────────────────────────────────────────────────────────────────    ║
║  Score        0%  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0/35 pass             ║
║  data-testid  1/35  █░░░░░░░░░░░░░░░░░░░░░░░░░░░  34 missing          ║
║  ──────────────────────────────────────────────────────────────────    ║
║  Issues      39 issues  across 8 files                                 ║
╚════════════════════════════════════════════════════════════════════════╝
```

### Issues by File
Each file with violations is listed with a severity badge, followed by every failing element's line number, tag, violation reasons, and the raw JSX snippet.

```
  ▸ src/features/reward-catalog/components/bulk-action-bar.tsx  [WARN]  4 issues
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
    ✗  L31    <button>  missing data-testid  ·  no aria-label, role, or id
      <button className={btnDefault} onClick={onInvert}>
    ✗  L34    <button>  only one stable attribute  ·  no aria-label, role, or id
      <button data-testid="bulk-action-edit" className={btnDefault} onClick={onEdit}>
```

### Summary by Rule
Groups all violations by rule type, showing how many elements are affected, what percentage of total elements that represents, and a compact file → line number tree.

```
  ◈  Summary by Rule

  ✔     1  elements already have data-testid
  ✗    34  elements missing data-testid

  [FAIL]  34  missing data-testid  (97% of elements)
         │  bulk-action-bar.tsx   L31<button>  L38<button>  L43<button>
         │  bulk-edit-drawer.tsx  L135<input>  L294<input>  L575<button>
         │  rewards-toolbar.tsx   L155<button>  L178<select>  L230<button>

  [WARN]  4  img missing alt attribute  (11% of elements)
         │  quick-search.tsx       L120<img>
         │  reward-form-drawer.tsx  L1467<img>
```

### Severity Badges

| Badge | Condition |
|-------|-----------|
| `OK`  | 0 issues  |
| `WARN` | 1–5 issues |
| `FAIL` | 6+ issues  |

### Score Calculation
```
Score = (elements with zero violations) / (total interactive elements) × 100
```

---

## JSON Output (CI mode)

```json
{
  "score": 6,
  "totalElements": 195,
  "totalOk": 12,
  "totalIssues": 190,
  "files": [
    {
      "file": "src/features/reward-catalog/components/bulk-action-bar.tsx",
      "issues": [
        {
          "tag": "button",
          "line": 31,
          "raw": "<button className={btnDefault} onClick={onInvert}>",
          "dynamic": false,
          "issues": ["missing data-testid", "no aria-label, role, or id for accessibility"]
        }
      ]
    }
  ]
}
```

Exit code `0` = no issues. Exit code `1` = issues found (suitable for CI gates).
