# Fulfillment Conditional Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename fulfillment fields to `ffmnt` prefix and add conditional fields for Points (currency, points, expiration, escrow) and Tier Status (policy, level, duration) fulfillment types.

**Architecture:** All fulfillment data is stored in `ext._meta` on the RewardPolicy. The Fulfillment tab conditionally shows different field groups based on `ffmntType`. Points auto-populates expiration/escrow from the selected purse policy on first selection. Non-qualifying purse policies are loaded via `useEntityList` with a query filter.

**Tech Stack:** React Hook Form, Zod, Controller, Select component, useEntityList, useEnumOptions, useTierPolicyOptions

---

### Task 1: Rename `fulfillment*` to `ffmnt*` in form helpers

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.test.ts`

**Step 1: Rename in `RewardFormValues` interface**

Replace:
```typescript
fulfillmentType: string;
fulfillmentPartner: string;
fulfillmentDeliveryMethod: string;
```
With:
```typescript
ffmntType: string;
ffmntPartner: string;
ffmntDeliveryMethod: string;
```

**Step 2: Rename in `buildRewardDefaultValues`**

Replace:
```typescript
fulfillmentType: (meta?.fulfillmentType as string) ?? "Discount",
fulfillmentPartner: (meta?.fulfillmentPartner as string) ?? "",
fulfillmentDeliveryMethod: (meta?.fulfillmentDeliveryMethod as string) ?? "",
```
With:
```typescript
ffmntType: (meta?.ffmntType as string) ?? "Discount",
ffmntPartner: (meta?.ffmntPartner as string) ?? "",
ffmntDeliveryMethod: (meta?.ffmntDeliveryMethod as string) ?? "",
```

**Step 3: Rename in `buildRewardZodSchema`**

Replace:
```typescript
fulfillmentType: z.string().min(1, "Fulfillment type is required"),
fulfillmentPartner: z.string(),
fulfillmentDeliveryMethod: z.string(),
```
With:
```typescript
ffmntType: z.string().min(1, "Fulfillment type is required"),
ffmntPartner: z.string(),
ffmntDeliveryMethod: z.string(),
```

**Step 4: Rename in `buildFieldTabMap`**

Replace:
```typescript
fulfillmentType: "fulfillment",
fulfillmentPartner: "fulfillment",
fulfillmentDeliveryMethod: "fulfillment",
```
With:
```typescript
ffmntType: "fulfillment",
ffmntPartner: "fulfillment",
ffmntDeliveryMethod: "fulfillment",
```

**Step 5: Update test fixture `validFormData`**

Replace:
```typescript
fulfillmentType: "Discount",
fulfillmentPartner: "",
fulfillmentDeliveryMethod: "",
```
With:
```typescript
ffmntType: "Discount",
ffmntPartner: "",
ffmntDeliveryMethod: "",
```

**Step 6: Commit**
```bash
git commit -m "refactor: rename fulfillment to ffmnt prefix in form helpers"
```

---

### Task 2: Rename `fulfillment*` to `ffmnt*` in form drawer

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Rename all `fulfillment*` references in the component**

Use find-and-replace within the file:
- `"fulfillmentType"` → `"ffmntType"` (RHF field names in Controller, watch, errors)
- `"fulfillmentPartner"` → `"ffmntPartner"`
- `"fulfillmentDeliveryMethod"` → `"ffmntDeliveryMethod"`
- `selectedFulfillmentType` → `selectedFfmntType`
- `isExternalFulfillment` → `isExternalFfmnt`
- `fulfillmentType` → `ffmntType` in the `meta` object within `onSubmit`
- `fulfillmentPartner` → `ffmntPartner` in the `meta` object
- `fulfillmentDeliveryMethod` → `ffmntDeliveryMethod` in the `meta` object
- `data.fulfillmentType` → `data.ffmntType` in onSubmit conditional checks

**Step 2: Run type check and tests**
Run: `npx tsc --noEmit && npx vitest run`

**Step 3: Commit**
```bash
git commit -m "refactor: rename fulfillment to ffmnt prefix in form drawer"
```

---

### Task 3: Rename `fulfillment*` to `ffmnt*` in defaults

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-defaults.ts`
- Modify: `src/features/reward-catalog/lib/reward-defaults.test.ts`

