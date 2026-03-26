/**
 * Bulk edit drawer — allows editing multiple reward policies at once.
 *
 * Fields are opt-in: users enable each field with a checkbox before the value
 * is included in the update. Mixed-value indicators show when selected rewards
 * have different values for a field.
 */

import { useState, useEffect, useMemo, useCallback, type JSX } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/cn";
import { DrawerShell } from "@/shared/components/drawer-shell";
import { Button } from "@/shared/ui/button";
import type { SelectOption } from "@/shared/components/select";
import { useEntityList } from "@/shared/hooks/use-api";
import { useEnumOptions } from "@/shared/hooks/use-enums";
import type { PursePolicy } from "@/shared/types";
import {
  buildRewardFormTabs,
  type FormTab,
  type BulkEditFormValues,
  buildBulkEditZodSchema,
  flattenRhfErrors,
} from "../lib/reward-form-helpers";
import { getMixedValue } from "@/shared/lib/bulk-field-utils";
import { BulkField } from "@/shared/components/bulk-field";
import { ExtFieldRenderer } from "@/shared/components/ext-field-renderer";
import {
  useSegmentOptions,
  useTierPolicyOptions,
} from "../hooks/use-reward-eligibility";
import type {
  RewardCatalogItem,
  EntitySchemaData,
  ExtFieldDef,
} from "../types/reward-policy";
import type { ApiFieldError } from "@/shared/types/api";
import { BulkDetailsTab } from "./bulk-tabs/bulk-details-tab";
import { BulkFulfillmentTab } from "./bulk-tabs/bulk-fulfillment-tab";
import { BulkLimitsTab } from "./bulk-tabs/bulk-limits-tab";
import { BulkEligibilityTab } from "./bulk-tabs/bulk-eligibility-tab";

// ── Props ───────────────────────────────────────────────────────────────────

