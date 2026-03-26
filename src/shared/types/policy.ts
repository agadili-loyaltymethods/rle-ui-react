/**
 * Policy types for loyalty program configuration.
 * Derived from Mongoose schemas in @lm-org/model-defs.
 */

import type { EntityBase } from './api';
import type {
  RuleLocations,
  RuleProducts,
  RuleAvailability,
  TierPolicyLevelGroup,
} from './program';
import type { TierLevel } from './member';

// ---------------------------------------------------------------------------
// RewardPolicy
// ---------------------------------------------------------------------------

export interface ProductUPCGroup {
  productGroup?: string;
  upc: string;
  upcObj?: unknown;
}

export interface RewardPolicy extends EntityBase {
  name: string;
  desc?: string;
  isAppeasement?: boolean;
  isNonRefundable?: boolean;
  expirationHours?: number;
  numUses?: number;
  perDayLimit?: number;
  perWeekLimit?: number;
  perOfferLimit?: number;
  countLimit?: number;
  redemptions?: number;
  availableRedemptions?: number;
  effectiveDate: string;
  expirationDate: string;
  activityBasedExpiration?: boolean;
  expiryWarningDays?: number[];
  expirationSnapTo?: string;
  allowItemOverlap?: boolean;
  /** Discriminator: undefined = Reward, "Offer" = Offer/Benefit, "Global Offer" = Discount */
  intendedUse?: string;
  upc: string;
  priority?: number;
  program: string;
  segments?: string[];
  mandatorySegments?: string[];
  controlGroups?: string[];
  canPreview?: boolean;
  minPurchaseAmount?: number;
  url?: string;
  locations?: RuleLocations;
  mandatoryProducts?: RuleProducts;
  primaryProducts?: RuleProducts;
  secondaryProducts?: RuleProducts;
  tertiaryProducts?: RuleProducts;
  excludedProducts?: RuleProducts;
  expiryUnit?: string;
  expiryValue?: number;
  budget?: number;
  budgetUsed?: number;
  availableBudget?: number;
  discountType: string;
  price?: number;
  maxDiscountValue?: number;
  pricingType?: string;
  mandatoryProductQuantity?: number;
  primaryProductQuantity?: number;
  primaryProdPricingType?: string;
  primaryProdDiscValue?: number;
  primaryProdMaxDisc?: number;
  secondaryProductQuantity?: number;
  secondaryProdPricingType?: string;
  secondaryProdDiscValue?: number;
  secondaryProdMaxDisc?: number;
  tertiaryProductQuantity?: number;
  tertiaryProdPricingType?: string;
  tertiaryProdDiscValue?: number;
  tertiaryProdMaxDisc?: number;
  availability?: RuleAvailability;
  associatedId?: string;
  upcMapping?: ProductUPCGroup[];
  applicableMemberStatus?: string[];
  eligibilityQuery?: string;
  transactionLimit?: number;
  coolOffPeriod?: number;
  tierPolicyLevels?: TierPolicyLevelGroup[];
  isLockable?: boolean;
  lockSnapTo?: string;
  lockValue?: number;
  lockUnit?: string;
  divisions?: string[];
  cost?: number;
  singleUse?: boolean;
}

// ---------------------------------------------------------------------------
// PursePolicy
// ---------------------------------------------------------------------------

export interface PursePolicyColor {
  start?: number;
  end?: number;
  color?: string;
}

export interface PursePolicy extends EntityBase {
  name: string;
  desc?: string;
  expirationHours?: number;
  escrowDays?: number;
  activityBasedExpiration?: boolean;
  colors?: PursePolicyColor[];
  expiryWarningDays?: number[];
  expirationSnapTo?: string;
  escrowSnapTo?: string;
  overdraftLimit?: number;
  primary?: boolean;
  program: string;
  expiryUnit?: string;
  expiryValue?: number;
  escrowUnit?: string;
  escrowValue?: number;
  effectiveDate: string;
  expirationDate: string;
  ptMultiplier?: number;
  divisions?: string[];
  reverseSign?: boolean;
  group?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  periodCloseDate?: string;
  aggregates?: string[];
  periodTimezone?: string;
  enableAutomaticExpiration?: boolean;
  expirationStartDate?: string;
  expirationEndDate?: string;
  frequency?: string;
  repeatInterval?: number;
  expirationType?: string;
  inactiveDays?: number;
}

// ---------------------------------------------------------------------------
// TierPolicy
// ---------------------------------------------------------------------------

export interface TierPolicy extends EntityBase {
  name: string;
  levels: TierLevel[];
  primary?: boolean;
  program: string;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// StreakPolicy & GoalPolicy
// ---------------------------------------------------------------------------

export interface GoalPolicy {
  _id?: string;
  name?: string;
  description?: string;
  timeLimit?: number;
  timeLimitUnit?: string;
  timeLimitValue?: number;
  timeLimitSnap?: string;
  coolOffTime?: number;
  target: number;
  accRule?: string;
  bonusRule?: string;
  expirationPenaltyRule?: string;
}

export interface StreakPolicy extends EntityBase {
  name: string;
  ruleTemplate: string;
  description?: string;
  effectiveDate: string;
  expirationDate?: string;
  timeLimit?: number;
  timeLimitUnit?: string;
  timeLimitValue?: number;
  coolOffTime?: number;
  instanceLimit?: number;
  optinRule?: string;
  accRule?: string;
  evalRule?: string;
  bonusRule?: string;
  progressRule?: string;
  expirationPenaltyRule?: string;
  optoutRule?: string;
  memLevelOverride?: boolean;
  goalPolicies?: GoalPolicy[];
  program: string;
  optinSegments?: string[];
  precision?: number;
  numGoalsNeeded?: number;
  version?: number;
  status?: string;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// AggregatePolicy
// ---------------------------------------------------------------------------

export interface AggregatePolicy extends EntityBase {
  name: string;
  desc?: string;
  aggregateTypes: string[];
  effectiveDate: string;
  expirationDate: string;
  divisions?: string[];
  program: string;
}

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------

export interface Partner extends EntityBase {
  name: string;
  code: string;
  status: string;
  email?: string;
  phone?: string;
  contactFirst?: string;
  contactLast?: string;
  program?: string;
  divisions?: string[];
  partnerType?: string;
  timezone?: string;
  isHostingPartner?: boolean;
}

// ---------------------------------------------------------------------------
// PromoCodeDef & PromoCode
// ---------------------------------------------------------------------------

export interface PromoCodeDef extends EntityBase {
  name: string;
  desc?: string;
  campaignCode: string;
  type: string;
  codeLength?: number;
  codeAlphabet?: string;
  codeCap?: number;
  startDate?: string;
  endDate?: string;
  program: string;
}

export interface PromoCode extends EntityBase {
  code: string;
  defId: string;
  memberId?: string;
  status?: string;
  redemptionDate?: string;
  assignmentDate?: string;
  expirationDate?: string;
}