**Step 1: Update defaults**

Replace in `createDefaultRewardCatalogItem`:
```typescript
ext: { ...defaultExt, _meta: { subType: "RewardsCatalog", fulfillmentType: "Discount", fulfillmentPartner: "", fulfillmentDeliveryMethod: "" } },
```
With:
```typescript
ext: { ...defaultExt, _meta: { subType: "RewardsCatalog", ffmntType: "Discount", ffmntPartner: "", ffmntDeliveryMethod: "" } },
```

**Step 2: Update test assertion**

Replace:
```typescript
expect(item.ext._meta).toEqual({
  subType: "RewardsCatalog",
  fulfillmentType: "Discount",
  fulfillmentPartner: "",
  fulfillmentDeliveryMethod: "",
});
```
With:
```typescript
expect(item.ext._meta).toEqual({
  subType: "RewardsCatalog",
  ffmntType: "Discount",
  ffmntPartner: "",
  ffmntDeliveryMethod: "",
});
```

**Step 3: Run tests**
Run: `npx vitest run`

**Step 4: Commit**
```bash
git commit -m "refactor: rename fulfillment to ffmnt prefix in defaults"
```

---

### Task 4: Add Points and Tier Status fields to form values and schema

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.test.ts`

**Step 1: Add new fields to `RewardFormValues`**

After `ffmntDeliveryMethod: string;`, add:
```typescript
// Points
ffmntCurrency: string;
ffmntPoints: number;
ffmntExpirationType: string;
ffmntExpiryValue: number;
ffmntExpiryUnit: string;
ffmntExpirationSnapTo: string;
ffmntInactiveDays: number;
ffmntEscrowValue: number;
ffmntEscrowUnit: string;
ffmntEscrowSnapTo: string;
// Tier Status
ffmntTierPolicy: string;
ffmntTierLevel: string;
ffmntTierDurationValue: number;
ffmntTierDurationUnit: string;
```

**Step 2: Add defaults in `buildRewardDefaultValues`**

After `ffmntDeliveryMethod`:
```typescript
ffmntCurrency: (meta?.ffmntCurrency as string) ?? "",
ffmntPoints: (meta?.ffmntPoints as number) ?? 0,
ffmntExpirationType: (meta?.ffmntExpirationType as string) ?? "None",
ffmntExpiryValue: (meta?.ffmntExpiryValue as number) ?? 0,
ffmntExpiryUnit: (meta?.ffmntExpiryUnit as string) ?? "Days",
ffmntExpirationSnapTo: (meta?.ffmntExpirationSnapTo as string) ?? "now",
ffmntInactiveDays: (meta?.ffmntInactiveDays as number) ?? 0,
ffmntEscrowValue: (meta?.ffmntEscrowValue as number) ?? 0,
ffmntEscrowUnit: (meta?.ffmntEscrowUnit as string) ?? "None",
ffmntEscrowSnapTo: (meta?.ffmntEscrowSnapTo as string) ?? "now",
ffmntTierPolicy: (meta?.ffmntTierPolicy as string) ?? "",
ffmntTierLevel: (meta?.ffmntTierLevel as string) ?? "",
ffmntTierDurationValue: (meta?.ffmntTierDurationValue as number) ?? 0,
ffmntTierDurationUnit: (meta?.ffmntTierDurationUnit as string) ?? "Days",
```

**Step 3: Add Zod validators in `buildRewardZodSchema`**

After `ffmntDeliveryMethod`:
```typescript
ffmntCurrency: z.string(),
ffmntPoints: z.coerce.number().int().min(0),
ffmntExpirationType: z.string(),
ffmntExpiryValue: z.coerce.number().min(0),
ffmntExpiryUnit: z.string(),
ffmntExpirationSnapTo: z.string(),
ffmntInactiveDays: z.coerce.number().int().min(0),
ffmntEscrowValue: z.coerce.number().min(0),
ffmntEscrowUnit: z.string(),
ffmntEscrowSnapTo: z.string(),
ffmntTierPolicy: z.string(),
ffmntTierLevel: z.string(),
ffmntTierDurationValue: z.coerce.number().int().min(0),
ffmntTierDurationUnit: z.string(),
```

**Step 4: Add to `buildFieldTabMap`**

After `ffmntDeliveryMethod: "fulfillment"`:
```typescript
ffmntCurrency: "fulfillment",
ffmntPoints: "fulfillment",
ffmntExpirationType: "fulfillment",
ffmntExpiryValue: "fulfillment",
ffmntExpiryUnit: "fulfillment",
ffmntExpirationSnapTo: "fulfillment",
ffmntInactiveDays: "fulfillment",
ffmntEscrowValue: "fulfillment",
ffmntEscrowUnit: "fulfillment",
ffmntEscrowSnapTo: "fulfillment",
ffmntTierPolicy: "fulfillment",
ffmntTierLevel: "fulfillment",
ffmntTierDurationValue: "fulfillment",
ffmntTierDurationUnit: "fulfillment",
```

**Step 5: Update test fixture `validFormData`**

After `ffmntDeliveryMethod: ""`:
```typescript
ffmntCurrency: "",
ffmntPoints: 0,
ffmntExpirationType: "None",
ffmntExpiryValue: 0,
ffmntExpiryUnit: "Days",
ffmntExpirationSnapTo: "now",
ffmntInactiveDays: 0,
ffmntEscrowValue: 0,
ffmntEscrowUnit: "None",
ffmntEscrowSnapTo: "now",
ffmntTierPolicy: "",
ffmntTierLevel: "",
ffmntTierDurationValue: 0,
ffmntTierDurationUnit: "Days",
```

**Step 6: Run tests**
Run: `npx vitest run src/features/reward-catalog/lib/reward-form-helpers.test.ts`

**Step 7: Commit**
```bash
git commit -m "feat: add Points and Tier Status fields to form values and schema"
```

---

### Task 5: Render Points conditional fields on Fulfillment tab

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add data hooks for purse policies and SnapTo enum**

Add import at top:
```typescript
import type { PursePolicy } from "@/shared/types";
import { useEnumOptions } from "@/shared/hooks/use-api";
```

Inside the component, after the partner hooks, add:
```typescript
// Points fulfillment — non-qualifying purse policies
const { data: pursePoliciesData } = useEntityList<PursePolicy>("pursepolicies", {
  select: "name,expirationType,expiryValue,expiryUnit,expirationSnapTo,inactiveDays,escrowValue,escrowUnit,escrowSnapTo,group",
  sort: "name",
  limit: 0,
});
const currencyOptions: SelectOption[] = useMemo(
  () => (pursePoliciesData?.data ?? [])
    .filter((pp) => !pp.group)
    .map((pp) => ({ value: pp._id, label: pp.name })),
  [pursePoliciesData],
);

