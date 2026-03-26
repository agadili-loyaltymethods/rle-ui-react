# Reward Catalog RHF Conversion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert `RewardFormDrawer` and `BulkEditDrawer` from manual `useState` form management to React Hook Form + Zod, with a shared generic ext-field schema builder for reuse across future models.

**Architecture:** A new `buildExtZodSchema(extFields)` utility in `src/shared/lib/` converts runtime API extension field definitions into a Zod schema. Feature-level helpers (`buildRewardZodSchema`, `buildRewardDefaultValues`) compose that shared utility with reward-specific core fields. Both drawers use `useForm` + `zodResolver`, with `form.reset()` handling the async schema-load timing.

**Tech Stack:** React Hook Form 7, Zod 3, `@hookform/resolvers/zod`, Vitest, TypeScript strict

**Design doc:** `docs/plans/2026-03-02-reward-catalog-rhf-design.md`

---

## Task 1: Move ext field types to shared

**Why first:** `ExtFieldDef` and friends are currently in `reward-catalog/types/reward-policy.ts`. The shared `buildExtZodSchema` utility (Task 2) needs to import them without depending on the reward catalog feature.

**Files:**
- Create: `src/shared/types/ext-field-def.ts`
- Modify: `src/shared/types/index.ts`
- Modify: `src/features/reward-catalog/types/reward-policy.ts`

**Step 1: Create the new shared types file**

Copy these three interfaces out of `reward-policy.ts` into the new file — do not delete them from `reward-policy.ts` yet:

```ts
// src/shared/types/ext-field-def.ts

export interface ExtFieldDef {
  type: string;
  title: string;
  format?: string;
  required: boolean;
  enum?: string[];
  category: string;
  displayOrder: number;
  showInList: boolean;
  searchable: boolean;
  sortable: boolean;
  defaultValue?: unknown;
  parentField?: string;
  isParent?: boolean;
}

export interface CategoryDef {
  name: string;
  columns: number;
}

export interface EntitySchemaData {
  extRequiredFields: string[];
  dbRequiredFields: Set<string>;
  enumFields: Record<string, string[]>;
  extFields: Record<string, ExtFieldDef>;
  categories: CategoryDef[];
  bulkEditableFields: Set<string>;
}
```

**Step 2: Re-export from `src/shared/types/index.ts`**

Add to the bottom of the file:

```ts
export type { ExtFieldDef, CategoryDef, EntitySchemaData } from './ext-field-def';
```

**Step 3: Update `reward-policy.ts` to re-export from shared**

Replace the three interface definitions in `src/features/reward-catalog/types/reward-policy.ts` with re-exports:

```ts
// Replace the three interface definitions with:
export type { ExtFieldDef, CategoryDef, EntitySchemaData } from '@/shared/types/ext-field-def';
```

**Step 4: Verify no TypeScript errors**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors. If there are import errors, check that all files that previously imported these types from `reward-policy.ts` still resolve correctly (they should, since we re-export).

**Step 5: Commit**

```bash
git add src/shared/types/ext-field-def.ts src/shared/types/index.ts src/features/reward-catalog/types/reward-policy.ts
git commit -m "refactor: move ExtFieldDef, CategoryDef, EntitySchemaData to shared types"
```

---

## Task 2: Create `buildExtZodSchema` shared utility (TDD)

**What it does:** Given `extFields: Record<string, ExtFieldDef> | undefined`, returns a `z.ZodObject` where each key maps to the correct Zod type. Returns `z.record(z.unknown())` when extFields is undefined/null. This is the reusable piece that future features will call.

**Files:**
- Create: `src/shared/lib/build-ext-zod-schema.ts`
- Create: `src/shared/lib/build-ext-zod-schema.test.ts`

**Step 1: Write the failing tests**

