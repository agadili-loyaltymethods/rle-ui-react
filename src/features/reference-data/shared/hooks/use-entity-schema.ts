/**
 * Generic hook for fetching any model's schema including extension field
 * definitions, enum values, categories, and bulk-editable field list.
 *
 * Generalized from reward-catalog's useRewardSchema — works with any model
 * that has an ExtensionSchema document.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { useUIStore } from "@/shared/stores/ui-store";
import type {
  ServerEntitySchemaData,
  ExtFieldDef,
  ExtFieldType,
  CategoryDef,
  DbFieldSchema,
  ServerTableConfig,
} from "../types/server-table-types";

interface EnumEntry {
  value: string | number;
  label: string;
}

async function fetchEnumValues(enumType: string): Promise<string[]> {
  const resp = await apiClient.get<EnumEntry[]>("enums", {
    params: {
      query: JSON.stringify({ type: enumType, lang: "en" }),
      sort: "label",
      select: "value,label",
      limit: "0",
    },
  });
  return resp.data.map((e) => String(e.value));
}

async function fetchEntitySchema(
  modelName: string,
  coreEnumTypes?: { field: string; enumType: string }[],
): Promise<Omit<ServerEntitySchemaData, "isLoading" | "error">> {
  // Fetch validation schema and extension schema in parallel
  let extSchemaPartial = false;
  const [validationResp, extSchemaResp] = await Promise.all([
    apiClient.get<Record<string, unknown>>("schema/validation"),
    apiClient
      .get<Record<string, unknown>>("schema/extensionschema")
      .catch(() => {
        extSchemaPartial = true;
        return null;
      }),
  ]);

  const all = validationResp.data;
  const modelBlock = all[modelName] as Record<string, unknown> | undefined;
  if (!modelBlock) {
    // Model not in schema — return empty data
    return {
      extFields: {},
      categories: [],
      coreRequiredFields: new Set(),
      extRequiredFields: new Set<string>(),
      enumFields: {},
      bulkEditableFields: new Set(),
      dbSchema: {},
    };
  }

  // Extract categories from extensionschema response
  const extSchemaAll = extSchemaResp?.data;
  const extSchemaModel = extSchemaAll?.[modelName] as
    | Record<string, unknown>
    | undefined;
  const rawCategories = (extSchemaModel?.categories ?? []) as {
    name: string;
    columns: number;
  }[];
  const categories: CategoryDef[] = rawCategories.map((c) => ({
    name: c.name,
    columns: c.columns ?? 2,
  }));

  const extRequired = new Set<string>();
  const enumFields: Record<string, string[]> = {};

  // Collect enumType references that need to be fetched from /api/enums
  const enumTypesToFetch = new Map<string, string[]>();

  // Extract ext required fields and enum values from extSchema
  const extSchema = modelBlock.extSchema as
    | {
        required?: string[];
        properties?: Record<
          string,
          {
            enum?: string[];
            enumType?: string;
            format?: string;
            default?: unknown;
          }
        >;
      }
    | undefined;

  if (extSchema) {
    if (Array.isArray(extSchema.required)) {
      for (const r of extSchema.required) extRequired.add(r);
    }
    const props = extSchema.properties;
    if (props) {
      for (const [field, def] of Object.entries(props)) {
        if (Array.isArray(def.enum) && def.enum.length > 0) {
          enumFields[field] = def.enum;
        } else if (typeof def.enumType === "string" && def.enumType) {
          const fields = enumTypesToFetch.get(def.enumType) ?? [];
          fields.push(field);
          enumTypesToFetch.set(def.enumType, fields);
        }
      }
    }
  }

  // Extract enum values from dbSchema
  const dbSchema = (modelBlock.dbSchema ?? {}) as Record<string, DbFieldSchema>;

  for (const [field, def] of Object.entries(dbSchema)) {
    if (Array.isArray(def.enum) && def.enum.length > 0) {
      enumFields[field] = def.enum;
    } else if (typeof def.enum === "string" && def.enum) {
      const fields = enumTypesToFetch.get(def.enum) ?? [];
      fields.push(field);
      enumTypesToFetch.set(def.enum, fields);
    }
  }

  // Extract required core fields from dbSchema
  const coreRequiredFields = new Set<string>();
  for (const [field, def] of Object.entries(dbSchema)) {
    if (def.required === true) {
      coreRequiredFields.add(field);
    }
  }

  // Collect bulk-editable fields from dbSchema rcxOpts
  // All fields are bulk-editable by default; fields with
  // rcxOpts.disallowBulkUpdate are excluded.
  const bulkEditableFields = new Set<string>();
  for (const [field, def] of Object.entries(dbSchema)) {
    if (def.rcxOpts?.disallowBulkUpdate) continue;
    bulkEditableFields.add(field);
  }

  // Check extUISchema for enum format references
  const uiSchema = modelBlock.extUISchema as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (uiSchema) {
    for (const [field, def] of Object.entries(uiSchema)) {
      if (enumFields[field]) continue;
      const enumType = def.enumType as string | undefined;
      if (typeof enumType === "string" && enumType) {
        const fields = enumTypesToFetch.get(enumType) ?? [];
        if (!fields.includes(field)) {
          fields.push(field);
          enumTypesToFetch.set(enumType, fields);
        }
      }
    }
  }

  // Add core enum types from config (e.g., timeZone, LocationStatusType)
  if (coreEnumTypes) {
    for (const { field, enumType } of coreEnumTypes) {
      if (enumFields[field]) continue; // Already resolved
      const fields = enumTypesToFetch.get(enumType) ?? [];
      if (!fields.includes(field)) {
        fields.push(field);
        enumTypesToFetch.set(enumType, fields);
      }
    }
  }

  // Fetch all referenced enum types in parallel
  if (enumTypesToFetch.size > 0) {
    const entries = [...enumTypesToFetch.entries()];
    const results = await Promise.all(
      entries.map(([enumType]) =>
        fetchEnumValues(enumType).catch(() => [] as string[]),
      ),
    );
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      const [, fieldNames] = entry;
      const values = results[i];
      if (values && values.length > 0) {
        for (const fieldName of fieldNames) {
          enumFields[fieldName] = values;
        }
      }
    }
  }

  // Build extFields from extUISchema + extSchema fallback
  const extFields: Record<string, ExtFieldDef> = {};
  if (uiSchema) {
    for (const [field, raw] of Object.entries(uiSchema)) {
      const def = raw as Record<string, unknown>;
      extFields[field] = {
        type: ((def.type as string) ?? "string") as ExtFieldType,
        title: (def.title as string) ?? field,
        format: def.format as string | undefined,
        required: extRequired.has(field),
        enum: enumFields[field],
        category: (def.category as string) ?? "",
        displayOrder: parseInt(String(def.displayOrder ?? "999"), 10),
        showInList: (def.showInList as boolean) ?? false,
        searchable: (def.searchable as boolean) ?? false,
        sortable: (def.sortable as boolean) ?? false,
        defaultValue: extSchema?.properties?.[field]?.default,
      };
    }
  }
  // Fall back to extSchema.properties for fields missing from extUISchema
  if (extSchema?.properties) {
    for (const [field, def] of Object.entries(extSchema.properties)) {
      if (!extFields[field]) {
        const d = def as Record<string, unknown>;
        extFields[field] = {
          type: ((d.type as string) ?? "string") as ExtFieldType,
          title: (d.title as string) ?? field,
          format: d.format as string | undefined,
          required: extRequired.has(field),
          enum: enumFields[field],
          category: "",
          displayOrder: 999,
          showInList: false,
          searchable: false,
          sortable: false,
          defaultValue: (def as Record<string, unknown>).default,
        };
      }
    }
  }

  // Post-process: mark parent objects/arrays and dot-path children
  for (const [field, def] of Object.entries(extFields)) {
    if (def.type === "object" || def.type === "array") {
      def.isParent = true;
    }
    const dot = field.indexOf(".");
    if (dot !== -1) {
      def.parentField = field.slice(0, dot);
    }
  }

  return {
    extFields,
    categories,
    coreRequiredFields,
    extRequiredFields: extRequired,
    enumFields,
    bulkEditableFields,
    dbSchema,
    extSchemaPartial,
  };
}

/**
 * Generic hook for fetching a model's extension schema, enum values,
 * categories, and bulk-editable field list from the metaschema API.
 *
 * Cached with infinite staleTime — schema doesn't change during a session.
 * Query key includes org/program so cache invalidates when switching.
 */
