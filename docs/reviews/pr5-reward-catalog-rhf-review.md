# PR #5 Code Review: Reward Catalog RHF + Zod Conversion

**Date:** 2026-03-02
**Branch:** `feature/reward-catalog-rhf`
**PR:** Convert reward catalog forms to React Hook Form + Zod
**Reviewers:** 3 parallel agents (code quality, test coverage, type design)

---

## Critical Issues (4 found)

### C1. Bulk edit ext fields registered at wrong path — data loss bug

**File:** `src/features/reward-catalog/components/bulk-edit-drawer.tsx`

The Zod schema (`buildBulkEditZodSchema`) nests ext fields under `ext: { ... }`, but Controller components register them at the top level (`name={fieldName as never}`). The `onApply` handler reads `data[field]` which will be `undefined` for ext fields after Zod validation. This means bulk-editing ext fields will silently send `null` values. The `as never` casts mask the type mismatch.

**Fix:** Either flatten the bulk edit schema (remove the `ext` wrapper, put ext field schemas at the top level alongside core fields) or change Controller names to `ext.${fieldName}` and update data extraction accordingly.

---

### C2. ~~Resolver not updated when schema loads asynchronously~~ — FALSE POSITIVE

**File:** `src/features/reward-catalog/components/reward-form-drawer.tsx`, line 130

**Status:** Verified as a false positive. RHF updates `control._options` (which includes `resolver`) on every render via `control._options = props` (react-hook-form source, line 2858). Passing a new `resolver` prop to `useForm` is picked up on the next validation cycle without needing a ref wrapper. No fix needed.

---

### C3. `buildExtFromValues` uses `parseInt` for all number fields

**File:** `src/features/reward-catalog/components/reward-form-drawer.tsx`, line 304

`parseInt(String(val), 10) || 0` truncates decimal values (e.g., `99.99` → `99`). Should use `parseFloat`/`Number` for `"number"` type and reserve `parseInt` for `"integer"` type only.

**Fix:**

```ts
if (def.type === "integer") {
  flat[fieldName] = parseInt(String(val), 10) || 0;
} else if (def.type === "number") {
  flat[fieldName] = Number(val) || 0;
}
```

---

### C4. `buildExtZodSchema` ignores `required` on number/boolean fields

**File:** `src/shared/lib/build-ext-zod-schema.ts`, lines 29-32

The `required` flag is only honored for string and enum types. A `required: true` number field uses the same `z.coerce.number()` as non-required — empty string coerces to `0` silently. No test covers this gap.

**Fix:** For required number fields, add a `.refine()` or `.min()` to reject empty/undefined input. For non-required number fields, add `.optional()`.

---

## Important Issues (10 found)

### I1. Unsafe double cast on resolver

**File:** `src/features/reward-catalog/components/reward-form-drawer.tsx`, line 130

```ts
resolver: zodResolver(schema) as unknown as Resolver<RewardFormValues>,
```

The Zod schema outputs `number` for limit fields, but `RewardFormValues` declares them as `string`. The double cast papers over this mismatch.

**Fix:** Align the types — either make limit fields `number` in `RewardFormValues` or use `z.string().pipe(z.coerce.number())`.

---

### I2. Missing `cursor-pointer` on interactive elements

Per CLAUDE.md: "Every clickable element must show `cursor: pointer` on hover."

Missing on:
- Tab buttons: `reward-form-drawer.tsx:540`, `bulk-edit-drawer.tsx:861`
- Dismiss buttons: `reward-form-drawer.tsx:497,516`, `bulk-edit-drawer.tsx:835`
- Image preview close button: `reward-form-drawer.tsx:1238`

---

### I3. Preview state not reset when opening a new preview

**File:** `src/features/reward-catalog/components/reward-form-drawer.tsx`, lines 109-111

`previewLoading` and `previewError` are not reset when a new preview URL is set. Opening a second preview after a failed one shows stale error state.

**Fix:** Reset state when a new preview URL is set:

```ts
const openPreview = useCallback((url: string) => {
  setPreviewError(false);
  setPreviewLoading(true);
  setPreviewUrl(url);
}, []);
```

---

### I4. `buildBulkEditZodSchema` has zero unit tests

**File:** `src/features/reward-catalog/lib/reward-form-helpers.ts`, lines 418-448

Non-trivial function with conditional `.partial()` logic and ext schema composition — entirely untested.

Missing tests should cover:
- All core fields are optional (accepts `{}` as valid input)
- Ext fields are made optional via `.partial()` when `extFields` are defined
- Coercion still works for optional number fields
- Invalid values are still rejected (e.g., `numUses: 0` should fail `.min(1)`)
- The fallback path where `extSchema` is not a `ZodObject`

---

### I5. `superRefine` cross-field validation not unit-tested

