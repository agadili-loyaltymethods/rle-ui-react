/**
 * Bulk fulfillment tab — extracted from bulk-edit-drawer.tsx.
 * Renders fulfillment type, partner, delivery method, currency, points,
 * expiration, escrow, and tier status fields for bulk editing.
 */

import { useState, type JSX } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Select, type SelectOption } from "@/shared/components/select";
import { BulkField } from "@/shared/components/bulk-field";
import { getMixedValue } from "@/shared/lib/bulk-field-utils";
import type { BulkEditFormValues } from "../../lib/reward-form-helpers";
import type { RewardCatalogItem } from "../../types/reward-policy";

const FULFILLMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "Discount", label: "Discount" },
  { value: "Points", label: "Points" },
  { value: "Tier Status", label: "Tier Status" },
  { value: "External Fulfillment", label: "External Fulfillment" },
];

interface BulkFulfillmentTabProps {
  enabledFields: Set<string>;
  toggleField: (key: string) => void;
  selectedRewards: RewardCatalogItem[];
  partnerOptions: SelectOption[];
  currencyOptions: SelectOption[];
  tierPolicySelectOptions: SelectOption[];
  tierPolicyOpts: Array<{ id: string; name: string; primary?: boolean; levels: Array<{ name: string }> }>;
  filteredSnapToOptions: SelectOption[];
}

