/**
 * Reward form helpers — types, constants, and pure utility functions shared
 * between RewardFormDrawer and BulkEditDrawer.
 *
 * No React dependencies — pure TypeScript only.
 */

import { z } from 'zod';
import { buildExtZodSchema } from '@/shared/lib/build-ext-zod-schema';
import type {
  WeekAvailability,
  DayAvailability,
  EntitySchemaData,
  TierPolicyLevel,
} from "../types/reward-policy";
import type { RewardCatalogItem } from "../types/reward-policy";
import type { FormTab } from '@/shared/types/ext-field-def';
import { flattenNested, unflattenDotPaths } from '@/shared/lib/dot-path';

export type { FormTab } from '@/shared/types/ext-field-def';

// ── Core tabs ───────────────────────────────────────────────────────────────

export const CORE_TAB_KEYS = ["details", "fulfillment", "limits", "eligibility"] as const;
export type CoreTab = (typeof CORE_TAB_KEYS)[number];

// ── RHF form values ─────────────────────────────────────────────────────────

export interface RewardFormValues {
  name: string;
  desc: string;
  cost: number;
  effectiveDate: string;
  expirationDate: string;
  countLimit: number;
  perDayLimit: number;
  perWeekLimit: number;
  perOfferLimit: number;
  transactionLimit: number;
  coolOffPeriod: number;
  numUses: number;
  canPreview: boolean;
  segments: string[];
  mandatorySegments: string[];
  tierPolicyLevels: TierPolicyLevel[];
  availability: WeekAvailability;
  eligibleChannels: string[];
  divisions: string[];
  redemptionType: string;
  voucherValidValue: number;
  voucherValidUnit: string;
  ffmntType: string;
  ffmntPartner: string;
  ffmntDeliveryMethod: string;
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
  ffmntTierUseDefaults: boolean;
  ffmntTierDurationValue: number;
  ffmntTierDurationUnit: string;
  ext: Record<string, unknown>;
}

export type BulkEditFormValues = Record<string, unknown>;

// ── Time / date helpers ─────────────────────────────────────────────────────

export function toDateOnly(iso: string | number | undefined | null): string {
  return iso ? String(iso).slice(0, 10) : "";
}

export function timeToString(hours: number, mins: number): string {
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function parseTime(val: string): { hours: number; mins: number } {
  const [h, m] = val.split(":").map(Number);
  return { hours: h || 0, mins: m || 0 };
}

// ── Availability constants ──────────────────────────────────────────────────

export const DEFAULT_DAY: DayAvailability = {
  isEnabled: true,
  startHours: 0,
  startMins: 0,
  endHours: 23,
  endMins: 59,
};

export const DEFAULT_AVAILABILITY: WeekAvailability = {
  sunday: DEFAULT_DAY,
  monday: DEFAULT_DAY,
  tuesday: DEFAULT_DAY,
  wednesday: DEFAULT_DAY,
  thursday: DEFAULT_DAY,
  friday: DEFAULT_DAY,
  saturday: DEFAULT_DAY,
};

export const DAY_KEYS: (keyof WeekAvailability)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<keyof WeekAvailability, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

// ── Build form tabs from schema ─────────────────────────────────────────────

export function buildRewardFormTabs(schemaData: EntitySchemaData | null): FormTab[] {
  const tabs: FormTab[] = [
    { key: "details", label: "Details", fields: [], columns: 2 },
    { key: "fulfillment", label: "Fulfillment", fields: [], columns: 1 },
  ];

  if (schemaData?.extFields) {
    const categoryColumns = new Map<string, number>();
    for (const cat of schemaData.categories) {
      categoryColumns.set(cat.name, cat.columns);
    }

    const categoryMap = new Map<
      string,
      { fields: string[]; minOrder: number }
    >();

    const sorted = Object.entries(schemaData.extFields).sort(
      ([, a], [, b]) => a.displayOrder - b.displayOrder,
    );

    for (const [fieldName, def] of sorted) {
      const cat = def.category || "General";
      if (def.isParent) continue;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { fields: [], minOrder: def.displayOrder });
      }
      categoryMap.get(cat)!.fields.push(fieldName);
    }

    const categoryOrder =
      schemaData.categories.length > 0
        ? schemaData.categories.map((c) => c.name)
        : [...categoryMap.keys()].sort((a, b) => {
            const ma = categoryMap.get(a)!.minOrder;
            const mb = categoryMap.get(b)!.minOrder;
            return ma - mb;
          });

    for (const category of categoryOrder) {
      const entry = categoryMap.get(category);
      if (!entry) continue;
      const key = category.toLowerCase().replace(/\s+/g, "-");
      tabs.push({
        key,
        label: category,
        fields: entry.fields,
        columns: categoryColumns.get(category) ?? 2,
      });
    }

    for (const [category, entry] of categoryMap) {
      const key = category.toLowerCase().replace(/\s+/g, "-");
      if (!tabs.some((t) => t.key === key)) {
        tabs.push({
          key,
          label: category,
          fields: entry.fields,
          columns: categoryColumns.get(category) ?? 2,
        });
      }
    }
  }

  tabs.push(
    { key: "limits", label: "Limits", fields: [], columns: 2 },
    { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
  );

  return tabs;
}