const { data: snapToOptions } = useEnumOptions("SnapTo");
const filteredSnapToOptions: SelectOption[] = useMemo(
  () => (snapToOptions ?? [])
    .filter((o) => o.value !== "ExpirationDate")
    .map((o) => ({ value: o.value, label: o.label })),
  [snapToOptions],
);
```

**Step 2: Add derived state for conditional rendering**

Update the existing fulfillment type watchers:
```typescript
const selectedFfmntType = watch("ffmntType");
const isExternalFfmnt = selectedFfmntType === "External Fulfillment";
const isPointsFfmnt = selectedFfmntType === "Points";
const isTierStatusFfmnt = selectedFfmntType === "Tier Status";

const selectedFfmntExpirationType = watch("ffmntExpirationType");
const selectedFfmntCurrency = watch("ffmntCurrency");
```

**Step 3: Add auto-populate effect for purse policy defaults**

After the fulfillment watchers, add a ref and effect:
```typescript
const lastAutoPopulatedCurrency = useRef<string>("");

useEffect(() => {
  if (!isPointsFfmnt || !selectedFfmntCurrency || selectedFfmntCurrency === lastAutoPopulatedCurrency.current) return;
  const pp = pursePoliciesData?.data?.find((p) => p._id === selectedFfmntCurrency);
  if (!pp) return;
  lastAutoPopulatedCurrency.current = selectedFfmntCurrency;
  setValue("ffmntExpirationType", pp.expirationType ?? "None");
  setValue("ffmntExpiryValue", pp.expiryValue ?? 0);
  setValue("ffmntExpiryUnit", pp.expiryUnit ?? "Days");
  setValue("ffmntExpirationSnapTo", pp.expirationSnapTo ?? "now");
  setValue("ffmntInactiveDays", pp.inactiveDays ?? 0);
  setValue("ffmntEscrowValue", pp.escrowValue ?? 0);
  setValue("ffmntEscrowUnit", pp.escrowUnit ?? "None");
  setValue("ffmntEscrowSnapTo", pp.escrowSnapTo ?? "now");
}, [selectedFfmntCurrency, isPointsFfmnt, pursePoliciesData, setValue]);
```

**Step 4: Add Points section JSX**

After the External Fulfillment conditional block, within the `{tab === "fulfillment" && (` section, add:

```tsx
{isPointsFfmnt && (
  <>
    {/* Currency */}
    <div>
      <label className="mb-3 block text-label text-foreground-muted">
        Currency<span className="ml-0.5 text-error">*</span>
      </label>
      <Controller
        control={control}
        name="ffmntCurrency"
        render={({ field }) => (
          <Select
            value={field.value}
            onChange={field.onChange}
            options={currencyOptions}
            placeholder="Select currency..."
          />
        )}
      />
    </div>

    {/* Points */}
    <div>
      <label className="mb-3 block text-label text-foreground-muted">
        Points<span className="ml-0.5 text-error">*</span>
      </label>
      <Input
        type="number"
        {...register("ffmntPoints", { valueAsNumber: true })}
        min="0"
        placeholder="0"
      />
    </div>

    {/* Expiration */}
    <div className="space-y-3">
      <label className="block text-label text-foreground-muted">Expiration</label>
      <Controller
        control={control}
        name="ffmntExpirationType"
        render={({ field }) => (
          <Select
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: "None", label: "None" },
              { value: "Custom", label: "Custom" },
              { value: "Activity-Based", label: "Activity-Based" },
            ]}
            placeholder="Select..."
          />
        )}
      />

      {selectedFfmntExpirationType === "Custom" && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-caption text-foreground-muted">Value</label>
            <Input
              type="number"
              {...register("ffmntExpiryValue", { valueAsNumber: true })}
              min="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-caption text-foreground-muted">Unit</label>
            <Controller
              control={control}
              name="ffmntExpiryUnit"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "Days", label: "Days" },
                    { value: "Hours", label: "Hours" },
                    { value: "Months", label: "Months" },
                    { value: "Years", label: "Years" },
                  ]}
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-caption text-foreground-muted">Snap To</label>
            <Controller
              control={control}
              name="ffmntExpirationSnapTo"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={filteredSnapToOptions}
                  placeholder="now"
                />
              )}
            />
          </div>
        </div>
      )}

      {selectedFfmntExpirationType === "Activity-Based" && (
        <div>
          <label className="mb-1 block text-caption text-foreground-muted">Inactive Days</label>
          <Input
            type="number"
            {...register("ffmntInactiveDays", { valueAsNumber: true })}
            min="0"
          />
        </div>
      )}
    </div>

    {/* Escrow */}
    <div className="space-y-3">
      <label className="block text-label text-foreground-muted">Escrow</label>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-caption text-foreground-muted">Value</label>
          <Input
            type="number"
            {...register("ffmntEscrowValue", { valueAsNumber: true })}
            min="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-caption text-foreground-muted">Unit</label>
          <Controller
            control={control}
            name="ffmntEscrowUnit"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "None", label: "None" },
                  { value: "Days", label: "Days" },
                  { value: "Hours", label: "Hours" },
                  { value: "Months", label: "Months" },
                  { value: "Years", label: "Years" },
                ]}
              />
            )}
          />
        </div>
        <div>
          <label className="mb-1 block text-caption text-foreground-muted">Snap To</label>
          <Controller
            control={control}
            name="ffmntEscrowSnapTo"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={filteredSnapToOptions}
                placeholder="now"
              />
            )}
          />
        </div>
      </div>
    </div>
  </>
)}
```

**Step 5: Run type check**
Run: `npx tsc --noEmit`

**Step 6: Commit**
```bash
git commit -m "feat: render Points conditional fields on Fulfillment tab"
```

---

### Task 6: Render Tier Status conditional fields on Fulfillment tab

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add tier level options derived from selected policy**

After the existing fulfillment watchers, add:
```typescript
const selectedFfmntTierPolicy = watch("ffmntTierPolicy");

