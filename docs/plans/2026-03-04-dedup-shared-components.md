# Dedup Shared Components Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract 4 duplicated patterns into shared components/hooks, eliminating ~750 lines of copy-paste between reference-data and reward-catalog.

**Architecture:** Extract bottom-up — utilities first, then components, then hooks. Each extraction is independent and can be committed separately. Both consumers are updated in the same task to keep the codebase compiling at every commit.

**Tech Stack:** React 19, Radix UI Dialog, Tailwind CSS 4, TypeScript 5 strict

---

### Task 1: Extract `ExtFieldRenderer` to shared

The renderer is 98% identical between the two features. The only blocker is the `schemaData` prop type — define a minimal interface that both `EntitySchemaData` and `RewardSchemaData` satisfy.

**Files:**
- Modify: `src/shared/components/ext-field-renderer.tsx` (new location — rename from feature)
- Modify: `src/features/reference-data/shared/components/ext-field-renderer.tsx` (delete after extraction)
- Modify: `src/features/reward-catalog/components/reward-ext-fields.tsx` (remove `ExtFieldRenderer` + `isUrlField`, keep `ExtTabBody`)
- Modify: `src/features/reference-data/shared/components/entity-form-drawer.tsx` (update import)
- Modify: `src/features/reference-data/shared/components/bulk-edit-drawer.tsx` (update import)
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx` (update import)
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx` (update import via reward-ext-fields)

**Step 1: Create the shared ExtFieldRenderer**

Move `src/features/reference-data/shared/components/ext-field-renderer.tsx` to `src/shared/components/ext-field-renderer.tsx`. Change the `schemaData` prop type from `EntitySchemaData | null` to a minimal interface:

```typescript
/** Minimal schema shape needed by ExtFieldRenderer — satisfied by both EntitySchemaData and RewardSchemaData */
export interface ExtFieldSchemaData {
  extFields: Record<string, { enum?: string[] }>;
  enumFields: Record<string, string[]>;
}
```

Update the component's props to use `ExtFieldSchemaData | null` instead of `EntitySchemaData | null`.

**Step 2: Update reference-data imports**

- Delete `src/features/reference-data/shared/components/ext-field-renderer.tsx`
- In `entity-form-drawer.tsx` and `bulk-edit-drawer.tsx`: change import from `./ext-field-renderer` to `@/shared/components/ext-field-renderer`

**Step 3: Update reward-catalog imports**

- In `reward-ext-fields.tsx`: remove the `isUrlField` function and `ExtFieldRenderer` component entirely (~160 lines). Add `import { ExtFieldRenderer } from "@/shared/components/ext-field-renderer"` and re-export it so other reward files importing from `./reward-ext-fields` still work. `ExtTabBody` stays in this file.
- In `bulk-edit-drawer.tsx` (reward): update import if it imports directly from `reward-ext-fields`.

**Step 4: Verify build**

Run: `npx tsc -b --noEmit && npm test`
Expected: Clean build, 9 tests pass.

**Step 5: Commit**

```
feat: extract ExtFieldRenderer to shared components
```

---

### Task 2: Extract `getMixedValue` and `BulkField` to shared

Both are near-identical between the two bulk-edit drawers.

**Files:**
- Create: `src/shared/lib/bulk-field-utils.ts`
- Create: `src/shared/components/bulk-field.tsx`
- Modify: `src/features/reference-data/shared/components/bulk-edit-drawer.tsx` (remove getMixedValue + BulkField, import from shared)
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx` (remove getMixedValue + BulkField, import from shared)

**Step 1: Create `getMixedValue` utility**

Create `src/shared/lib/bulk-field-utils.ts`:

```typescript
/**
 * Check whether a field has different values across multiple items.
 * Uses JSON.stringify for deep comparison.
 */
