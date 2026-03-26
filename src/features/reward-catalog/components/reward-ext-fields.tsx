/**
 * Extension field renderers for reward form drawers.
 *
 * ExtFieldRenderer and isUrlField are re-exported from shared.
 * ExtTabBody is reward-specific (uses reward form state shape via useFormContext).
 */

import { type JSX } from "react";
import { useFormContext } from "react-hook-form";
import type { FormTab, RewardFormValues } from "../lib/reward-form-helpers";
import { flattenRhfErrors } from "../lib/reward-form-helpers";
import type { EntitySchemaData } from "../types/reward-policy";

// Re-export shared ExtFieldRenderer for reward-catalog consumers
export { ExtFieldRenderer, isUrlField } from "@/shared/components/ext-field-renderer";
// Import for local use in ExtTabBody
import { ExtFieldRenderer } from "@/shared/components/ext-field-renderer";

// ── ExtTabBody ──────────────────────────────────────────────────────────────

interface ExtTabBodyProps {
  tab: FormTab;
  schemaData: EntitySchemaData | null;
  onPreviewUrl?: (url: string) => void;
}

export function ExtTabBody({ tab, schemaData, onPreviewUrl }: ExtTabBodyProps): JSX.Element {
  const { watch, setValue, formState: { errors: rhfErrors } } = useFormContext<RewardFormValues>();
  const errors = flattenRhfErrors(rhfErrors);
  const ext = watch("ext") as Record<string, unknown>;

  const getExtValue = (key: string) => ext[key];
  const setExtValue = (key: string, val: unknown) =>
    setValue(`ext.${key}` as keyof RewardFormValues, val as never, { shouldDirty: true });
  const getExtError = (key: string) => errors[key];
  const cols = tab.columns;

  const nonBoolFields: string[] = [];
  const boolFields: string[] = [];
  for (const fieldName of tab.fields) {
    const def = schemaData?.extFields[fieldName];
    if (def?.type === "boolean") {
      boolFields.push(fieldName);
    } else {
      nonBoolFields.push(fieldName);
    }
  }

  const rows: string[][] = [];
  for (let i = 0; i < nonBoolFields.length; i += cols) {
    rows.push(nonBoolFields.slice(i, i + cols));
  }

  const gridClass =
    cols === 3
      ? "grid grid-cols-3 gap-4"
      : cols === 1
        ? "flex flex-col gap-4"
        : "grid grid-cols-2 gap-4";

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => (
        <div key={idx} className={gridClass}>
          {row.map((fieldName) => {
            const def = schemaData?.extFields[fieldName];
            if (!def) return null;
            return (
              <ExtFieldRenderer
                key={fieldName}
                fieldName={fieldName}
                def={def}
                value={getExtValue(fieldName)}
                onChange={(v) => setExtValue(fieldName, v)}
                error={getExtError(fieldName)}
                schemaData={schemaData}
                onPreviewUrl={onPreviewUrl}
              />
            );
          })}
        </div>
      ))}
      {boolFields.length > 0 && (
        <div className={gridClass}>
          {boolFields.map((fieldName) => {
            const def = schemaData?.extFields[fieldName];
            if (!def) return null;
            return (
              <ExtFieldRenderer
                key={fieldName}
                fieldName={fieldName}
                def={def}
                value={getExtValue(fieldName)}
                onChange={(v) => setExtValue(fieldName, v)}
                error={getExtError(fieldName)}
                schemaData={schemaData}
                onPreviewUrl={onPreviewUrl}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