**File:** `src/features/reward-catalog/lib/reward-form-helpers.ts`, lines 348-380

Missing tests:
- `expirationDate < effectiveDate` → should fail with "Must not be before effective date"
- Availability end time < start time on enabled day → should fail
- Availability end time < start time on disabled day → should pass

---

### I6. `buildRewardDefaultValues` never tested with non-null `schemaData`

**File:** `src/features/reward-catalog/lib/reward-form-helpers.test.ts`

All 4 tests pass `null` as `schemaData`. The code path that populates ext defaults from schema definitions (lines 250-261) is never exercised.

Missing tests:
- New reward with `schemaData` that has ext fields with `defaultValue`
- New reward with boolean ext field → should default to `false`
- Existing reward with `schemaData` → reward.ext values should override schema defaults
- Existing reward with a `date-time` format ext field → verify `toDateOnly` conversion

---

### I7. 14 uses of `waitForTimeout` in E2E tests

**File:** `e2e/reward-catalog.spec.ts`

Fixed timeouts (200ms/500ms) create flakiness risk on slower CI. Should wait for specific DOM state changes instead.

Recommendations:
- Search waits: remove — the next assertion already uses `toHaveCount` with a timeout
- Schema loading: wait for a specific element that only renders after schema loads
- Dirty detection: wait for the Cancel button or Save button state change

---

### I8. `eslint-disable` on useEffect deps hides potential stale closure issues

**File:** `src/features/reward-catalog/components/reward-form-drawer.tsx`, lines 144, 154

Two effects omit significant dependencies. The ordering between the open/reward reset effect and the schema-load effect is fragile if both fire in the same render cycle.

---

### I9. `EntitySchemaData` naming is reward-specific but lives in shared types

**File:** `src/shared/types/ext-field-def.ts`

Should either be renamed to a generic name (`EntitySchemaData`) or moved back to the feature module, keeping only `ExtFieldDef`/`CategoryDef` in shared.

---

### I10. `buildBulkEditZodSchema` applies double optional on ext

**File:** `src/features/reward-catalog/lib/reward-form-helpers.ts`, line 446

`.partial()` makes each ext field optional, then `.optional()` is applied to the entire `ext` object. Combined with C1, this entire section is dead code.

---

## Suggestions (9 found)

| # | Description | File |
|---|---|---|
| S1 | 12+ `as never` casts in bulk-edit-drawer — define `BulkEditFormValues` type | `bulk-edit-drawer.tsx` |
| S2 | `buildExtFromValues` is a pure function defined inside the component — extract to helpers | `reward-form-drawer.tsx:293` |
| S3 | Negative schema tests rely on multiple failures, hiding the actual assertion — use a valid fixture and override one field | `reward-form-helpers.test.ts` |
| S4 | `CORE_TAB_SET` recreated every render — move to module level | `bulk-edit-drawer.tsx:789` |
| S5 | Empty `className=""` divs throughout (no-op) | multiple files |
| S6 | E2E `nameInput` helper uses fragile positional selector (`input.first()`) — use `data-testid` or `getByLabel` | `reward-catalog.spec.ts:49` |
| S7 | E2E add-reward test doesn't clean up created rewards | `reward-catalog.spec.ts:144` |
| S8 | `passthrough()` behavior not tested for `buildExtZodSchema` — important for `_meta` preservation | `build-ext-zod-schema.test.ts` |
| S9 | `flattenRhfErrors` doesn't handle deeply nested ext fields (e.g., `ext.featured.AT`) | `reward-form-helpers.ts:390` |

---

## Strengths

- Clean separation of concerns — pure helpers in `reward-form-helpers.ts`, shared schema builder in `build-ext-zod-schema.ts`
- `buildExtZodSchema` is properly model-agnostic and reusable for future entity forms
- Consistent use of `@/` path aliases and shared components per CLAUDE.md
- Tab error navigation with auto-focus is a thoughtful UX pattern
- Good test coverage for core helpers (`buildRewardDefaultValues`, `flattenRhfErrors`)
- 19 E2E tests covering add/edit/bulk-edit/validation/tab-switching
- Proper use of `generateObjectId()` instead of `crypto.randomUUID()`
- Proper use of `UnsavedChangesDialog` from shared components

---

## Recommended Action

1. **Fix C1 first** (ext field path mismatch) — this is a data loss bug in production
2. **Fix C2** (stale resolver) — ext validation won't work without this
3. **Fix C3+C4** (parseInt truncation, required flag on numbers)
4. **Address I1** (type alignment) to remove the unsafe double cast
5. **Add missing tests** (I4-I6) for the untested pure functions
6. **Sweep cursor-pointer** (I2) across both drawers
7. Consider suggestions as polish before merge