const tierLevelOptions: SelectOption[] = useMemo(() => {
  if (!selectedFfmntTierPolicy) return [];
  const policy = tierPolicyOpts.find((tp) => tp.id === selectedFfmntTierPolicy);
  if (!policy) return [];
  return policy.levels.map((l) => ({ value: l.name, label: l.name }));
}, [selectedFfmntTierPolicy, tierPolicyOpts]);

const tierPolicySelectOptions: SelectOption[] = useMemo(
  () => tierPolicyOpts.map((tp) => ({ value: tp.id, label: tp.name })),
  [tierPolicyOpts],
);
```

**Step 2: Add Tier Status section JSX**

After the Points conditional block, add:

```tsx
{isTierStatusFfmnt && (
  <>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          Tier Policy<span className="ml-0.5 text-error">*</span>
        </label>
        <Controller
          control={control}
          name="ffmntTierPolicy"
          render={({ field }) => (
            <Select
              value={field.value}
              onChange={(val) => {
                field.onChange(val);
                setValue("ffmntTierLevel", "");
              }}
              options={tierPolicySelectOptions}
              placeholder="Select tier policy..."
            />
          )}
        />
      </div>
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          Tier Level<span className="ml-0.5 text-error">*</span>
        </label>
        <Controller
          control={control}
          name="ffmntTierLevel"
          render={({ field }) => (
            <Select
              value={field.value}
              onChange={field.onChange}
              options={tierLevelOptions}
              placeholder="Select tier level..."
            />
          )}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          Duration<span className="ml-0.5 text-error">*</span>
        </label>
        <Input
          type="number"
          {...register("ffmntTierDurationValue", { valueAsNumber: true })}
          min="0"
          placeholder="0"
        />
      </div>
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          Duration Unit<span className="ml-0.5 text-error">*</span>
        </label>
        <Controller
          control={control}
          name="ffmntTierDurationUnit"
          render={({ field }) => (
            <Select
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "Days", label: "Days" },
                { value: "Months", label: "Months" },
                { value: "Years", label: "Years" },
              ]}
            />
          )}
        />
      </div>
    </div>
  </>
)}
```

**Step 3: Run type check**
Run: `npx tsc --noEmit`

**Step 4: Commit**
```bash
git commit -m "feat: render Tier Status conditional fields on Fulfillment tab"
```

---

### Task 7: Wire all ffmnt fields into save payload

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Update the `meta` object in `onSubmit`**

Replace the existing meta construction:
```typescript
const meta = {
  ...metaBase,
  ffmntType: data.ffmntType,
  ffmntPartner: data.ffmntType === "External Fulfillment" ? data.ffmntPartner : "",
  ffmntDeliveryMethod: data.ffmntType === "External Fulfillment" ? data.ffmntDeliveryMethod : "",
};
```

With:
```typescript
const isPoints = data.ffmntType === "Points";
const isTierStatus = data.ffmntType === "Tier Status";
const isExternal = data.ffmntType === "External Fulfillment";

