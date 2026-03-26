/**
 * Reward catalog domain types.
 *
 * The main entity is `RewardCatalogItem` — the full shape of a reward
 * document as used by the catalog feature. This is distinct from the
 * lighter `RewardPolicy` in `src/shared/types/policy.ts` (which extends
 * EntityBase and is used in purse-policy config).
 */

// ── Category ────────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  name: string;
  color: string;
  createdAt: string;
}

// ── Populated user ref ──────────────────────────────────────────────────────

export interface PopulatedUser {
  _id: string;
  login: string;
  empName?: string;
}

export function getUserDisplayName(
  value: string | PopulatedUser | undefined,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.empName || value.login || value._id;
}

// ── Extension fields ────────────────────────────────────────────────────────

export interface RewardExt extends Record<string, unknown> {
  // General
  configType: string;
  rewardType: string;
  brandCode: string;
  channel: string;
  programCode: string;
  cmsId: string;
  partnerCode: string;
  partnerName: string;
  nameFR: string;
  softEndDate: string;
  sendEmailNotification: boolean;
  hideReward: boolean;
  // Points — dynamic per-tier costs are stored as ext.rewardCost{TierName}
  // fields defined in the ExtensionSchema, NOT hard-coded here.
  // Links
  navigationRewardsURL: string;
  navigationMarketplaceURL: string;
  imageListPageUrlDesktopNormal: string;
  imageListPageUrlDesktopWide: string;
  imageListPageUrlMobileNormal: string;
  imageListPageUrlMobileWide: string;
  displayType: string;
  // Badges
  channelBadge: string;
  premierPlusBadge: string;
  postClaimBadge: string;
  allAccessBadge: string;
  soldOutBadge: string;
}

// ── Sub-document types ──────────────────────────────────────────────────────

export interface TierPolicyLevel {
  policyId: string;
  level: string;
}

export interface ProductQuery {
  isDisabled: boolean;
  isIncluded?: boolean;
  inclusionParams?: string;
  isORQuery: boolean;
  isWildCardSearch: boolean;
  query: string;
}

export interface LocationQuery {
  isIncluded: boolean;
  count: number;
  inclusionParams: string;
  isORQuery: boolean;
  isWildCardSearch: boolean;
  query: string;
}

export interface DayAvailability {
  isEnabled: boolean;
  startHours: number;
  startMins: number;
  endHours: number;
  endMins: number;
}

export interface WeekAvailability {
  sunday: DayAvailability;
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
}

// ── Main entity ─────────────────────────────────────────────────────────────

export interface RewardCatalogItem {
  _id: string;
  name: string;
  desc: string;
  isAppeasement: boolean;
  isNonRefundable: boolean;
  expirationHours: number;
  numUses: number;
  perDayLimit: number;
  perWeekLimit: number;
  perOfferLimit: number;
  countLimit: number;
  redemptions: number;
  availableRedemptions: number;
  effectiveDate: string;
  expirationDate: string;
  activityBasedExpiration: boolean;
  expiryWarningDays: number[];
  expirationSnapTo: string;
  allowItemOverlap: boolean;
  intendedUse: string;
  upc: string;
  priority: number;
  program: string;
  segments: string[];
  mandatorySegments: string[];
  controlGroups: string[];
  canPreview: boolean;
  org: string;
  minPurchaseAmount: number;
  locations: LocationQuery;
  mandatoryProducts: ProductQuery;
  primaryProducts: ProductQuery;
  secondaryProducts: ProductQuery;
  tertiaryProducts: ProductQuery;
  excludedProducts: ProductQuery;
  expiryUnit: string;
  expiryValue: number;
  budget: number;
  budgetUsed: number;
  availableBudget: number;
  discountType: string;
  price: number;
  pricingType: string;
  primaryProductQuantity: number | null;
  primaryProdPricingType: string | null;
  primaryProdDiscValue: number | null;
  primaryProdMaxDisc: number | null;
  secondaryProductQuantity: number | null;
  secondaryProdPricingType: string | null;
  secondaryProdDiscValue: number | null;
  secondaryProdMaxDisc: number | null;
  tertiaryProductQuantity: number | null;
  tertiaryProdPricingType: string | null;
  tertiaryProdDiscValue: number | null;
  tertiaryProdMaxDisc: number | null;
  availability: WeekAvailability;
  upcMapping: string[];
  applicableMemberStatus: string[];
  eligibilityQuery: string;
  transactionLimit: number;
  coolOffPeriod: number;
  tierPolicyLevels: TierPolicyLevel[];
  isLockable: boolean;
  lockSnapTo: string;
  lockValue: number;
  lockUnit: string;
  divisions: string[];
  cost: number;
  singleUse: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | PopulatedUser;
  updatedBy: string | PopulatedUser;
  ext: RewardExt;
  extCategories: string[];
  sortOrder: number;
}

// ── Status helpers ──────────────────────────────────────────────────────────

export type RewardStatus = "active" | "expired" | "future";

export function getRewardStatus(reward: RewardCatalogItem): RewardStatus {
  const now = Date.now();
  const effective = new Date(reward.effectiveDate).getTime();
  const expiration = new Date(reward.expirationDate).getTime();
  if (now < effective) return "future";
  if (now > expiration) return "expired";
  return "active";
}

// ── View mode ───────────────────────────────────────────────────────────────

export type ViewMode = "list" | "grid";

// ── Expiration filter ───────────────────────────────────────────────────────

export type ExpirationSince = "1m" | "3m" | "6m" | "1y" | "all" | "custom";

export interface CustomDateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ── Schema & layout types ──────────────────────────────────────────────────

export type { ExtFieldDef, CategoryDef, EntitySchemaData, TableLayout } from '@/shared/types/ext-field-def';