```ts
// src/shared/lib/build-ext-zod-schema.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildExtZodSchema } from './build-ext-zod-schema';
import type { ExtFieldDef } from '@/shared/types/ext-field-def';

function field(overrides: Partial<ExtFieldDef> = {}): ExtFieldDef {
  return {
    type: 'string', title: 'Field', required: false,
    category: 'General', displayOrder: 0,
    showInList: false, searchable: false, sortable: false,
    ...overrides,
  };
}

describe('buildExtZodSchema', () => {
  it('returns z.record(z.unknown()) when extFields is undefined', () => {
    const schema = buildExtZodSchema(undefined);
    expect(schema.safeParse({ anything: 'ok' }).success).toBe(true);
  });

  it('returns z.record(z.unknown()) when extFields is empty object', () => {
    const schema = buildExtZodSchema({});
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('maps string field to z.string()', () => {
    const schema = buildExtZodSchema({ myField: field({ type: 'string' }) });
    expect(schema.safeParse({ myField: 'hello' }).success).toBe(true);
  });

  it('maps number field to coerced number', () => {
    const schema = buildExtZodSchema({ count: field({ type: 'number' }) });
    const result = schema.safeParse({ count: '42' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.count).toBe(42);
  });

  it('maps integer field to coerced integer', () => {
    const schema = buildExtZodSchema({ qty: field({ type: 'integer' }) });
    const result = schema.safeParse({ qty: '5' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.qty).toBe(5);
  });

  it('maps boolean field to z.boolean()', () => {
    const schema = buildExtZodSchema({ flag: field({ type: 'boolean' }) });
    expect(schema.safeParse({ flag: true }).success).toBe(true);
    expect(schema.safeParse({ flag: false }).success).toBe(true);
  });

  it('maps enum field to z.enum', () => {
    const schema = buildExtZodSchema({
      color: field({ type: 'string', enum: ['red', 'blue'] }),
    });
    expect(schema.safeParse({ color: 'red' }).success).toBe(true);
    expect(schema.safeParse({ color: 'green' }).success).toBe(false);
  });

  it('makes non-required string fields optional (empty string passes)', () => {
    const schema = buildExtZodSchema({ desc: field({ type: 'string', required: false }) });
    expect(schema.safeParse({ desc: '' }).success).toBe(true);
  });

  it('makes required string fields fail on empty string', () => {
    const schema = buildExtZodSchema({ name: field({ type: 'string', required: true }) });
    expect(schema.safeParse({ name: '' }).success).toBe(false);
    expect(schema.safeParse({ name: 'hello' }).success).toBe(true);
  });

  it('skips isParent fields', () => {
    const schema = buildExtZodSchema({
      parentObj: field({ isParent: true }),
      child: field({ type: 'string' }),
    });
    // parentObj should not appear in schema shape
    const result = schema.safeParse({ child: 'ok' });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run to confirm they fail**

```bash
npx vitest run src/shared/lib/build-ext-zod-schema.test.ts
```

Expected: all tests FAIL with "Cannot find module './build-ext-zod-schema'"

**Step 3: Implement `buildExtZodSchema`**

```ts
// src/shared/lib/build-ext-zod-schema.ts
import { z } from 'zod';
import type { ExtFieldDef } from '@/shared/types/ext-field-def';

/**
 * Converts a map of API extension field definitions into a Zod schema.
 * Generic — works for any model with extension fields, not reward-specific.
 *
 * Returns z.record(z.unknown()) when extFields is undefined so the form
 * works before schema data has loaded.
 */
export function buildExtZodSchema(
  extFields: Record<string, ExtFieldDef> | undefined,
): z.ZodTypeAny {
  if (!extFields || Object.keys(extFields).length === 0) {
    return z.record(z.unknown());
  }

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [fieldName, def] of Object.entries(extFields)) {
    if (def.isParent) continue;

    let fieldSchema: z.ZodTypeAny;

    if (def.enum && def.enum.length > 0) {
      const [first, ...rest] = def.enum as [string, ...string[]];
      const enumSchema = z.enum([first, ...rest]);
      fieldSchema = def.required ? enumSchema : enumSchema.or(z.literal('')).optional();
    } else if (def.type === 'boolean') {
      fieldSchema = z.boolean();
    } else if (def.type === 'number' || def.type === 'integer') {
      fieldSchema = z.coerce.number();
    } else {
      // string, date, date-time, uri, url, etc.
      fieldSchema = def.required
        ? z.string().min(1, `${def.title || fieldName} is required`)
        : z.string();
    }

    shape[fieldName] = fieldSchema;
  }

  return z.object(shape).passthrough();
}
```

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/shared/lib/build-ext-zod-schema.test.ts
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add src/shared/lib/build-ext-zod-schema.ts src/shared/lib/build-ext-zod-schema.test.ts
git commit -m "feat: add buildExtZodSchema shared utility for dynamic ext field validation"
```

---

## Task 3: Add form helpers to `reward-form-helpers.ts` (TDD)

**What changes:** Add four new exports to `reward-form-helpers.ts`, remove the `FormState` interface (its fields move into the typed form values), and update imports. The helpers are pure functions — testable without React.

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`
- Create: `src/features/reward-catalog/lib/reward-form-helpers.test.ts`

**Step 1: Write failing tests for the pure helpers**

```ts
// src/features/reward-catalog/lib/reward-form-helpers.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildRewardDefaultValues,
  flattenRhfErrors,
  buildRewardZodSchema,
} from './reward-form-helpers';
import type { RewardPolicy } from '../types/reward-policy';

// Minimal mock for a RewardPolicy (only fields used by buildRewardDefaultValues)
function makeReward(overrides: Partial<RewardPolicy> = {}): RewardPolicy {
  return {
    _id: 'abc',
    name: 'Test Reward',
    desc: 'A reward',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2029-12-31T23:59:59.999Z',
    countLimit: 5,
    perDayLimit: 1,
    perWeekLimit: 2,
    perOfferLimit: 3,
    transactionLimit: 10,
    coolOffPeriod: 0,
    numUses: 2,
    canPreview: false,
    segments: ['seg1'],
    mandatorySegments: [],
    tierPolicyLevels: [],
    availability: {
      sunday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      monday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      tuesday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      wednesday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      thursday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      friday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      saturday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
    },
    ext: { rewardCostCore: 100 } as RewardPolicy['ext'],
  } as RewardPolicy;
}