// ── Field → tab map ─────────────────────────────────────────────────────────

export function buildFieldTabMap(tabs: FormTab[]): Record<string, string> {
  const map: Record<string, string> = {
    name: "details",
    desc: "details",
    cost: "details",
    effectiveDate: "details",
    expirationDate: "details",
    divisions: "details",
    redemptionType: "fulfillment",
    voucherValidValue: "fulfillment",
    voucherValidUnit: "fulfillment",
    ffmntType: "fulfillment",
    ffmntPartner: "fulfillment",
    ffmntDeliveryMethod: "fulfillment",
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
    ffmntTierUseDefaults: "fulfillment",
    ffmntTierDurationValue: "fulfillment",
    ffmntTierDurationUnit: "fulfillment",
    countLimit: "limits",
    perDayLimit: "limits",
    perWeekLimit: "limits",
    perOfferLimit: "limits",
    transactionLimit: "limits",
    coolOffPeriod: "limits",
    numUses: "limits",
    canPreview: "limits",
    segments: "eligibility",
    mandatorySegments: "eligibility",
    tierPolicyLevels: "eligibility",
    availability: "eligibility",
    eligibleChannels: "eligibility",
  };

  for (const tab of tabs) {
    for (const field of tab.fields) {
      map[field] = tab.key;
    }
  }

  return map;
}

// ── Error helpers ───────────────────────────────────────────────────────────

export function firstTabWithError(
  errors: Record<string, string>,
  fieldTabMap: Record<string, string>,
  tabOrder: string[],
): string | null {
  for (const t of tabOrder) {
    for (const field of Object.keys(errors)) {
      if (fieldTabMap[field] === t) return t;
    }
  }
  return null;
}

export function tabErrorCounts(
  errors: Record<string, string>,
  fieldTabMap: Record<string, string>,
  tabKeys: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const k of tabKeys) counts[k] = 0;
  for (const field of Object.keys(errors)) {
    const t = fieldTabMap[field];
    if (t && counts[t] !== undefined) counts[t]!++;
  }
  return counts;
}

// ── buildRewardDefaultValues ─────────────────────────────────────────────────

