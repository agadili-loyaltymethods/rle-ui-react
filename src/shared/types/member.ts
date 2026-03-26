/**
 * Member and all member sub-collection types.
 * Derived from Mongoose schemas in @lm-org/model-defs.
 */

import type { EntityBase } from './api';

// ---------------------------------------------------------------------------
// Embedded sub-document types (no EntityBase)
// ---------------------------------------------------------------------------

export interface LockDetail {
  _id?: string;
  lockTxnId: string;
  lockTill: string;
  lockAct?: string;
  lockedUses: number;
}

export interface LineItem {
  _id?: string;
  type?: string;
  lineNo?: number;
  couponCode?: string;
  coupon?: Record<string, unknown>;
  itemSKU?: string;
  itemPrice?: number;
  itemAmount?: number;
  itemUOM?: string;
  discountAmount?: number;
  quantity?: number;
  productId?: string;
  offerId?: string;
  product?: Record<string, unknown>;
  targetedItems?: number[];
}

export interface TenderItem {
  _id?: string;
  type?: string;
  subType?: string;
  lineNo?: number;
  itemNo?: string;
  value?: number;
}

export interface RuleMatch {
  _id?: string;
  ruleRunId?: string;
  ruleId?: string;
  matchCount?: number;
  primaryLines?: number[] | null;
  primaryQty?: number;
  primaryReqQty?: number;
  primaryAllocation?: number[] | null;
  secondaryLines?: number[] | null;
  secondaryQty?: number;
  secondaryReqQty?: number;
  secondaryAllocation?: number[] | null;
  tertiaryLines?: number[] | null;
  tertiaryQty?: number;
  tertiaryReqQty?: number;
  tertiaryAllocation?: number[] | null;
  ruleFired?: boolean;
  executionCount?: number;
  memberOfferLimit?: number;
}

export interface TierLevel {
  _id?: string;
  name?: string;
  number?: number;
  color?: string;
  defaultLevel?: boolean;
  expirationHours?: number;
  expirationSnapTo?: string;
  expiryWarningDays?: number[];
  expiryUnit?: string;
  expiryValue?: number;
  threshold?: number;
}

export interface Goal {
  _id?: string;
  name: string;
  startedAt?: string;
  changedAt?: string;
  endedAt?: string;
  target?: number;
  status: string;
  value: number;
}

/** Accrual item embedded in a Purse */
export interface AccrualItem {
  _id?: string;
  rule?: string;
  member: string;
  activity?: string;
  purse?: string;
  purseName?: string;
  pursePolicy?: string;
  program?: string;
  accruedPoints?: number;
  burnedPoints?: number;
  availablePoints?: number;
  dtEarned?: string;
  dtExpiresOn?: string;
  dtEscrowsOn?: string;
  hasExpired?: boolean;
  hasEscrowed?: boolean;
  hasBurned?: boolean;
  oplogTS?: number;
  state?: string;
  accountingType?: string;
  packagedRedemption?: string;
  activityUTCOffset?: number;
  executionCount?: number;
  expiryActivityId?: string;
  allowUnmergeUpdate?: boolean;
  org: string;
  mergeIds?: string[];
  divisions?: string[];
  orgAccrualId?: string;
}

/** Redemption item embedded in a Purse */
export interface RedemptionItem {
  _id?: string;
  rule?: string;
  activity?: string;
  accrual?: string;
  member: string;
  purse?: string;
  pursePolicy?: string;
  packagedRedemption?: string;
  points?: number;
  dtBurned?: string;
  state?: string;
  oplogTS?: number;
  activityUTCOffset?: number;
  org: string;
  mergeIds?: string[];
  targetAct?: string;
  awaitingAccrual?: boolean;
  pointsRedeemed?: number;
  accountingType?: string;
  divisions?: string[];
}

/** Escrow item embedded in a Purse */
export interface PurseEscrow {
  date?: string;
  value?: number;
  txnId?: string;
  externalTxnId?: string;
}

/** Locked points embedded in a Purse */
export interface LockedPoint {
  _id?: string;
  activity?: string;
  points?: number;
  lockedDate?: string;
  lockedTillDate?: string;
  tag?: string;
}

// ---------------------------------------------------------------------------
// Top-level member sub-entities (extend EntityBase)
// ---------------------------------------------------------------------------

