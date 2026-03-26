# Design: Reward Catalog RHF Conversion

**Date:** 2026-03-02
**Branch:** `feature/reward-catalog-rhf`
**Scope:** Convert `RewardFormDrawer` and `BulkEditDrawer` from manual `useState` form management to React Hook Form + Zod.

## Context

Both reward catalog drawers use manual `useState` for form state, dirty tracking, validation, and error management. RHF + Zod is the established pattern in this project (`entity-edit-page.tsx`, `form-drawer.tsx`). This conversion aligns the reward catalog with that standard.

## Approach

**Approach A — Full RHF with flat ext field registration.**

Register ext fields using RHF's native dot-path naming (`ext.fieldName`). Build a dynamic Zod schema from `schemaData` at runtime. Call `form.reset()` when schema loads, mirroring the current `useEffect` that patches ext defaults.

## Shared Infrastructure (new)

### `src/shared/lib/build-ext-zod-schema.ts`

Generic utility — works for any model with API extension fields. Not reward-specific.

```ts
export function buildExtZodSchema(
  extFields: Record<string, ExtFieldDef> | undefined
): z.ZodTypeAny
```

- When `extFields` is undefined/null: returns `z.record(z.unknown())`
- For each field: maps `type` → Zod primitive, applies `.optional()` or required based on `def.required`, uses `z.enum([...])` when `def.enum` is present, uses `z.coerce.number()` for `number`/`integer` types
- Boolean fields: `z.boolean()`
- Date fields: `z.string()` (stored as `YYYY-MM-DD` strings)

**Future models** call this same function with their own `extFields` map.

### `ExtFieldDef` moves to `src/shared/types/`

Currently in `reward-catalog/types/reward-policy.ts`. Moved to shared so future features can import it without depending on the reward catalog. The reward catalog re-exports it.

## `RewardFormDrawer` Changes

### Schema

```ts
// reward-form-helpers.ts (reward-specific)
export function buildRewardZodSchema(
  schemaData: EntitySchemaData | null
): z.ZodObject<...>
```

Composes:
- Static core shape: `name`, `desc`, `effectiveDate`, `expirationDate`, limits (all `z.coerce.number().int().min(0)`), `numUses` (min 1), `canPreview`, `segments`, `mandatorySegments`, `tierPolicyLevels`, `availability`
- Dynamic ext shape: `buildExtZodSchema(schemaData?.extFields)`
- Cross-field refinements via `.superRefine()`:
  - `expirationDate >= effectiveDate`
  - Availability time-range per enabled day

### Default values

```ts
// reward-form-helpers.ts
export function buildRewardDefaultValues(
  reward: RewardPolicy | null,
  schemaData: EntitySchemaData | null
): RewardFormValues
```

Pure function replacing the duplicated init block. Called at form setup and on reset.

### Form lifecycle

```ts
const schema = useMemo(
  () => buildRewardZodSchema(schemaData ?? null),
  [schemaData]
);

const form = useForm<RewardFormValues>({
  resolver: zodResolver(schema),
  defaultValues: buildRewardDefaultValues(reward, null),
});
```

- **On schema load:** `useEffect([schemaData, reward]) → form.reset(buildRewardDefaultValues(reward, schemaData))`
- **On drawer open/reward change:** `useEffect([open, reward]) → form.reset(buildRewardDefaultValues(reward, schemaData))`
- RHF's `formState.isDirty` replaces `initialRef` + JSON.stringify dirty tracking

### Field registration

- Core fields: `register("name")`, `register("effectiveDate")`, etc.
- Ext fields: `register("ext.rewardCostCore")`, `register("ext.brandCode")`, etc. — RHF dot-paths produce `{ ext: { rewardCostCore: 0, ... } }` from `getValues()`
- `ExtTabBody` / `ExtFieldRenderer` receive value + onChange via `Controller` or parent-passed `useController` props

### Submit

- `form.handleSubmit(onValid)` replaces manual `handleSubmit`
- Zod coercion produces typed numbers/booleans; `buildExt()` is removed
- API errors mapped via `form.setError(fieldName, { message })`

### Tab error navigation

`firstTabWithError` and `tabErrorCounts` utilities are kept. A thin adapter `flattenRhfErrors(errors: FieldErrors)` converts RHF's nested error object to `Record<string, string>` for these utilities.

### What is removed

| Removed | Replaced by |
|---|---|
| `useState<FormState>(form)` | `useForm()` |
| `setField` / `setExtField` callbacks | `register()` / `Controller` |
| `initialRef` + JSON.stringify dirty check | `formState.isDirty` |
| `useState<Record<string, string>>(errors)` | `formState.errors` |
| `useState<string \| null>(generalError)` | `form.setError("root", ...)` |
| `buildExt()` coercion function | Zod `z.coerce.number()` |
| Manual ext required/enum validation loop | `buildRewardZodSchema` resolver |
| Duplicated init block | `buildRewardDefaultValues()` |

## `BulkEditDrawer` Changes

### Schema

```ts
// reward-form-helpers.ts
export function buildBulkEditZodSchema(
  schemaData: EntitySchemaData
): z.ZodObject<...>
```

All fields `.optional()` — no field is required since editing is opt-in. Calls `buildExtZodSchema` for ext fields.

### Form lifecycle

```ts
const form = useForm<BulkEditValues>({
  resolver: zodResolver(buildBulkEditZodSchema(schemaData)),
  defaultValues: {},
});
```

### Opt-in checkboxes

`enabledFields: Set<string>` stays as `useState`. Controls which fields are included in the submit payload. Field inputs become `Controller`-wrapped.

### Submit

`handleSubmit(data => ...)` iterates `enabledFields` and plucks those keys from `data` to build the update payload.

### What is removed

| Removed | Replaced by |
|---|---|
| `useState<Record<string, unknown>>(values)` | `useForm()` |
| `setValue` callback | `Controller` |
| `useState<Record<string, string>>(errors)` | `formState.errors` |
| `toggleField`'s manual error cleanup | RHF handles it |

## File Changelist

| File | Change |
|---|---|
| `src/shared/lib/build-ext-zod-schema.ts` | **New** — generic ext Zod schema builder |
| `src/shared/types/ext-field-def.ts` | **New** — `ExtFieldDef`, `CategoryDef`, `EntitySchemaData` moved here |
| `src/shared/types/index.ts` | Re-export new shared types |
| `src/features/reward-catalog/types/reward-policy.ts` | Re-export `ExtFieldDef` etc. from shared |
| `src/features/reward-catalog/lib/reward-form-helpers.ts` | Add `buildRewardZodSchema`, `buildRewardDefaultValues`, `buildBulkEditZodSchema`, `flattenRhfErrors`; remove `FormState` |
| `src/features/reward-catalog/components/reward-form-drawer.tsx` | Full RHF conversion |
| `src/features/reward-catalog/components/reward-ext-fields.tsx` | Update props to accept `Controller`-style value/onChange |
| `src/features/reward-catalog/components/bulk-edit-drawer.tsx` | RHF for field values; keep `enabledFields` as `useState` |