const meta = {
  ...metaBase,
  ffmntType: data.ffmntType,
  // External Fulfillment
  ffmntPartner: isExternal ? data.ffmntPartner : "",
  ffmntDeliveryMethod: isExternal ? data.ffmntDeliveryMethod : "",
  // Points
  ffmntCurrency: isPoints ? data.ffmntCurrency : "",
  ffmntPoints: isPoints ? data.ffmntPoints : 0,
  ffmntExpirationType: isPoints ? data.ffmntExpirationType : "None",
  ffmntExpiryValue: isPoints && data.ffmntExpirationType === "Custom" ? data.ffmntExpiryValue : 0,
  ffmntExpiryUnit: isPoints && data.ffmntExpirationType === "Custom" ? data.ffmntExpiryUnit : "Days",
  ffmntExpirationSnapTo: isPoints && data.ffmntExpirationType === "Custom" ? data.ffmntExpirationSnapTo : "now",
  ffmntInactiveDays: isPoints && data.ffmntExpirationType === "Activity-Based" ? data.ffmntInactiveDays : 0,
  ffmntEscrowValue: isPoints ? data.ffmntEscrowValue : 0,
  ffmntEscrowUnit: isPoints ? data.ffmntEscrowUnit : "None",
  ffmntEscrowSnapTo: isPoints ? data.ffmntEscrowSnapTo : "now",
  // Tier Status
  ffmntTierPolicy: isTierStatus ? data.ffmntTierPolicy : "",
  ffmntTierLevel: isTierStatus ? data.ffmntTierLevel : "",
  ffmntTierDurationValue: isTierStatus ? data.ffmntTierDurationValue : 0,
  ffmntTierDurationUnit: isTierStatus ? data.ffmntTierDurationUnit : "Days",
};
```

**Step 2: Run type check and tests**
Run: `npx tsc --noEmit && npx vitest run`

**Step 3: Commit**
```bash
git commit -m "feat: wire all ffmnt fields into ext._meta save payload"
```

---

### Task 8: Update defaults and verify

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-defaults.ts`
- Modify: `src/features/reward-catalog/lib/reward-defaults.test.ts`