export interface Activity extends EntityBase {
  type: string;
  date: string;
  utcOffset?: number;
  srcChannelType: string;
  srcChannelID?: string;
  value?: number;
  program?: string;
  targetProgram?: string;
  location?: Record<string, unknown>;
  locationId?: string;
  loyaltyID?: string;
  referralCode?: string;
  referredMember?: boolean;
  memberID?: string;
  couponCode?: string;
  coupon?: Record<string, unknown>;
  currentRule?: Record<string, unknown>;
  partnerCode?: string;
  originalMemberID?: string;
  currencyCode?: string;
  status?: string;
  result?: unknown;
  oplogTS?: number;
  lineItems?: LineItem[];
  tenderItems?: TenderItem[];
  originalTxnId?: string;
  externalTxnId?: string;
  bestOffers?: unknown[];
  ruleMatch?: RuleMatch[];
  partner?: unknown;
  reasonCode?: string;
  subReasonCode?: string;
  data?: unknown;
  mergeIds?: string[];
  _internal?: unknown;
  divisions?: string[];
}

export interface ActivityHistory extends EntityBase {
  type: string;
  date: string;
  utcOffset?: number;
  srcChannelType: string;
  srcChannelID?: string;
  value?: number;
  program?: string;
  targetProgram?: string;
  location?: Record<string, unknown>;
  locationId?: string;
  loyaltyID?: string;
  referralCode?: string;
  referredMember?: boolean;
  memberID?: string;
  couponCode?: string;
  coupon?: Record<string, unknown>;
  partnerCode?: string;
  originalMemberID?: string;
  currencyCode?: string;
  status?: string;
  result?: unknown;
  oplogTS?: number;
  lineItems?: LineItem[];
  tenderItems?: TenderItem[];
  originalTxnId?: string;
  externalTxnId?: string;
  bestOffers?: unknown[];
  ruleMatch?: RuleMatch[];
  partner?: unknown;
  reasonCode?: string;
  subReasonCode?: string;
  data?: unknown;
  mergeIds?: string[];
  _internal?: unknown;
  divisions?: string[];
}

export interface Reward extends EntityBase {
  name: string;
  code?: string;
  desc?: string;
  usesLeft?: number;
  expiresOn?: string;
  effectiveDate?: string;
  redemptionDate?: string;
  redemptionLocalDate?: string;
  activityUTCOffset?: number;
  member: string;
  events?: unknown[];
  url?: string;
  upc?: string;
  type?: string;
  policyId: string;
  rule?: string;
  activity?: string;
  isCancelled?: boolean;
  canPreview?: boolean;
  lockedTill?: string;
  activityBurn?: string;
  activityLock?: string;
  activityUnlock?: string;
  activityCancel?: string;
  mergeIds?: string[];
  issueValue?: number;
  redmValue?: number;
  lockDetails?: LockDetail[];
  divisions?: string[];
}

export interface Offer extends EntityBase {
  name?: string;
  code?: string;
  desc?: string;
  usesLeft?: number;
  timesUsed?: number;
  isGlobal?: boolean;
  expiresOn?: string;
  effectiveDate?: string;
  redemptionDate?: string;
  redemptionLocalDate?: string;
  activityUTCOffset?: number;
  member: string;
  url?: string;
  upc?: string;
  type?: string;
  policyId: string;
  discount?: number;
  rule?: string;
  activity?: string;
  isCancelled?: boolean;
  canPreview?: boolean;
  activityBurn?: string;
  mergeIds?: string[];
  singleUse?: boolean;
  lockDetails?: LockDetail[];
  isLimitReset?: boolean;
  divisions?: string[];
}

export interface Purse {
  _id?: string;
  name: string;
  balance?: number;
  availBalance?: number;
  accruedPoints?: number;
  redeemedPoints?: number;
  escrowsIn?: number;
  primary?: boolean;
  program: string;
  policyId: string;
  expiredPoints?: number;
  accruals?: AccrualItem[];
  redemptions?: RedemptionItem[];
  escrows?: PurseEscrow[];
  expiredAccruals?: string[];
  escrowedAccruals?: string[];
  lastExpirationDate?: string;
  expiryPending?: { date?: string; activityId?: string };
  accrualExpiryPending?: { date?: string; activityId?: string; lastExpirationDate?: string };
  org: string;
  lockedPoints?: LockedPoint[];
  transferPending?: {
    date?: string;
    targetMemberId?: string;
    sourceActId?: string;
    targetActId?: string;
    ruleId?: string;
    points?: number;
    targetMemberPurse?: string;
    divisions?: string[];
  };
}

export interface Tier {
  _id?: string;
  name?: string;
  level: TierLevel;
  achievedOn: string;
  requalsOn?: string;
  primary?: boolean;
  policyId: string;
  program: string;
  lockDate?: string;
  lockedBy?: string;
  activityId?: string;
  prevLevelName?: string;
  reason?: string;
  subReason?: string;
}

export interface Badge {
  _id?: string;
  name: string;
  achievedOn: string;
}

export interface Streak {
  _id?: string;
  startedAt?: string;
  changedAt?: string;
  endedAt?: string;
  status: string;
  value: number;
  currGoal?: string;
  goals?: Goal[];
  ctlGroup?: string;
  policyId?: string;
}

