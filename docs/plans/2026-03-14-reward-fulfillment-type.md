# Reward Fulfillment Type Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Fulfillment" tab to the reward form with a type selector and conditional External Fulfillment fields (partner + delivery method), stored in `ext._meta`.

**Architecture:** Fulfillment config is stored inline on the RewardPolicy's `ext._meta` object (atomic save). A new core tab "Fulfillment" is added to the form with a single select for type. When "External Fulfillment" is selected, partner (from API) and delivery method (fixed options) fields appear conditionally. The form reads/writes `ext._meta` properties directly in the payload construction.

**Tech Stack:** React Hook Form, Controller, Select component, MultiSelect (for partner search), useEntityList hook

---

### Task 1: Add "fulfillment" to core tabs and form values

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`

**Step 1: Add "fulfillment" to `CORE_TAB_KEYS`**

Change line 24 from:
```typescript
export const CORE_TAB_KEYS = ["details", "limits", "eligibility"] as const;
```
to:
```typescript
export const CORE_TAB_KEYS = ["details", "fulfillment", "limits", "eligibility"] as const;
```

**Step 2: Add fulfillment fields to `RewardFormValues`**

Add after `divisions: string[];` and before `ext`:
```typescript
fulfillmentType: string;
fulfillmentPartner: string;
fulfillmentDeliveryMethod: string;
```

**Step 3: Add fulfillment fields to `buildRewardDefaultValues`**

In the return object, after `divisions`, add:
```typescript
fulfillmentType: (reward?.ext as Record<string, unknown>)?._meta
  ? ((reward.ext as Record<string, unknown>)._meta as Record<string, unknown>)?.fulfillmentType as string ?? "Discount"
  : "Discount",
fulfillmentPartner: (reward?.ext as Record<string, unknown>)?._meta
  ? ((reward.ext as Record<string, unknown>)._meta as Record<string, unknown>)?.fulfillmentPartner as string ?? ""
  : "",
fulfillmentDeliveryMethod: (reward?.ext as Record<string, unknown>)?._meta
  ? ((reward.ext as Record<string, unknown>)._meta as Record<string, unknown>)?.fulfillmentDeliveryMethod as string ?? ""
  : "",
```

A cleaner approach: extract `_meta` once at the top of the function:
```typescript
const meta = (reward?.ext as Record<string, unknown>)?._meta as Record<string, unknown> | undefined;
```
Then use:
```typescript
fulfillmentType: (meta?.fulfillmentType as string) ?? "Discount",
fulfillmentPartner: (meta?.fulfillmentPartner as string) ?? "",
fulfillmentDeliveryMethod: (meta?.fulfillmentDeliveryMethod as string) ?? "",
```

**Step 4: Add fulfillment fields to `buildRewardZodSchema`**

In the `coreShape` object, add:
```typescript
fulfillmentType: z.string().min(1, "Fulfillment type is required"),
fulfillmentPartner: z.string(),
fulfillmentDeliveryMethod: z.string(),
```

**Step 5: Add fulfillment fields to `buildFieldTabMap`**

In the hardcoded map, add:
```typescript
fulfillmentType: "fulfillment",
fulfillmentPartner: "fulfillment",
fulfillmentDeliveryMethod: "fulfillment",
```

**Step 6: Add "Fulfillment" tab to `buildRewardFormTabs`**

In the function, the current code adds `details` first, then extension tabs, then `limits` and `eligibility` at the end. Add `fulfillment` after `details`:

Change the initial tabs array from:
```typescript
const tabs: FormTab[] = [
  { key: "details", label: "Details", fields: [], columns: 2 },
];
```
to:
```typescript
const tabs: FormTab[] = [
  { key: "details", label: "Details", fields: [], columns: 2 },
  { key: "fulfillment", label: "Fulfillment", fields: [], columns: 1 },
];
```

**Step 7: Update `validFormData` in tests**

In `src/features/reward-catalog/lib/reward-form-helpers.test.ts`, add to `validFormData`:
```typescript
fulfillmentType: "Discount",
fulfillmentPartner: "",
fulfillmentDeliveryMethod: "",
```

**Step 8: Run tests**

Run: `npx vitest run src/features/reward-catalog/lib/reward-form-helpers.test.ts`
Expected: All pass (existing tests should work with the new fields added to validFormData).

**Step 9: Commit**

```bash
git add src/features/reward-catalog/lib/reward-form-helpers.ts src/features/reward-catalog/lib/reward-form-helpers.test.ts
git commit -m "feat: add fulfillment to core tabs, form values, and schema"
```

---

### Task 2: Render Fulfillment tab in the form drawer

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add imports**

Add near existing imports:
```typescript
import { Select, type SelectOption as SingleSelectOption } from "@/shared/components/select";
import type { Partner } from "@/shared/types";
```

Note: `SelectOption` is already imported for MultiSelect — use a different alias for Select's option type, or reuse the same type if compatible. Check if both use the same `{ value: string; label: string }` shape — they do, so just reuse `SelectOption`.

Actually, `SelectOption` is already imported from `@/shared/components/select`. Just add the `Select` import:
```typescript
import { Select, type SelectOption } from "@/shared/components/select";
```
And remove the standalone `type SelectOption` import if it was separate. Also add:
```typescript
import type { Partner } from "@/shared/types";
```

**Step 2: Add fulfillment constants and partner data hook**

Inside the component, after the divisions hooks, add:

```typescript
// Fulfillment
const FULFILLMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "Discount", label: "Discount" },
  { value: "Points", label: "Points" },
  { value: "Tier Status", label: "Tier Status" },
  { value: "External Fulfillment", label: "External Fulfillment" },
];

const DELIVERY_METHOD_OPTIONS: SelectOption[] = [
  { value: "Event-Based", label: "Event-Based" },
  { value: "Batch", label: "Batch" },
];

