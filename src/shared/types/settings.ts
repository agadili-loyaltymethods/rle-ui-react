/**
 * Settings and administration entity types.
 * Derived from Mongoose schemas in @lm-org/model-defs.
 */

import type { EntityBase } from './api';

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User extends EntityBase {
  login: string;
  email: string;
  blocked?: boolean;
  active?: boolean;
  uberFlag?: boolean;
  tokenExpirationTime?: number;
  lastAccess?: string;
  sessMgmtFlag?: boolean;
  sessMultiFlag?: boolean;
  limitsEnabled?: boolean;
  oidcUser?: boolean;
  division?: string;
  possibleDivisions?: string[];
  divisionCheckEnabled?: boolean;
  empName?: string;
  empNumber?: string;
  partner?: string;
  departments?: string[];
  aiSettings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Division
// ---------------------------------------------------------------------------

export interface DivisionPermissions {
  read?: boolean;
  update?: boolean;
  create?: boolean;
  delete?: boolean;
}

export interface Division extends EntityBase {
  name: string;
  description?: string;
  isActive?: boolean;
  /** Self-referencing parent for hierarchy */
  parent?: string;
  permissions?: DivisionPermissions;
}

// ---------------------------------------------------------------------------
// ExtensionDef & ExtensionSchema
// ---------------------------------------------------------------------------

export interface ExtensionDef extends EntityBase {
  model: string;
  display?: boolean;
}

export interface ExtensionSchemaCategory {
  _id?: string;
  name: string;
  columns?: number;
}

export interface ExtensionSchema extends EntityBase {
  model: string;
  /** JSON string of the Mongoose-compatible schema definition */
  extSchema: string;
  /** JSON string of UI field definitions */
  uiDef?: string;
  /** Path for enum values used in the extension */
  enumPath?: string;
  categories?: ExtensionSchemaCategory[];
}

// ---------------------------------------------------------------------------
// Limit & LimitSpec
// ---------------------------------------------------------------------------

export interface LimitSpec {
  _id?: string;
  type: string;
  target?: string;
  targetSet?: string;
  name: string;
  value: number;
  scope: string;
  options?: Record<string, unknown>;
  limitType: string;
}

export interface Limit extends EntityBase {
  principalType: 'User' | 'Role';
  principalId: string;
  limitSpec: LimitSpec;
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export interface Job extends EntityBase {
  name: string;
  status?: string;
  params?: unknown[];
  submitTime?: string;
  result?: unknown;
  error?: unknown;
  completionTime?: string;
}