describe('buildRewardDefaultValues', () => {
  it('returns defaults for a null reward (new form)', () => {
    const vals = buildRewardDefaultValues(null, null);
    expect(vals.name).toBe('');
    expect(vals.canPreview).toBe(true);
    expect(vals.numUses).toBe(1);
    expect(vals.segments).toEqual([]);
  });

  it('populates values from an existing reward', () => {
    const reward = makeReward();
    const vals = buildRewardDefaultValues(reward, null);
    expect(vals.name).toBe('Test Reward');
    expect(vals.canPreview).toBe(false);
    expect(vals.numUses).toBe(2);
    expect(vals.segments).toEqual(['seg1']);
  });

  it('slices dates to YYYY-MM-DD', () => {
    const reward = makeReward({ effectiveDate: '2026-03-15T00:00:00.000Z' });
    const vals = buildRewardDefaultValues(reward, null);
    expect(vals.effectiveDate).toBe('2026-03-15');
  });

  it('stringifies number fields', () => {
    const reward = makeReward({ countLimit: 7 });
    const vals = buildRewardDefaultValues(reward, null);
    expect(vals.countLimit).toBe('7');
  });
});

describe('flattenRhfErrors', () => {
  it('returns empty object for no errors', () => {
    expect(flattenRhfErrors({})).toEqual({});
  });

  it('flattens top-level string errors', () => {
    const errors = { name: { message: 'Required' } };
    expect(flattenRhfErrors(errors)).toEqual({ name: 'Required' });
  });

  it('flattens nested ext errors', () => {
    const errors = { ext: { rewardCostCore: { message: 'Invalid' } } };
    expect(flattenRhfErrors(errors)).toEqual({ rewardCostCore: 'Invalid' });
  });

  it('ignores fields with no message', () => {
    const errors = { name: { type: 'required' } }; // no message
    expect(flattenRhfErrors(errors)).toEqual({});
  });
});