const { data: partnersData } = useEntityList<Partner>("partners", {
  select: "name",
  sort: "name",
  limit: 0,
});
const partnerOptions: SelectOption[] = useMemo(
  () => (partnersData?.data ?? []).map((p) => ({ value: p._id, label: p.name })),
  [partnersData],
);

const selectedFulfillmentType = watch("fulfillmentType");
const isExternalFulfillment = selectedFulfillmentType === "External Fulfillment";
```

**Step 3: Add Fulfillment tab body**

After the Details tab block and before the Limits tab block, add:

```tsx
{/* Fulfillment tab */}
{tab === "fulfillment" && (
  <div className="space-y-4">
    <div>
      <label className="mb-3 block text-label text-foreground-muted">
        Fulfillment Type<span className="ml-0.5 text-error">*</span>
      </label>
      <Controller
        control={control}
        name="fulfillmentType"
        render={({ field }) => (
          <Select
            value={field.value}
            onChange={field.onChange}
            options={FULFILLMENT_TYPE_OPTIONS}
            placeholder="Select fulfillment type..."
          />
        )}
      />
      {errors.fulfillmentType && (
        <p className="text-caption text-error">
          {errors.fulfillmentType}
        </p>
      )}
    </div>

    {isExternalFulfillment && (
      <>
        <div>
          <label className="mb-3 block text-label text-foreground-muted">
            Partner
          </label>
          <Controller
            control={control}
            name="fulfillmentPartner"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={partnerOptions}
                placeholder="Select partner..."
                searchable
              />
            )}
          />
        </div>

        <div>
          <label className="mb-3 block text-label text-foreground-muted">
            Delivery Method
          </label>
          <Controller
            control={control}
            name="fulfillmentDeliveryMethod"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={DELIVERY_METHOD_OPTIONS}
                placeholder="Select delivery method..."
              />
            )}
          />
        </div>
      </>
    )}
  </div>
)}
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: May have errors since onSubmit doesn't write fulfillment to ext._meta yet — fixed in Task 3.

**Step 5: Commit**

```bash
git add src/features/reward-catalog/components/reward-form-drawer.tsx
git commit -m "feat: render fulfillment tab with conditional external fields"
```

---

### Task 3: Wire fulfillment into the save payload via ext._meta

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Build _meta object in onSubmit**

In the `onSubmit` handler, after `const ext = buildExtFromValues(...)`, build the `_meta` with fulfillment fields:

```typescript
const metaBase = isEditing && reward
  ? (reward.ext as Record<string, unknown>)?._meta as Record<string, unknown> ?? {}
  : { subType: "RewardsCatalog" };

const meta = {
  ...metaBase,
  fulfillmentType: data.fulfillmentType,
  fulfillmentPartner: data.fulfillmentType === "External Fulfillment" ? data.fulfillmentPartner : "",
  fulfillmentDeliveryMethod: data.fulfillmentType === "External Fulfillment" ? data.fulfillmentDeliveryMethod : "",
};
```

**Step 2: Update the editing branch ext construction**

Change:
```typescript
ext: { ...reward.ext, ...ext } as RewardCatalogItem["ext"],
```
to:
```typescript
ext: { ...reward.ext, ...ext, _meta: meta } as RewardCatalogItem["ext"],
```

**Step 3: Update the creating branch ext construction**

Change:
```typescript
ext: { _meta: (base.ext as Record<string, unknown>)._meta, ...ext } as unknown as RewardCatalogItem["ext"],
```
to:
```typescript
ext: { ...ext, _meta: meta } as unknown as RewardCatalogItem["ext"],
```

**Step 4: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass.

**Step 5: Commit**

```bash
git add src/features/reward-catalog/components/reward-form-drawer.tsx
git commit -m "feat: wire fulfillment fields into ext._meta on save"
```

---

### Task 4: Update defaults to include fulfillment _meta

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-defaults.ts`

**Step 1: Add default fulfillment _meta fields**

Change line 175 from:
```typescript
ext: { ...defaultExt, _meta: { subType: "RewardsCatalog" } },
```
to:
```typescript
ext: { ...defaultExt, _meta: { subType: "RewardsCatalog", fulfillmentType: "Discount", fulfillmentPartner: "", fulfillmentDeliveryMethod: "" } },
```

**Step 2: Update reward-defaults test**

In `src/features/reward-catalog/lib/reward-defaults.test.ts`, update the `_meta` assertion:

Change:
```typescript
expect(item.ext._meta).toEqual({ subType: "RewardsCatalog" });
```
to:
```typescript
expect(item.ext._meta).toEqual({
  subType: "RewardsCatalog",
  fulfillmentType: "Discount",
  fulfillmentPartner: "",
  fulfillmentDeliveryMethod: "",
});
```

**Step 3: Run tests**

Run: `npx vitest run src/features/reward-catalog/lib/reward-defaults.test.ts`
Expected: All pass.

**Step 4: Commit**

```bash
git add src/features/reward-catalog/lib/reward-defaults.ts src/features/reward-catalog/lib/reward-defaults.test.ts
git commit -m "feat: add fulfillment defaults to reward _meta"
```

---

### Task 5: Final verification

**Step 1: Run full type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass.

**Step 2: Manual verification (if dev environment available)**

- Open reward form drawer
- Verify "Fulfillment" tab appears between Details and first extension tab
- Select "Discount" — no additional fields shown
- Select "External Fulfillment" — Partner and Delivery Method fields appear
- Select a partner, select a delivery method
- Save — verify data persists in `ext._meta`
- Re-open the reward — verify fulfillment fields load correctly
- Change from "External Fulfillment" to "Points" — verify partner/delivery method are cleared on save
