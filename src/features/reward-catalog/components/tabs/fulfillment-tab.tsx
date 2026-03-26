/**
 * Fulfillment tab — extracted from reward-form-drawer.tsx.
 * Renders fulfillment type, external fulfillment, points fulfillment
 * (with advanced settings), tier status fulfillment, and redemption type.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { FormattedNumberInput } from "@/shared/components/field-renderer";
import { Select, type SelectOption } from "@/shared/components/select";
import type { PursePolicy } from "@/shared/types";
import type { EntitySchemaData } from "@/shared/types/ext-field-def";
import {
  type RewardFormValues,
  flattenRhfErrors,
} from "../../lib/reward-form-helpers";
import type { TierPolicyOption } from "../../hooks/use-reward-eligibility";

// ── Fulfillment constants ────────────────────────────────────────────────────

const FULFILLMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "Discount", label: "Discount" },
  { value: "Points", label: "Points" },
  { value: "Tier Status", label: "Tier Status" },
  { value: "External Fulfillment", label: "External Fulfillment" },
];

const DELIVERY_METHOD_OPTIONS: SelectOption[] = [
  { value: "Event-Based", label: "Event-Based" },
  { value: "Batch", label: "Batch" },
];

const REDEMPTION_TYPE_OPTIONS: SelectOption[] = [
  { value: "auto-redeem", label: "Auto-Redeem (1-step)" },
  { value: "issue-voucher", label: "Issue Voucher (2-step)" },
];

const VOUCHER_UNIT_OPTIONS: SelectOption[] = [
  { value: "Minutes", label: "Minutes" },
  { value: "Hours", label: "Hours" },
  { value: "Days", label: "Days" },
  { value: "Months", label: "Months" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface FulfillmentTabProps {
  partnerOptions: SelectOption[];
  currencyOptions: SelectOption[];
  snapToOptions: SelectOption[];
  tierPolicySelectOptions: SelectOption[];
  tierPolicyOpts: TierPolicyOption[];
  pursePoliciesData: PursePolicy[];
  schemaData: EntitySchemaData | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function FulfillmentTab({
  partnerOptions,
  currencyOptions,
  snapToOptions,
  tierPolicySelectOptions,
  tierPolicyOpts,
  pursePoliciesData,
}: FulfillmentTabProps): React.JSX.Element {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors: rhfErrors },
  } = useFormContext<RewardFormValues>();

  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  // ── Fulfillment-specific watches ────────────────────────────────────────

  const selectedFfmntType = watch("ffmntType");
  const isExternalFfmnt = selectedFfmntType === "External Fulfillment";
  const isPointsFfmnt = selectedFfmntType === "Points";
  const isTierStatusFfmnt = selectedFfmntType === "Tier Status";
  const watchedRedemptionType = watch("redemptionType");
  const selectedFfmntExpirationType = watch("ffmntExpirationType");
  const selectedFfmntCurrency = watch("ffmntCurrency");
  const selectedFfmntTierPolicy = watch("ffmntTierPolicy");
  const ffmntTierUseDefaults = watch("ffmntTierUseDefaults");

  // ── Local state ─────────────────────────────────────────────────────────

  const [ffmntAdvancedOpen, setFfmntAdvancedOpen] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────

  const prevCurrencyRef = useRef<string>("");

  // ── Effects ──────────────────────────────────────────────────────────────

  // Auto-populate expiration/escrow from purse policy each time currency changes
  useEffect(() => {
    if (!isPointsFfmnt || !selectedFfmntCurrency || selectedFfmntCurrency === prevCurrencyRef.current) return;
    prevCurrencyRef.current = selectedFfmntCurrency;
    const pp = pursePoliciesData?.find((p) => p._id === selectedFfmntCurrency);
    if (!pp) return;
    setValue("ffmntExpirationType", pp.expirationType ?? "None");
    setValue("ffmntExpiryValue", pp.expiryValue ?? 0);
    setValue("ffmntExpiryUnit", pp.expiryUnit ?? "Days");
    setValue("ffmntExpirationSnapTo", pp.expirationSnapTo ?? "now");
    setValue("ffmntInactiveDays", pp.inactiveDays ?? 0);
    setValue("ffmntEscrowValue", pp.escrowValue ?? 0);
    setValue("ffmntEscrowUnit", pp.escrowUnit ?? "None");
    setValue("ffmntEscrowSnapTo", pp.escrowSnapTo ?? "now");
  }, [selectedFfmntCurrency, isPointsFfmnt, pursePoliciesData, setValue]);

  // Auto-select first tier policy when switching to Tier Status
  useEffect(() => {
    if (!isTierStatusFfmnt || selectedFfmntTierPolicy || tierPolicyOpts.length === 0) return;
    setValue("ffmntTierPolicy", tierPolicyOpts[0]!.id);
  }, [isTierStatusFfmnt, selectedFfmntTierPolicy, tierPolicyOpts, setValue]);

  // Auto-select second tier level when tier policy changes
  useEffect(() => {
    if (!isTierStatusFfmnt || !selectedFfmntTierPolicy) return;
    const policy = tierPolicyOpts.find((tp) => tp.id === selectedFfmntTierPolicy);
    if (!policy) return;
    const currentLevel = watch("ffmntTierLevel");
    if (currentLevel && policy.levels.some((l) => l.name === currentLevel)) return;
    const autoLevel = policy.levels[1] ?? policy.levels[0];
    if (autoLevel) setValue("ffmntTierLevel", autoLevel.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to policy changes
  }, [isTierStatusFfmnt, selectedFfmntTierPolicy, tierPolicyOpts, setValue]);

  // ── Derived data ────────────────────────────────────────────────────────

  const tierLevelOptions: SelectOption[] = useMemo(() => {
    if (!selectedFfmntTierPolicy) return [];
    const policy = tierPolicyOpts.find((tp) => tp.id === selectedFfmntTierPolicy);
    if (!policy) return [];
    return policy.levels.map((l) => ({ value: l.name, label: l.name }));
  }, [selectedFfmntTierPolicy, tierPolicyOpts]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Fulfillment group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <div>
          <label className="mb-3 block text-label font-medium text-foreground">
            Fulfillment Type<span className="ml-0.5 text-error">*</span>
          </label>
          <Controller
            control={control}
            name="ffmntType"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={FULFILLMENT_TYPE_OPTIONS}
                placeholder="Select fulfillment type..."
                testIdPrefix="ffmnt-type"
              />
            )}
          />
          {errors.ffmntType && (
            <p className="text-caption text-error">
              {errors.ffmntType}
            </p>
          )}
        </div>

      {isExternalFfmnt && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Partner<span className="ml-0.5 text-error">*</span>
            </label>
            <Controller
              control={control}
              name="ffmntPartner"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={partnerOptions}
                  placeholder="Select partner..."
                  testIdPrefix="ffmnt-partner"
                  error={!!errors.ffmntPartner}
                />
              )}
            />
            {errors.ffmntPartner && (
              <p className="text-caption text-error">
                {errors.ffmntPartner}
              </p>
            )}
          </div>

          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Delivery Method
            </label>
            <Controller
              control={control}
              name="ffmntDeliveryMethod"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={DELIVERY_METHOD_OPTIONS}
                  placeholder="Select delivery method..."
                  testIdPrefix="ffmnt-delivery"
                />
              )}
            />
          </div>
        </div>
      )}

      {isPointsFfmnt && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Currency */}
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Currency<span className="ml-0.5 text-error">*</span>
              </label>
              <Controller
                control={control}
                name="ffmntCurrency"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={currencyOptions}
                    placeholder="Select currency..."
                    testIdPrefix="ffmnt-currency"
                    error={!!errors.ffmntCurrency}
                  />
                )}
              />
              {errors.ffmntCurrency && (
                <p className="text-caption text-error">
                  {errors.ffmntCurrency}
                </p>
              )}
            </div>

            {/* Points */}
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Points<span className="ml-0.5 text-error">*</span>
              </label>
              <Input
                type="number"
                {...register("ffmntPoints", { valueAsNumber: true })}
                min="0"
                placeholder="0"
                error={!!errors.ffmntPoints}
              />
              {errors.ffmntPoints && (
                <p className="text-caption text-error">
                  {errors.ffmntPoints}
                </p>
              )}
            </div>
          </div>

          {/* Advanced Settings — collapsible */}
          <div className="border-t border-border pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 py-2 text-label font-medium text-foreground-muted hover:text-foreground cursor-pointer"
              onClick={() => setFfmntAdvancedOpen((v) => !v)}
              data-testid="ffmnt-advanced-toggle"
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
                {/* Expiration Override */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-label font-medium text-foreground">
                      Expiration Override
                    </label>
                    <p className="mb-3 text-caption text-foreground-muted">
                      Choose how awarded points should expire.
                    </p>
                    <Controller
                      control={control}
                      name="ffmntExpirationType"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { value: "None", label: "None" },
                            { value: "Custom", label: "Rolling Expiration" },
                          ]}
                          placeholder="None"
                          testIdPrefix="ffmnt-exp-type"
                        />
                      )}
                    />
                  </div>
                </div>

                {selectedFfmntExpirationType !== "None" && selectedFfmntExpirationType !== "" && (
                  <>
                    {/* Expiration Duration — inline row */}
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">
                        Expiration Duration
                      </label>
                      <p className="mb-3 text-caption text-foreground-muted">
                        Override the purse policy&apos;s rolling expiration for points earned through this reward.
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-body-sm text-foreground-muted whitespace-nowrap">Expire after</span>
                        <Controller
                          name="ffmntExpiryValue"
                          control={control}
                          render={({ field }) => (
                            <FormattedNumberInput
                              placeholder="0"
                              className="w-25"
                              name={field.name}
                              value={field.value as number | undefined}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name="ffmntExpiryUnit"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onChange={field.onChange}
                              options={[
                                { value: "Days", label: "Days" },
                                { value: "Hours", label: "Hours" },
                                { value: "Months", label: "Months" },
                                { value: "Years", label: "Years" },
                              ]}
                              testIdPrefix="ffmnt-exp-unit"
                            />
                          )}
                        />
                      </div>
                    </div>

                    {/* Snap To */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-label font-medium text-foreground">
                          Snap To
                        </label>
                        <p className="mb-3 text-caption text-foreground-muted">
                          Round the expiration to the nearest time boundary.
                        </p>
                        <Controller
                          control={control}
                          name="ffmntExpirationSnapTo"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onChange={field.onChange}
                              options={snapToOptions}
                              placeholder="None"
                              testIdPrefix="ffmnt-exp-snap"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Escrow Duration — inline row */}
                <div>
                  <label className="mb-1.5 block text-label font-medium text-foreground">
                    Escrow Duration
                  </label>
                  <p className="mb-3 text-caption text-foreground-muted">
                    Points are held in escrow before becoming available to the member.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm text-foreground-muted whitespace-nowrap">Hold for</span>
                    <Controller
                      name="ffmntEscrowValue"
                      control={control}
                      render={({ field }) => (
                        <FormattedNumberInput
                          placeholder="0"
                          className="w-25"
                          name={field.name}
                          value={field.value as number | undefined}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="ffmntEscrowUnit"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { value: "None", label: "None" },
                            { value: "Days", label: "Days" },
                            { value: "Hours", label: "Hours" },
                            { value: "Months", label: "Months" },
                            { value: "Years", label: "Years" },
                          ]}
                          testIdPrefix="ffmnt-esc-unit"
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Escrow Snap To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-label font-medium text-foreground">
                      Snap To
                    </label>
                    <p className="mb-3 text-caption text-foreground-muted">
                      Round the escrow release to the nearest time boundary.
                    </p>
                    <Controller
                      control={control}
                      name="ffmntEscrowSnapTo"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          options={snapToOptions}
                          placeholder="None"
                          testIdPrefix="ffmnt-esc-snap"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {isTierStatusFfmnt && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Tier Policy<span className="ml-0.5 text-error">*</span>
              </label>
              <Controller
                control={control}
                name="ffmntTierPolicy"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      setValue("ffmntTierLevel", "");
                    }}
                    options={tierPolicySelectOptions}
                    placeholder="Select tier policy..."
                    testIdPrefix="ffmnt-tier-policy"
                    error={!!errors.ffmntTierPolicy}
                  />
                )}
              />
              {errors.ffmntTierPolicy && (
                <p className="text-caption text-error">
                  {errors.ffmntTierPolicy}
                </p>
              )}
            </div>
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Tier Level<span className="ml-0.5 text-error">*</span>
              </label>
              <Controller
                control={control}
                name="ffmntTierLevel"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={tierLevelOptions}
                    placeholder="Select tier level..."
                    testIdPrefix="ffmnt-tier-level"
                    error={!!errors.ffmntTierLevel}
                  />
                )}
              />
              {errors.ffmntTierLevel && (
                <p className="text-caption text-error">
                  {errors.ffmntTierLevel}
                </p>
              )}
            </div>
          </div>

          <Controller
            control={control}
            name="ffmntTierUseDefaults"
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                />
                <span className="text-body-sm text-foreground">
                  Use level defaults for expiration
                </span>
              </label>
            )}
          />

          <div className={cn(
            "grid grid-cols-2 gap-4",
            ffmntTierUseDefaults && "opacity-40 pointer-events-none",
          )}>
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Duration{!ffmntTierUseDefaults && <span className="ml-0.5 text-error">*</span>}
              </label>
              <Input
                type="number"
                {...register("ffmntTierDurationValue", { valueAsNumber: true })}
                min="0"
                placeholder="0"
                disabled={ffmntTierUseDefaults}
              />
            </div>
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Duration Unit{!ffmntTierUseDefaults && <span className="ml-0.5 text-error">*</span>}
              </label>
              <Controller
                control={control}
                name="ffmntTierDurationUnit"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    disabled={ffmntTierUseDefaults}
                    options={[
                      { value: "Days", label: "Days" },
                      { value: "Months", label: "Months" },
                      { value: "Years", label: "Years" },
                    ]}
                    testIdPrefix="ffmnt-tier-dur-unit"
                  />
                )}
              />
            </div>
          </div>
        </>
      )}
      </div>

      {/* Redemption group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <div>
          <label className="mb-3 block text-label font-medium text-foreground">
            Redemption Type<span className="ml-0.5 text-error">*</span>
          </label>
          <Controller
            control={control}
            name="redemptionType"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={REDEMPTION_TYPE_OPTIONS}
                testIdPrefix="ffmnt-redemption-type"
                error={!!errors.redemptionType}
              />
            )}
          />
          {errors.redemptionType && (
            <p className="text-caption text-error">
              {errors.redemptionType}
            </p>
          )}
        </div>

        {watchedRedemptionType === "issue-voucher" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Valid For<span className="ml-0.5 text-error">*</span>
              </label>
              <Input
                type="number"
                min={0}
                {...register("voucherValidValue", { valueAsNumber: true })}
                data-testid="ffmnt-voucher-valid-value"
                aria-label="Voucher validity duration"
                error={!!errors.voucherValidValue}
              />
              {errors.voucherValidValue && (
                <p className="text-caption text-error">
                  {errors.voucherValidValue}
                </p>
              )}
            </div>
            <div>
              <label className="mb-3 block text-label text-foreground-muted">
                Unit
              </label>
              <Controller
                control={control}
                name="voucherValidUnit"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={VOUCHER_UNIT_OPTIONS}
                    testIdPrefix="ffmnt-voucher-valid-unit"
                  />
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