**Step 1: Update _meta defaults**

Replace the `_meta` object in `createDefaultRewardCatalogItem`:
```typescript
_meta: {
  subType: "RewardsCatalog",
  ffmntType: "Discount",
  ffmntPartner: "",
  ffmntDeliveryMethod: "",
  ffmntCurrency: "",
  ffmntPoints: 0,
  ffmntExpirationType: "None",
  ffmntExpiryValue: 0,
  ffmntExpiryUnit: "Days",
  ffmntExpirationSnapTo: "now",
  ffmntInactiveDays: 0,
  ffmntEscrowValue: 0,
  ffmntEscrowUnit: "None",
  ffmntEscrowSnapTo: "now",
  ffmntTierPolicy: "",
  ffmntTierLevel: "",
  ffmntTierDurationValue: 0,
  ffmntTierDurationUnit: "Days",
}
```

**Step 2: Update test assertion to match**

**Step 3: Run full suite**
Run: `npx tsc --noEmit && npx vitest run`

**Step 4: Commit**
```bash
git commit -m "feat: add all ffmnt defaults to reward _meta"
```

---

### Task 9: Final verification

**Step 1: Run full type check and tests**
Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass.

**Step 2: Manual verification**
- Open reward form drawer
- Fulfillment tab → select "Points":
  - Verify Currency dropdown shows only non-qualifying purse policies
  - Select a currency → verify expiration/escrow auto-populate from purse policy
  - Change expiration type to Custom → verify value/unit/snapTo fields appear
  - Change to Activity-Based → verify inactive days field appears
  - Change to None → verify fields hidden
- Fulfillment tab → select "Tier Status":
  - Verify Tier Policy dropdown loads tier policies
  - Select a policy → verify Tier Level dropdown populates with that policy's levels
  - Change policy → verify level resets
  - Fill duration value and unit
- Fulfillment tab → select "Discount" → verify no additional fields
- Fulfillment tab → select "External Fulfillment" → verify partner/delivery method still work
- Save and re-open → verify all fields persist
