# Reward Drawer Tab Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract each tab of `reward-form-drawer.tsx` (2,079 lines) into standalone components using RHF FormProvider, reducing the parent to ~300 lines and isolating re-renders per tab.

**Architecture:** Wrap `<form>` in `<FormProvider {...methods}>`. Each tab becomes a component in `tabs/` that calls `useFormContext<RewardFormValues>()`. Non-form dependencies (option lists, schema data) are passed as props. Tab-local state (toggles, refs) moves into the tab component.

**Tech Stack:** React Hook Form (FormProvider/useFormContext), React 19, TypeScript, Zod, Radix UI

**Design doc:** `docs/plans/2026-03-21-reward-drawer-tab-extraction-design.md`

---

## Task 1: Create `tabs/` directory and extract DetailsTab

**Files:**
- Create: `src/features/reward-catalog/components/tabs/details-tab.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Create DetailsTab component**

Create `tabs/details-tab.tsx`. Cut the Details JSX (lines 772–933 of reward-form-drawer.tsx — the block inside `{tab === "details" && (...)}`) into a new component.

```tsx
import { useFormContext } from "react-hook-form";
import { Controller } from "react-hook-form";
import { cn } from "@/shared/lib/cn";
import { handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";
import { Input } from "@/shared/ui/input";
import { MultiSelect } from "@/shared/components/multi-select";
import type { SelectOption } from "@/shared/components/select";
import type { RewardFormValues } from "../lib/reward-form-helpers";
import { flattenRhfErrors } from "../lib/reward-form-helpers";
import type { RewardCatalogItem } from "../types/reward-policy";
import { getUserDisplayName } from "../types/reward-policy";
import type { RewardSchemaData } from "../hooks/use-reward-schema";

interface DetailsTabProps {
  reward: RewardCatalogItem | null;
  isEditing: boolean;
  divisionOptions: SelectOption[];
  schemaData: RewardSchemaData | null;
}

export function DetailsTab({ reward, isEditing, divisionOptions, schemaData }: DetailsTabProps) {
  const { register, control, formState: { errors: rhfErrors } } = useFormContext<RewardFormValues>();
  const errors = flattenRhfErrors(rhfErrors);
  // ... paste the Details tab JSX here (the content of the <div className="space-y-4"> block)
}
```

Props needed:
- `reward` — for created/updated metadata display
- `isEditing` — to conditionally show metadata fields
- `divisionOptions` — for the divisions MultiSelect
- `schemaData` — for `coreRequiredFields` required-field markers

**Step 2: Update reward-form-drawer.tsx**

- Add `import { FormProvider } from "react-hook-form"`
- Add `import { DetailsTab } from "./tabs/details-tab"`
- Wrap form contents in `<FormProvider {...methods}>` where `methods` is the return of `useForm()`
  - Destructure: `const methods = useForm(...)` then `const { register, control, ... } = methods`
- Replace the Details tab JSX block with: `{tab === "details" && <DetailsTab reward={reward} isEditing={isEditing} divisionOptions={divisionOptions} schemaData={schemaData ?? null} />}`
- Remove imports that were ONLY used by Details tab (none in this case)

**Step 3: Type-check and verify**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

Run: `npx vitest run src/features/reward-catalog/` (verify existing tests still pass)

**Step 4: Commit**

```
feat: extract DetailsTab from reward-form-drawer
```

---

## Task 2: Extract FulfillmentTab

**Files:**
- Create: `src/features/reward-catalog/components/tabs/fulfillment-tab.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Create FulfillmentTab component**

Cut the Fulfillment JSX (lines 936–1439) into a new component. This is the largest tab.

Move into this component:
- The JSX block
- The `ffmntAdvancedOpen` useState
- The `prevCurrencyRef` useRef
- The 3 fulfillment-related useEffects (currency auto-pop lines 240–253, auto-select tier policy lines 272–275, auto-select tier level lines 278–287)
- The static option arrays: `FULFILLMENT_TYPE_OPTIONS`, `DELIVERY_METHOD_OPTIONS`, `REDEMPTION_TYPE_OPTIONS`, `VOUCHER_UNIT_OPTIONS`
- The `tierLevelOptions` useMemo

Props needed:
```tsx
interface FulfillmentTabProps {
  partnerOptions: SelectOption[];
  currencyOptions: SelectOption[];
  snapToOptions: SelectOption[];
  tierPolicySelectOptions: SelectOption[];
  tierPolicyOpts: TierPolicyOption[];  // full objects for deriving tier levels
  pursePoliciesData: PursePolicy[];    // for currency auto-pop effect
  schemaData: RewardSchemaData | null;
}
```

Use `useFormContext<RewardFormValues>()` for all form access. All `watch()` calls for fulfillment fields (ffmntType, redemptionType, ffmntExpirationType, ffmntCurrency, ffmntTierPolicy, ffmntTierUseDefaults) move into this component.

**Step 2: Update reward-form-drawer.tsx**

- Add `import { FulfillmentTab } from "./tabs/fulfillment-tab"`
- Replace Fulfillment JSX block with `<FulfillmentTab ... />`
- Remove from parent: `ffmntAdvancedOpen` state, `prevCurrencyRef`, the 3 fulfillment effects, the static option arrays, fulfillment-only watch variables (`selectedFfmntType`, `isExternalFfmnt`, `isPointsFfmnt`, `isTierStatusFfmnt`, `watchedRedemptionType`, `selectedFfmntExpirationType`, `selectedFfmntCurrency`, `selectedFfmntTierPolicy`, `ffmntTierUseDefaults`, `tierLevelOptions`)
- Remove imports only used by Fulfillment: `ChevronDown`, `FormattedNumberInput`

**Step 3: Type-check and verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/features/reward-catalog/`

**Step 4: Commit**

```
feat: extract FulfillmentTab from reward-form-drawer
```

---

## Task 3: Extract LimitsTab

**Files:**
- Create: `src/features/reward-catalog/components/tabs/limits-tab.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Create LimitsTab component**

Cut the Limits JSX (lines 1442–1660) into a new component.

Move into this component:
- The JSX block (Inventory group with Unlimited toggle, Rate Limits group, Usage group, canPreview toggle)
- The `unlimitedInventory` useState

Props needed:
```tsx
interface LimitsTabProps {
  reward: RewardCatalogItem | null;  // for redemptions count
}
```

The parent's drawer-open reset effect currently sets `setUnlimitedInventory(...)`. Since this state moves into LimitsTab, use a `key` prop on `<LimitsTab>` keyed to `reward?._id` so the component remounts with fresh state when the reward changes. Or pass `initialUnlimited` as a prop. Simplest: use `key={reward?._id ?? "new"}`.

**Step 2: Update reward-form-drawer.tsx**

- Add `import { LimitsTab } from "./tabs/limits-tab"`
- Replace Limits JSX block with `<LimitsTab reward={reward} key={reward?._id ?? "new"} />`
- Remove from parent: `unlimitedInventory` state, the `setUnlimitedInventory(...)` line from the reset effect

**Step 3: Type-check and verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/features/reward-catalog/`

**Step 4: Commit**

```
feat: extract LimitsTab from reward-form-drawer
```

---

## Task 4: Extract EligibilityTab

**Files:**
- Create: `src/features/reward-catalog/components/tabs/eligibility-tab.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Create EligibilityTab component**

Cut the Eligibility JSX (lines 1663–1968) into a new component.

Move into this component:
- The JSX block (Channels, Segments, Tier Levels with "All Tiers" toggle, Availability grid with "All Times" toggle)
- The `allTimesOverride` useState
- Imports: `timeToString`, `parseTime`, `DEFAULT_AVAILABILITY`, `DAY_KEYS`, `DAY_LABELS`

Props needed:
```tsx
interface EligibilityTabProps {
  channelOptions: SelectOption[];
  segmentOptions: SelectOption[];
  tierPolicyOpts: TierPolicyOption[];
  eligibilityLoading: boolean;
}
```

Same `key` approach as LimitsTab for `allTimesOverride` reset: `key={reward?._id ?? "new"}`.

**Step 2: Update reward-form-drawer.tsx**

- Add `import { EligibilityTab } from "./tabs/eligibility-tab"`
- Replace Eligibility JSX block with `<EligibilityTab ... key={reward?._id ?? "new"} />`
- Remove from parent: `allTimesOverride` state, the `setAllTimesOverride(...)` line from the reset effect
- Remove imports only used by Eligibility: `timeToString`, `parseTime`, `DEFAULT_AVAILABILITY`, `DAY_KEYS`, `DAY_LABELS`

**Step 3: Type-check and verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/features/reward-catalog/`

**Step 4: Commit**

```
feat: extract EligibilityTab from reward-form-drawer
```

---

## Task 5: Refactor ExtTabBody to use useFormContext

**Files:**
- Modify: `src/features/reward-catalog/components/reward-ext-fields.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Refactor ExtTabBody**

Replace the accessor-prop interface (`getExtValue`, `setExtValue`, `getExtError`) with `useFormContext`. The component reads/writes `ext.*` fields directly.

Before (current):
```tsx
export function ExtTabBody({
  tab, getExtValue, setExtValue, getExtError, schemaData, onPreviewUrl,
}: { ... })
```

After:
```tsx
import { useFormContext } from "react-hook-form";
import type { RewardFormValues } from "../lib/reward-form-helpers";
import { flattenRhfErrors } from "../lib/reward-form-helpers";

interface ExtTabBodyProps {
  tab: FormTab;
  schemaData: EntitySchemaData | null;
  onPreviewUrl?: (url: string) => void;
}

export function ExtTabBody({ tab, schemaData, onPreviewUrl }: ExtTabBodyProps) {
  const { watch, setValue, formState: { errors: rhfErrors } } = useFormContext<RewardFormValues>();
  const errors = flattenRhfErrors(rhfErrors);
  const ext = watch("ext") as Record<string, unknown>;

  const getExtValue = (key: string) => ext[key];
  const setExtValue = (key: string, val: unknown) =>
    setValue(`ext.${key}` as keyof RewardFormValues, val as never, { shouldDirty: true });
  const getExtError = (key: string) => errors[key];

  // ... rest of component unchanged (rows, gridClass, JSX rendering)
}
```

**Step 2: Update reward-form-drawer.tsx callsite**

Remove the accessor props from the `<ExtTabBody>` usage in the parent:

Before:
```tsx
<ExtTabBody
  tab={currentTab}
  getExtValue={(key) => (watch("ext") as Record<string, unknown>)[key]}
  setExtValue={(key, val) => setValue(`ext.${key}` as keyof RewardFormValues, val as never, { shouldDirty: true })}
  getExtError={(key) => errors[key]}
  schemaData={schemaData ?? null}
  onPreviewUrl={openPreview}
/>
```

After:
```tsx
<ExtTabBody
  tab={currentTab}
  schemaData={schemaData ?? null}
  onPreviewUrl={openPreview}
/>
```

**Step 3: Type-check and verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/features/reward-catalog/`

**Step 4: Commit**

```
refactor: ExtTabBody uses useFormContext instead of accessor props
```

---

## Task 6: Clean up parent drawer and verify

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Clean up unused imports**

After all tabs are extracted, remove any imports that are no longer used in the parent. Run `npx tsc --noEmit` to catch unused import errors if `noUnusedLocals` is enabled, or use the IDE/eslint.

**Step 2: Verify the parent is ~300 lines**

The parent should now contain:
- Hook calls (schema, options, etc.)
- `useForm` setup + `FormProvider`
- Reset effects (drawer open, schema load)
- Tab bar with drag-and-drop
- `bodyRef` + focus/scroll handling
- Submit handler + error-to-tab routing
- Footer (Cancel/Save)
- Unsaved changes dialog
- Image preview modal

**Step 3: Run full test suite**

Run: `npx vitest run src/features/reward-catalog/`
Run: `npx tsc --noEmit`

**Step 4: Commit**

```
refactor: clean up reward-form-drawer after tab extraction
```

---

## Task 7: Extract bulk edit drawer tabs (same pattern)

**Files:**
- Create: `src/features/reward-catalog/components/bulk-tabs/bulk-details-tab.tsx`
- Create: `src/features/reward-catalog/components/bulk-tabs/bulk-fulfillment-tab.tsx`
- Create: `src/features/reward-catalog/components/bulk-tabs/bulk-limits-tab.tsx`
- Create: `src/features/reward-catalog/components/bulk-tabs/bulk-eligibility-tab.tsx`
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx`

Apply the same FormProvider + useFormContext pattern to `bulk-edit-drawer.tsx`. Each bulk tab gets its own component file. The `BulkField` wrapper, `renderCoreField`, and `renderExtField` helpers either move into the tab that uses them or become shared utilities if used across multiple tabs.

The `renderCoreField` helper is used by multiple tabs — extract it to a shared utility: `src/features/reward-catalog/components/bulk-tabs/bulk-core-field.tsx`.

**Step 1: Add FormProvider to bulk-edit-drawer.tsx**

Same pattern as Task 1 Step 2.

**Step 2: Extract each tab one at a time**

Follow the same cut-and-replace pattern as Tasks 1–4. Each bulk tab receives `enabledFields`, `toggleField`, `getMixedValue`, `selectedRewards`, `schemaData`, and tab-specific option lists as props.

**Step 3: Type-check and verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/features/reward-catalog/`

**Step 4: Commit**

```
refactor: extract bulk edit drawer tabs into separate components
```

---

## Task 8: Run testability check and fix any issues

**Files:**
- All newly created tab components

**Step 1: Run testability checker**

Run: `node scripts/check-testability.mjs --dir src/features/reward-catalog/components/tabs`
Run: `node scripts/check-testability.mjs --dir src/features/reward-catalog/components/bulk-tabs`

**Step 2: Fix any reported issues**

Add missing `data-testid` and `aria-label` attributes as needed.

**Step 3: Commit**

```
fix: add missing testability attributes to extracted tab components
```
