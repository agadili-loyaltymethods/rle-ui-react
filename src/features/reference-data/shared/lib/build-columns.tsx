/**
 * Build column descriptors from entity config + schema data.
 *
 * Core columns come from config.coreColumns (always shown by default).
 * Extension columns come from schema.extFields where showInList === true.
 */

import type {
  ServerTableConfig,
  ServerEntitySchemaData,
  CoreColumnDef,
  CoreFieldType,
  ExtFieldType,
} from "../types/server-table-types";
import { summarizeNested } from "@/shared/lib/dot-path";

// ── Column descriptor ────────────────────────────────────────────────────────

/** All possible column type values across core and extension fields. */
export type ColumnType = CoreFieldType | ExtFieldType;

interface ColumnDescriptorBase {
  key: string;
  label: string;
  type: ColumnType;
  sortable: boolean;
  /** Whether this column is visible by default */
  defaultVisible: boolean;
  /** Custom cell renderer hint (e.g. "status-badge") */
  cellRenderer?: string;
  /** Whether column filter input is shown (defaults to true) */
  filterable: boolean;
}

interface CoreColumnDescriptor extends ColumnDescriptorBase {
  source: "core";
  /** Dot-path into the entity for core fields */
  corePath: string;
}

interface ExtColumnDescriptor extends ColumnDescriptorBase {
  source: "ext";
  /** Field name inside entity.ext for ext fields */
  extField: string;
}

export type ColumnDescriptor = CoreColumnDescriptor | ExtColumnDescriptor;

// ── Value accessors ──────────────────────────────────────────────────────────

/** Get a nested value from an object using a dot-path key. */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function getColumnValue(
  entity: Record<string, unknown>,
  col: ColumnDescriptor,
): unknown {
  if (col.source === "core") {
    return getNestedValue(entity, col.corePath);
  }
  const ext = entity.ext as Record<string, unknown> | undefined;
  if (!ext) return undefined;
  return getNestedValue(ext, col.extField);
}

export function formatCellValue(value: unknown, type: ColumnType): string {
  if (value == null) return "";
  if (type === "date" || type === "date-time") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "number" || type === "integer")
    return (value as number)?.toLocaleString?.() ?? String(value);
  if (typeof value === "object") return summarizeNested(value);
  return String(value);
}

// ── Builder ──────────────────────────────────────────────────────────────────

export function buildColumns(
  config: ServerTableConfig,
  schema: ServerEntitySchemaData,
): ColumnDescriptor[] {
  const columns: ColumnDescriptor[] = [];

  // Core columns from config
  for (const col of config.coreColumns) {
    columns.push(buildCoreColumn(col));
  }

  // Extension columns from schema (where showInList is true)
  const extEntries = Object.entries(schema.extFields)
    .filter(([, def]) => def.showInList && !def.isParent)
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder);

  for (const [fieldName, def] of extEntries) {
    columns.push({
      key: `ext.${fieldName}`,
      label: def.title || fieldName,
      source: "ext",
      extField: fieldName,
      type: def.type,
      sortable: def.sortable,
      defaultVisible: true,
      filterable: true,
    });
  }

  return columns;
}

function buildCoreColumn(col: CoreColumnDef): ColumnDescriptor {
  return {
    key: col.field,
    label: col.label,
    source: "core",
    corePath: col.field,
    type: col.type,
    sortable: true,
    defaultVisible: col.defaultVisible !== false,
    cellRenderer: col.cellRenderer,
    filterable: col.filterable !== false,
  };
}
