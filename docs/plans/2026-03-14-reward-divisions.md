# Reward Divisions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a searchable multi-select for assigning divisions to rewards on the Details tab.

**Architecture:** The `divisions` field already exists on the backend model and frontend type (`string[]`). We need to: (1) add it to `RewardFormValues` and the Zod schema, (2) include it in default values, (3) render it on the Details tab, (4) pass it through in the save payload. All patterns are established via segments/eligibility.

**Tech Stack:** React Hook Form, Zod, MultiSelect component, useEntityList hook, TanStack Query

---

### Task 1: Add `divisions` to form types and schema

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`

**Step 1: Add `divisions` to `RewardFormValues` interface**

Add `divisions: string[];` after the `availability` field (line 46):

```typescript
export interface RewardFormValues {
  // ... existing fields ...
  availability: WeekAvailability;
  divisions: string[];       // ← add this
  ext: Record<string, unknown>;
}
```

**Step 2: Add `divisions` to `buildRewardDefaultValues`**

In the return object of `buildRewardDefaultValues` (around line 296), add:

```typescript
  divisions: reward?.divisions ?? [],
```

**Step 3: Add `divisions` to the Zod schema in `buildRewardZodSchema`**

In the `coreShape` object (around line 323), add:

```typescript
  divisions: z.array(z.string()),
```

**Step 4: Add `divisions` to `buildFieldTabMap`**

In the hardcoded map (around line 182), add:

```typescript
  divisions: "details",
```

**Step 5: Run type check to verify**

Run: `npx tsc --noEmit`
Expected: Type errors in `reward-form-drawer.tsx` because onSubmit doesn't use `data.divisions` yet (this is fine, we'll fix in Task 3).

**Step 6: Commit**

```bash
git add src/features/reward-catalog/lib/reward-form-helpers.ts
git commit -m "feat: add divisions to reward form types and schema"
```

---

### Task 2: Add divisions MultiSelect to the Details tab

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add the divisions data hook**

After the existing eligibility hooks (around line 106), add:

```typescript
import { useEntityList } from "@/shared/hooks/use-api";
import type { Division } from "@/shared/types";
```

Inside the component, after the eligibility hooks:

```typescript
const { data: divisionsData } = useEntityList<Division>("divisions", {
  select: "name",
  sort: "name",
  limit: 0,
});
const divisionOptions: SelectOption[] = useMemo(
  () => (divisionsData ?? []).map((d) => ({ value: d._id, label: d.name })),
  [divisionsData],
);
```

**Step 2: Add the MultiSelect to the Details tab**

After the date fields grid (after line 646, before the Created/Updated audit fields), add:

```tsx
<div>
  <label className="mb-3 block text-label text-foreground-muted">
    Divisions
  </label>
  <Controller
    control={control}
    name="divisions"
    render={({ field }) => (
      <MultiSelect
        value={field.value}
        onChange={field.onChange}
        options={divisionOptions}
        placeholder="Select divisions..."
        searchable
      />
    )}
  />
</div>
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: Still may error on onSubmit payload — fixed in Task 3.

**Step 4: Commit**

```bash
git add src/features/reward-catalog/components/reward-form-drawer.tsx
git commit -m "feat: add divisions multi-select to reward details tab"
```

---

### Task 3: Wire divisions into the save payload

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add `divisions` to the save payload**

In the `onSubmit` handler, add `divisions: data.divisions` to both the editing and creating branches.

For the editing branch (around line 337):
```typescript
payload = {
  ...reward,
  // ... existing fields ...
  ...limitsFields,
  divisions: data.divisions,  // ← add
};
```

For the creating branch (around line 349):
```typescript
payload = {
  ...base,
  // ... existing fields ...
  ...limitsFields,
  divisions: data.divisions,  // ← add
  redemptions: 0,
  // ...
};
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass.

**Step 4: Commit**

```bash
git add src/features/reward-catalog/components/reward-form-drawer.tsx
git commit -m "feat: wire divisions into reward save payload"
```

---

### Task 4: Verify end-to-end

**Step 1: Run full type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass.

**Step 2: Manual verification (if dev environment available)**

- Open reward form drawer
- Verify "Divisions" multi-select appears on Details tab after date fields
- Create a reward with divisions selected
- Edit existing reward — verify divisions load correctly
- Save and verify divisions persist
