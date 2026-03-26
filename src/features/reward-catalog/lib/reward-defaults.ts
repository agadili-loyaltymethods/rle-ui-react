/**
 * Factory for creating a default RewardCatalogItem object.
 *
 * Ported from rcx-cowork seed.ts — hardcoded IDs replaced with parameters.
 */

import { generateObjectId } from "@/shared/lib/format-utils";
import type {
  RewardCatalogItem,
  RewardExt,
  WeekAvailability,
  ProductQuery,
  LocationQuery,
} from "../types/reward-policy";

const defaultDay = {
  isEnabled: true,
  startHours: 0,
  startMins: 0,
  endHours: 23,
  endMins: 59,
};

const defaultAvailability: WeekAvailability = {
  sunday: defaultDay,
  monday: defaultDay,
  tuesday: defaultDay,
  wednesday: defaultDay,
  thursday: defaultDay,
  friday: defaultDay,
  saturday: defaultDay,
};

const defaultProductQuery: ProductQuery = {
  isDisabled: true,
  isIncluded: true,
  inclusionParams: "{}",
  isORQuery: false,
  isWildCardSearch: false,
  query: "{}",
};

const bareProductQuery: ProductQuery = {
  isDisabled: true,
  isORQuery: false,
  isWildCardSearch: false,
  query: "{}",
};

const defaultLocation: LocationQuery = {
  isIncluded: true,
  count: 0,
  inclusionParams: "{}",
  isORQuery: false,
  isWildCardSearch: false,
  query: "{}",
};

const defaultExt: RewardExt = {
  configType: "Marketplace Reward",
  rewardType: "",
  brandCode: "ALL",
  channel: "ALL",
  programCode: "",
  cmsId: "",
  partnerCode: "",
  partnerName: "",
  nameFR: "",
  softEndDate: "",
  sendEmailNotification: true,
  hideReward: false,
  rewardCostCore: 0,
  rewardCostPremier: 0,
  rewardCostAllAccess: 0,
  navigationRewardsURL: "",
  navigationMarketplaceURL: "",
  imageListPageUrlDesktopNormal: "",
  imageListPageUrlDesktopWide: "",
  imageListPageUrlMobileNormal: "",
  imageListPageUrlMobileWide: "",
  displayType: "Normal",
  channelBadge: "",
  premierPlusBadge: "",
  postClaimBadge: "",
  allAccessBadge: "",
  soldOutBadge: "",
};

/**
 * Create a new RewardCatalogItem with sensible defaults.
 * Used when the "Add Reward" form opens.
 */
export function createDefaultRewardCatalogItem(
  programId: string,
  orgId: string,
  sortOrder: number,
  intendedUse: string = "Reward",
): RewardCatalogItem {
  const now = new Date().toISOString();
  const farFuture = "2029-12-31T23:59:59.999Z";

  return {
    _id: generateObjectId(),
    name: "",
    desc: "",
    isAppeasement: false,
    isNonRefundable: false,
    expirationHours: 0,
    numUses: 1,
    perDayLimit: 0,
    perWeekLimit: 0,
    perOfferLimit: 0,
    countLimit: 0,
    redemptions: 0,
    availableRedemptions: 1,
    effectiveDate: now,
    expirationDate: farFuture,
    activityBasedExpiration: false,
    expiryWarningDays: [],
    expirationSnapTo: "now",
    allowItemOverlap: false,
    intendedUse,
    upc: "NA",
    priority: 0,
    program: programId,
    segments: [],
    mandatorySegments: [],
    controlGroups: [],
    canPreview: true,
    org: orgId,
    minPurchaseAmount: 0,
    locations: defaultLocation,
    mandatoryProducts: defaultProductQuery,
    primaryProducts: bareProductQuery,
    secondaryProducts: bareProductQuery,
    tertiaryProducts: bareProductQuery,
    excludedProducts: defaultProductQuery,
    expiryUnit: "Hours",
    expiryValue: 0,
    budget: 0,
    budgetUsed: 0,
    availableBudget: 1,
    discountType: "Ticket",
    price: 0,
    pricingType: "Package Percent Off",
    primaryProductQuantity: null,
    primaryProdPricingType: null,
    primaryProdDiscValue: null,
    primaryProdMaxDisc: null,
    secondaryProductQuantity: null,
    secondaryProdPricingType: null,
    secondaryProdDiscValue: null,
    secondaryProdMaxDisc: null,
    tertiaryProductQuantity: null,
    tertiaryProdPricingType: null,
    tertiaryProdDiscValue: null,
    tertiaryProdMaxDisc: null,
    availability: defaultAvailability,
    upcMapping: [],
    applicableMemberStatus: [],
    eligibilityQuery: "",
    transactionLimit: 0,
    coolOffPeriod: 0,
    tierPolicyLevels: [],
    isLockable: false,
    lockSnapTo: "now",
    lockValue: 0,
    lockUnit: "Hours",
    divisions: [],
    cost: 0,
    singleUse: true,
    createdAt: now,
    updatedAt: now,
    createdBy: "",
    updatedBy: "",
    ext: {
      ...defaultExt,
      _meta: {
        subType: "RewardsCatalog",
        redemptionType: "auto-redeem",
        voucherValidValue: 0,
        voucherValidUnit: "Days",
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
      },
    },
    extCategories: [],
    sortOrder,
  };
}
