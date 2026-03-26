/**
 * Bulk details tab — extracted from bulk-edit-drawer.tsx.
 * Renders description and date fields for bulk editing.
 */

import type { JSX } from "react";
import { BulkCoreField, type CoreFieldDef } from "./bulk-core-field";
import type { RewardCatalogItem, EntitySchemaData } from "../../types/reward-policy";

const DETAILS_FIELDS: CoreFieldDef[] = [
  { key: "desc", label: "Description", type: "textarea" },
  { key: "effectiveDate", label: "Effective Date", type: "date" },
  { key: "expirationDate", label: "Expiration Date", type: "date" },
];

interface BulkDetailsTabProps {
  enabledFields: Set<string>;
  toggleField: (key: string) => void;
  selectedRewards: RewardCatalogItem[];
  schemaData: EntitySchemaData;
  errors: Record<string, string | undefined>;
}

export function BulkDetailsTab({
  enabledFields,
  toggleField,
  selectedRewards,
  schemaData,
  errors,
}: BulkDetailsTabProps): JSX.Element {
  const dateFields = DETAILS_FIELDS.filter((f) => f.type === "date");
  const otherFields = DETAILS_FIELDS.filter((f) => f.type !== "date");

  const coreProps = { enabledFields, toggleField, selectedRewards, schemaData, errors };

  return (
    <div className="space-y-4">
      {otherFields
        .filter((f) => f.key === "desc")
        .map((f) => (
          <BulkCoreField key={f.key} field={f} {...coreProps} />
        ))}
      {dateFields.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {dateFields.map((f) => (
            <BulkCoreField key={f.key} field={f} {...coreProps} />
          ))}
        </div>
      )}
      {otherFields
        .filter((f) => f.key !== "desc")
        .map((f) => (
          <BulkCoreField key={f.key} field={f} {...coreProps} />
        ))}
    </div>
  );
}
