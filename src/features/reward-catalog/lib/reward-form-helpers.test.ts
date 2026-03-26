import { describe, it, expect } from 'vitest';
import type { FieldErrors } from 'react-hook-form';
import {
  buildRewardDefaultValues,
  flattenRhfErrors,
  buildRewardZodSchema,
  buildBulkEditZodSchema,
  buildExtFromValues,
  buildRewardFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  parseTime,
  toDateOnly,
  timeToString,
} from './reward-form-helpers';
import type { RewardCatalogItem, EntitySchemaData } from '../types/reward-policy';
import type { ExtFieldDef } from '@/shared/types/ext-field-def';

// Minimal mock for a RewardCatalogItem (only fields used by buildRewardDefaultValues)
function makeReward(overrides: Partial<RewardCatalogItem> = {}): RewardCatalogItem {
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
    ext: { rewardCostCore: 100 } as unknown as RewardCatalogItem['ext'],
    ...overrides,
  } as RewardCatalogItem;
}

function makeExtField(overrides: Partial<ExtFieldDef> = {}): ExtFieldDef {
  return {
    type: 'string', title: 'Field', required: false,
    category: 'General', displayOrder: 0,
    showInList: false, searchable: false, sortable: false,
    ...overrides,
  };
}

function makeSchemaData(overrides: Partial<EntitySchemaData> = {}): EntitySchemaData {
  return {
    extRequiredFields: new Set<string>(),
    coreRequiredFields: new Set<string>(),
    enumFields: {},
    extFields: {},
    categories: [],
    bulkEditableFields: new Set<string>(),
    ...overrides,
  };
}

/** Valid form data fixture for reuse in schema tests */
const validFormData = {
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
  divisions: [],
  eligibleChannels: [],
  redemptionType: "auto-redeem",
  voucherValidValue: 0,
  voucherValidUnit: "Days",
  cost: 0,
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
  ffmntTierUseDefaults: true,
  ffmntTierDurationValue: 0,
  ffmntTierDurationUnit: "Days",
  ext: {},
};

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

  it('returns number fields as numbers', () => {
    const reward = makeReward({ countLimit: 7 });
    const vals = buildRewardDefaultValues(reward, null);
    expect(vals.countLimit).toBe(7);
  });

  it('populates ext defaults from schemaData', () => {
    const sd = makeSchemaData({
      extFields: {
        rewardCostCore: makeExtField({ type: 'number', defaultValue: 500 }),
        brandCode: makeExtField({ type: 'string' }),
      },
    });
    const vals = buildRewardDefaultValues(null, sd);
    expect(vals.ext.rewardCostCore).toBe(500);
    expect(vals.ext.brandCode).toBe('');
  });

  it('defaults boolean ext fields to false', () => {
    const sd = makeSchemaData({
      extFields: {
        hideReward: makeExtField({ type: 'boolean' }),
      },
    });
    const vals = buildRewardDefaultValues(null, sd);
    expect(vals.ext.hideReward).toBe(false);
  });

  it('uses defaultValue from ext field def', () => {
    const sd = makeSchemaData({
      extFields: {
        channel: makeExtField({ type: 'string', defaultValue: 'web' }),
      },
    });
    const vals = buildRewardDefaultValues(null, sd);
    expect(vals.ext.channel).toBe('web');
  });

  it('converts date-time ext field to date-only for existing reward', () => {
    const sd = makeSchemaData({
      extFields: {
        softEndDate: makeExtField({ type: 'string', format: 'date-time' }),
      },
    });
    const reward = makeReward({
      ext: { softEndDate: '2026-06-15T23:59:59.999Z' } as unknown as RewardCatalogItem['ext'],
    });
    const vals = buildRewardDefaultValues(reward, sd);
    expect(vals.ext.softEndDate).toBe('2026-06-15');
  });
});

