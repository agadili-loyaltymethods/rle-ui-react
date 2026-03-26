---
name: ux-conventions
description: UI/UX conventions for rcx-ui — tables, forms, modals, dropdowns, save buttons, field editability, enum-driven selects, unsaved changes guards, form data transforms, list views, number formatting, refresh buttons, and naming conventions. Use when building or modifying any UI component, page, or form.
allowed-tools: Read, Grep, Glob
---

# RCX UX Conventions

Follow these conventions when building or modifying any UI in rcx-ui.

---

## Naming Conventions
- **"Policies"** → referred to as **"Program Elements"** in the UI
- **"Tier Policies"** → referred to as **"Tier Groups"** in the UI
- Use these labels in all headings, breadcrumbs, sidebar items, and toast messages

## CSS & Styling Standards

See the `/ui-standards` skill for the complete rules (color tokens, sizing tokens, typography, inline style exceptions, border radius, CVA, Tailwind 4 gotchas). Always invoke `/ui-standards` before creating or modifying any UI component.

## Design Tokens
- **Brand color**: `#F47A20` (orange)
- **Sidebar**: 260px expanded, 64px collapsed, persisted in localStorage
- **Search**: inline in header bar (not modal), dropdown results on focus/type

## Number Formatting
ALL numeric values displayed in the UI MUST use thousands separators. Use `formatNumber()` from `@/shared/lib/format-utils` — never render raw numbers. This applies to:
- Counts and totals
- Currency and point values
- Pagination info
- Badges and metrics
- Table cell values

## List Views
Always provide a **Card view / List (table) view toggle** for entity listings. Users should be able to switch between a grid-of-cards layout and a tabular list view for any collection of entities.

## Table Views
- **Row actions**: If there are more than 2 actions available, use a **context menu** (right-click or "..." button). For 2 or fewer actions, use **inline icon buttons**.
- **Column sorting**: Always enable sorting on all columns — users should be able to click column headers to sort ascending/descending.
- **Column rearranging**: Always allow users to rearrange columns via drag-and-drop or a column visibility/order control.

## Card View Structure
All entity card views must follow the same structural pattern (see `purse-grouped-cards.tsx` as reference):
- **Card components**: Use `CardHeader` + `CardContent` (never just `CardContent` alone)
- **Icon container**: 8x8 rounded-lg colored icon in the header, next to `CardTitle` — use a distinct accent color per entity type (e.g. blue for purses, violet for activity templates)
- **Action buttons**: Edit (Pencil) and Delete (Trash2) buttons in the header top-right, with `e.stopPropagation()` on click
- **Badges/tags**: Below the header row with `ml-10` to indent under the icon
- **Metadata rows**: In `CardContent`, each row follows `icon (h-3.5) + label: value` pattern with `space-y-2 text-body-sm`
- **Layout**: `flex flex-col` on Card for consistent height in grids

## Edit Pages
- **Page title**: Must clearly indicate the entity type and action — e.g. "Create Activity Template" vs "Edit Activity Template"
- **Editable title field**: The entity name/title field should always remain editable and be wide enough for long names (never cramped into a small input)
- **Auto-focus**: On page load or tab switch, always focus the first editable element in the visible tab

## Save Button Behavior
- Save/Create button must be `disabled={!isDirty && !isCreate}` on ALL edit pages
- Label: **"Create"** for new entities, **"Save"** for editing existing ones
- Consistent between `EntityEditPage` and custom editors (e.g. `TierGroupEditor`)

## Field Editability
- **Always editable**: Expiration settings (type, unit, value, snap-to, warning days) and escrow settings (value, unit, snap-to)
- **Locked in edit mode**: Entity `name`, qualifying `group`, period start/end dates — fields that define identity or are structurally immutable
- **Locked entities**: Use `isReadOnly` config with a lock banner and no Save button (e.g. past qualifying periods)

## Enum-Driven Selects
- Dropdowns for reference values (SnapTo, timeZone, AggregateType, PurseGroup) must load from the API via `useEnumOptions("EnumType")`, never hardcode options
- Filter out irrelevant enum values at the consumer level (e.g. filter `ExpirationDate` from SnapTo for purse/tier pages)
- Title-case labels from API: `.map(o => ({ value: o.value, label: o.label.replace(/\b\w/g, c => c.toUpperCase()) }))`
- Use the enum values as-is — don't inject synthetic options like a manual "None" entry

## Unsaved Changes Guards
- Use React Router `useBlocker` for route navigation (sidebar links, browser back)
- Show confirmation dialog for cancel/back button when `isDirty`
- Use `skipBlockerRef.current = true` before `navigate()` after successful save to prevent false "unsaved changes" dialog
- Warn on browser tab close/refresh via `beforeunload` event when dirty
- **Applies to both edit and create flows** — new entities with any filled-in fields must also trigger unsaved changes guards