export function buildRewardDefaultValues(
  reward: RewardCatalogItem | null,
  schemaData: EntitySchemaData | null,
): RewardFormValues {
  const meta = (reward?.ext as Record<string, unknown>)?._meta as Record<string, unknown> | undefined;
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
    cost: reward?.cost ?? 0,
    effectiveDate: toDateOnly(
      reward?.effectiveDate ?? new Date().toISOString(),
    ),
    expirationDate: toDateOnly(
      reward?.expirationDate ??
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5).toISOString(),
    ),
    countLimit: reward?.countLimit ?? 0,
    perDayLimit: reward?.perDayLimit ?? 0,
    perWeekLimit: reward?.perWeekLimit ?? 0,
    perOfferLimit: reward?.perOfferLimit ?? 0,
    transactionLimit: reward?.transactionLimit ?? 0,
    coolOffPeriod: reward?.coolOffPeriod ?? 0,
    numUses: reward?.numUses ?? 1,
    canPreview: reward?.canPreview ?? true,
    segments: reward?.segments ?? [],
    mandatorySegments: reward?.mandatorySegments ?? [],
    tierPolicyLevels: reward?.tierPolicyLevels ?? [],
    availability: reward?.availability ?? DEFAULT_AVAILABILITY,
    divisions: reward?.divisions ?? [],
    eligibleChannels: (meta?.eligibleChannels as string[]) ?? [],
    redemptionType: (meta?.redemptionType as string) ?? "auto-redeem",
    voucherValidValue: (meta?.voucherValidValue as number) ?? 0,
    voucherValidUnit: (meta?.voucherValidUnit as string) ?? "Days",
    ffmntType: (meta?.ffmntType as string) ?? "Discount",
    ffmntPartner: (meta?.ffmntPartner as string) ?? "",
    ffmntDeliveryMethod: (meta?.ffmntDeliveryMethod as string) ?? "",
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
    ffmntTierUseDefaults: (meta?.ffmntTierUseDefaults as boolean) ?? true,
    ffmntTierDurationValue: (meta?.ffmntTierDurationValue as number) ?? 0,
    ffmntTierDurationUnit: (meta?.ffmntTierDurationUnit as string) ?? "Days",
    ext,
  };
}

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
): z.ZodType<RewardFormValues> {
  const coreShape = {
    name: z.string().min(1, 'Name is required'),
    desc: z.string(),
    cost: z.coerce.number().min(0, 'Must be a non-negative number'),
    effectiveDate: z.string().min(1, 'Effective date is required'),
    expirationDate: z.string().min(1, 'Expiration date is required'),
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
    divisions: z.array(z.string()),
    eligibleChannels: z.array(z.string()),
    redemptionType: z.enum(["auto-redeem", "issue-voucher"]),
    voucherValidValue: z.coerce.number().int().min(0),
    voucherValidUnit: z.string(),
    ffmntType: z.string().min(1, "Fulfillment type is required"),
    ffmntPartner: z.string(),
    ffmntDeliveryMethod: z.string(),
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
    ffmntTierUseDefaults: z.boolean(),
    ffmntTierDurationValue: z.coerce.number().int().min(0),
    ffmntTierDurationUnit: z.string(),
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

      // Conditional fulfillment validation
      if (data.ffmntType === "Points") {
        if (!data.ffmntCurrency) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ffmntCurrency"],
            message: "Currency is required for Points fulfillment",
          });
        }
        if (!data.ffmntPoints || data.ffmntPoints <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ffmntPoints"],
            message: "Points must be greater than 0",
          });
        }
      }
      if (data.ffmntType === "External Fulfillment") {
        if (!data.ffmntPartner) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ffmntPartner"],
            message: "Partner is required for External Fulfillment",
          });
        }
      }
      if (data.ffmntType === "Tier Status") {
        if (!data.ffmntTierPolicy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ffmntTierPolicy"],
            message: "Tier policy is required",
          });
        }
        if (!data.ffmntTierLevel) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ffmntTierLevel"],
            message: "Tier level is required",
          });
        }
      }

      // Conditional redemption validation
      if (data.redemptionType === "issue-voucher") {
        if (!data.voucherValidValue || data.voucherValidValue <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["voucherValidValue"],
            message: "Validity duration is required for vouchers",
          });
        }
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

// ── flattenRhfErrors ─────────────────────────────────────────────────────────