describe('flattenRhfErrors', () => {
  it('returns empty object for no errors', () => {
    expect(flattenRhfErrors({})).toEqual({});
  });

  it('flattens top-level string errors', () => {
    const errors = { name: { message: 'Required' } } as unknown as FieldErrors;
    expect(flattenRhfErrors(errors)).toEqual({ name: 'Required' });
  });

  it('flattens nested ext errors', () => {
    const errors = { ext: { rewardCostCore: { message: 'Invalid' } } } as unknown as FieldErrors;
    expect(flattenRhfErrors(errors)).toEqual({ rewardCostCore: 'Invalid' });
  });

  it('ignores fields with no message', () => {
    const errors = { name: { type: 'required' } } as unknown as FieldErrors; // no message
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
    const result = schema.safeParse(validFormData);
    expect(result.success).toBe(true);
  });

  it('rejects numUses less than 1', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({ ...validFormData, numUses: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative countLimit', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({ ...validFormData, countLimit: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects expirationDate before effectiveDate', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      effectiveDate: '2026-06-01',
      expirationDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('expirationDate');
    }
  });

  it('rejects availability end < start on enabled day', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      availability: {
        ...validFormData.availability,
        monday: { isEnabled: true, startHours: 18, startMins: 0, endHours: 9, endMins: 0 },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('availability');
    }
  });

  it('allows availability end < start on disabled day', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      availability: {
        ...validFormData.availability,
        monday: { isEnabled: false, startHours: 18, startMins: 0, endHours: 9, endMins: 0 },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('buildRewardZodSchema (conditional fulfillment validation)', () => {
  it('accepts Discount type without currency or points', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Discount',
      ffmntCurrency: '',
      ffmntPoints: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects Points type with empty currency', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Points',
      ffmntCurrency: '',
      ffmntPoints: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('ffmntCurrency');
    }
  });

  it('rejects Points type with zero points', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Points',
      ffmntCurrency: 'USD',
      ffmntPoints: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('ffmntPoints');
    }
  });

  it('accepts Points type with valid currency and points', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Points',
      ffmntCurrency: 'USD',
      ffmntPoints: 500,
    });
    expect(result.success).toBe(true);
  });

  it('rejects External Fulfillment with empty partner', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'External Fulfillment',
      ffmntPartner: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('ffmntPartner');
    }
  });

  it('accepts External Fulfillment with partner set', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'External Fulfillment',
      ffmntPartner: 'partner-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects Tier Status with empty tier policy', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Tier Status',
      ffmntTierPolicy: '',
      ffmntTierLevel: 'Gold',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('ffmntTierPolicy');
    }
  });

  it('rejects Tier Status with empty tier level', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Tier Status',
      ffmntTierPolicy: 'tp-1',
      ffmntTierLevel: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('ffmntTierLevel');
    }
  });

  it('accepts Tier Status with both policy and level set', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      ffmntType: 'Tier Status',
      ffmntTierPolicy: 'tp-1',
      ffmntTierLevel: 'Gold',
    });
    expect(result.success).toBe(true);
  });

  it('rejects issue-voucher redemption type with zero validity', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      redemptionType: 'issue-voucher',
      voucherValidValue: 0,
      voucherValidUnit: 'Days',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('voucherValidValue');
    }
  });

  it('accepts issue-voucher with valid duration', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      redemptionType: 'issue-voucher',
      voucherValidValue: 30,
      voucherValidUnit: 'Days',
    });
    expect(result.success).toBe(true);
  });

  it('accepts auto-redeem without voucher validity', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      redemptionType: 'auto-redeem',
      voucherValidValue: 0,
      voucherValidUnit: 'Days',
    });
    expect(result.success).toBe(true);
  });
});