export function getMixedValue(
  items: Record<string, unknown>[],
  fieldPath: string,
): boolean {
  if (items.length <= 1) return false;
  const first = items[0];
  if (!first) return false;
  const firstVal = JSON.stringify(first[fieldPath]);
  return items.some((item) => JSON.stringify(item[fieldPath]) !== firstVal);
}
```

Return type is `boolean` (normalized — the reward version's `{ mixed }` wrapper is unnecessary).

**Step 2: Create `BulkField` component**

Create `src/shared/components/bulk-field.tsx`:

```typescript
import type { JSX } from "react";

interface BulkFieldProps {
  fieldKey: string;
  enabled: boolean;
  mixed: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}

/**
 * Wrapper for bulk-edit fields — adds an enable/disable checkbox
 * and mixed-value indicator.
 */
export function BulkField({
  fieldKey,
  enabled,
  mixed,
  onToggle,
  children,
}: BulkFieldProps): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => onToggle(fieldKey)}
        className="mt-2.5 h-4 w-4 rounded-radius-sm border-border-strong accent-brand cursor-pointer"
      />
      <div className={enabled ? "flex-1" : "flex-1 opacity-50 pointer-events-none"}>
        {children}
        {!enabled && mixed && (
          <span className="text-caption text-foreground-tertiary italic">(mixed values)</span>
        )}
      </div>
    </div>
  );
}
```

Use `rounded-radius-sm` (design token) consistently.

**Step 3: Update both bulk-edit drawers**

In reference-data `bulk-edit-drawer.tsx`:
- Remove `getMixedValue` function (lines 48-67)
- Remove `BulkField` component (lines 71-109)
- Add imports: `import { getMixedValue } from "@/shared/lib/bulk-field-utils"` and `import { BulkField } from "@/shared/components/bulk-field"`

In reward-catalog `bulk-edit-drawer.tsx`:
- Remove `getMixedValue` function (lines 94-115)
- Remove `BulkField` component (lines 119-157)
- Add same imports
- Update call sites: `getMixedValue(...)` now returns `boolean` directly instead of `{ mixed }` — update any destructuring

**Step 4: Verify build**

Run: `npx tsc -b --noEmit && npm test`

**Step 5: Commit**

```
feat: extract getMixedValue and BulkField to shared
```

---

### Task 3: Extract `DrawerShell` component

The Dialog wrapper (Root/Portal/Overlay/Content), header (title + X), and body container are identical across all 4 drawers. Extract just the chrome — no tabs, no footer, no form logic.

**Files:**
- Create: `src/shared/components/drawer-shell.tsx`
- Modify: `src/features/reference-data/shared/components/entity-form-drawer.tsx`
- Modify: `src/features/reference-data/shared/components/bulk-edit-drawer.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx`

**Step 1: Create DrawerShell**

Create `src/shared/components/drawer-shell.tsx`:

```typescript
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { handleOpenAutoFocus, handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";

interface DrawerShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  /** Width class override — defaults to "w-1/2 min-w-[480px]" */
  widthClass?: string;
  /** data-testid for the content panel */
  testId?: string;
}

/**
 * Drawer chrome — right-sliding Radix Dialog with header (title + close button).
 * Consumers provide their own body, tabs, and footer as children.
 */
export function DrawerShell({
  open,
  onOpenChange,
  title,
  children,
  widthClass = "w-1/2 min-w-[480px]",
  testId,
}: DrawerShellProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[var(--z-modal)] bg-black/40
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=open]:duration-300
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            data-[state=closed]:duration-200"
        />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-[var(--z-modal)] h-full max-w-full",
            widthClass,
            "border-l border-border bg-card shadow-modal",
            "flex flex-col",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={handleOpenAutoFocus}
          onFocus={handleAutoSelectOnFocus}
          aria-describedby={undefined}
          data-testid={testId}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="text-h4 text-foreground">
              {title}
            </Dialog.Title>
            <button
              type="button"
              className="rounded-radius-sm p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Consumer-provided content (tabs, body, footer) */}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Step 2: Update each drawer to use DrawerShell**

For each of the 4 drawers, replace the `Dialog.Root` → `Dialog.Content` → header block with `<DrawerShell>`. The children become everything after the header: error banner, tab bar, body, and footer.

