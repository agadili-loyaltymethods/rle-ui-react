/**
 * Time-series aggregate types.
 * Derived from Mongoose schemas in @lm-org/model-defs.
 */

/** Base fields shared by all aggregate types */
export interface AggregateBase {
  _id: string;
  metricName: string;
  metricAggValue?: number;
  lastAggDate?: string;
  memberId?: string;
  isGlobal?: boolean;
  org: string;
  mergeIds?: string[];
  divisions?: string[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface DailyAggregate extends AggregateBase {
  day?: string;
}

export interface WeeklyAggregate extends AggregateBase {
  week?: number;
  year?: number;
}

export interface MonthlyAggregate extends AggregateBase {
  month?: number;
  year?: number;
}

export interface QuarterlyAggregate extends AggregateBase {
  quarter?: number;
  year?: number;
}

export interface HalfYearlyAggregate extends AggregateBase {
  halfYear?: number;
  year?: number;
}

export interface YearlyAggregate extends AggregateBase {
  year?: number;
}

export interface LifetimeAggregate extends AggregateBase {
  expirationDate?: string;
}

/** Union of all aggregate period types */
export type Aggregate =
  | DailyAggregate
  | WeeklyAggregate
  | MonthlyAggregate
  | QuarterlyAggregate
  | HalfYearlyAggregate
  | YearlyAggregate
  | LifetimeAggregate;
