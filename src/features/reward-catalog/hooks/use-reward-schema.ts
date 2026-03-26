/**
 * Hook for fetching the RewardPolicy schema including extension field
 * definitions, enum values, categories, and bulk-editable field list.
 * Updated: bulk-editable fields now match the normal edit drawer fields.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { useUIStore } from "@/shared/stores/ui-store";
import type {
  EntitySchemaData,
  ExtFieldDef,
  CategoryDef,
} from "../types/reward-policy";

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

async function fetchRewardSchema(): Promise<EntitySchemaData> {
  const warnings: string[] = [];

  // Fetch validation schema and extension schema in parallel
  const [validationResp, extSchemaResp] = await Promise.all([
    apiClient.get<Record<string, unknown>>("schema/validation"),
    apiClient
      .get<Record<string, unknown>>("schema/extensionschema")
      .catch(() => {
        warnings.push("Extension schema could not be loaded; category tabs may be missing.");
        return null;
      }),
  ]);

  const all = validationResp.data;
  const rp = all["RewardPolicy"] as Record<string, unknown> | undefined;
  if (!rp) {
    throw new Error("RewardPolicy not found in schema");
  }

  // Extract categories from extensionschema response
  const extSchemaAll = extSchemaResp?.data;
  const extSchemaRP = extSchemaAll?.["RewardPolicy"] as
    | Record<string, unknown>
    | undefined;
  const rawCategories = (extSchemaRP?.categories ?? []) as {
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
  const extSchema = rp.extSchema as
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
  const dbSchema = rp.dbSchema as
    | Record<string, { enum?: string[] | string }>
    | undefined;
  if (dbSchema) {
    for (const [field, def] of Object.entries(dbSchema)) {
      if (Array.isArray(def.enum) && def.enum.length > 0) {
        enumFields[field] = def.enum;
      } else if (typeof def.enum === "string" && def.enum) {
        const fields = enumTypesToFetch.get(def.enum) ?? [];
        fields.push(field);
        enumTypesToFetch.set(def.enum, fields);
      }
    }
  }

  // Extract required core fields from dbSchema
  const coreRequiredFields = new Set<string>();
  if (dbSchema) {
    for (const [field, def] of Object.entries(dbSchema)) {
      if ((def as Record<string, unknown>).required === true) {
        coreRequiredFields.add(field);
      }
    }
  }

  // Collect bulk-editable core fields from dbSchema rcxOpts.
  // Must match the fields shown in CORE_FIELDS in bulk-edit-drawer.tsx.
  const BULK_EDITABLE_FALLBACK = new Set([
    // Details
    "desc",
    "effectiveDate",
    "expirationDate",
    // Limits
    "countLimit",
    "perDayLimit",
    "perWeekLimit",
    "perOfferLimit",
    "transactionLimit",
    "coolOffPeriod",
    "numUses",
    "canPreview",
    // Eligibility
    "segments",
    "mandatorySegments",
    "tierPolicyLevels",
    "availability",
  ]);
  const bulkEditableFields = new Set<string>();
  if (dbSchema) {
    // First pass: check whether any field defines rcxOpts
    let hasRcxOpts = false;
    for (const def of Object.values(dbSchema)) {
      if ((def as Record<string, unknown>).rcxOpts) {
        hasRcxOpts = true;
        break;
      }
    }

    if (hasRcxOpts) {
      // Start with the known bulk-editable core fields, then let rcxOpts
      // override: fields with disallowBulkUpdate are removed, fields with
      // rcxOpts but no disallowBulkUpdate are added.
      for (const f of BULK_EDITABLE_FALLBACK) bulkEditableFields.add(f);
      for (const [field, def] of Object.entries(dbSchema)) {
        const opts = (def as Record<string, unknown>).rcxOpts as
          | Record<string, unknown>
          | undefined;
        if (opts) {
          if (opts.disallowBulkUpdate) {
            bulkEditableFields.delete(field);
          } else {
            bulkEditableFields.add(field);
          }
        }
      }
    } else {
      // No rcxOpts defined at all — use the hardcoded fallback list
      for (const f of BULK_EDITABLE_FALLBACK) bulkEditableFields.add(f);
    }
  } else {
    for (const f of BULK_EDITABLE_FALLBACK) bulkEditableFields.add(f);
  }

  // Check extUISchema for enum format references
  const uiSchema = rp.extUISchema as
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

  // Fetch all referenced enum types in parallel
  if (enumTypesToFetch.size > 0) {
    const entries = [...enumTypesToFetch.entries()];
    const results = await Promise.all(
      entries.map(([enumType]) =>
        fetchEnumValues(enumType).catch(() => {
          warnings.push(`Enum values for "${enumType}" could not be loaded; affected dropdowns may be empty.`);
          return [] as string[];
        }),
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

  // Build extFields from extUISchema + extSchema fallback titles
  const extFields: Record<string, ExtFieldDef> = {};
  if (uiSchema) {
    for (const [field, raw] of Object.entries(uiSchema)) {
      const def = raw as Record<string, unknown>;
      extFields[field] = {
        type: ((def.type as string) ?? "string") as ExtFieldDef["type"],
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
          type: ((d.type as string) ?? "string") as ExtFieldDef["type"],
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
    extRequiredFields: extRequired,
    coreRequiredFields,
    enumFields,
    extFields,
    categories,
    bulkEditableFields,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Hook wrapping fetchRewardSchema in TanStack Query with infinite staleTime.
 * The query key includes org/program so the cache is invalidated when switching.
 */
export function useRewardSchema() {
  const org = useUIStore((s) => s.currentOrg);
  const program = useUIStore((s) => s.currentProgram);

  return useQuery({
    queryKey: ["reward-schema", org, program],
    queryFn: fetchRewardSchema,
    staleTime: Infinity,
  });
}