describe('buildRewardZodSchema', () => {
  it('rejects empty name', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts valid name', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      name: 'My Reward',
      desc: '',
      effectiveDate: '2026-01-01',
      expirationDate: '2029-12-31',
      countLimit: 0,
      perDayLimit: 0,
      perWeekLimit: 0,
      perOfferLimit: 0,
      transactionLimit: 0,
      coolOffPeriod: 0,
      numUses: 1,
      canPreview: true,
      segments: [],
      mandatorySegments: [],
      tierPolicyLevels: [],
      availability: {
        sunday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        monday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        tuesday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        wednesday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        thursday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        friday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        saturday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      },
      ext: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects numUses less than 1', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({ name: 'X', numUses: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative countLimit', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({ name: 'X', countLimit: -1 });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run to confirm they fail**

```bash
npx vitest run src/features/reward-catalog/lib/reward-form-helpers.test.ts
```

Expected: FAIL — the new exports don't exist yet.

**Step 3: Add `RewardFormValues` type and the four new helpers to `reward-form-helpers.ts`**

Add the following to the **top** of `reward-form-helpers.ts`, after the existing imports — do not remove anything yet:

```ts
import { z } from 'zod';
import { buildExtZodSchema } from '@/shared/lib/build-ext-zod-schema';
import type { FieldErrors } from 'react-hook-form';
```

Add the `RewardFormValues` type (this replaces `FormState` — keep `FormState` for now until the drawer is converted in Task 5):

```ts
// ── RHF form values ─────────────────────────────────────────────────────────

export interface RewardFormValues {
  name: string;
  desc: string;
  effectiveDate: string;
  expirationDate: string;
  countLimit: string;
  perDayLimit: string;
  perWeekLimit: string;
  perOfferLimit: string;
  transactionLimit: string;
  coolOffPeriod: string;
  numUses: string;
  canPreview: boolean;
  segments: string[];
  mandatorySegments: string[];
  tierPolicyLevels: TierPolicyLevel[];
  availability: WeekAvailability;
  ext: Record<string, unknown>;
}
```

Note: limit fields stay as `string` in the form values so native number inputs work naturally, and `z.coerce.number()` in the schema handles the conversion on validation.

Add the default values builder:

```ts
// ── buildRewardDefaultValues ─────────────────────────────────────────────────

export function buildRewardDefaultValues(
  reward: RewardPolicy | null,
  schemaData: EntitySchemaData | null,
): RewardFormValues {
  const ext: Record<string, unknown> = {};

  if (schemaData?.extFields) {
    for (const [fieldName, def] of Object.entries(schemaData.extFields)) {
      if (def.isParent) continue;
      if (def.defaultValue !== undefined) {
        ext[fieldName] = def.defaultValue;
      } else if (def.type === 'boolean') {
        ext[fieldName] = false;
      } else {
        ext[fieldName] = '';
      }
    }
  }

  if (reward?.ext) {
    const flat = flattenNested(reward.ext as Record<string, unknown>);
    for (const [key, val] of Object.entries(flat)) {
      if (
        typeof val === 'string' &&
        schemaData?.extFields[key]?.format === 'date-time'
      ) {
        ext[key] = toDateOnly(val);
      } else {
        ext[key] = val;
      }
    }
  }

  return {
    name: reward?.name ?? '',
    desc: reward?.desc ?? '',
    effectiveDate: toDateOnly(
      reward?.effectiveDate ?? new Date().toISOString(),
    ),
    expirationDate: toDateOnly(
      reward?.expirationDate ??
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5).toISOString(),
    ),
    countLimit: reward?.countLimit?.toString() ?? '0',
    perDayLimit: reward?.perDayLimit?.toString() ?? '0',
    perWeekLimit: reward?.perWeekLimit?.toString() ?? '0',
    perOfferLimit: reward?.perOfferLimit?.toString() ?? '0',
    transactionLimit: reward?.transactionLimit?.toString() ?? '0',
    coolOffPeriod: reward?.coolOffPeriod?.toString() ?? '0',
    numUses: reward?.numUses?.toString() ?? '1',
    canPreview: reward?.canPreview ?? true,
    segments: reward?.segments ?? [],
    mandatorySegments: reward?.mandatorySegments ?? [],
    tierPolicyLevels: reward?.tierPolicyLevels ?? [],
    availability: reward?.availability ?? DEFAULT_AVAILABILITY,
    ext,
  };
}
```

Note: `buildRewardDefaultValues` needs `RewardPolicy` imported. Add this import to `reward-form-helpers.ts`:

```ts
import type { RewardPolicy } from '../types/reward-policy';
```

Add the Zod schema builder:

```ts
// ── buildRewardZodSchema ──────────────────────────────────────────────────────

const daySchema = z.object({
  isEnabled: z.boolean(),
  startHours: z.number().int().min(0).max(23),
  startMins: z.number().int().min(0).max(59),
  endHours: z.number().int().min(0).max(23),
  endMins: z.number().int().min(0).max(59),
});

const availabilitySchema = z.object({
  sunday: daySchema,
  monday: daySchema,
  tuesday: daySchema,
  wednesday: daySchema,
  thursday: daySchema,
  friday: daySchema,
  saturday: daySchema,
});

export function buildRewardZodSchema(
  schemaData: EntitySchemaData | null,
): z.ZodObject<z.ZodRawShape> {
  const coreShape = {
    name: z.string().min(1, 'Name is required'),
    desc: z.string(),
    effectiveDate: z.string(),
    expirationDate: z.string(),
    countLimit: z.coerce.number().int().min(0, 'Must be a non-negative integer'),
    perDayLimit: z.coerce.number().int().min(0, 'Must be a non-negative integer'),
    perWeekLimit: z.coerce.number().int().min(0, 'Must be a non-negative integer'),
    perOfferLimit: z.coerce.number().int().min(0, 'Must be a non-negative integer'),
    transactionLimit: z.coerce.number().int().min(0, 'Must be a non-negative integer'),
    coolOffPeriod: z.coerce.number().int().min(0, 'Must be a non-negative integer'),
    numUses: z.coerce.number().int().min(1, 'Must be at least 1'),
    canPreview: z.boolean(),
    segments: z.array(z.string()),
    mandatorySegments: z.array(z.string()),
    tierPolicyLevels: z.array(
      z.object({ policyId: z.string(), level: z.string() }),
    ),
    availability: availabilitySchema,
    ext: buildExtZodSchema(schemaData?.extFields),
  };

  return z
    .object(coreShape)
    .superRefine((data, ctx) => {
      // expirationDate must not be before effectiveDate
      if (
        data.effectiveDate &&
        data.expirationDate &&
        data.expirationDate < data.effectiveDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expirationDate'],
          message: 'Must not be before effective date',
        });
      }

      // Availability: end time must be >= start time for enabled days
      for (const dayKey of DAY_KEYS) {
        const day = data.availability[dayKey];
        if (day.isEnabled) {
          const startMins = day.startHours * 60 + day.startMins;
          const endMins = day.endHours * 60 + day.endMins;
          if (endMins < startMins) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['availability'],
              message: `${DAY_LABELS[dayKey]}: end time must be >= start time`,
            });
            break;
          }
        }
      }
    });
}
```

Add `flattenRhfErrors`:

```ts
// ── flattenRhfErrors ─────────────────────────────────────────────────────────

/**
 * Converts RHF's nested FieldErrors object to a flat Record<string, string>
 * compatible with firstTabWithError / tabErrorCounts utilities.
 * Ext field errors (nested under `ext`) are promoted to the top level.
 */
export function flattenRhfErrors(
  errors: FieldErrors,
): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, val] of Object.entries(errors)) {
    if (!val) continue;

    if (key === 'ext' && typeof val === 'object' && !('message' in val)) {
      // Promote ext.fieldName errors to top-level fieldName
      for (const [extKey, extVal] of Object.entries(val as FieldErrors)) {
        const msg = (extVal as { message?: string })?.message;
        if (msg) flat[extKey] = msg;
      }
    } else {
      const msg = (val as { message?: string })?.message;
      if (msg) flat[key] = msg;
    }
  }

  return flat;
}
```

Add `buildBulkEditZodSchema`:

```ts
// ── buildBulkEditZodSchema ────────────────────────────────────────────────────

/**
 * Schema for BulkEditDrawer — all fields optional since editing is opt-in.
 */
export function buildBulkEditZodSchema(
  schemaData: EntitySchemaData,
): z.ZodObject<z.ZodRawShape> {
  const extSchema = buildExtZodSchema(schemaData.extFields);
  // Make all ext fields optional for bulk edit
  const optionalExtSchema = extSchema instanceof z.ZodObject
    ? extSchema.partial()
    : z.record(z.unknown());

  return z.object({
    desc: z.string().optional(),
    effectiveDate: z.string().optional(),
    expirationDate: z.string().optional(),
    activityBasedExpiration: z.boolean().optional(),
    expirationSnapTo: z.string().optional(),
    priority: z.coerce.number().optional(),
    canPreview: z.boolean().optional(),
    url: z.string().optional(),
    cost: z.coerce.number().optional(),
    transactionLimit: z.coerce.number().int().min(0).optional(),
    segments: z.array(z.string()).optional(),
    mandatorySegments: z.array(z.string()).optional(),
    controlGroups: z.array(z.string()).optional(),
    applicableMemberStatus: z.array(z.string()).optional(),
    eligibilityQuery: z.string().optional(),
    ext: optionalExtSchema,
  });
}
```

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/features/reward-catalog/lib/reward-form-helpers.test.ts
```

Expected: all tests PASS

**Step 5: Run full test suite to confirm nothing broken**

```bash
npm test
```

Expected: all tests pass

**Step 6: Commit**

```bash
git add src/features/reward-catalog/lib/reward-form-helpers.ts src/features/reward-catalog/lib/reward-form-helpers.test.ts
git commit -m "feat: add RHF helpers (buildRewardZodSchema, buildRewardDefaultValues, flattenRhfErrors, buildBulkEditZodSchema)"
```

---

## Task 4: Update `ExtTabBody` and `ExtFieldRenderer` props

**What changes:** `ExtTabBody` currently takes `form: FormState` and `setExtField`. Replace those with generic callbacks so the component is no longer coupled to `FormState`. `ExtFieldRenderer` already takes value+onChange — no change needed there.

**Files:**
- Modify: `src/features/reward-catalog/components/reward-ext-fields.tsx`

**Step 1: Update `ExtTabBody` props interface**

Find the `ExtTabBody` function signature:

```ts
// BEFORE
export function ExtTabBody({
  tab,
  form,
  setExtField,
  errors,
  schemaData,
  onPreviewUrl,
}: {
  tab: FormTab;
  form: FormState;
  setExtField: (key: string, value: unknown) => void;
  errors: Record<string, string>;
  schemaData: EntitySchemaData | null;
  onPreviewUrl?: (url: string) => void;
})
```

Replace with:

```ts
// AFTER
export function ExtTabBody({
  tab,
  getExtValue,
  setExtValue,
  getExtError,
  schemaData,
  onPreviewUrl,
}: {
  tab: FormTab;
  getExtValue: (key: string) => unknown;
  setExtValue: (key: string, value: unknown) => void;
  getExtError: (key: string) => string | undefined;
  schemaData: EntitySchemaData | null;
  onPreviewUrl?: (url: string) => void;
})
```

**Step 2: Update usages inside `ExtTabBody`**

Inside the component body, replace:
- `form.ext[fieldName]` → `getExtValue(fieldName)`
- `(v) => setExtField(fieldName, v)` → `(v) => setExtValue(fieldName, v)`
- `errors[fieldName]` → `getExtError(fieldName)`

The `ExtFieldRenderer` calls update from:
```ts
// BEFORE
value={form.ext[fieldName]}
onChange={(v) => setExtField(fieldName, v)}
error={errors[fieldName]}
```
to:
```ts
// AFTER
value={getExtValue(fieldName)}
onChange={(v) => setExtValue(fieldName, v)}
error={getExtError(fieldName)}
```

**Step 3: Remove `FormState` import from `reward-ext-fields.tsx`**

```ts
// Remove this import:
import type { FormTab, FormState } from '../lib/reward-form-helpers';

// Replace with:
import type { FormTab } from '../lib/reward-form-helpers';
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | head -30
```

Expected: TypeScript errors for the two callers that pass the old props (`reward-form-drawer.tsx` and `bulk-edit-drawer.tsx`). That's expected — we'll fix them in Tasks 5 and 6. If there are other unexpected errors, fix them now.

**Step 5: Commit**

```bash
git add src/features/reward-catalog/components/reward-ext-fields.tsx
git commit -m "refactor: decouple ExtTabBody from FormState, use generic value/setter callbacks"
```

---

## Task 5: Convert `RewardFormDrawer` to RHF

**What changes:** Replace the entire `useState<FormState>` block, `setField`/`setExtField` callbacks, `initialRef` dirty tracking, manual `errors` state, manual validation loop, and `buildExt()` with `useForm` + the new helpers. Keep the drawer shell, tab navigation, drag-reorder, keyboard shortcuts, and schema/eligibility hooks untouched.

**Files:**
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

### Step 1: Update imports

Add RHF imports and new helpers to the import block:

```ts
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type FormTab,
  type RewardFormValues,      // new
  type CoreTab,
  CORE_TAB_KEYS,
  toDateOnly,
  timeToString,
  parseTime,
  DEFAULT_AVAILABILITY,
  DAY_KEYS,
  DAY_LABELS,
  buildFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  buildRewardZodSchema,       // new
  buildRewardDefaultValues,   // new
  flattenRhfErrors,           // new
} from '../lib/reward-form-helpers';
```

Remove `type FormState` from the import (it's no longer used in this file).

### Step 2: Replace form state setup

Remove the entire block starting at `// ── Build initial ext state` through the end of the `setExtField` declaration. Replace with:

```ts
// ── RHF setup ───────────────────────────────────────────────────────────────

const schema = useMemo(
  () => buildRewardZodSchema(schemaData ?? null),
  [schemaData],
);

const {
  register,
  control,
  handleSubmit,
  reset,
  watch,
  setError,
  formState: { errors: rhfErrors, isDirty },
} = useForm<RewardFormValues>({
  resolver: zodResolver(schema),
  defaultValues: buildRewardDefaultValues(reward, null),
});

// Flatten RHF errors for tab navigation utilities
const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);
```

### Step 3: Replace the reset useEffect

Remove the `useEffect([open, reward])` that calls `setForm(init)`. Replace with:

```ts
// Reset when drawer opens or target reward changes
useEffect(() => {
  if (!open) return;
  reset(buildRewardDefaultValues(reward, schemaData ?? null));
  setGeneralError(null);
  setAllTimesOverride(null);
  setTab(savedTabOrder?.[0] ?? 'details');
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, reward]);
```

### Step 4: Replace the schema-load useEffect

Remove the `useEffect([schemaData, reward, buildInitialExt])` that patches ext defaults. Replace with:

```ts
// When schema loads, rebuild defaults (ext fields now known) and reset.
// Preserve isDirty=false since this is a defaults update, not user input.
useEffect(() => {
  if (!schemaData) return;
  reset(buildRewardDefaultValues(reward, schemaData), {
    keepDirty: false,
    keepDefaultValues: false,
  });
}, [schemaData]); // eslint-disable-line react-hooks/exhaustive-deps
```

### Step 5: Remove isDirty manual tracking

Remove the `isDirty` useMemo that compared JSON.stringify. The `isDirty` from `formState` is now used directly.

Remove `initialRef` declaration and all references to it.

### Step 6: Update `tryClose`

The `tryClose` callback already uses `isDirty` — no change needed, since `isDirty` is now the RHF value from destructuring.

### Step 7: Remove `generalError` overlap

Keep `const [generalError, setGeneralError] = useState<string | null>(null)` — it's used for the error banner in the UI.

Remove `const [errors, setErrors] = useState<Record<string, string>>({})` — `errors` is now the flattened RHF errors from Step 2.

### Step 8: Wire the Details tab fields

Find the Details tab JSX. Replace each controlled input with `register` or `Controller`:

**Name field** (was `value={form.name}` + `onChange`):
```tsx
<Input
  {...register('name')}
  error={!!errors.name}
  onFocus={handleAutoSelectOnFocus}
/>
{errors.name && <p className="text-caption text-error">{errors.name}</p>}
```

**Desc field:**
```tsx
<textarea
  {...register('desc')}
  className={cn(...)}
  rows={3}
/>
```

**effectiveDate / expirationDate:**
```tsx
<Input type="date" {...register('effectiveDate')} error={!!errors.effectiveDate} />
<Input type="date" {...register('expirationDate')} error={!!errors.expirationDate} />
{errors.expirationDate && <p className="text-caption text-error">{errors.expirationDate}</p>}
```

### Step 9: Wire the Limits tab fields

All numeric string fields use `register`. The `canPreview` switch uses `Controller`:

```tsx
// countLimit, perDayLimit, etc.
<Input type="number" {...register('countLimit')} min="0" error={!!errors.countLimit} />

// canPreview
<Controller
  control={control}
  name="canPreview"
  render={({ field }) => (
    <Switch checked={field.value} onChange={field.onChange} />
  )}
/>
```

### Step 10: Wire the Eligibility tab fields

**segments / mandatorySegments** (MultiSelect):
```tsx
<Controller
  control={control}
  name="segments"
  render={({ field }) => (
    <MultiSelect
      value={field.value}
      onChange={field.onChange}
      options={segmentOpts}
      placeholder="Select..."
      error={!!errors.segments}
    />
  )}
/>
```

**tierPolicyLevels** (existing custom component — same pattern with `Controller name="tierPolicyLevels"`).

### Step 11: Wire availability

The availability grid is a complex custom UI. Wrap it with a single `Controller`:

```tsx
<Controller
  control={control}
  name="availability"
  render={({ field }) => (
    <AvailabilityGrid
      value={field.value}
      onChange={(next) => {
        field.onChange(next);
        setAllTimesOverride(null);
      }}
      allTimesOverride={allTimesOverride}
      onAllTimesChange={(v) => {
        setAllTimesOverride(v);
        // ... existing all-times logic, now using field.onChange
      }}
    />
  )}
/>
```

Note: if there is no `<AvailabilityGrid>` component and the availability UI is inlined, keep the JSX exactly as-is but replace `form.availability` reads with `watch('availability')` and `setForm` calls with `setValue('availability', ...)` — pattern is the same, just different call sites.

### Step 12: Wire ext tabs

Pass callbacks to `ExtTabBody` backed by `watch` and `setValue`:

```tsx
const extValues = watch('ext');

<ExtTabBody
  tab={t}
  getExtValue={(key) => extValues[key]}
  setExtValue={(key, val) => setValue(`ext.${key}` as keyof RewardFormValues, val as never)}
  getExtError={(key) => errors[key]}
  schemaData={schemaData ?? null}
  onPreviewUrl={setPreviewUrl}
/>
```

### Step 13: Replace `handleSubmit`

Remove the entire manual `handleSubmit` function (the `async (e: React.FormEvent) => void`), including the manual validation block and `buildExt()` call. Replace the form's `onSubmit` with RHF's `handleSubmit`:

```tsx
<form
  onSubmit={handleSubmit(async (data: RewardFormValues) => {
    setGeneralError(null);

    const ext = buildExtFromValues(data.ext, schemaData);

    const limitsFields = {
      countLimit: Number(data.countLimit),
      perDayLimit: Number(data.perDayLimit),
      perWeekLimit: Number(data.perWeekLimit),
      perOfferLimit: Number(data.perOfferLimit),
      transactionLimit: Number(data.transactionLimit),
      coolOffPeriod: Number(data.coolOffPeriod),
      numUses: Number(data.numUses),
      canPreview: data.canPreview,
      segments: data.segments,
      mandatorySegments: data.mandatorySegments,
      tierPolicyLevels: data.tierPolicyLevels,
      availability: data.availability,
    };

    const effectiveISO = data.effectiveDate
      ? data.effectiveDate + 'T00:00:00.000Z' : '';
    const expirationISO = data.expirationDate
      ? data.expirationDate + 'T23:59:59.999Z' : '';
    const coreVal = Number(ext.rewardCostCore) || 0;

    let payload: RewardPolicy;
    if (isEditing && reward) {
      payload = {
        ...reward,
        name: data.name.trim(),
        desc: data.desc.trim(),
        cost: coreVal,
        effectiveDate: effectiveISO,
        expirationDate: expirationISO,
        ext: { ...reward.ext, ...ext } as RewardPolicy['ext'],
        extCategories: reward.extCategories,
        ...limitsFields,
      };
    } else {
      const base = createDefaultRewardPolicy(programId, orgId, nextSortOrder);
      payload = {
        ...base,
        name: data.name.trim(),
        desc: data.desc.trim(),
        cost: coreVal,
        effectiveDate: effectiveISO,
        expirationDate: expirationISO,
        ext: { _meta: (base.ext as Record<string, unknown>)._meta, ...ext } as unknown as RewardPolicy['ext'],
        extCategories: [],
        ...limitsFields,
        redemptions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      await onSave(payload);
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      if (apiErr?.details && apiErr.details.length > 0) {
        for (const d of apiErr.details as ApiFieldError[]) {
          const fieldKey = d.path.startsWith('ext.') ? d.path.slice(4) : d.path;
          const rhfPath = d.path.startsWith('ext.')
            ? `ext.${fieldKey}` as keyof RewardFormValues
            : fieldKey as keyof RewardFormValues;
          setError(rhfPath, { message: d.message });
        }
        // Navigate to first tab with errors
        const newErrors = flattenRhfErrors(rhfErrors);
        const targetTab = firstTabWithError(newErrors, fieldTabMap, orderedTabKeys);
        if (targetTab) setTab(targetTab);
      } else {
        setGeneralError(err instanceof Error ? err.message : String(err));
      }
    }
  })}
>
```

Add the `buildExtFromValues` helper at the top of the component file (or in `reward-form-helpers.ts` if it grows complex) — it replaces the old `buildExt()` method:

```ts
function buildExtFromValues(
  extValues: Record<string, unknown>,
  schemaData: EntitySchemaData | null,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  if (schemaData?.extFields) {
    for (const [fieldName, def] of Object.entries(schemaData.extFields)) {
      if (def.isParent) continue;
      const val = extValues[fieldName];
      if (def.type === 'number' || def.type === 'integer') {
        flat[fieldName] = parseInt(String(val), 10) || 0;
      } else if (def.type === 'boolean') {
        flat[fieldName] = !!val;
      } else if (def.format === 'date-time' || def.format === 'date') {
        const strVal = String(val ?? '').trim();
        flat[fieldName] = strVal
          ? strVal + (def.format === 'date-time' ? 'T23:59:59.999Z' : '')
          : '';
      } else {
        flat[fieldName] = typeof val === 'string' ? val.trim() : (val ?? '');
      }
    }
  } else {
    for (const [key, val] of Object.entries(extValues)) {
      flat[key] = typeof val === 'string' ? val.trim() : val;
    }
  }

  const ext = unflattenDotPaths(flat);
  if (schemaData?.extFields?.rewardCostCore) {
    const coreVal = (ext.rewardCostCore as number) || 0;
    if (!ext.rewardCostPremier && schemaData.extFields.rewardCostPremier) ext.rewardCostPremier = coreVal;
    if (!ext.rewardCostAllAccess && schemaData.extFields.rewardCostAllAccess) ext.rewardCostAllAccess = coreVal;
  }
  return ext;
}
```

### Step 14: Wire tab error counts display

Replace `tabErrorCounts(errors, fieldTabMap, ...)` call — `errors` is now already the flattened object from Step 2, so no change needed in the tab bar rendering.

### Step 15: Remove `FormState` and dead code

Now that the drawer no longer uses `FormState`:
- Remove the import of `FormState` from `reward-form-helpers`
- Remove `buildInitialExt` callback (no longer needed)
- Remove `setField` and `setExtField` callbacks

### Step 16: Build and manually verify

```bash
npm run build 2>&1 | head -50
```

Fix any TypeScript errors. Common issues:
- `setValue` call with `ext.fieldName` may need `as any` or a typed helper if the path type is too wide
- `watch('ext')` returns `Record<string, unknown>` — if TS complains, use `watch('ext') as Record<string, unknown>`

### Step 17: Smoke test in the browser

Start the dev server (`docker compose -f docker-compose.dev.yml up -d`), open the Rewards Catalog, and verify:
1. Create a new reward — form opens with correct defaults
2. Edit an existing reward — form populates correctly
3. Change fields — Save button activates (isDirty)
4. Submit with name empty — error appears on Details tab
5. Submit with valid data — saves successfully
6. Close with unsaved changes — confirmation dialog appears

### Step 18: Commit

```bash
git add src/features/reward-catalog/components/reward-form-drawer.tsx
git commit -m "feat: convert RewardFormDrawer from useState to React Hook Form"
```

---

## Task 6: Convert `BulkEditDrawer` to RHF

**What changes:** Replace `useState<Record<string, unknown>>(values)`, `setState<Record<string, string>>(errors)`, and `setValue`/`setErrors` callbacks with `useForm`. Keep `enabledFields: Set<string>` as `useState`.

**Files:**
- Modify: `src/features/reward-catalog/components/bulk-edit-drawer.tsx`

### Step 1: Add imports

```ts
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  buildFormTabs,
  toDateOnly,
  type FormTab,
  buildBulkEditZodSchema,
  flattenRhfErrors,
} from '../lib/reward-form-helpers';
```

### Step 2: Replace form state

Remove:
```ts
const [values, setValues] = useState<Record<string, unknown>>({});
const [errors, setErrors] = useState<Record<string, string>>({});
```

Replace with:
```ts
const {
  control,
  handleSubmit,
  formState: { errors: rhfErrors },
  setError,
} = useForm({
  resolver: zodResolver(buildBulkEditZodSchema(schemaData)),
  defaultValues: {},
});

const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);
```

### Step 3: Replace `setValue` callback with `Controller`

Remove the `setValue` callback. Each field's input becomes a `Controller`-rendered element. The `BulkField` wrapper remains unchanged.

For core fields inside `renderCoreField`, replace the `value={values[field.key]}` + `onChange={(e) => setValue(...)}` pattern with a `Controller`:

```tsx
<Controller
  control={control}
  name={field.key as keyof BulkEditValues}
  defaultValue={undefined}
  render={({ field: f }) => (
    <Input
      type={field.type === 'number' ? 'number' : 'text'}
      value={f.value != null ? String(f.value) : ''}
      onChange={(e) => f.onChange(
        field.type === 'number' ? e.target.valueAsNumber : e.target.value
      )}
      disabled={!enabled}
      error={!!errors[field.key]}
    />
  )}
/>
```

Apply the same `Controller` pattern to textarea, date, boolean, segments, and select field types, each following the same shape.

### Step 4: Replace `handleApply`

Remove the manual `handleApply`. Replace with RHF's `handleSubmit`:

```ts
const onApply = handleSubmit(async (data) => {
  setShowConfirm(false);
  setGeneralError(null);

  const update: Record<string, unknown> = {};
  for (const field of enabledFields) {
    const isExt = !!schemaData.extFields[field];
    const key = isExt ? `ext.${field}` : field;
    update[key] = (data as Record<string, unknown>)[field] ?? null;
  }

  try {
    await onSave(update);
  } catch (err: unknown) {
    const apiErr = err as ApiError | undefined;
    if (apiErr?.details && apiErr.details.length > 0) {
      for (const d of apiErr.details as ApiFieldError[]) {
        const fieldKey = d.path.startsWith('ext.') ? d.path.slice(4) : d.path;
        setError(fieldKey as never, { message: d.message });
      }
      // Navigate to first tab with error
      for (const tab of tabs) {
        if (Object.keys(flattenRhfErrors(rhfErrors)).some(f => fieldTabMap[f] === tab.key)) {
          setActiveTab(tab.key);
          break;
        }
      }
    } else {
      setGeneralError(err instanceof Error ? err.message : String(err));
    }
  }
});
```

Update the Apply button to call `onApply` instead of `handleApply`:

```tsx
<AlertDialog.Action asChild>
  <Button onClick={onApply}>Apply</Button>
</AlertDialog.Action>
```

### Step 5: Remove dead code

Remove: `toggleField`'s error-cleanup block (RHF handles it), the `values` state, `setValue` callback, `errors` state, `setErrors` calls, `errCounts` useMemo (replace with `tabErrorCounts(errors, fieldTabMap, tabs.map(t => t.key))`).

### Step 6: Build and smoke test

```bash
npm run build 2>&1 | head -30
```

Smoke test in the browser:
1. Select multiple rewards → open Bulk Edit drawer
2. Enable a field checkbox → field becomes active
3. Enter an invalid value → error appears
4. Submit → confirmation dialog → apply

### Step 7: Commit

```bash
git add src/features/reward-catalog/components/bulk-edit-drawer.tsx
git commit -m "feat: convert BulkEditDrawer from useState to React Hook Form"
```

---

## Task 7: Cleanup — remove `FormState` from `reward-form-helpers.ts`

Now that both drawers are converted, `FormState` is unused.

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-form-helpers.ts`

**Step 1: Delete the `FormState` interface**

Remove the `FormState` interface block (lines `export interface FormState { ... }`).

**Step 2: Verify build**

```bash
npm run build 2>&1 | head -20
```

Expected: clean. If anything still imports `FormState`, fix the import.

**Step 3: Run full test suite**

```bash
npm test
```

Expected: all pass.

**Step 4: Commit**

```bash
git add src/features/reward-catalog/lib/reward-form-helpers.ts
git commit -m "chore: remove FormState interface now that both drawers use RHF"
```

---

## Task 8: Final lint and build verification

**Step 1: Lint**

```bash
npm run lint
```

Fix any lint warnings introduced by the conversion (unused imports, `any` types, etc.).

**Step 2: Full build**

```bash
npm run build
```

Expected: zero errors, zero warnings.

**Step 3: Commit any lint fixes**

```bash
git add -p
git commit -m "chore: fix lint warnings from RHF conversion"
```
