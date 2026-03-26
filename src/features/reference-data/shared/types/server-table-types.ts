/**
 * Server-side table editor types.
 *
 * These types define the configuration interface for per-entity table editors
 * and the schema data returned by useEntitySchema.
 */

import type React from "react";
import type { CoreFieldBase, CoreFieldDef } from "@/shared/types/core-field";
import type { EntitySchemaData } from "@/shared/types/ext-field-def";

export type { CoreFieldType, CoreFieldDef, CoreFieldBase } from "@/shared/types/core-field";
export type { ExtFieldType, ExtFieldDef, CategoryDef, EntitySchemaData, FormTab, TableLayout } from "@/shared/types/ext-field-def";

// ── Column config ────────────────────────────────────────────────────────────

export interface CoreColumnDef extends CoreFieldBase {
  /** Optional fixed column width in pixels */
  width?: number;
  /** Whether the column is visible by default (defaults to true when omitted) */
  defaultVisible?: boolean;
  /** Custom cell renderer hint (e.g. "status-badge") */
  cellRenderer?: string;
  /** Set to false to hide the column filter input (e.g. for computed columns) */
  filterable?: boolean;
}

// ── Table configuration ──────────────────────────────────────────────────────

export interface ServerTableConfig {
  /** Mongoose model name as it appears in the schema API (e.g. "Location") */
  modelName: string;
  /** API endpoint (e.g. "locations") */
  endpoint: string;
  /** Page title displayed in header */
  pageTitle: string;
  /** Singular form of pageTitle for messages (e.g. "Location"). Derived from pageTitle if omitted. */
  singularTitle?: string;
  /** Optional icon shown beside the page title */
  pageIcon?: React.ComponentType<{ className?: string }>;
  /** Prefix for data-testid attributes */
  testIdPrefix: string;
  /** Default sort field (default: "name") */
  defaultSort?: string;
  /** Refs to populate in list queries */
  populate?: string[];
  /** Field selection string passed as the `select` query param.
   *  Use dotted notation (e.g. "userId.login") to restrict populated fields. */
  select?: string;
  /** Core fields to include in global text search ($or regex) */
  searchFields?: string[];
  /** Table columns — extension columns added from schema automatically */
  coreColumns: CoreColumnDef[];
  /** Form fields for the "Details" tab — extension tabs added from schema */
  coreFormFields: CoreFieldDef[];
  /** Fields auto-injected into the create payload (not shown in forms).
   *  Each value can be a static value or a function returning the value. */
  hiddenDefaults?: Record<string, unknown | (() => unknown)>;
}

// ── Extension schema types (returned by useEntitySchema) ─────────────────────

/** Shape of a field entry in the validation schema's dbSchema block. */
export interface DbFieldSchema {
  enum?: string[] | string;
  required?: boolean;
  rcxOpts?: Record<string, unknown>;
}

export interface ServerEntitySchemaData extends EntitySchemaData {
  dbSchema: Record<string, DbFieldSchema>;
  isLoading: boolean;
  error: Error | null;
  /** True when the extension schema endpoint failed — ext fields may be missing */
  extSchemaPartial?: boolean;
}

