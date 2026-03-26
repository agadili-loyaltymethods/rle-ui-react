/**
 * Bulk limits tab — extracted from bulk-edit-drawer.tsx.
 * Renders inventory, rate limits, usage, and boolean fields for bulk editing.
 */

import { useState, type JSX } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { BulkField } from "@/shared/components/bulk-field";
import { getMixedValue } from "@/shared/lib/bulk-field-utils";
import { BulkCoreField, type CoreFieldDef } from "./bulk-core-field";
import type { BulkEditFormValues } from "../../lib/reward-form-helpers";
import type { RewardCatalogItem, EntitySchemaData } from "../../types/reward-policy";

const LIMITS_FIELDS: CoreFieldDef[] = [
  { key: "countLimit", label: "Starting Inventory", type: "number" },
  { key: "perDayLimit", label: "Per-Day Limit", type: "number" },
  { key: "perWeekLimit", label: "Per-Week Limit", type: "number" },
  { key: "perOfferLimit", label: "Per-Offer Limit", type: "number" },
  { key: "transactionLimit", label: "Per-Transaction Usage Limit", type: "number" },
  { key: "coolOffPeriod", label: "Cool-Off Period (minutes)", type: "number" },
  { key: "numUses", label: "Uses Per Issuance", type: "number" },
  { key: "canPreview", label: "Show in Preview", type: "boolean" },
];

interface BulkLimitsTabProps {
  enabledFields: Set<string>;
  toggleField: (key: string) => void;
  selectedRewards: RewardCatalogItem[];
  schemaData: EntitySchemaData;
  errors: Record<string, string | undefined>;
}

export function BulkLimitsTab({
  enabledFields,
  toggleField,
  selectedRewards,
  schemaData,
  errors,
}: BulkLimitsTabProps): JSX.Element {
  const { watch, setValue: setFormValue } = useFormContext<BulkEditFormValues>();
  const [bulkUnlimitedInventory, setBulkUnlimitedInventory] = useState(false);

  const fields = LIMITS_FIELDS;
  const findField = (key: string) => fields.find((f) => f.key === key);
  const inventoryField = findField("countLimit");
  const rateLimitFields = ["perDayLimit", "perWeekLimit", "perOfferLimit"].map(findField).filter(Boolean) as CoreFieldDef[];
  const coolOffField = findField("coolOffPeriod");
  const usageFields = ["transactionLimit", "numUses"].map(findField).filter(Boolean) as CoreFieldDef[];
  const boolFields = fields.filter((f) => f.type === "boolean");

  const coreProps = { enabledFields, toggleField, selectedRewards, schemaData, errors };

  return (
    <div className="space-y-4">
      {/* Inventory group */}
      {inventoryField && (
        <div className="rounded-lg border border-border bg-page p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="block text-label font-medium text-foreground">Inventory</span>
            <label
              className="flex items-center gap-2 cursor-pointer"
              data-testid="bulk-unlimited-inventory-toggle"
              aria-label="Unlimited inventory"
            >
              <span className="text-caption text-foreground-muted">Unlimited</span>
              <Switch
                checked={bulkUnlimitedInventory}
                onChange={(checked) => {
                  setBulkUnlimitedInventory(checked);
                  if (checked) {
                    setFormValue("countLimit", 0, { shouldDirty: true });
                    if (!enabledFields.has("countLimit")) {
                      toggleField("countLimit");
                    }
                  } else {
                    setFormValue("countLimit", 1, { shouldDirty: true });
                  }
                }}
                disabled={!enabledFields.has("countLimit")}
                data-testid="bulk-unlimited-inventory-switch"
                aria-label="Toggle unlimited inventory"
              />
            </label>
          </div>
          <BulkField
            fieldKey="countLimit"
            enabled={enabledFields.has("countLimit")}
            mixed={getMixedValue(selectedRewards, "countLimit", false)}
            onToggle={(key) => {
              toggleField(key);
              if (!enabledFields.has(key)) {
                setBulkUnlimitedInventory(false);
              }
            }}
          >
            <div>
              <label className="mb-3 block text-label text-foreground-muted">Starting Inventory</label>
              <Input
                type="number"
                name="countLimit"
                value={bulkUnlimitedInventory ? "" : (watch("countLimit") ?? "")}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  setFormValue("countLimit", isNaN(val) ? 0 : val, { shouldDirty: true });
                }}
                min="1"
                disabled={!enabledFields.has("countLimit") || bulkUnlimitedInventory}
                placeholder={bulkUnlimitedInventory ? "\u221E" : undefined}
                error={!!errors.countLimit}
                data-testid="bulk-field-countLimit-input"
                aria-label="Starting inventory"
              />
              {errors.countLimit && (
                <p className="text-caption text-error">{errors.countLimit}</p>
              )}
            </div>
          </BulkField>
        </div>
      )}

      {/* Rate Limits group */}
      {rateLimitFields.length > 0 && (
        <div className="rounded-lg border border-border bg-page p-4 space-y-4">
          <span className="block text-label font-medium text-foreground">Rate Limits</span>
          <div className="grid grid-cols-3 gap-4">
            {rateLimitFields.map((f) => (
              <BulkCoreField key={f.key} field={f} {...coreProps} />
            ))}
          </div>
          {coolOffField && (
            <div className="grid grid-cols-3 gap-4">
              <BulkCoreField field={coolOffField} {...coreProps} />
            </div>
          )}
        </div>
      )}

      {/* Usage group */}
      {usageFields.length > 0 && (
        <div className="rounded-lg border border-border bg-page p-4 space-y-4">
          <span className="block text-label font-medium text-foreground">Usage</span>
          <div className="grid grid-cols-2 gap-4">
            {usageFields.map((f) => (
              <BulkCoreField key={f.key} field={f} {...coreProps} />
            ))}
          </div>
        </div>
      )}

      {boolFields.map((f) => (
        <BulkCoreField key={f.key} field={f} {...coreProps} />
      ))}
    </div>
  );
}
