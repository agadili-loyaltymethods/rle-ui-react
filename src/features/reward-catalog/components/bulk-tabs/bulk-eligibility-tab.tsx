/**
 * Bulk eligibility tab — extracted from bulk-edit-drawer.tsx.
 * Renders channels, segments, tier levels, and availability for bulk editing.
 */

import type { JSX } from "react";
import type { SelectOption } from "@/shared/components/select";
import { BulkCoreField, type CoreFieldDef } from "./bulk-core-field";
import type { RewardCatalogItem, EntitySchemaData } from "../../types/reward-policy";

const ELIGIBILITY_FIELDS: CoreFieldDef[] = [
  { key: "eligibleChannels", label: "Channels", type: "channels" },
  { key: "segments", label: "Segments", type: "segments" },
  { key: "mandatorySegments", label: "Mandatory Segments", type: "segments" },
  { key: "tierPolicyLevels", label: "Tier Levels", type: "tierLevels" },
  { key: "availability", label: "Availability", type: "availability" },
];

interface BulkEligibilityTabProps {
  enabledFields: Set<string>;
  toggleField: (key: string) => void;
  selectedRewards: RewardCatalogItem[];
  schemaData: EntitySchemaData;
  errors: Record<string, string | undefined>;
  segmentSelectOptions: SelectOption[];
  segmentsLoading: boolean;
  channelSelectOptions: SelectOption[];
  tierPolicyOpts: Array<{ id: string; name: string; primary?: boolean; levels: Array<{ name: string }> }>;
  tiersLoading: boolean;
}

export function BulkEligibilityTab({
  enabledFields,
  toggleField,
  selectedRewards,
  schemaData,
  errors,
  segmentSelectOptions,
  segmentsLoading,
  channelSelectOptions,
  tierPolicyOpts,
  tiersLoading,
}: BulkEligibilityTabProps): JSX.Element {
  const fields = ELIGIBILITY_FIELDS;
  const channelFields = fields.filter((f) => f.type === "channels");
  const segmentFields = fields.filter((f) => f.type === "segments");
  const otherFields = fields.filter((f) => f.type !== "segments" && f.type !== "channels");

  const coreProps = {
    enabledFields,
    toggleField,
    selectedRewards,
    schemaData,
    errors,
    segmentSelectOptions,
    segmentsLoading,
    channelSelectOptions,
    tierPolicyOpts,
    tiersLoading,
  };

  return (
    <div className="space-y-6">
      {/* Channels — full width */}
      {channelFields.map((f) => (
        <BulkCoreField key={f.key} field={f} {...coreProps} />
      ))}
      {/* Segment multi-selects in 2-column grid */}
      {segmentFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segmentFields.map((f) => (
            <BulkCoreField key={f.key} field={f} {...coreProps} />
          ))}
        </div>
      )}
      {/* Tier levels, availability — full width */}
      {otherFields.map((f) => (
        <BulkCoreField key={f.key} field={f} {...coreProps} />
      ))}
    </div>
  );
}
