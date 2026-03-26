/**
 * API infrastructure types for express-restify-mongoose endpoints.
 */

/** Base fields added by Mongoose to every document */
export interface EntityBase {
  _id: string;
  org: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** express-restify-mongoose returns arrays for list endpoints */
export type PaginatedResponse<T> = T[];

/** Field-level validation error detail */
export interface ApiFieldError {
  path: string;
  message: string;
}

/** Error response shape from the API */
export interface ApiError {
  name: string;
  message: string;
  statusCode: number;
  /** Backend-specific error code (e.g. 1104 for ACL denial, 2160 for circular dependency). */
  code?: number;
  details?: ApiFieldError[];
}

/** Query parameters supported by express-restify-mongoose */
export interface QueryParams {
  query?: string;
  sort?: string;
  skip?: number;
  limit?: number;
  select?: string;
  populate?: string;
  distinct?: string;
}

export type SortDirection = 'asc' | 'desc';

export type FilterOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$regex'
  | '$exists';
