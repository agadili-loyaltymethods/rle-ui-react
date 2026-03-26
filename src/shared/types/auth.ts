/**
 * Auth types for JWT + OIDC authentication.
 */

export interface LoginRequest {
  username: string;
  password: string;
  locale?: string;
}

export interface LoginResponse {
  token: string;
  version: string;
  build: string;
}

export interface MyAccountResponse {
  id: string;
  login: string;
  email: string;
  division: { _id: string; name: string; permissions: string[] } | null;
  possibleDivisions: { _id: string; name: string }[];
  divisionCheckEnabled: boolean;
  empName?: string;
  empNumber?: string;
  uberFlag?: boolean;
}

export interface OidcSyncRequest {
  idToken: string;
  org: string;
}

export interface AuthUser {
  _id: string;
  login: string;
  email: string;
  org: string;
  roles: string[];
  division?: string;
  possibleDivisions: string[];
  partner?: string;
  oidcUser: boolean;
  empName?: string;
  empNumber?: string;
  departments: string[];
  tokenExpirationTime: number;
  limitsEnabled: boolean;
  divisionCheckEnabled: boolean;
  uberFlag?: boolean;
}

/** Permission for a single entity type (CRUD booleans) */
export interface Permission {
  entity: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

/** Named role containing a set of permissions */
export interface Role {
  _id: string;
  name: string;
  permissions: Permission[];
  org: string;
}

/** Access control list entry */
export interface ACLEntry {
  _id: string;
  user: string;
  role: string;
  org: string;
}