Example for entity-form-drawer (the pattern is the same for all 4):
- Remove imports: `Dialog` from `@radix-ui/react-dialog`, `X` from lucide (if only used for header close)
- Remove the `Dialog.Root`/`Portal`/`Overlay`/`Content` wrapper and header JSX
- Wrap the remaining content (form with error banner + tabs + body + footer) in `<DrawerShell open={open} onOpenChange={handleOpenChange} title={...}>`

For reward bulk-edit drawer, pass `widthClass="w-[560px]"` to preserve its fixed width.

**Step 3: Verify build**

Run: `npx tsc -b --noEmit && npm test`

**Step 4: Commit**

```
feat: extract DrawerShell to shared, use in all 4 drawers
```

---

### Task 4: Extract `useColumnChooser` hook and `ColumnChooserDropdown`

The column chooser is the largest duplication (~240 lines). Extract the state + handlers into a hook and the portal JSX into a component.

**Files:**
- Create: `src/shared/hooks/use-column-chooser.ts`
- Create: `src/shared/components/column-chooser-dropdown.tsx`
- Modify: `src/features/reference-data/shared/components/server-table-page.tsx`
- Modify: `src/features/reward-catalog/components/rewards-table.tsx`

**Step 1: Create `useColumnChooser` hook**

Create `src/shared/hooks/use-column-chooser.ts`. This hook encapsulates:
- `columnOrder` state (initialized from `buildOrder(savedLayout)`)
- `chooserOpen`, `chooserSearch`, `chooserPos` state
- All refs (`chooserRef`, `chooserBtnRef`, `chooserSearchRef`, `dragColRef`, `dragOverCol`)
- `buildOrder(savedLayout)` — pure function, can be module-level
- `toggleColumn`, `setAllColumnsVisible`, `invertColumns`
- `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`
- `openChooser`
- Click-outside `useEffect`

```typescript
interface ColumnChooserOptions {
  columns: { key: string; defaultVisible?: boolean }[];
  savedLayout?: { columns: { key: string; visible: boolean }[] } | null;
  onLayoutChange?: (layout: { columns: { key: string; visible: boolean }[] }) => void;
  /** True when schema data is ready (triggers column re-init if no saved layout) */
  schemaReady: boolean;
}
```

Returns: `{ columnOrder, activeColumns, chooser }` where `chooser` contains all the state/handlers the dropdown needs.

**Step 2: Create `ColumnChooserDropdown` component**

Create `src/shared/components/column-chooser-dropdown.tsx`. This is the portal-rendered dropdown with search, All/None/Invert, checkboxes, drag reorder. It receives the `chooser` object from the hook.

**Step 3: Update `server-table-page.tsx`**

Remove lines 200-350 (state, buildOrder, handlers, effects) and lines 962-1035 (portal JSX). Replace with:

```typescript
const { columnOrder, activeColumns, chooser } = useColumnChooser({
  columns,
  savedLayout,
  onLayoutChange,
  schemaReady: !schema.isLoading,
});
```

And in the JSX, replace the portal block with `<ColumnChooserDropdown chooser={chooser} />`. The gear button calls `chooser.open(event)`.

**Step 4: Update `rewards-table.tsx`**

Same pattern — remove lines 553-749 and 897-965. Replace with hook + component.

The `schemaReady` prop is `!!schemaData` for the rewards table.

**Step 5: Verify build**

Run: `npx tsc -b --noEmit && npm test`

**Step 6: Commit**

```
feat: extract useColumnChooser hook and ColumnChooserDropdown
```

---

## Deferred Items (follow-up PR)

These have incompatible signatures and need more design work:

- **I2: `useRewardSchema` ≈ `useEntitySchema`** — 90% identical but reward has hardcoded bulk-editable list and no config param. Needs shared `fetchSchemaCore()` internal function.
- **I6: `buildFormTabs` / `tabErrorCounts`** — different input shapes (config-driven vs hardcoded core tabs). Needs unified tab config format.
