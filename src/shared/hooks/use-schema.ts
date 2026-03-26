import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { toFieldLabel } from "@/shared/lib/format-utils";
import type {
  SchemaFieldDef,
  ModelSchemaBlock,
  ValidationSchemaResponse,
  FieldOption,
} from "@/shared/types/schema";

/** Fields that are internal / system-managed and shouldn't appear in user-facing pickers. */
const SYSTEM_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "__v",
  "org",
  "program",
  "targetProgram",
  "memberID",
  "divisions",
  "_internal",
  "oplogTS",
  "currentRule",
  "ruleMatch",
  "bestOffers",
  "mergeIds",
  "originalMemberID",
  "result",
  "ext",
]);

/**
 * Fetches the full validation schema from `/api/schema/validation`.
 * Cached with `staleTime: Infinity` — the Mongoose schema doesn't change during a session.
 */
export function useValidationSchema() {
  return useQuery({
    queryKey: ["schema", "validation"],
    queryFn: async () => {
      const res = await apiClient.get<ValidationSchemaResponse>(
        "schema/validation",
      );
      return res.data;
    },
    staleTime: Infinity,
  });
}

interface UseModelSchemaOptions {
  /** Field names to exclude (defaults to SYSTEM_FIELDS). Pass empty set to include all. */
  exclude?: Set<string>;
  /** Only include fields of these types. */
  includeTypes?: Set<string>;
}

/**
 * Returns the raw field metadata for a single model, filtered by exclusion list and optional type filter.
 */
export function useModelSchema(
  model: string,
  opts?: UseModelSchemaOptions,
) {
  const { data: schema, isLoading } = useValidationSchema();

  const fields = useMemo(() => {
    const block: ModelSchemaBlock | undefined = schema?.[model];
    if (!block) return {};

    const exclude = opts?.exclude ?? SYSTEM_FIELDS;
    const includeTypes = opts?.includeTypes;

    const result: Record<string, SchemaFieldDef> = {};
    for (const [key, def] of Object.entries(block.dbSchema)) {
      if (exclude.has(key)) continue;
      if (includeTypes && !includeTypes.has(def.type)) continue;
      result[key] = def;
    }
    return result;
  }, [schema, model, opts?.exclude, opts?.includeTypes]);

  return { fields, isLoading };
}

/**
 * Recursively flattens a dbSchema into dropdown-ready options.
 * - Simple fields → `Amount` (value: `value`)
 * - Array subdocs → `[lineItems → Item SKU]` (value: `lineItems.itemSKU`)
 */
function flattenDbSchema(
  schema: Record<string, SchemaFieldDef>,
  exclude: Set<string>,
): FieldOption[] {
  const result: FieldOption[] = [];

  for (const [key, def] of Object.entries(schema)) {
    if (exclude.has(key)) continue;

    // Array with subdocument (keyed by "0")
    const subdoc = (def as Record<string, unknown>)["0"];
    if (
      def.type === "array" &&
      subdoc &&
      typeof subdoc === "object" &&
      !Array.isArray(subdoc)
    ) {
      const subFields = subdoc as Record<string, SchemaFieldDef>;
      for (const [subKey, subDef] of Object.entries(subFields)) {
        if (typeof subDef !== "object" || subDef === null) continue;
        const subType = subDef.type;
        if (!subType || subType === "object" || subType === "mixed") continue;
        result.push({
          value: `${key}.${subKey}`,
          label: `[${toFieldLabel(key)} → ${toFieldLabel(subKey)}]`,
          fieldType: subType,
        });
      }
      continue;
    }

    // Simple field — skip opaque containers
    if (
      typeof def.type === "string" &&
      def.type !== "object" &&
      def.type !== "mixed" &&
      def.type !== "array"
    ) {
      result.push({
        value: key,
        label: toFieldLabel(key),
        fieldType: def.type,
      });
    }
  }

  return result;
}

/**
 * Returns dropdown-ready options, a label resolver, and a field name set for a single model.
 * Flattens nested fields: arrays use `[parent → child]`, objects use `parent → child`.
 */
export function useModelFieldOptions(
  model: string,
  opts?: UseModelSchemaOptions,
) {
  const { data: schema, isLoading } = useValidationSchema();

  const options = useMemo<FieldOption[]>(() => {
    const block: ModelSchemaBlock | undefined = schema?.[model];
    if (!block) return [];

    const exclude = opts?.exclude ?? SYSTEM_FIELDS;
    return flattenDbSchema(block.dbSchema, exclude).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [schema, model, opts?.exclude]);

  const getLabel = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return (fieldName: string) => map.get(fieldName) ?? toFieldLabel(fieldName);
  }, [options]);

  const fieldNames = useMemo(
    () => new Set(options.map((o) => o.value)),
    [options],
  );

  return { options, getLabel, fieldNames, isLoading };
}

/** Map JSON Schema type + format to our SchemaFieldType. */
function mapJsonSchemaType(
  type: string | undefined,
  format: string | undefined,
): FieldOption["fieldType"] {
  if (format === "date-time" || format === "date") return "date";
  if (type === "integer") return "number";
  if (type === "string" || type === "number" || type === "boolean") return type;
  return "mixed";
}

/**
 * Ext UI schema entry shape (subset of fields we use).
 * Full entries may have many more properties.
 */
interface ExtUIEntry {
  title?: string;
  type?: string;
  format?: string;
  isParentKey?: boolean;
  noProperties?: boolean;
  nest?: { type?: string };
}

/**
 * Returns dropdown-ready options for a model's org-level extension fields.
 * Uses `extUISchema` as the source (already flattened with dotted keys for nested fields).
 * Filters out parent-only keys and formats nesting with → notation.
 */
export function useModelExtensionFieldOptions(model: string) {
  const { data: schema, isLoading } = useValidationSchema();

  const options = useMemo<FieldOption[]>(() => {
    const block: ModelSchemaBlock | undefined = schema?.[model];
    if (!block) return [];

    const extUISchema = block.extUISchema as Record<string, ExtUIEntry> | null;
    if (!extUISchema) return [];

    const result: FieldOption[] = [];

    for (const [key, ui] of Object.entries(extUISchema)) {
      // Skip parent-only container keys
      if (ui.isParentKey) continue;

      const rawType = ui.type;
      if (!rawType) continue;

      let fieldType: FieldOption["fieldType"];
      let label: string;

      if (rawType === "array") {
        // Simple array — show as [fieldName]
        const itemType = ui.nest?.type;
        fieldType = mapJsonSchemaType(itemType, undefined);
        label = ui.title
          ? `[${ui.title}]`
          : `[${toFieldLabel(key)}]`;
      } else if (key.includes(".")) {
        // Nested field (dotted key like txnCenter.xref)
        fieldType = mapJsonSchemaType(rawType, ui.format);
        const parts = key.split(".");
        label = parts.map(toFieldLabel).join(" → ");
      } else {
        // Simple flat field
        fieldType = mapJsonSchemaType(rawType, ui.format);
        label = ui.title || toFieldLabel(key);
      }

      result.push({ value: key, label, fieldType });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [schema, model]);

  const getLabel = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return (fieldName: string) => map.get(fieldName) ?? toFieldLabel(fieldName);
  }, [options]);

  return { options, getLabel, isLoading };
}
