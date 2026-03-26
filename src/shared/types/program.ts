/**
 * Program configuration and rule entity types.
 * Derived from Mongoose schemas in @lm-org/model-defs.
 */

import type { EntityBase } from './api';

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

export interface ProgramEnrollSettings {
  _id?: string;
  autoEnroll?: boolean;
  maxActivityAge?: number;
  generateEnrollmentBonus?: boolean;
  trashVisibility?: boolean;
  currencyCode?: string;
  defaultUTCOffset?: number;
  activityBasedExpFilter?: string[];
  activityBasedExpFilterJSON?: string;
  enableCardValidation?: boolean;
  cardTypesToValidate?: string[];
  defaultCardType?: string;
  weekStartDay?: string;
  isMultiNational?: boolean;
  shareIds?: boolean;
  isMergeAnActivity?: boolean;
  redemptionOrder?: string;
  accountingTypeOrder?: string;
  restictManualAddsToAppeasements?: boolean;
  checkDuplicateTxn?: boolean;
  mergeConfig?: string;
  gracePeriod?: number;
  effectiveGracePeriod?: number;
  locationOverride?: boolean;
  disOriginalMemIdHisLookup?: boolean;
  overrideSaveOnActivity?: boolean;
  raiseActivityLogEvent?: boolean;
  optimizeActLog?: boolean;
  aggregateOffsetTZ?: string;
  disableEsLogsLookUp?: boolean;
  raiseMetricEventPerInstance?: boolean;
  defaultDivision?: string;
  translateTierNames?: boolean;
}

export interface Program extends EntityBase {
  name: string;
  desc?: string;
  enrollSettings?: ProgramEnrollSettings;
  structureVersion?: number;
  version?: number;
  rules?: string;
  streaks?: string;
  flow?: string;
  lastPublished?: string;
  hasChanges?: boolean;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// Rule sub-types
// ---------------------------------------------------------------------------

export interface RuleLocations {
  isIncluded?: boolean;
  count?: number;
  inclusionParams?: string;
  isORQuery?: boolean;
  isWildCardSearch?: boolean;
  namedList?: string;
  query?: string;
  jsonLogicQuery?: string;
}

export interface RuleProducts {
  isDisabled?: boolean;
  isIncluded?: boolean;
  count?: number;
  inclusionParams?: string;
  isORQuery?: boolean;
  isWildCardSearch?: boolean;
  namedList?: string;
  query?: string;
  jsonLogicQuery?: string;
}

export interface TierPolicyLevelGroup {
  policyId?: string;
  level?: string;
}

export interface AvailabilityDetails {
  isEnabled?: boolean;
  startHours?: number;
  startMins?: number;
  endHours?: number;
  endMins?: number;
}

export interface RuleAvailability {
  sunday?: AvailabilityDetails;
  monday?: AvailabilityDetails;
  tuesday?: AvailabilityDetails;
  wednesday?: AvailabilityDetails;
  thursday?: AvailabilityDetails;
  friday?: AvailabilityDetails;
  saturday?: AvailabilityDetails;
}

// ---------------------------------------------------------------------------
// Condition & Action (embedded in Rule)
// ---------------------------------------------------------------------------

export interface Condition {
  _id?: string;
  name: string;
  desc?: string;
  logicJSON?: string;
}

export interface Action {
  _id?: string;
  name: string;
  desc?: string;
  logicJSON?: string;
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export interface Rule extends EntityBase {
  name: string;
  desc?: string;
  ruleFolder?: string;
  program: string;
  conditions?: Condition[];
  actions?: Action[];
  effectiveFrom: string;
  effectiveTo?: string;
  priority?: number;
  trashed?: boolean;
  segments?: string[];
  mandatorySegments?: string[];
  controlGroups?: string[];
  ruleExecutionType?: string;
  bonusType?: string;
  bonusValue?: number;
  locations?: RuleLocations;
  mandatoryProducts?: RuleProducts;
  mandatoryExpectedQty?: number;
  primaryProducts?: RuleProducts;
  primaryExpectedQty?: number;
  secondaryProducts?: RuleProducts;
  secondaryExpectedQty?: number;
  tertiaryProducts?: RuleProducts;
  tertiaryExpectedQty?: number;
  excludedProducts?: RuleProducts;
  excludedExpectedQty?: number;
  canPreview?: boolean;
  isGateRule?: boolean;
  availability?: RuleAvailability;
  applicableMemberStatus?: string[];
  tierPolicyLevels?: TierPolicyLevelGroup[];
  associatedId?: string;
  addToLog?: boolean;
  perDayLimit?: number;
  perWeekLimit?: number;
  perOfferLimit?: number;
  coolOffPeriod?: number;
  countLimit?: number;
  budget?: number;
  divisions?: string[];
  streakPolicyId?: string;
  goalName?: string;
  streakRuleType?: string;
  maxActivityAge?: number;
}

// ---------------------------------------------------------------------------
// RuleFolder
// ---------------------------------------------------------------------------

export interface RuleFolder extends EntityBase {
  name: string;
  desc?: string;
  program: string;
  parentFolder?: string;
  flow?: boolean;
  priority?: number;
  isTrash?: boolean;
  isStreakFolder?: boolean;
  isPromoFolder?: boolean;
  streakPolicyId?: string;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export interface Flow extends EntityBase {
  name: string;
  desc?: string;
  program: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  /** JointJS/React Flow graph JSON */
  graph?: unknown;
  primary?: boolean;
  /** Compiled logic JSON */
  logic?: unknown;
  isCleaned?: boolean;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// RuleMatch (standalone collection, also used as embedded)
// ---------------------------------------------------------------------------

export interface RuleMatchEntity extends EntityBase {
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

// ---------------------------------------------------------------------------
// RuleLimit
// ---------------------------------------------------------------------------

export interface RuleLimit extends EntityBase {
  rule?: string;
  redemptions?: number;
  availableRedemptions?: number;
  budgetUsed?: number;
  availableBudget?: number;
  program: string;
  effectiveFrom: string;
  effectiveTo?: string;
  canPreview?: boolean;
  trashed?: boolean;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// CustomExpression
// ---------------------------------------------------------------------------

export interface CustomExpression extends EntityBase {
  name: string;
  expr: string;
  alias?: string;
  type?: string;
  path?: string;
  version?: number;
  user: string;
  divisions?: string[];
  program: string;
  isDefault?: boolean;
}

// ---------------------------------------------------------------------------
// CustomData
// ---------------------------------------------------------------------------

export interface CustomData extends EntityBase {
  user: string;
  program?: string;
  name: string;
  type?: string;
  desc?: string;
  private?: boolean;
  data?: string;
  member?: string;
}