// Re-export from shared — handles nested ext errors (e.g. ext.featured.AT)
export { flattenRhfErrors } from '@/shared/lib/rhf-error-utils';

// ── buildExtFromValues ────────────────────────────────────────────────────────

/**
 * Converts flat ext form values into the nested ext object expected by the API.
 * Handles type coercion (integer, number, boolean, date-time) and cost-field
 * defaults for rewardCostCore → rewardCostPremier / rewardCostAllAccess.
 */
export function buildExtFromValues(
  extValues: Record<string, unknown>,
  sd: EntitySchemaData | null,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  if (sd?.extFields) {
    for (const [fieldName, def] of Object.entries(sd.extFields)) {
      if (def.isParent) continue;
      const val = extValues[fieldName];
      if (def.type === "integer") {
        flat[fieldName] = parseInt(String(val), 10) || 0;
      } else if (def.type === "number") {
        flat[fieldName] = parseFloat(String(val)) || 0;
      } else if (def.type === "boolean") {
        flat[fieldName] = !!val;
      } else if (def.format === "date-time" || def.format === "date") {
        const strVal = String(val ?? "").trim();
        flat[fieldName] = strVal
          ? strVal + (def.format === "date-time" ? "T23:59:59.999Z" : "")
          : "";
      } else {
        flat[fieldName] = typeof val === "string" ? val.trim() : (val ?? "");
      }
    }
  } else {
    for (const [key, val] of Object.entries(extValues)) {
      flat[key] = typeof val === "string" ? val.trim() : val;
    }
  }

  const ext = unflattenDotPaths(flat);
  if (sd?.extFields?.rewardCostCore) {
    const coreVal = (ext.rewardCostCore as number) || 0;
    // Default premier/allAccess from core only if the user left the field blank.
    // Check the raw form value (before coercion) so intentional 0 is preserved.
    const isBlank = (v: unknown) => v === '' || v == null;
    if (isBlank(extValues.rewardCostPremier) && sd.extFields.rewardCostPremier) ext.rewardCostPremier = coreVal;
    if (isBlank(extValues.rewardCostAllAccess) && sd.extFields.rewardCostAllAccess) ext.rewardCostAllAccess = coreVal;
  }
  return ext;
}

// ── buildBulkEditZodSchema ────────────────────────────────────────────────────

/**
 * Schema for BulkEditDrawer — all fields optional since editing is opt-in.
 */
export function buildBulkEditZodSchema(
  schemaData: EntitySchemaData,
): z.ZodObject<z.ZodRawShape> {
  const extSchema = buildExtZodSchema(schemaData.extFields);
  // Flatten ext fields to top level — Controllers register at top level, not under ext
  const extShape: Record<string, z.ZodTypeAny> = Object.fromEntries(
    Object.entries(extSchema.shape).map(
      ([k, v]) => [k, (v as z.ZodTypeAny).optional()]
    )
  );

  return z.object({
    // Details
    desc: z.string().optional(),
    effectiveDate: z.string().optional(),
    expirationDate: z.string().optional(),
    // Limits (mirrors normal edit limits tab)
    countLimit: z.coerce.number().int().min(0).optional(),
    perDayLimit: z.coerce.number().int().min(0).optional(),
    perWeekLimit: z.coerce.number().int().min(0).optional(),
    perOfferLimit: z.coerce.number().int().min(0).optional(),
    transactionLimit: z.coerce.number().int().min(0).optional(),
    coolOffPeriod: z.coerce.number().int().min(0).optional(),
    numUses: z.coerce.number().int().min(1).optional(),
    canPreview: z.boolean().optional(),
    // Eligibility (mirrors normal edit eligibility tab)
    segments: z.array(z.string()).optional(),
    mandatorySegments: z.array(z.string()).optional(),
    tierPolicyLevels: z.array(z.object({ policyId: z.string(), level: z.string() })).optional(),
    availability: availabilitySchema.optional(),
    ...extShape,
  });
}