export function BulkFulfillmentTab({
  enabledFields,
  toggleField,
  selectedRewards,
  partnerOptions,
  currencyOptions,
  tierPolicySelectOptions,
  tierPolicyOpts,
  filteredSnapToOptions,
}: BulkFulfillmentTabProps): JSX.Element {
  const { control, watch, setValue: setFormValue } = useFormContext<BulkEditFormValues>();
  const [ffmntAdvancedOpen, setFfmntAdvancedOpen] = useState(false);

  const ffmntType = watch("ffmntType") as string | undefined;
  const isPoints = enabledFields.has("ffmntType") && ffmntType === "Points";
  const isExternal = enabledFields.has("ffmntType") && ffmntType === "External Fulfillment";
  const isTierStatus = enabledFields.has("ffmntType") && ffmntType === "Tier Status";

  const ffmntExpirationType = watch("ffmntExpirationType") as string | undefined;
  const expirationEnabled = enabledFields.has("ffmntExpirationType") && ffmntExpirationType !== "None" && ffmntExpirationType !== "" && ffmntExpirationType != null;
  const selectedTierPolicy = watch("ffmntTierPolicy") as string | undefined;
  const policy = selectedTierPolicy ? tierPolicyOpts.find((tp) => tp.id === selectedTierPolicy) : undefined;
  const tierLevelOpts: SelectOption[] = policy
    ? policy.levels.map((l) => ({ value: l.name, label: l.name }))
    : [];

  return (
    <div className="space-y-4">
      {/* Fulfillment Type */}
      <BulkField
        fieldKey="ffmntType"
        enabled={enabledFields.has("ffmntType")}
        mixed={getMixedValue(selectedRewards, "ffmntType", true)}
        onToggle={toggleField}
      >
        <Controller
          control={control}
          name="ffmntType"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-3 block text-[13px] font-medium text-foreground">Fulfillment Type</label>
                <Select
                  value={String(field.value ?? "")}
                  onChange={field.onChange}
                  options={FULFILLMENT_TYPE_OPTIONS}
                  placeholder="Select fulfillment type..."
                  disabled={!enabledFields.has("ffmntType")}
                  testIdPrefix="bulk-ffmnt-type"
                />
              </div>
            </div>
          )}
        />
      </BulkField>

      {/* External Fulfillment fields */}
      {isExternal && (
        <div className="grid grid-cols-2 gap-4">
          <BulkField
            fieldKey="ffmntPartner"
            enabled={enabledFields.has("ffmntPartner")}
            mixed={getMixedValue(selectedRewards, "ffmntPartner", true)}
            onToggle={toggleField}
          >
            <Controller
              control={control}
              name="ffmntPartner"
              render={({ field }) => (
                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">Partner</label>
                  <Select
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    options={partnerOptions}
                    placeholder="Select partner..."
                    disabled={!enabledFields.has("ffmntPartner")}
                    testIdPrefix="bulk-ffmnt-partner"
                  />
                </div>
              )}
            />
          </BulkField>
          <BulkField
            fieldKey="ffmntDeliveryMethod"
            enabled={enabledFields.has("ffmntDeliveryMethod")}
            mixed={getMixedValue(selectedRewards, "ffmntDeliveryMethod", true)}
            onToggle={toggleField}
          >
            <Controller
              control={control}
              name="ffmntDeliveryMethod"
              render={({ field }) => (
                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">Delivery Method</label>
                  <Select
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    options={[
                      { value: "Event-Based", label: "Event-Based" },
                      { value: "Batch", label: "Batch" },
                    ]}
                    placeholder="Select delivery method..."
                    disabled={!enabledFields.has("ffmntDeliveryMethod")}
                    testIdPrefix="bulk-ffmnt-delivery"
                  />
                </div>
              )}
            />
          </BulkField>
        </div>
      )}

      {/* Points fields */}
      {isPoints && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <BulkField
              fieldKey="ffmntCurrency"
              enabled={enabledFields.has("ffmntCurrency")}
              mixed={getMixedValue(selectedRewards, "ffmntCurrency", true)}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="ffmntCurrency"
                render={({ field }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">Currency</label>
                    <Select
                      value={String(field.value ?? "")}
                      onChange={field.onChange}
                      options={currencyOptions}
                      placeholder="Select currency..."
                      disabled={!enabledFields.has("ffmntCurrency")}
                      testIdPrefix="bulk-ffmnt-currency"
                    />
                  </div>
                )}
              />
            </BulkField>
            <BulkField
              fieldKey="ffmntPoints"
              enabled={enabledFields.has("ffmntPoints")}
              mixed={getMixedValue(selectedRewards, "ffmntPoints", true)}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="ffmntPoints"
                render={({ field }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">Points</label>
                    <Input
                      type="number"
                      value={field.value != null ? String(field.value) : ""}
                      onChange={(e) => {
                        const num = e.target.valueAsNumber;
                        field.onChange(Number.isNaN(num) ? "" : num);
                      }}
                      min="0"
                      disabled={!enabledFields.has("ffmntPoints")}
                    />
                  </div>
                )}
              />
            </BulkField>
          </div>

          {/* Advanced Settings — collapsible */}
          <div className="border-t border-border pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 py-2 text-label font-medium text-foreground-muted hover:text-foreground cursor-pointer"
              onClick={() => setFfmntAdvancedOpen((v) => !v)}
              data-testid="bulk-ffmnt-advanced-toggle"
              aria-label="Toggle advanced settings"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  !ffmntAdvancedOpen && "-rotate-90",
                )}
              />
              Advanced Settings
            </button>

            {ffmntAdvancedOpen && (
              <div className="space-y-4 pt-2">
                {/* Expiration Type */}
                <div className="grid grid-cols-2 gap-4">
                  <BulkField
                    fieldKey="ffmntExpirationType"
                    enabled={enabledFields.has("ffmntExpirationType")}
                    mixed={getMixedValue(selectedRewards, "ffmntExpirationType", true)}
                    onToggle={toggleField}
                  >
                    <Controller
                      control={control}
                      name="ffmntExpirationType"
                      render={({ field }) => (
                        <div>
                          <label className="mb-3 block text-[13px] font-medium text-foreground">Expiration Type</label>
                          <Select
                            value={String(field.value ?? "")}
                            onChange={field.onChange}
                            options={[
                              { value: "None", label: "None" },
                              { value: "Custom", label: "Rolling Expiration" },
                            ]}
                            placeholder="None"
                            disabled={!enabledFields.has("ffmntExpirationType")}
                            testIdPrefix="bulk-ffmnt-exp-type"
                          />
                        </div>
                      )}
                    />
                  </BulkField>
                </div>

                {/* Expiration Duration + Snap To — visible when type !== None */}
                {expirationEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <BulkField
                        fieldKey="ffmntExpiryValue"
                        enabled={enabledFields.has("ffmntExpiryValue")}
                        mixed={getMixedValue(selectedRewards, "ffmntExpiryValue", true)}
                        onToggle={toggleField}
                      >
                        <Controller
                          control={control}
                          name="ffmntExpiryValue"
                          render={({ field }) => (
                            <div>
                              <label className="mb-3 block text-[13px] font-medium text-foreground">Expiry Value</label>
                              <Input
                                type="number"
                                value={field.value != null ? String(field.value) : ""}
                                onChange={(e) => {
                                  const num = e.target.valueAsNumber;
                                  field.onChange(Number.isNaN(num) ? "" : num);
                                }}
                                min="0"
                                disabled={!enabledFields.has("ffmntExpiryValue")}
                              />
                            </div>
                          )}
                        />
                      </BulkField>
                      <BulkField
                        fieldKey="ffmntExpiryUnit"
                        enabled={enabledFields.has("ffmntExpiryUnit")}
                        mixed={getMixedValue(selectedRewards, "ffmntExpiryUnit", true)}
                        onToggle={toggleField}
                      >
                        <Controller
                          control={control}
                          name="ffmntExpiryUnit"
                          render={({ field }) => (
                            <div>
                              <label className="mb-3 block text-[13px] font-medium text-foreground">Expiry Unit</label>
                              <Select
                                value={String(field.value ?? "")}
                                onChange={field.onChange}
                                options={[
                                  { value: "Days", label: "Days" },
                                  { value: "Hours", label: "Hours" },
                                  { value: "Months", label: "Months" },
                                  { value: "Years", label: "Years" },
                                ]}
                                disabled={!enabledFields.has("ffmntExpiryUnit")}
                                testIdPrefix="bulk-ffmnt-exp-unit"
                              />
                            </div>
                          )}
                        />
                      </BulkField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <BulkField
                        fieldKey="ffmntExpirationSnapTo"
                        enabled={enabledFields.has("ffmntExpirationSnapTo")}
                        mixed={getMixedValue(selectedRewards, "ffmntExpirationSnapTo", true)}
                        onToggle={toggleField}
                      >
                        <Controller
                          control={control}
                          name="ffmntExpirationSnapTo"
                          render={({ field }) => (
                            <div>
                              <label className="mb-3 block text-[13px] font-medium text-foreground">Expiration Snap To</label>
                              <Select
                                value={String(field.value ?? "")}
                                onChange={field.onChange}
                                options={filteredSnapToOptions}
                                placeholder="None"
                                disabled={!enabledFields.has("ffmntExpirationSnapTo")}
                                testIdPrefix="bulk-ffmnt-exp-snap"
                              />
                            </div>
                          )}
                        />
                      </BulkField>
                    </div>
                  </>
                )}

                {/* Escrow */}
                <div className="grid grid-cols-2 gap-4">
                  <BulkField
                    fieldKey="ffmntEscrowValue"
                    enabled={enabledFields.has("ffmntEscrowValue")}
                    mixed={getMixedValue(selectedRewards, "ffmntEscrowValue", true)}
                    onToggle={toggleField}
                  >
                    <Controller
                      control={control}
                      name="ffmntEscrowValue"
                      render={({ field }) => (
                        <div>
                          <label className="mb-3 block text-[13px] font-medium text-foreground">Escrow Value</label>
                          <Input
                            type="number"
                            value={field.value != null ? String(field.value) : ""}
                            onChange={(e) => {
                              const num = e.target.valueAsNumber;
                              field.onChange(Number.isNaN(num) ? "" : num);
                            }}
                            min="0"
                            disabled={!enabledFields.has("ffmntEscrowValue")}
                          />
                        </div>
                      )}
                    />
                  </BulkField>
                  <BulkField
                    fieldKey="ffmntEscrowUnit"
                    enabled={enabledFields.has("ffmntEscrowUnit")}
                    mixed={getMixedValue(selectedRewards, "ffmntEscrowUnit", true)}
                    onToggle={toggleField}
                  >
                    <Controller
                      control={control}
                      name="ffmntEscrowUnit"
                      render={({ field }) => (
                        <div>
                          <label className="mb-3 block text-[13px] font-medium text-foreground">Escrow Unit</label>
                          <Select
                            value={String(field.value ?? "")}
                            onChange={field.onChange}
                            options={[
                              { value: "None", label: "None" },
                              { value: "Days", label: "Days" },
                              { value: "Hours", label: "Hours" },
                              { value: "Months", label: "Months" },
                              { value: "Years", label: "Years" },
                            ]}
                            disabled={!enabledFields.has("ffmntEscrowUnit")}
                            testIdPrefix="bulk-ffmnt-esc-unit"
                          />
                        </div>
                      )}
                    />
                  </BulkField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <BulkField
                    fieldKey="ffmntEscrowSnapTo"
                    enabled={enabledFields.has("ffmntEscrowSnapTo")}
                    mixed={getMixedValue(selectedRewards, "ffmntEscrowSnapTo", true)}
                    onToggle={toggleField}
                  >
                    <Controller
                      control={control}
                      name="ffmntEscrowSnapTo"
                      render={({ field }) => (
                        <div>
                          <label className="mb-3 block text-[13px] font-medium text-foreground">Escrow Snap To</label>
                          <Select
                            value={String(field.value ?? "")}
                            onChange={field.onChange}
                            options={filteredSnapToOptions}
                            placeholder="None"
                            disabled={!enabledFields.has("ffmntEscrowSnapTo")}
                            testIdPrefix="bulk-ffmnt-esc-snap"
                          />
                        </div>
                      )}
                    />
                  </BulkField>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tier Status fields */}
      {isTierStatus && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <BulkField
              fieldKey="ffmntTierPolicy"
              enabled={enabledFields.has("ffmntTierPolicy")}
              mixed={getMixedValue(selectedRewards, "ffmntTierPolicy", true)}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="ffmntTierPolicy"
                render={({ field }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">Tier Policy</label>
                    <Select
                      value={String(field.value ?? "")}
                      onChange={(val) => {
                        field.onChange(val);
                        setFormValue("ffmntTierLevel", "");
                      }}
                      options={tierPolicySelectOptions}
                      placeholder="Select tier policy..."
                      disabled={!enabledFields.has("ffmntTierPolicy")}
                      testIdPrefix="bulk-ffmnt-tier-policy"
                    />
                  </div>
                )}
              />
            </BulkField>
            <BulkField
              fieldKey="ffmntTierLevel"
              enabled={enabledFields.has("ffmntTierLevel")}
              mixed={getMixedValue(selectedRewards, "ffmntTierLevel", true)}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="ffmntTierLevel"
                render={({ field }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">Tier Level</label>
                    <Select
                      value={String(field.value ?? "")}
                      onChange={field.onChange}
                      options={tierLevelOpts}
                      placeholder="Select tier level..."
                      disabled={!enabledFields.has("ffmntTierLevel")}
                      testIdPrefix="bulk-ffmnt-tier-level"
                    />
                  </div>
                )}
              />
            </BulkField>
          </div>
          <BulkField
            fieldKey="ffmntTierUseDefaults"
            enabled={enabledFields.has("ffmntTierUseDefaults")}
            mixed={getMixedValue(selectedRewards, "ffmntTierUseDefaults", true)}
            onToggle={toggleField}
          >
            <Controller
              control={control}
              name="ffmntTierUseDefaults"
              render={({ field: f }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={!!f.value}
                    onChange={f.onChange}
                    disabled={!enabledFields.has("ffmntTierUseDefaults")}
                  />
                  <span className="text-body-sm text-foreground">Use level defaults for expiration</span>
                </label>
              )}
            />
          </BulkField>
          <div className="grid grid-cols-2 gap-4">
            <BulkField
              fieldKey="ffmntTierDurationValue"
              enabled={enabledFields.has("ffmntTierDurationValue")}
              mixed={getMixedValue(selectedRewards, "ffmntTierDurationValue", true)}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="ffmntTierDurationValue"
                render={({ field }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">Duration</label>
                    <Input
                      type="number"
                      value={field.value != null ? String(field.value) : ""}
                      onChange={(e) => {
                        const num = e.target.valueAsNumber;
                        field.onChange(Number.isNaN(num) ? "" : num);
                      }}
                      min="0"
                      disabled={!enabledFields.has("ffmntTierDurationValue")}
                    />
                  </div>
                )}
              />
            </BulkField>
            <BulkField
              fieldKey="ffmntTierDurationUnit"
              enabled={enabledFields.has("ffmntTierDurationUnit")}
              mixed={getMixedValue(selectedRewards, "ffmntTierDurationUnit", true)}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="ffmntTierDurationUnit"
                render={({ field }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">Duration Unit</label>
                    <Select
                      value={String(field.value ?? "")}
                      onChange={field.onChange}
                      options={[
                        { value: "Days", label: "Days" },
                        { value: "Months", label: "Months" },
                        { value: "Years", label: "Years" },
                      ]}
                      disabled={!enabledFields.has("ffmntTierDurationUnit")}
                      testIdPrefix="bulk-ffmnt-tier-dur-unit"
                    />
                  </div>
                )}
              />
            </BulkField>
          </div>
        </>
      )}
    </div>
  );
}
