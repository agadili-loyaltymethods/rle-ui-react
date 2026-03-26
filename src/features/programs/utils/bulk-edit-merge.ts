import type { ActivityTemplateConfig } from "../types/activity-template-config";

interface BulkEditUpdate {
  _arrayModes?: Record<string, string>;
  [key: string]: unknown;
}

interface BulkEditPlan {
  /** Fields to apply via multiedit API (replace-mode only, no merge needed). */
  directUpdate: Record<string, unknown>;
  /** Whether any field requires per-template merging. */
  hasMerge: boolean;
}

/**
 * Separate a bulk edit update into direct-set and merge groups
 * based on the _arrayModes metadata.
 */
export function planBulkEdit(update: BulkEditUpdate): BulkEditPlan {
  const { _arrayModes, ...fields } = update;
  const modes = (_arrayModes as Record<string, string>) ?? {};

  const directUpdate: Record<string, unknown> = {};
  const mergeFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (modes[key] === "add") {
      mergeFields[key] = value;
    } else {
      directUpdate[key] = value;
    }
  }

  return {
    directUpdate,
    hasMerge: Object.keys(mergeFields).length > 0,
  };
}

/**
 * Apply bulk edit fields to a single template, handling both replace and
 * add-to-existing (merge) modes. Returns a new template object (deep clone).
 */
export function applyBulkEditToTemplate(
  template: ActivityTemplateConfig,
  update: BulkEditUpdate,
): ActivityTemplateConfig {
  const { _arrayModes, ...fields } = update;
  const modes = (_arrayModes as Record<string, string>) ?? {};

  const directUpdate: Record<string, unknown> = {};
  const mergeFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (modes[key] === "add") {
      mergeFields[key] = value;
    } else {
      directUpdate[key] = value;
    }
  }

  const merged = structuredClone(template);

  // Apply direct (replace) fields
  for (const [key, value] of Object.entries(directUpdate)) {
    if (key === "label" && typeof value === "string") merged.label = value;
    else if (key === "description") merged.description = (value as string) || undefined;
    else if (key === "divisions" && Array.isArray(value)) merged.divisions = value as string[];
    else if (key === "reasonCodes" && Array.isArray(value)) merged.reasonCodes = value as string[];
    else if (key === "extensions" && Array.isArray(value)) merged.extensions = value as typeof template.extensions;
    else if (key === "validationRules" && Array.isArray(value)) merged.validationRules = value as typeof template.validationRules;
  }

  // Apply merge (add-to-existing) fields
  for (const [key, value] of Object.entries(mergeFields)) {
    if (key === "reasonCodes" && Array.isArray(value)) {
      merged.reasonCodes = [...new Set([...template.reasonCodes, ...value])];
    } else if (key === "extensions" && Array.isArray(value)) {
      const existingNames = new Set(template.extensions.map((e) => e.name));
      merged.extensions = [
        ...template.extensions,
        ...(value as typeof template.extensions).filter((e) => !existingNames.has(e.name)),
      ];
    } else if (key === "validationRules" && Array.isArray(value)) {
      const existingIds = new Set(template.validationRules.map((r) => r.id));
      merged.validationRules = [
        ...template.validationRules,
        ...(value as typeof template.validationRules).filter((r) => !existingIds.has(r.id)),
      ];
    }
  }

  return merged;
}