## Form Data Transforms on Load
- `EntityEditPage` auto-transforms data during form reset:
  - ISO date strings (`YYYY-MM-DDTHH:mm`) → `YYYY-MM-DD` for `<input type="date">`
  - Warning-days arrays (`[30, 60]`) → comma-separated strings (`"30,60"`) for `warning-days` field type
- Merge `config.defaultValues` into reset data so virtual fields (e.g. `_qualifying`) don't cause false dirty state from key-count mismatches

## Scheduling UI
- Don't render scheduling fields (automatic expiration, start/end dates, repeat interval, frequency) for now — the API supports them but they are not needed yet

## Refresh Buttons
- All list/detail views should have a refresh button (RefreshCw icon)
- Use `isFetching` state for spin animation and disabled state
- Place next to other action buttons in the header bar

## Select / Dropdown Styling
- **Never use a bare native `<select>`** — the browser-default dropdown arrow jams into the border and looks broken
- Always style selects with sufficient right padding (e.g. `pr-10`) and a custom chevron icon positioned inside, OR use a Radix/cmdk-based combobox component
- If using a native `<select>`, wrap it with `appearance-none` and render a `ChevronDown` icon absolutely positioned on the right
- **Searchable vs non-searchable**: If there are only a handful of fixed selections, use a non-searchable dropdown (Radix Select or styled native select). When a list could have more than a handful of items (or the count is unbounded), use a searchable dropdown (Radix Popover + search input + filtered list).
- **Multi-select dropdowns**: Always include helper buttons: **Selected** (filter to show only selected items), **All** (select all visible), **Clear** (deselect all), and **Invert** (toggle selection). Place these as compact buttons/links above or below the options list.

## Unique IDs
- **Always use MongoDB ObjectIDs** (24-char hex) — use `generateObjectId()` from `@/shared/lib/format-utils`
- Never use `crypto.randomUUID()` — UUIDs are not MongoDB-compatible

## Empty States
- Always show a **muted icon** (e.g. the relevant Lucide icon for the entity) centered above the message
- Use a **`variant="outline" size="sm"`** button (b/w), never the accent/brand button
- Pattern: icon (`h-10 w-10 text-foreground-muted mb-3`) → muted text (`text-body-sm text-foreground-muted mb-3`) → outline button
- Reference: Extensions tab empty state in `activity-template-edit-page.tsx`

## Form Validation Across Tabs
- All tabbed edit pages must surface validation errors consistently:
  1. **Inline field errors**: Red border on the input (`error` prop) + error message below (`text-caption text-error`)
  2. **Tab error dot**: Red dot (`h-2 w-2 rounded-full bg-error`) on tab triggers that contain fields with errors
  3. **Auto-switch on save**: On validation failure, switch to the first tab with errors
  4. **Focus first errored field**: ALWAYS focus the first field with an error after switching tabs — both on save validation failure and when the user manually clicks a tab with errors. Use double-`requestAnimationFrame` to wait for the tab switch render.
  5. **Clear on edit**: Clear a field's error as soon as the user modifies it
  6. **Required field validation**: All required fields must pass validation before save/create is allowed — never allow submission with empty required fields
- `EntityEditPage` implements this via React Hook Form `errors` + `tabsWithErrors` memo + `formRef` querySelector for field focus
- Custom edit pages (e.g. `activity-template-edit-page.tsx`) use `formErrors` state + `validate()` + `tabsWithErrors` memo + `FIELD_SELECTORS` map + `focusFirstErrorField()` + `clearError()` per field
- **Tab switch focus**: Even without errors, switching tabs should focus the first editable element in the newly displayed tab content (same double-`requestAnimationFrame` technique)

## Modal Dialogs
- **X button**: Every modal dialog must have an X close button at the top right, acting as a proxy for Cancel
- **Stable height**: Modals should not change height based on internal content changes (e.g. toggling fields, switching tabs within a modal). Use a fixed or min-height to prevent layout jitter.
- **Consistency**: All modals must follow the same patterns for title placement, button order (secondary left, primary right), and spacing. Reference existing modals (e.g. `form-modal.tsx`) to match the established look.
- **Auto-focus**: Every modal with input fields must auto-focus the first available entry field on open
  - Use `onOpenAutoFocus` on `Dialog.Content` to prevent default and focus the first input/textarea/combobox
  - Selector: `'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), button[role="combobox"]'`
  - Wrap in `requestAnimationFrame` for reliable timing after render
  - Already implemented in: `form-modal.tsx`, `ExtensionFieldModal`, `ValidationRuleModal`, create modal on activity-templates-page
  - Popovers (`SearchableFieldPicker`, `AddTypePopover`) use a ref to focus the search input directly

## Breadcrumbs
- **Never display raw IDs** in breadcrumbs or elsewhere in the UI unless explicitly requested
- Edit pages must call `useBreadcrumbOverride(segment, label)` from `@/shared/components/breadcrumb-context` to register a human-readable name for the URL segment
- The `Breadcrumbs` component automatically hides ID-like segments (ObjectIDs, UUIDs) that have no override
