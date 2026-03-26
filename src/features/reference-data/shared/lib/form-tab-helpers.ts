/**
 * Utilities for building form tabs from entity config + schema data.
 *
 * Also provides Zod schema builders and RHF error helpers so that all
 * server-table form drawers use React Hook Form + Zod consistently.
 */

import { z } from "zod";
import { buildExtZodSchema } from "@/shared/lib/build-ext-zod-schema";
import { flattenNested } from "@/shared/lib/dot-path";
import type {
  ServerTableConfig,
  ServerEntitySchemaData,
  FormTab,
} from "../types/server-table-types";

/**
 * Build form tabs: one "Details" tab from config core fields,
 * plus one tab per extension schema category.
 */
export function buildFormTabs(
  config: ServerTableConfig,
  schema: ServerEntitySchemaData,
): FormTab[] {
  const tabs: FormTab[] = [];

  // Core "Details" tab from config
  tabs.push({
    key: "details",
    label: "Details",
    fields: config.coreFormFields.map((f) => f.field),
    columns: 2,
  });

  // Extension tabs — one per category
  if (schema.categories.length > 0) {
    for (const cat of schema.categories) {
      const fields: string[] = [];
      const entries = Object.entries(schema.extFields)
        .filter(([, def]) => def.category === cat.name && !def.isParent)
        .sort((a, b) => a[1].displayOrder - b[1].displayOrder);

      for (const [fieldName] of entries) {
        fields.push(fieldName);
      }

      if (fields.length > 0) {
        tabs.push({
          key: cat.name.toLowerCase().replace(/\s+/g, "-"),
          label: cat.name,
          fields,
          columns: cat.columns,
        });
      }
    }
  } else {
    // No categories defined — put all ext fields in a single "Extensions" tab
    const allExtFields = Object.entries(schema.extFields)
      .filter(([, def]) => !def.isParent)
      .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
      .map(([name]) => name);

    if (allExtFields.length > 0) {
      tabs.push({
        key: "extensions",
        label: "Extensions",
        fields: allExtFields,
        columns: 2,
      });
    }
  }

  return tabs;
}

/**
 * Build a map from field name to tab key, for error routing.
 */
export function buildFieldTabMap(tabs: FormTab[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tab of tabs) {
    for (const field of tab.fields) {
      map[field] = tab.key;
    }
  }
  return map;
}

/** Return the first tab key that contains a field with an error, or null. */
export function firstTabWithError(
  fieldTabMap: Record<string, string>,
  errors: Record<string, string>,
): string | null {
  for (const field of Object.keys(errors)) {
    const tab = fieldTabMap[field];
    if (tab) return tab;
  }
  return null;
}

export function tabErrorCounts(
  tabs: FormTab[],
  errors: Record<string, string>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tab of tabs) {
    let count = 0;
    for (const field of tab.fields) {
      if (errors[field]) count++;
    }
    counts[tab.key] = count;
  }
  return counts;
}

// ── RHF + Zod helpers ──────────────────────────────────────────────────────

// Re-export from shared — handles nested ext errors (e.g. ext.featured.AT)
export { flattenRhfErrors } from "@/shared/lib/rhf-error-utils";

/**
 * Build a Zod schema for the entity form from config core fields + extension
 * schema. All fields (core + ext) are at the top level of the schema.
 */
export function buildEntityFormZodSchema(
  config: ServerTableConfig,
  schema: ServerEntitySchemaData,
): z.ZodObject<z.ZodRawShape> {
  const coreShape: Record<string, z.ZodTypeAny> = {};

  for (const def of config.coreFormFields) {
    switch (def.type) {
      case "number":
        coreShape[def.field] = def.required
          ? z.coerce.number({ invalid_type_error: `${def.label} must be a number` })
          : z.coerce.number().optional();
        break;
      case "boolean":
        coreShape[def.field] = z.boolean().optional().default(false);
        break;
      case "enum": {
        const allowed =
          schema.enumFields[def.field] ??
          schema.enumFields[def.enumType ?? ""] ??
          [];
        if (allowed.length > 0) {
          const [first, ...rest] = allowed as [string, ...string[]];
          const enumSchema = z.enum([first, ...rest]);
          coreShape[def.field] = def.required
            ? enumSchema
            : enumSchema.or(z.literal("")).optional();
        } else {
          coreShape[def.field] = def.required
            ? z.string().min(1, `${def.label} is required`)
            : z.string();
        }
        break;
      }
      case "ref-multiselect":
        coreShape[def.field] = z.array(z.string()).optional().default([]);
        break;
      case "ref-select":
        coreShape[def.field] = def.required
          ? z.string().min(1, `${def.label} is required`)
          : z.string().optional().default("");
        break;
      default: // text, textarea, date
        coreShape[def.field] = def.required
          ? z.string().min(1, `${def.label} is required`)
          : z.string();
    }
  }

  const extSchema = buildExtZodSchema(schema.extFields);
  return z.object(coreShape).merge(extSchema);
}

/**
 * Build default form values for an entity (create or edit).
 * Returns a flat record with both core + ext fields at the top level.
 */
export function buildEntityDefaultValues(
  config: ServerTableConfig,
  schema: ServerEntitySchemaData,
  entity: Record<string, unknown> | null,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  // Core fields
  for (const field of config.coreFormFields) {
    const fallback =
      field.type === "ref-multiselect" ? []
        : field.type === "boolean" ? false
          : "";
    values[field.field] = entity
      ? ((entity as Record<string, unknown>)[field.field] ?? fallback)
      : (field.defaultValue ?? fallback);
  }

  // Ext fields (flattened from entity.ext)
  const rawExt = (entity as Record<string, unknown> | null)?.ext;
  const flat =
    rawExt && typeof rawExt === "object"
      ? flattenNested(rawExt as Record<string, unknown>)
      : {};

  for (const [fieldName, def] of Object.entries(schema.extFields)) {
    if (def.isParent) continue;
    values[fieldName] =
      flat[fieldName] ?? def.defaultValue ?? (def.type === "boolean" ? false : "");
  }

  return values;
}