describe('buildBulkEditZodSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const schema = buildBulkEditZodSchema(makeSchemaData());
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('coerces string to number for core number fields', () => {
    const schema = buildBulkEditZodSchema(makeSchemaData());
    const result = schema.safeParse({ countLimit: '5', perDayLimit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countLimit).toBe(5);
      expect(result.data.perDayLimit).toBe(10);
    }
  });

  it('rejects numUses: 0 (min is 1)', () => {
    const schema = buildBulkEditZodSchema(makeSchemaData());
    const result = schema.safeParse({ numUses: 0 });
    expect(result.success).toBe(false);
  });

  it('flattens ext fields to top level', () => {
    const schema = buildBulkEditZodSchema(makeSchemaData({
      extFields: {
        rewardCostCore: makeExtField({ type: 'number', required: true }),
      },
    }));
    // Field should be at top level, not under ext
    const result = schema.safeParse({ rewardCostCore: '100' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rewardCostCore).toBe(100);
  });

  it('makes ext fields optional even if required in schema', () => {
    const schema = buildBulkEditZodSchema(makeSchemaData({
      extFields: {
        rewardCostCore: makeExtField({ type: 'number', required: true }),
      },
    }));
    // Should pass even without providing the required ext field
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('parseTime', () => {
  it('parses a normal HH:MM string', () => {
    expect(parseTime('14:30')).toEqual({ hours: 14, mins: 30 });
  });

  it('returns 0 for empty string (NaN fallback)', () => {
    expect(parseTime('')).toEqual({ hours: 0, mins: 0 });
  });

  it('returns 0 for malformed input without colon', () => {
    expect(parseTime('abc')).toEqual({ hours: 0, mins: 0 });
  });
});

describe('buildExtFromValues', () => {
  it('coerces integer fields to integers', () => {
    const sd = makeSchemaData({
      extFields: {
        points: makeExtField({ type: 'integer' }),
      },
    });
    const result = buildExtFromValues({ points: '42' }, sd);
    expect(result.points).toBe(42);
  });

  it('coerces number fields to floats', () => {
    const sd = makeSchemaData({
      extFields: {
        rate: makeExtField({ type: 'number' }),
      },
    });
    const result = buildExtFromValues({ rate: '3.14' }, sd);
    expect(result.rate).toBeCloseTo(3.14);
  });

  it('returns 0 for non-numeric integer input', () => {
    const sd = makeSchemaData({
      extFields: {
        points: makeExtField({ type: 'integer' }),
      },
    });
    const result = buildExtFromValues({ points: 'abc' }, sd);
    expect(result.points).toBe(0);
  });

  it('coerces boolean fields', () => {
    const sd = makeSchemaData({
      extFields: {
        hidden: makeExtField({ type: 'boolean' }),
      },
    });
    expect(buildExtFromValues({ hidden: 1 }, sd).hidden).toBe(true);
    expect(buildExtFromValues({ hidden: '' }, sd).hidden).toBe(false);
    expect(buildExtFromValues({ hidden: undefined }, sd).hidden).toBe(false);
  });

  it('appends T23:59:59.999Z to date-time fields', () => {
    const sd = makeSchemaData({
      extFields: {
        softEnd: makeExtField({ type: 'string', format: 'date-time' }),
      },
    });
    const result = buildExtFromValues({ softEnd: '2026-06-15' }, sd);
    expect(result.softEnd).toBe('2026-06-15T23:59:59.999Z');
  });

  it('returns empty string for empty date-time value', () => {
    const sd = makeSchemaData({
      extFields: {
        softEnd: makeExtField({ type: 'string', format: 'date-time' }),
      },
    });
    const result = buildExtFromValues({ softEnd: '' }, sd);
    expect(result.softEnd).toBe('');
  });

  it('does not append suffix for plain date format', () => {
    const sd = makeSchemaData({
      extFields: {
        startDate: makeExtField({ type: 'string', format: 'date' }),
      },
    });
    const result = buildExtFromValues({ startDate: '2026-01-01' }, sd);
    expect(result.startDate).toBe('2026-01-01');
  });

  it('trims string fields', () => {
    const sd = makeSchemaData({
      extFields: {
        brandCode: makeExtField({ type: 'string' }),
      },
    });
    const result = buildExtFromValues({ brandCode: '  ABC  ' }, sd);
    expect(result.brandCode).toBe('ABC');
  });

  it('skips isParent fields', () => {
    const sd = makeSchemaData({
      extFields: {
        parent: makeExtField({ isParent: true }),
        child: makeExtField({ type: 'string' }),
      },
    });
    const result = buildExtFromValues({ parent: 'val', child: 'hi' }, sd);
    expect(result).not.toHaveProperty('parent');
    expect(result.child).toBe('hi');
  });

  it('defaults rewardCostPremier/rewardCostAllAccess from rewardCostCore', () => {
    const sd = makeSchemaData({
      extFields: {
        rewardCostCore: makeExtField({ type: 'integer' }),
        rewardCostPremier: makeExtField({ type: 'integer' }),
        rewardCostAllAccess: makeExtField({ type: 'integer' }),
      },
    });
    const result = buildExtFromValues(
      { rewardCostCore: '500', rewardCostPremier: '', rewardCostAllAccess: '' },
      sd,
    );
    expect(result.rewardCostCore).toBe(500);
    expect(result.rewardCostPremier).toBe(500);
    expect(result.rewardCostAllAccess).toBe(500);
  });

  it('does not override existing rewardCostPremier/rewardCostAllAccess', () => {
    const sd = makeSchemaData({
      extFields: {
        rewardCostCore: makeExtField({ type: 'integer' }),
        rewardCostPremier: makeExtField({ type: 'integer' }),
        rewardCostAllAccess: makeExtField({ type: 'integer' }),
      },
    });
    const result = buildExtFromValues(
      { rewardCostCore: '500', rewardCostPremier: '700', rewardCostAllAccess: '900' },
      sd,
    );
    expect(result.rewardCostPremier).toBe(700);
    expect(result.rewardCostAllAccess).toBe(900);
  });

  it('preserves intentional zero for rewardCostPremier/rewardCostAllAccess', () => {
    const sd = makeSchemaData({
      extFields: {
        rewardCostCore: makeExtField({ type: 'integer' }),
        rewardCostPremier: makeExtField({ type: 'integer' }),
        rewardCostAllAccess: makeExtField({ type: 'integer' }),
      },
    });
    const result = buildExtFromValues(
      { rewardCostCore: '500', rewardCostPremier: '0', rewardCostAllAccess: 0 },
      sd,
    );
    expect(result.rewardCostPremier).toBe(0);
    expect(result.rewardCostAllAccess).toBe(0);
  });

  it('handles no schemaData (passthrough mode)', () => {
    const result = buildExtFromValues({ foo: '  bar  ', num: 42 }, null);
    expect(result.foo).toBe('bar');
    expect(result.num).toBe(42);
  });
});

// ── buildRewardFormTabs ─────────────────────────────────────────────────────────────

describe('buildRewardFormTabs', () => {
  it('returns only core tabs when schemaData is null', () => {
    const tabs = buildRewardFormTabs(null);
    expect(tabs.map((t) => t.key)).toEqual(['details', 'fulfillment', 'limits', 'eligibility']);
  });

  it('returns core tabs when extFields is empty', () => {
    const tabs = buildRewardFormTabs(makeSchemaData());
    expect(tabs.map((t) => t.key)).toEqual(['details', 'fulfillment', 'limits', 'eligibility']);
  });

  it('groups ext fields by category into separate tabs', () => {
    const sd = makeSchemaData({
      extFields: {
        brandCode: makeExtField({ category: 'General', displayOrder: 1 }),
        rewardCostCore: makeExtField({ category: 'Points', displayOrder: 10 }),
      },
    });
    const tabs = buildRewardFormTabs(sd);
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('general');
    expect(keys).toContain('points');
  });

  it('excludes isParent fields from tab field lists', () => {
    const sd = makeSchemaData({
      extFields: {
        featured: makeExtField({ category: 'General', displayOrder: 1, isParent: true }),
        'featured.AT': makeExtField({ category: 'General', displayOrder: 2 }),
      },
    });
    const tabs = buildRewardFormTabs(sd);
    const general = tabs.find((t) => t.key === 'general');
    expect(general).toBeDefined();
    expect(general!.fields).not.toContain('featured');
    expect(general!.fields).toContain('featured.AT');
  });

  it('respects category order from schemaData.categories', () => {
    const sd = makeSchemaData({
      categories: [
        { name: 'Points', columns: 2 },
        { name: 'General', columns: 1 },
      ],
      extFields: {
        brandCode: makeExtField({ category: 'General', displayOrder: 1 }),
        rewardCostCore: makeExtField({ category: 'Points', displayOrder: 10 }),
      },
    });
    const tabs = buildRewardFormTabs(sd);
    const extKeys = tabs.filter((t) => t.key !== 'details' && t.key !== 'fulfillment' && t.key !== 'limits' && t.key !== 'eligibility').map((t) => t.key);
    expect(extKeys).toEqual(['points', 'general']);
  });

  it('falls back to minOrder when no explicit categories', () => {
    const sd = makeSchemaData({
      extFields: {
        zField: makeExtField({ category: 'Zebra', displayOrder: 100 }),
        aField: makeExtField({ category: 'Alpha', displayOrder: 1 }),
      },
    });
    const tabs = buildRewardFormTabs(sd);
    const extKeys = tabs.filter((t) => !['details', 'fulfillment', 'limits', 'eligibility'].includes(t.key)).map((t) => t.key);
    expect(extKeys).toEqual(['alpha', 'zebra']);
  });

  it('uses column count from categories', () => {
    const sd = makeSchemaData({
      categories: [{ name: 'General', columns: 3 }],
      extFields: {
        brandCode: makeExtField({ category: 'General', displayOrder: 1 }),
      },
    });
    const tabs = buildRewardFormTabs(sd);
    const general = tabs.find((t) => t.key === 'general');
    expect(general?.columns).toBe(3);
  });
});

// ── buildFieldTabMap ──────────────────────────────────────────────────────────

describe('buildFieldTabMap', () => {
  it('maps core fields to correct tabs', () => {
    const tabs = buildRewardFormTabs(null);
    const map = buildFieldTabMap(tabs);
    expect(map.name).toBe('details');
    expect(map.desc).toBe('details');
    expect(map.countLimit).toBe('limits');
    expect(map.numUses).toBe('limits');
    expect(map.segments).toBe('eligibility');
    expect(map.availability).toBe('eligibility');
  });

  it('maps ext fields from dynamic tabs', () => {
    const sd = makeSchemaData({
      extFields: {
        brandCode: makeExtField({ category: 'General', displayOrder: 1 }),
      },
    });
    const tabs = buildRewardFormTabs(sd);
    const map = buildFieldTabMap(tabs);
    expect(map.brandCode).toBe('general');
  });
});

// ── firstTabWithError ─────────────────────────────────────────────────────────

describe('firstTabWithError', () => {
  it('returns null for empty errors', () => {
    expect(firstTabWithError({}, { name: 'details' }, ['details', 'limits'])).toBeNull();
  });

  it('returns first tab in order that has an error', () => {
    const errors = { countLimit: 'too high', name: 'required' };
    const map = { name: 'details', countLimit: 'limits' };
    expect(firstTabWithError(errors, map, ['details', 'limits'])).toBe('details');
  });

  it('skips tabs without errors', () => {
    const errors = { countLimit: 'too high' };
    const map = { name: 'details', countLimit: 'limits' };
    expect(firstTabWithError(errors, map, ['details', 'limits'])).toBe('limits');
  });
});

// ── tabErrorCounts ────────────────────────────────────────────────────────────

describe('tabErrorCounts', () => {
  it('returns all zeros for empty errors', () => {
    const counts = tabErrorCounts({}, { name: 'details' }, ['details', 'limits']);
    expect(counts).toEqual({ details: 0, limits: 0 });
  });

  it('counts errors per tab correctly', () => {
    const errors = { name: 'required', desc: 'too short', countLimit: 'negative' };
    const map = { name: 'details', desc: 'details', countLimit: 'limits' };
    const counts = tabErrorCounts(errors, map, ['details', 'limits']);
    expect(counts.details).toBe(2);
    expect(counts.limits).toBe(1);
  });

  it('ignores fields not in any tab', () => {
    const errors = { unknown: 'error' };
    const map = { name: 'details' };
    const counts = tabErrorCounts(errors, map, ['details']);
    expect(counts.details).toBe(0);
  });
});

// ── flattenRhfErrors deep nesting ─────────────────────────────────────────────

describe('flattenRhfErrors (deep nesting)', () => {
  it('flattens deeply nested ext errors with dot-path keys', () => {
    const errors = {
      ext: {
        featured: {
          AT: { message: 'Invalid', type: 'custom' },
        },
      },
    } as unknown as FieldErrors;
    const result = flattenRhfErrors(errors);
    expect(result).toEqual({ 'featured.AT': 'Invalid' });
  });

  it('handles mix of shallow and deep ext errors', () => {
    const errors = {
      ext: {
        brandCode: { message: 'Required', type: 'custom' },
        featured: {
          AT: { message: 'Invalid', type: 'custom' },
          BR: { message: 'Bad value', type: 'custom' },
        },
      },
    } as unknown as FieldErrors;
    const result = flattenRhfErrors(errors);
    expect(result).toEqual({
      brandCode: 'Required',
      'featured.AT': 'Invalid',
      'featured.BR': 'Bad value',
    });
  });
});

// ── buildRewardZodSchema with ext fields ──────────────────────────────────────

describe('buildRewardZodSchema (ext field integration)', () => {
  it('validates required ext field', () => {
    const sd = makeSchemaData({
      extFields: {
        brandCode: makeExtField({ type: 'string', required: true }),
      },
    });
    const schema = buildRewardZodSchema(sd);
    // Missing required ext field should fail
    const result = schema.safeParse({ ...validFormData, ext: {} });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.includes('brandCode'))).toBe(true);
    }
  });

  it('accepts valid required ext field', () => {
    const sd = makeSchemaData({
      extFields: {
        brandCode: makeExtField({ type: 'string', required: true }),
      },
    });
    const schema = buildRewardZodSchema(sd);
    const result = schema.safeParse({ ...validFormData, ext: { brandCode: 'ABC' } });
    expect(result.success).toBe(true);
  });

  it('accepts same effective and expiration date', () => {
    const schema = buildRewardZodSchema(null);
    const result = schema.safeParse({
      ...validFormData,
      effectiveDate: '2026-06-01',
      expirationDate: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });
});

// ── toDateOnly ───────────────────────────────────────────────────────────────

describe('toDateOnly', () => {
  it('slices ISO string to YYYY-MM-DD', () => {
    expect(toDateOnly('2026-03-15T00:00:00.000Z')).toBe('2026-03-15');
  });

  it('returns empty string for undefined', () => {
    expect(toDateOnly(undefined)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(toDateOnly(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(toDateOnly('')).toBe('');
  });

  it('handles numeric timestamp by converting to string first', () => {
    const result = toDateOnly(1234567890);
    expect(result).toBe('1234567890'.slice(0, 10));
  });
});

// ── timeToString ─────────────────────────────────────────────────────────────

describe('timeToString', () => {
  it('formats hours and minutes with zero padding', () => {
    expect(timeToString(9, 5)).toBe('09:05');
  });

  it('formats double-digit hours and minutes', () => {
    expect(timeToString(14, 30)).toBe('14:30');
  });

  it('formats midnight', () => {
    expect(timeToString(0, 0)).toBe('00:00');
  });

  it('formats end of day', () => {
    expect(timeToString(23, 59)).toBe('23:59');
  });
});