interface BulkEditDrawerProps {
  open: boolean;
  selectedIds: Set<string>;
  rewards: RewardCatalogItem[];
  schemaData: EntitySchemaData;
  onSave: (update: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

// ── Core fields by tab (used for field→tab mapping) ─────────────────────────

const CORE_FIELDS: Record<string, { key: string }[]> = {
  details: [
    { key: "desc" },
    { key: "effectiveDate" },
    { key: "expirationDate" },
  ],
  limits: [
    { key: "countLimit" },
    { key: "perDayLimit" },
    { key: "perWeekLimit" },
    { key: "perOfferLimit" },
    { key: "transactionLimit" },
    { key: "coolOffPeriod" },
    { key: "numUses" },
    { key: "canPreview" },
  ],
  eligibility: [
    { key: "eligibleChannels" },
    { key: "segments" },
    { key: "mandatorySegments" },
    { key: "tierPolicyLevels" },
    { key: "availability" },
  ],
};

const CORE_TAB_SET = new Set(["details", "fulfillment", "limits", "eligibility"]);

// ── Main Component ──────────────────────────────────────────────────────────

function BulkEditDrawer({
  open,
  selectedIds,
  rewards,
  schemaData,
  onSave,
  onCancel,
  saving = false,
}: BulkEditDrawerProps): JSX.Element {
  const selectedRewards = useMemo(
    () => rewards.filter((r) => selectedIds.has(r._id)),
    [rewards, selectedIds],
  );

  const tabs = useMemo(() => buildRewardFormTabs(schemaData), [schemaData]);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "details");
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Eligibility data
  const { options: segmentOpts, isLoading: segmentsLoading } = useSegmentOptions();
  const { options: tierPolicyOpts, isLoading: tiersLoading } = useTierPolicyOptions();
  const segmentSelectOptions: SelectOption[] = segmentOpts.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const { data: channelOptions } = useEnumOptions("ChannelType");
  const channelSelectOptions: SelectOption[] = useMemo(
    () => (channelOptions ?? []).map((c) => ({ value: c.value, label: c.label })),
    [channelOptions],
  );

  // Fulfillment data
  const { data: partnersData } = useEntityList<{ _id: string; name: string }>("partners", {
    select: "name", sort: "name", limit: 0,
  });
  const partnerOptions: SelectOption[] = useMemo(
    () => (partnersData?.data ?? []).map((p) => ({ value: p._id, label: p.name })),
    [partnersData],
  );
  const { data: pursePoliciesData } = useEntityList<PursePolicy>("pursepolicies", {
    select: "name,group", sort: "name", limit: 0,
  });
  const currencyOptions: SelectOption[] = useMemo(
    () => (pursePoliciesData?.data ?? [])
      .filter((pp) => !pp.group)
      .map((pp) => ({ value: pp._id, label: pp.name })),
    [pursePoliciesData],
  );
  const tierPolicySelectOptions: SelectOption[] = useMemo(
    () => tierPolicyOpts.map((tp) => ({ value: tp.id, label: tp.name })),
    [tierPolicyOpts],
  );

  const { data: snapToRaw } = useEnumOptions("SnapTo");
  const filteredSnapToOptions: SelectOption[] = useMemo(() => {
    const magnitudeOrder: Record<string, number> = {
      now: 0, hour: 1, day: 2, week: 3, month: 4, quarter: 5, year: 6,
    };
    return (snapToRaw ?? [])
      .filter((o) => o.value !== "ExpirationDate")
      .map((o) => ({ value: o.value, label: o.label.replace(/\b\w/g, (c) => c.toUpperCase()) }))
      .sort((a, b) => {
        const aKey = a.value.toLowerCase().replace(/^end\s*of\s*/, "");
        const bKey = b.value.toLowerCase().replace(/^end\s*of\s*/, "");
        return (magnitudeOrder[aKey] ?? 99) - (magnitudeOrder[bKey] ?? 99);
      });
  }, [snapToRaw]);

  const bulkSchema = useMemo(
    () => buildBulkEditZodSchema(schemaData),
    [schemaData],
  );

  const methods = useForm<BulkEditFormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {},
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors: rhfErrors },
    setError,
    clearErrors,
    setValue: setFormValue,
  } = methods;

  // Reset form state when the drawer opens
  useEffect(() => {
    if (open) {
      reset({});
      setEnabledFields(new Set());
      setGeneralError(null);
      setActiveTab(tabs[0]?.key ?? "details");
    }
  }, [open, reset, tabs]);

  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleField = useCallback((field: string) => {
    setEnabledFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
        // Clear the field value so stale invalid data doesn't block validation
        setFormValue(field, undefined);
      } else {
        next.add(field);
      }
      return next;
    });
  }, [setFormValue]);

  // Field → tab map
  const fieldTabMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [tabKey, fields] of Object.entries(CORE_FIELDS)) {
      for (const f of fields) map[f.key] = tabKey;
    }
    for (const tab of tabs) {
      for (const field of tab.fields) map[field] = tab.key;
    }
    return map;
  }, [tabs]);

  // Tab error counts
  const errCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of tabs) counts[tab.key] = 0;
    for (const field of Object.keys(errors)) {
      const t = fieldTabMap[field];
      if (t && counts[t] !== undefined) counts[t]!++;
    }
    return counts;
  }, [errors, fieldTabMap, tabs]);

  const onApply = handleSubmit(async (data) => {
    setShowConfirm(false);
    clearErrors("root");
    setGeneralError(null);

    const update: Record<string, unknown> = {};
    const META_FIELDS = new Set([
      "ffmntType", "ffmntPartner", "ffmntDeliveryMethod",
      "ffmntCurrency", "ffmntPoints", "ffmntExpirationType",
      "ffmntExpiryValue", "ffmntExpiryUnit", "ffmntExpirationSnapTo",
      "ffmntInactiveDays", "ffmntEscrowValue", "ffmntEscrowUnit",
      "ffmntEscrowSnapTo", "ffmntTierPolicy", "ffmntTierLevel",
      "ffmntTierUseDefaults", "ffmntTierDurationValue", "ffmntTierDurationUnit",
      "eligibleChannels",
    ]);
    for (const field of enabledFields) {
      const isMeta = META_FIELDS.has(field);
      const isExt = !!schemaData.extFields[field];
      const key = isMeta ? `ext._meta.${field}` : isExt ? `ext.${field}` : field;
      update[key] = (data as Record<string, unknown>)[field] ?? null;
    }

    try {
      await onSave(update);
    } catch (err: unknown) {
      const apiErr = err as Record<string, unknown> | undefined;
      const details = Array.isArray(apiErr?.details) ? apiErr.details : [];
      if (details.length > 0) {
        const fieldErrors: Record<string, string> = {};
        for (const d of details) {
          if (!d || typeof d !== 'object' || typeof (d as ApiFieldError).path !== 'string') continue;
          const fe = d as ApiFieldError;
          const fieldKey = fe.path.startsWith("ext.")
            ? fe.path.slice(4)
            : fe.path;
          setError(fieldKey, { message: fe.message });
          fieldErrors[fieldKey] = fe.message;
        }
        for (const tab of tabs) {
          if (
            Object.keys(fieldErrors).some((f) => fieldTabMap[f] === tab.key)
          ) {
            setActiveTab(tab.key);
            break;
          }
        }
      } else {
        setGeneralError(
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }, (validationErrors) => {
    // Zod validation failed — close confirm dialog and navigate to first tab with an error
    setShowConfirm(false);
    const flatErrors = flattenRhfErrors(validationErrors);
    for (const tab of tabs) {
      if (Object.keys(flatErrors).some((f) => fieldTabMap[f] === tab.key)) {
        setActiveTab(tab.key);
        break;
      }
    }
  });

  // ── Extension tab renderer ────────────────────────────────────────────

  const renderExtField = (
    fieldName: string,
    def: ExtFieldDef,
  ): JSX.Element => {
    const enabled = enabledFields.has(fieldName);
    const mixed = getMixedValue(selectedRewards, fieldName, true);

    return (
      <BulkField
        key={fieldName}
        fieldKey={fieldName}
        enabled={enabled}
        mixed={mixed}
        onToggle={toggleField}
      >
        <Controller
          control={control}
          name={fieldName}
          render={({ field: f }) => (
            <ExtFieldRenderer
              fieldName={fieldName}
              def={def}
              value={f.value}
              onChange={(v) => f.onChange(v)}
              error={errors[fieldName]}
              schemaData={schemaData}
            />
          )}
        />
      </BulkField>
    );
  };

  const renderExtTab = (tab: FormTab): JSX.Element => {
    const cols = tab.columns;
    const nonBoolFields: string[] = [];
    const boolFields: string[] = [];
    for (const fieldName of tab.fields) {
      const def = schemaData.extFields[fieldName];
      if (!def || def.isParent) continue;
      if (def.type === "boolean") boolFields.push(fieldName);
      else nonBoolFields.push(fieldName);
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
              return renderExtField(fieldName, def);
            })}
          </div>
        ))}
        {boolFields.length > 0 && (
          <div className={gridClass}>
            {boolFields.map((fieldName) => {
              const def = schemaData.extFields[fieldName];
              if (!def) return null;
              return renderExtField(fieldName, def);
            })}
          </div>
        )}
      </div>
    );
  };

  const currentTab = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={(v) => !v && onCancel()}
        title={`Bulk Edit: ${selectedIds.size} rewards`}
        widthClass="w-1/2 min-w-[560px]"
        testId="bulk-edit-drawer"
      >
        <FormProvider {...methods}>
        <form data-testid="bulk-edit-form" id="bulk-edit-form" onSubmit={(e) => e.preventDefault()} className="flex flex-1 min-h-0 flex-col">
            {/* Error banner */}
            {generalError && (
              <div
                className="mx-6 mt-3 flex items-center justify-between rounded-md border border-error bg-error-light px-3 py-2"
                role="alert"
              >
                <span className="text-body-sm text-error">
                  {generalError}
                </span>
                <button
                  type="button"
                  data-testid="reward-bulk-edit-dismiss-error"
                  aria-label="Dismiss error"
                  className="text-caption text-error underline cursor-pointer"
                  onClick={() => setGeneralError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Hint */}
            <p className="px-6 pt-3 text-body-sm text-foreground-muted">
              Enable fields with the checkbox to include them in the update.
            </p>

            {/* Tabs */}
            <div
              className="flex gap-0 overflow-x-auto overflow-y-hidden border-b border-border px-6 mt-3"
              role="tablist"
            >
              {tabs.map((t) => (
                <button
                  key={t.key}
                  data-testid={`bulk-edit-tab-${t.key}`}
                  aria-label={t.label}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.key}
                  tabIndex={activeTab === t.key ? 0 : -1}
                  className={cn(
                    "relative whitespace-nowrap px-3 py-2 text-body-sm transition-colors cursor-pointer",
                    "border-b-2 -mb-px",
                    activeTab === t.key
                      ? "border-brand text-brand font-medium"
                      : "border-transparent text-foreground-muted hover:text-foreground hover:border-border-strong",
                  )}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                  {(errCounts[t.key] ?? 0) > 0 && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error" />
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "details" && (
                <BulkDetailsTab
                  enabledFields={enabledFields}
                  toggleField={toggleField}
                  selectedRewards={selectedRewards}
                  schemaData={schemaData}
                  errors={errors}
                />
              )}
              {activeTab === "fulfillment" && (
                <BulkFulfillmentTab
                  enabledFields={enabledFields}
                  toggleField={toggleField}
                  selectedRewards={selectedRewards}
                  partnerOptions={partnerOptions}
                  currencyOptions={currencyOptions}
                  tierPolicySelectOptions={tierPolicySelectOptions}
                  tierPolicyOpts={tierPolicyOpts}
                  filteredSnapToOptions={filteredSnapToOptions}
                />
              )}
              {activeTab === "limits" && (
                <BulkLimitsTab
                  enabledFields={enabledFields}
                  toggleField={toggleField}
                  selectedRewards={selectedRewards}
                  schemaData={schemaData}
                  errors={errors}
                />
              )}
              {activeTab === "eligibility" && (
                <BulkEligibilityTab
                  enabledFields={enabledFields}
                  toggleField={toggleField}
                  selectedRewards={selectedRewards}
                  schemaData={schemaData}
                  errors={errors}
                  segmentSelectOptions={segmentSelectOptions}
                  segmentsLoading={segmentsLoading}
                  channelSelectOptions={channelSelectOptions}
                  tierPolicyOpts={tierPolicyOpts}
                  tiersLoading={tiersLoading}
                />
              )}
              {!CORE_TAB_SET.has(activeTab) &&
                currentTab &&
                renderExtTab(currentTab)}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={enabledFields.size === 0 || saving}
                onClick={() => setShowConfirm(true)}
              >
                {saving
                  ? "Applying..."
                  : `Apply to ${selectedIds.size} Rewards`}
              </Button>
            </div>
        </form>
        </FormProvider>
      </DrawerShell>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={onApply}
        title="Confirm Bulk Edit"
        description={`Apply changes to ${enabledFields.size} field(s) across ${selectedIds.size} reward(s)?`}
        confirmLabel="Apply"
        isPending={saving}
      />
    </>
  );
}

export default BulkEditDrawer;
