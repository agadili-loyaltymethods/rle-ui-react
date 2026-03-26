/**
 * Renders a tab of extension fields with grid layout from category columns.
 * Separates boolean fields (rendered as toggles) from other fields.
 */

import { type JSX } from "react";
import { ExtFieldRenderer } from "@/shared/components/ext-field-renderer";
import type {
  ServerEntitySchemaData,
  FormTab,
} from "../types/server-table-types";

export function ExtTabBody({
  tab,
  extValues,
  onExtFieldChange,
  errors,
  schemaData,
  onPreviewUrl,
}: {
  tab: FormTab;
  extValues: Record<string, unknown>;
  onExtFieldChange: (key: string, value: unknown) => void;
  errors: Record<string, string>;
  schemaData: ServerEntitySchemaData;
  onPreviewUrl?: (url: string) => void;
}): JSX.Element {
  const cols = tab.columns;

  const nonBoolFields: string[] = [];
  const boolFields: string[] = [];
  for (const fieldName of tab.fields) {
    const def = schemaData.extFields[fieldName];
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
            const def = schemaData.extFields[fieldName];
            if (!def) return null;
            return (
              <ExtFieldRenderer
                key={fieldName}
                fieldName={fieldName}
                def={def}
                value={extValues[fieldName]}
                onChange={(v) => onExtFieldChange(fieldName, v)}
                error={errors[fieldName]}
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
            const def = schemaData.extFields[fieldName];
            if (!def) return null;
            return (
              <ExtFieldRenderer
                key={fieldName}
                fieldName={fieldName}
                def={def}
                value={extValues[fieldName]}
                onChange={(v) => onExtFieldChange(fieldName, v)}
                error={errors[fieldName]}
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