export interface LoyaltyID extends EntityBase {
  name: string;
  loyaltyId: string;
  status?: string;
  memberId: string;
  primary?: boolean;
  accrueTo?: string;
}

export interface MemberSegment extends EntityBase {
  member: string;
  segment: string;
  isCancelled?: boolean;
  divisions?: string[];
}

export interface Preference extends EntityBase {
  name: string;
  value: unknown;
  type?: string;
  inferred?: boolean;
  expirationDate?: string;
  optedInDate: string;
  category: string;
}

export interface MemberPreference extends EntityBase {
  memberId: string;
  name: string;
  value: unknown;
  type?: string;
  inferred?: boolean;
  expirationDate?: string;
  optedInDate: string;
  category: string;
  isCancelled?: boolean;
}

export interface Note extends EntityBase {
  note: string;
  memberId: string;
  mergeIds?: string[];
}

export interface Referral extends EntityBase {
  code: string;
  expirationDate: string;
  status: 'pending' | 'completed';
  referrer: string;
  referredMemberId?: string;
  referredMemberName: string;
  referredMemberContact?: string;
  referredMemberHandle?: string;
  completionDate?: string;
  events?: unknown[];
  mergeIds?: string[];
}

export interface AccountMemberEntry {
  member: string;
  program: string;
}

export interface Account extends EntityBase {
  members?: AccountMemberEntry[];
  activeMember?: string;
}

// ---------------------------------------------------------------------------
// History types
// ---------------------------------------------------------------------------

export interface TierHistory extends EntityBase {
  tier: string;
  date?: string;
  newTierLevel?: string;
  oldTierLevel?: string;
  eventId?: string;
  memberId: string;
  requalsOn?: string;
  lockDate?: string;
  lockedBy?: string;
  reason?: string;
  activityId?: string;
  subReason?: string;
  divisions?: string[];
}

export interface PurseHistory extends EntityBase {
  name: string;
  balance?: number;
  availBalance?: number;
  accruedPoints?: number;
  redeemedPoints?: number;
  escrowsIn?: number;
  primary?: boolean;
  program: string;
  policyId: string;
  expiredPoints?: number;
  lastExpirationDate?: string;
  memberId: string;
  mergeIds?: string[];
  divisions?: string[];
}

export interface StreakHistory extends EntityBase {
  startedAt?: string;
  changedAt?: string;
  endedAt?: string;
  status: string;
  value: number;
  currGoal?: string;
  goals?: Goal[];
  ctlGroup?: string;
  policyId?: string;
  memberId: string;
  mergeIds?: string[];
  divisions?: string[];
}

export interface MergeHistory extends EntityBase {
  survivorId: string;
  victimId: string;
  mergeReqDate?: string;
  mergeCompletionDate?: string;
  unmergeReqDate?: string;
  unmergeCompletionDate?: string;
  extMergeId?: string;
  mergeId: string;
  mergeStatus?: string;
  unMergeStatus?: string;
}

export interface OfferUsageHistory extends EntityBase {
  date?: string;
  localDate?: string;
  timesUsed?: number;
  eventId?: string;
  offer: string;
  rule: string;
  activity: string;
  member: string;
  activityUTCOffset?: number;
  mergeIds?: string[];
  divisions?: string[];
}

export interface RewardUsageHistory extends EntityBase {
  date?: string;
  timesUsed?: number;
  eventId?: string;
  reward: string;
  rule: string;
  activity: string;
  member: string;
  activityUTCOffset?: number;
  mergeIds?: string[];
  issueValue?: number;
  redmValue?: number;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// Member (top-level entity)
// ---------------------------------------------------------------------------

export interface Member extends EntityBase {
  enrollDate: string;
  enrollChannel: string;
  referralCode?: string;
  enrollSource?: string;
  enrollIncentive?: string;
  enrollLocation?: string;
  status: string;
  program: string;
  type: string;

  // Customer identity fields
  firstName?: string;
  lastName?: string;
  acquisitionDate?: string;
  acquisitionChannel: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string;
  cellPhone?: string;
  zipCode?: string;
  socialId?: string;

  // Flags
  canPreview?: boolean;
  mergePendingFlag?: boolean;
  unMergePendingFlag?: boolean;
  synchronousMergeFlag?: boolean;
  lastActivityDate?: string;
  structureVersion?: number;

  // Embedded sub-collections
  tiers?: Tier[];
  badges?: Badge[];
  purses?: Purse[];
  streaks?: Streak[];

  // Divisions
  divisions?: string[];

  // Extension data (added by ExtensionSchema)
  ext?: Record<string, unknown>;
}
