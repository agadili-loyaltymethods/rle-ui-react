# Reward Channel Eligibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add channel eligibility to rewards — a multi-select on the Eligibility tab, a table column, and card badges — stored in `ext._meta.eligibleChannels`.

**Architecture:** Channel data is stored as `eligibleChannels: string[]` in the reward policy's `ext._meta` object, following the existing `_meta` metadata pattern used for fulfillment and redemption settings. Empty array means all channels (no restriction). Channel options are loaded via `useEnumOptions("Channel")`.

**Tech Stack:** React 19, React Hook Form, Zod, TanStack Query, `useEnumOptions`, MultiSelect component, Badge component

---

### Task 1: Add `eligibleChannels` to form values and default builder

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`

**Step 1: Add `eligibleChannels` to `RewardFormValues` interface**

In `RewardFormValues` (line ~46, after `availability`), add:

```typescript
eligibleChannels: string[];
```

**Step 2: Add to `FIELD_TAB_MAP`**

In the `FIELD_TAB_MAP` object (around line 244), add:

```typescript
eligibleChannels: "eligibility",
```

**Step 3: Add to `buildRewardDefaultValues`**

In the return object of `buildRewardDefaultValues` (around line 347, after `divisions`), add:

```typescript
eligibleChannels: (meta?.eligibleChannels as string[]) ?? [],
```

**Step 4: Run tests**

Run: `npx vitest run src/features/reward-catalog/lib/reward-form-helpers.test.ts`
Expected: All existing tests pass (new field has default, no tests broken)

**Step 5: Commit**

```
feat: add eligibleChannels to reward form values and defaults
```

---

### Task 2: Write `eligibleChannels` to `ext._meta` on save

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add `eligibleChannels` to the `meta` object in `handleSave`**

In `reward-form-drawer.tsx`, inside the `handleSave` function where `meta` is built (around line 468-494), add after the tier status fields:

```typescript
// Channel eligibility
eligibleChannels: data.eligibleChannels.length > 0 ? data.eligibleChannels : undefined,
```

Using `undefined` when empty so the field is omitted from `_meta` rather than storing an empty array.

**Step 2: Commit**

```
feat: persist eligibleChannels to ext._meta on reward save
```

---

### Task 3: Add Channels multi-select to the Eligibility tab

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Import `useEnumOptions` if not already imported**

Check imports — add if needed:

```typescript
import { useEnumOptions } from "@/shared/hooks/use-enums";
```

**Step 2: Fetch channel options in the component**

Near the other data hooks (around line 134), add:

```typescript
const { data: channelOptions } = useEnumOptions("Channel");
```

Build select options:

```typescript
const channelSelectOptions = useMemo(
  () => (channelOptions ?? []).map((c) => ({ value: c.value, label: c.label })),
  [channelOptions],
);
```

**Step 3: Add Channels field to the Eligibility tab JSX**

In the `{tab === "eligibility" && (...)}` block (line ~1620), add a new section **before** the Segments 2-column row:

```tsx
{/* Channels */}
<div className="flex flex-col gap-2">
  <label className="text-label text-foreground-muted">
    Channels
  </label>
  <p className="text-caption text-foreground-muted mb-1">
    Restrict which channels this reward can be obtained through. Leave empty for all channels.
  </p>
  <Controller
    control={control}
    name="eligibleChannels"
    render={({ field }) => (
      <MultiSelect
        value={field.value}
        onChange={field.onChange}
        options={channelSelectOptions}
        placeholder="All channels"
        showBulkActions
      />
    )}
  />
</div>
```

**Step 4: Verify in browser**

Navigate to Rewards Catalog → open a reward → Eligibility tab. The Channels multi-select should appear above Segments.

**Step 5: Commit**

```
feat: add Channels multi-select to reward Eligibility tab
```

---

### Task 4: Add Channels column to the reward table

**Files:**
- Modify: `src/features/reward-catalog/config/reward-config.ts`
- Modify: `src/features/reward-catalog/lib/reward-cell-renderers.tsx`

**Step 1: Add a custom cell renderer for channels**

In `reward-cell-renderers.tsx`, add a new renderer after the existing ones:

```tsx
"reward-channels": (_value, row) => {
  const meta = (row.ext as Record<string, unknown>)?._meta as Record<string, unknown> | undefined;
  const channels = (meta?.eligibleChannels as string[] | undefined) ?? [];
  if (channels.length === 0) {
    return <span className="text-foreground-muted">All</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((ch) => (
        <Badge key={ch} variant="info">{ch}</Badge>
      ))}
    </div>
  );
},
```

**Step 2: Add the column to `reward-config.ts`**

In the `coreColumns` array, add after the `canPreview` column:

```typescript
{ field: "ext._meta.eligibleChannels", label: "Channels", type: "text", cellRenderer: "reward-channels", filterable: false },
```

**Step 3: Verify in browser**

Check the reward table — the Channels column should appear in the column chooser. When enabled, it shows "All" or channel badges.

**Step 4: Commit**

```
feat: add Channels column to reward catalog table
```

---

### Task 5: Add channel badges to reward cards

**Files:**
- Modify: `src/features/reward-catalog/components/rewards-card-grid.tsx`

**Step 1: Add channel badges to the card body**

In `rewards-card-grid.tsx`, inside the card body (around line 142-158), add a channel badges row **after** the type + status row and **before** the title:

```tsx
{/* Channel badges */}
{(() => {
  const meta = (reward.ext as Record<string, unknown>)?._meta as Record<string, unknown> | undefined;
  const channels = (meta?.eligibleChannels as string[] | undefined) ?? [];
  return channels.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {channels.map((ch) => (
        <Badge key={ch} variant="info" className="text-[10px] px-1.5 py-0">
          {ch}
        </Badge>
      ))}
    </div>
  ) : null;
})()}
```

**Step 2: Verify in browser**

Switch to card view in the reward catalog. Cards with channel restrictions should show channel badges below the type/status row. Cards with no restriction show nothing (no "All" badge to avoid clutter).

**Step 3: Commit**

```
feat: add channel eligibility badges to reward cards
```

---

### Task 6: Add `eligibleChannels` to bulk edit drawer

**Files:**
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx`

**Step 1: Check if the bulk edit drawer has an eligibility section**

Look for segments/eligibility fields in the bulk edit drawer. If present, add a Channels field alongside them following the same `BulkField` pattern. If not, skip this task.

**Step 2: Add Channels to bulk edit form if applicable**

Add a `BulkField` for channels with a `MultiSelect`, reading channel options from `useEnumOptions("Channel")`.

**Step 3: Add to bulk save handler**

Include `eligibleChannels` in the `_meta` merge logic when saving bulk edits.

**Step 4: Commit**

```
feat: add channel eligibility to reward bulk edit drawer
```

---

### Task 7: Run full test suite and verify

**Step 1: Run reward catalog tests**

```bash
npx vitest run src/features/reward-catalog/
```

Expected: All tests pass.

**Step 2: Run type check**

```bash
npx tsc -b 2>&1 | grep reward
```

Expected: No new type errors in reward files.

**Step 3: Final commit if any cleanup needed**

```
fix: address any test/type issues from channel eligibility feature
```
