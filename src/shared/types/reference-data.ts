/**
 * Reference data entity types.
 * Derived from Mongoose schemas in @lm-org/model-defs.
 */

import type { EntityBase } from './api';

// ---------------------------------------------------------------------------
// Org
// ---------------------------------------------------------------------------

export interface Org extends Omit<EntityBase, 'org'> {
  name: string;
  desc?: string;
  dbUrl?: string;
  allowUserAiSettings?: boolean;
  aiSettings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Segment
// ---------------------------------------------------------------------------

export interface Segment extends EntityBase {
  name: string;
  description?: string;
  type?: string;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export interface GeoPoint {
  type?: string;
  coordinates?: number[];
}

export interface Location extends EntityBase {
  name: string;
  desc?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  timeZone?: string;
  status?: string;
  number?: string;
  geoPoint?: GeoPoint;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface Product extends EntityBase {
  name: string;
  desc?: string;
  cost?: number;
  category?: string;
  internalCode?: string;
  subcategory?: string;
  style?: string;
  effectiveDate?: string;
  expirationDate?: string;
  sku: string;
  upc?: string;
  url?: string;
  divisions?: string[];
}

// ---------------------------------------------------------------------------
// DMA (Designated Market Area)
// ---------------------------------------------------------------------------

export interface DMA extends EntityBase {
  name: string;
  desc?: string;
  zipCodes?: string[];
}

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export interface Enum extends EntityBase {
  type: string;
  lang: string;
  value: unknown;
  data?: unknown;
  valueType: string;
  label: string;
  displayType?: string;
  desc?: string;
  context?: string;
  parVal?: string;
  parType?: string;
  status?: string;
  enumType?: string;
}

// ---------------------------------------------------------------------------
// NamedList & NamedListData
// ---------------------------------------------------------------------------

export interface NamedList extends EntityBase {
  name: string;
  modelType: string;
  type?: string;
  query?: string;
  inclusionParams?: string;
  isORQuery?: boolean;
  isWildCardSearch?: boolean;
  count?: number;
  refreshDate?: string;
  refreshedBy?: string;
  jsonLogicQuery?: string;
}

export interface NamedListData {
  _id: string;
  nameListId: string;
  childFieldId: string;
}