export function useEntitySchema(
  modelName: string,
  config?: ServerTableConfig,
): ServerEntitySchemaData {
  const org = useUIStore((s) => s.currentOrg);
  const program = useUIStore((s) => s.currentProgram);

  // Collect enum types referenced by core config fields
  const coreEnumTypes = useMemo(() => {
    if (!config) return undefined;
    const types: { field: string; enumType: string }[] = [];
    const allFields = [...config.coreFormFields, ...config.coreColumns];
    const seen = new Set<string>();
    for (const f of allFields) {
      if (f.enumType && !seen.has(f.field)) {
        seen.add(f.field);
        types.push({ field: f.field, enumType: f.enumType });
      }
    }
    return types.length > 0 ? types : undefined;
  }, [config]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["entity-schema", modelName, org, program, coreEnumTypes],
    queryFn: () => fetchEntitySchema(modelName, coreEnumTypes),
    staleTime: Infinity,
  });

  return useMemo(
    (): ServerEntitySchemaData => ({
      extFields: data?.extFields ?? {},
      categories: data?.categories ?? [],
      coreRequiredFields: data?.coreRequiredFields ?? new Set(),
      extRequiredFields: data?.extRequiredFields ?? new Set(),
      enumFields: data?.enumFields ?? {},
      bulkEditableFields: data?.bulkEditableFields ?? new Set(),
      dbSchema: data?.dbSchema ?? {},
      isLoading,
      error,
      extSchemaPartial: data?.extSchemaPartial,
    }),
    [data, isLoading, error],
  );
}
