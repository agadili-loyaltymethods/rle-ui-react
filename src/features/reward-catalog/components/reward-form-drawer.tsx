/**
 * Reward form drawer — tabbed form for creating/editing reward policies.
 *
 * Uses React Hook Form + Zod for validation with schema-driven dynamic
 * extension field tabs. Renders as a right-sliding Radix Dialog drawer.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type JSX,
} from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { DrawerShell } from "@/shared/components/drawer-shell";
import { cn } from "@/shared/lib/cn";
import { handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";
import { Button } from "@/shared/ui/button";
import type { SelectOption } from "@/shared/components/select";
import { useEntityList } from "@/shared/hooks/use-api";
import { useEnumOptions } from "@/shared/hooks/use-enums";
import type { Division, Partner, PursePolicy } from "@/shared/types";
import { createDefaultRewardCatalogItem } from "../lib/reward-defaults";
import {
  type FormTab,
  type RewardFormValues,
  type CoreTab,
  CORE_TAB_KEYS,
  buildRewardFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  buildRewardZodSchema,
  buildRewardDefaultValues,
  flattenRhfErrors,
  buildExtFromValues,
} from "../lib/reward-form-helpers";
import { ExtTabBody } from "./reward-ext-fields";
import { DetailsTab } from "./tabs/details-tab";
import { FulfillmentTab } from "./tabs/fulfillment-tab";
import { LimitsTab } from "./tabs/limits-tab";
import { EligibilityTab } from "./tabs/eligibility-tab";
import { useRewardSchema } from "../hooks/use-reward-schema";
import {
  useSegmentOptions,
  useTierPolicyOptions,
} from "../hooks/use-reward-eligibility";
import type {
  RewardCatalogItem,
} from "../types/reward-policy";
import type { ApiFieldError } from "@/shared/types/api";

// ── Props ───────────────────────────────────────────────────────────────────

interface RewardFormDrawerProps {
  open: boolean;
  reward: RewardCatalogItem | null;
  onSave: (reward: RewardCatalogItem) => Promise<void>;
  onCancel: () => void;
  nextSortOrder: number;
  saving?: boolean;
  savedTabOrder?: string[];
  onTabOrderChange?: (order: string[]) => void;
  programId: string;
  orgId: string;
  intendedUse?: string;
}

// ── Main Component ──────────────────────────────────────────────────────────

function RewardFormDrawer({
  open,
  reward,
  onSave,
  onCancel,
  nextSortOrder,
  saving = false,
  savedTabOrder,
  onTabOrderChange,
  programId,
  orgId,
  intendedUse,
}: RewardFormDrawerProps): JSX.Element {
  const isEditing = reward !== null;
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // Schema
  const {
    data: schemaData,
    isLoading: schemaLoading,
    isError: schemaError,
  } = useRewardSchema();

  // Eligibility
  const { options: segmentOpts, isLoading: segmentsLoading } =
    useSegmentOptions();
  const { options: tierPolicyOpts, isLoading: tiersLoading } =
    useTierPolicyOptions();
  const { data: channelOptions } = useEnumOptions("ChannelType");
  const channelSelectOptions = useMemo(
    () => (channelOptions ?? []).map((c) => ({ value: c.value, label: c.label })),
    [channelOptions],
  );
  const eligibilityLoading = segmentsLoading || tiersLoading;

  // Divisions
  const { data: divisionsData } = useEntityList<Division>("divisions", {
    select: "name",
    sort: "name",
    limit: 0,
  });
  const divisionOptions: SelectOption[] = useMemo(
    () => (divisionsData?.data ?? []).map((d) => ({ value: d._id, label: d.name })),
    [divisionsData],
  );

  // Fulfillment
  const { data: partnersData } = useEntityList<Partner>("partners", {
    select: "name",
    sort: "name",
    limit: 0,
  });
  const partnerOptions: SelectOption[] = useMemo(
    () => (partnersData?.data ?? []).map((p) => ({ value: p._id, label: p.name })),
    [partnersData],
  );

  // Points fulfillment — non-qualifying purse policies
  const { data: pursePoliciesData } = useEntityList<PursePolicy>("pursepolicies", {
    select: "name,expirationType,expiryValue,expiryUnit,expirationSnapTo,inactiveDays,escrowValue,escrowUnit,escrowSnapTo,group",
    sort: "name",
    limit: 0,
  });
  const currencyOptions: SelectOption[] = useMemo(
    () => (pursePoliciesData?.data ?? [])
      .filter((pp) => !pp.group)
      .map((pp) => ({ value: pp._id, label: pp.name })),
    [pursePoliciesData],
  );

  const { data: snapToOptions } = useEnumOptions("SnapTo");
  const filteredSnapToOptions: SelectOption[] = useMemo(() => {
    const magnitudeOrder: Record<string, number> = {
      now: 0, hour: 1, day: 2, week: 3, month: 4, quarter: 5, year: 6,
    };
    return (snapToOptions ?? [])
      .filter((o) => o.value !== "ExpirationDate")
      .map((o) => ({ value: o.value, label: o.label.replace(/\b\w/g, (c) => c.toUpperCase()) }))
      .sort((a, b) => {
        const aKey = a.value.toLowerCase().replace(/^end\s*of\s*/, "");
        const bKey = b.value.toLowerCase().replace(/^end\s*of\s*/, "");
        return (magnitudeOrder[aKey] ?? 99) - (magnitudeOrder[bKey] ?? 99);
      });
  }, [snapToOptions]);

  const tierPolicySelectOptions: SelectOption[] = useMemo(
    () => tierPolicyOpts.map((tp) => ({ value: tp.id, label: tp.name })),
    [tierPolicyOpts],
  );

  // Image preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);

  // ── RHF setup ───────────────────────────────────────────────────────────────

  const schema = useMemo(
    () => buildRewardZodSchema(schemaData ?? null) as unknown as z.ZodType<RewardFormValues>,
    [schemaData],
  );

  const methods = useForm<RewardFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildRewardDefaultValues(reward, null),
  });
  const {
    handleSubmit: rhfHandleSubmit,
    reset,
    setError,
    formState: { errors: rhfErrors, isDirty },
  } = methods;

  // Flatten RHF errors for tab navigation utilities
  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  // ── Tabs ────────────────────────────────────────────────────────────────

  const formTabs = useMemo(
    () => buildRewardFormTabs(schemaData ?? null),
    [schemaData],
  );
  const fieldTabMap = useMemo(() => buildFieldTabMap(formTabs), [formTabs]);

  const [tab, setTab] = useState<string>(savedTabOrder?.[0] ?? "details");

  // Reset when drawer opens or target reward changes
  useEffect(() => {
    if (!open) return;
    reset(buildRewardDefaultValues(reward, schemaData ?? null));
    setGeneralError(null);
    setTab(savedTabOrder?.[0] ?? "details");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- schemaData intentionally excluded;
  // the schema-load effect (below) handles async schemaData arrival independently.
  }, [open, reward, reset, setGeneralError, setTab, savedTabOrder]);

  // When schema loads asynchronously, rebuild defaults (ext fields now known) and reset.
  // Depends only on schemaData — NOT reward. If reward changes, the drawer-open effect
  // above handles the reset. This prevents parent reward refetches (new object reference,
  // same data) from clobbering in-progress user edits.
  useEffect(() => {
    if (!schemaData || !open) return;
    reset(buildRewardDefaultValues(reward, schemaData), {
      keepDirty: false,
      keepDefaultValues: false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reward and open intentionally
  // excluded; reward changes are handled by the drawer-open effect above, and we only
  // need open to guard against running when the drawer is closed.
  }, [schemaData, reset]);

  // Draggable tab ordering
  const [orderedTabs, setOrderedTabs] = useState<FormTab[]>(formTabs);
  const dragTabRef = useRef<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  useEffect(() => {
    setOrderedTabs(() => {
      if (savedTabOrder && savedTabOrder.length > 0) {
        const tabMap = Object.fromEntries(formTabs.map((t) => [t.key, t]));
        const ordered: FormTab[] = [];
        for (const key of savedTabOrder) {
          if (tabMap[key]) {
            ordered.push(tabMap[key]!);
            delete tabMap[key];
          }
        }
        for (const t of formTabs) {
          if (tabMap[t.key]) ordered.push(t);
        }
        return ordered;
      }
      return formTabs;
    });
  }, [formTabs, savedTabOrder]);


  // ── Focus helpers ─────────────────────────────────────────────────────

  const bodyRef = useRef<HTMLDivElement>(null);
  // Set to true before switching tabs due to validation errors so the
  // tab-change useEffect focuses the first error field instead of the first field.
  const focusErrorAfterRenderRef = useRef(false);

  const focusFirstField = useCallback(() => {
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      const el = bodyRef.current.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled])',
      );
      if (!el) return;
      el.focus({ preventScroll: true });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.select();
      }
    });
  }, []);

  const focusFirstError = useCallback(() => {
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      const el = bodyRef.current.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      );
      if (el) el.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
    if (focusErrorAfterRenderRef.current) {
      focusErrorAfterRenderRef.current = false;
      focusFirstError();
    } else {
      focusFirstField();
    }
  }, [tab, focusFirstField, focusFirstError]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const keys = orderedTabs.map((t) => t.key);
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Tab" && e.ctrlKey) {
        e.preventDefault();
        setTab((cur) => {
          const idx = keys.indexOf(cur);
          return e.shiftKey
            ? keys[(idx - 1 + keys.length) % keys.length] ?? "details"
            : keys[(idx + 1) % keys.length] ?? "details";
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, orderedTabs]);

  const orderedTabKeys = orderedTabs.map((t) => t.key);
  const handleTabKeyDown = (e: React.KeyboardEvent): void => {
    const idx = orderedTabKeys.indexOf(tab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setTab(
        orderedTabKeys[(idx + 1) % orderedTabKeys.length] ?? "details",
      );
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setTab(
        orderedTabKeys[(idx - 1 + orderedTabKeys.length) % orderedTabKeys.length] ??
          "details",
      );
    }
  };

  // ── Close handling ────────────────────────────────────────────────────

  const tryClose = useCallback((): void => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) tryClose();
    },
    [tryClose],
  );

  // ── Preview helper ──────────────────────────────────────────────────

  const openPreview = useCallback((url: string) => {
    setPreviewError(false);
    setPreviewLoading(true);
    setPreviewUrl(url);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────

  const onSubmit = rhfHandleSubmit(async (data: RewardFormValues) => {
    setGeneralError(null);

    const ext = buildExtFromValues(data.ext, schemaData ?? null);

    const metaBase = isEditing && reward
      ? ((reward.ext as Record<string, unknown>)?._meta as Record<string, unknown>) ?? {}
      : { subType: "RewardsCatalog" };

    const isPoints = data.ffmntType === "Points";
    const isTierStatus = data.ffmntType === "Tier Status";
    const isExternal = data.ffmntType === "External Fulfillment";

    const isVoucher = data.redemptionType === "issue-voucher";

    const meta = {
      ...metaBase,
      redemptionType: data.redemptionType,
      voucherValidValue: isVoucher ? data.voucherValidValue : 0,
      voucherValidUnit: isVoucher ? data.voucherValidUnit : "Days",
      ffmntType: data.ffmntType,
      // External Fulfillment
      ffmntPartner: isExternal ? data.ffmntPartner : "",
      ffmntDeliveryMethod: isExternal ? data.ffmntDeliveryMethod : "",
      // Points
      ffmntCurrency: isPoints ? data.ffmntCurrency : "",
      ffmntPoints: isPoints ? data.ffmntPoints : 0,
      ffmntExpirationType: isPoints ? data.ffmntExpirationType : "None",
      ffmntExpiryValue: isPoints && data.ffmntExpirationType === "Custom" ? data.ffmntExpiryValue : 0,
      ffmntExpiryUnit: isPoints && data.ffmntExpirationType === "Custom" ? data.ffmntExpiryUnit : "Days",
      ffmntExpirationSnapTo: isPoints && data.ffmntExpirationType === "Custom" ? data.ffmntExpirationSnapTo : "now",
      ffmntInactiveDays: isPoints && data.ffmntExpirationType === "Activity-Based" ? data.ffmntInactiveDays : 0,
      ffmntEscrowValue: isPoints ? data.ffmntEscrowValue : 0,
      ffmntEscrowUnit: isPoints ? data.ffmntEscrowUnit : "None",
      ffmntEscrowSnapTo: isPoints ? data.ffmntEscrowSnapTo : "now",
      // Tier Status
      ffmntTierPolicy: isTierStatus ? data.ffmntTierPolicy : "",
      ffmntTierLevel: isTierStatus ? data.ffmntTierLevel : "",
      ffmntTierUseDefaults: isTierStatus ? data.ffmntTierUseDefaults : true,
      ffmntTierDurationValue: isTierStatus && !data.ffmntTierUseDefaults ? data.ffmntTierDurationValue : 0,
      ffmntTierDurationUnit: isTierStatus && !data.ffmntTierUseDefaults ? data.ffmntTierDurationUnit : "Days",
      // Channel eligibility
      eligibleChannels: data.eligibleChannels?.length > 0 ? data.eligibleChannels : undefined,
    };

    const effectiveISO = data.effectiveDate
      ? data.effectiveDate + "T00:00:00.000Z"
      : "";
    const expirationISO = data.expirationDate
      ? data.expirationDate + "T23:59:59.999Z"
      : "";
    const coreVal = data.cost;

    const limitsFields = {
      countLimit: data.countLimit,
      perDayLimit: data.perDayLimit,
      perWeekLimit: data.perWeekLimit,
      perOfferLimit: data.perOfferLimit,
      transactionLimit: data.transactionLimit,
      coolOffPeriod: data.coolOffPeriod,
      numUses: data.numUses,
      canPreview: data.canPreview,
      segments: data.segments,
      mandatorySegments: data.mandatorySegments,
      tierPolicyLevels: data.tierPolicyLevels,
      availability: data.availability,
    };

    let payload: RewardCatalogItem;
    if (isEditing && reward) {
      payload = {
        ...reward,
        name: data.name.trim(),
        desc: data.desc.trim(),
        cost: coreVal,
        effectiveDate: effectiveISO,
        expirationDate: expirationISO,
        ext: { ...reward.ext, ...ext, _meta: meta } as RewardCatalogItem["ext"],
        extCategories: reward.extCategories,
        ...limitsFields,
        divisions: data.divisions,
      };
    } else {
      const base = createDefaultRewardCatalogItem(programId, orgId, nextSortOrder, intendedUse);
      payload = {
        ...base,
        name: data.name.trim(),
        desc: data.desc.trim(),
        cost: coreVal,
        effectiveDate: effectiveISO,
        expirationDate: expirationISO,
        ext: { ...ext, _meta: meta } as unknown as RewardCatalogItem["ext"],
        extCategories: [],
        ...limitsFields,
        divisions: data.divisions,
        redemptions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      await onSave(payload);
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
          const rhfPath = fe.path.startsWith("ext.")
            ? (`ext.${fieldKey}` as keyof RewardFormValues)
            : (fieldKey as keyof RewardFormValues);
          setError(rhfPath, { message: fe.message });
          fieldErrors[fieldKey] = fe.message;
        }
        const targetTab = firstTabWithError(fieldErrors, fieldTabMap, orderedTabKeys);
        if (targetTab && targetTab !== tab) {
          focusErrorAfterRenderRef.current = true;
          setTab(targetTab);
        } else {
          focusFirstError();
        }
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : typeof (err as Record<string, unknown>)?.message === "string"
              ? ((err as Record<string, unknown>).message as string)
              : String(err);
        setGeneralError(msg);
      }
    }
  }, (validationErrors) => {
    // Zod validation failed — navigate to first tab with an error and focus it
    const flatErrors = flattenRhfErrors(validationErrors);
    const targetTab = firstTabWithError(flatErrors, fieldTabMap, orderedTabKeys);
    if (targetTab && targetTab !== tab) {
      focusErrorAfterRenderRef.current = true;
      setTab(targetTab);
    } else {
      focusFirstError();
    }
  });

  // ── Tab error dots ────────────────────────────────────────────────────

  const errCounts = tabErrorCounts(errors, fieldTabMap, orderedTabKeys);

  const currentTab =
    orderedTabs.find((t) => t.key === tab) ?? orderedTabs[0];
  const isCoreTab = CORE_TAB_KEYS.includes(tab as CoreTab);

  // ── Segment/tier options for MultiSelect ──────────────────────────────

  const segmentSelectOptions: SelectOption[] = segmentOpts.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={handleOpenChange}
        title={isEditing ? `Edit: ${reward!.name}` : "Add Reward"}
        testId="reward-form-drawer"
      >
            <form
              data-testid="reward-form"
              id="reward-form"
              onSubmit={onSubmit}
              noValidate
              className="flex flex-1 min-h-0 flex-col"
            >
            <FormProvider {...methods}>

              {/* Error banners */}
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
                    data-testid="reward-form-dismiss-error"
                    aria-label="Dismiss error"
                    className="text-caption text-error underline cursor-pointer"
                    onClick={() => setGeneralError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {schemaError && (
                <div
                  className="mx-6 mt-3 flex items-center justify-between rounded-md border border-warning bg-warning-light px-3 py-2"
                  role="alert"
                >
                  <span className="text-body-sm text-warning">
                    Schema unavailable — dropdowns may be empty, basic
                    validation only
                  </span>
                  <button
                    type="button"
                    data-testid="reward-form-dismiss-schema-warning"
                    aria-label="Dismiss schema warning"
                    className="text-caption text-warning underline cursor-pointer"
                    onClick={() => {
                      /* schema error is from TanStack Query, can't clear it */
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {schemaData?.warnings && schemaData.warnings.length > 0 && (
                <div
                  className="mx-6 mt-3 rounded-md border border-warning bg-warning-light px-3 py-2"
                  role="status"
                >
                  {schemaData.warnings.map((w, i) => (
                    <p key={i} className="text-body-sm text-warning">{w}</p>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div
                className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-6"
                role="tablist"
                onKeyDown={handleTabKeyDown}
              >
                {orderedTabs.map((t) => (
                  <button
                    key={t.key}
                    data-testid={`reward-form-tab-${t.key}`}
                    aria-label={t.label}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    tabIndex={tab === t.key ? 0 : -1}
                    className={cn(
                      "relative whitespace-nowrap px-3 py-2 text-body-sm transition-colors cursor-pointer",
                      "border-b-2 -mb-px",
                      tab === t.key
                        ? "border-brand text-brand font-medium"
                        : "border-transparent text-foreground-muted hover:text-foreground hover:border-border-strong",
                      dragOverTab === t.key && "bg-brand/10",
                    )}
                    onClick={() => setTab(t.key)}
                    draggable
                    onDragStart={() => {
                      dragTabRef.current = t.key;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverTab(t.key);
                    }}
                    onDrop={() => {
                      const from = dragTabRef.current;
                      if (from && from !== t.key) {
                        const newOrder = [...orderedTabs];
                        const fromIdx = newOrder.findIndex(
                          (x) => x.key === from,
                        );
                        const toIdx = newOrder.findIndex(
                          (x) => x.key === t.key,
                        );
                        const [moved] = newOrder.splice(fromIdx, 1);
                        if (moved) {
                          newOrder.splice(toIdx, 0, moved);
                          setOrderedTabs(newOrder);
                          onTabOrderChange?.(newOrder.map((x) => x.key));
                        }
                      }
                      dragTabRef.current = null;
                      setDragOverTab(null);
                    }}
                    onDragEnd={() => {
                      dragTabRef.current = null;
                      setDragOverTab(null);
                    }}
                  >
                    {t.label}
                    {(errCounts[t.key] ?? 0) > 0 && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error" />
                    )}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div
                className="flex-1 overflow-y-auto p-6"
                ref={bodyRef}
                onFocus={handleAutoSelectOnFocus}
              >
                {/* Details tab */}
                {tab === "details" && (
                  <DetailsTab
                    reward={reward}
                    isEditing={isEditing}
                    divisionOptions={divisionOptions}
                    schemaData={schemaData ?? null}
                  />
                )}

                {/* Fulfillment tab */}
                {tab === "fulfillment" && (
                  <FulfillmentTab
                    partnerOptions={partnerOptions}
                    currencyOptions={currencyOptions}
                    snapToOptions={filteredSnapToOptions}
                    tierPolicySelectOptions={tierPolicySelectOptions}
                    tierPolicyOpts={tierPolicyOpts}
                    pursePoliciesData={pursePoliciesData?.data ?? []}
                    schemaData={schemaData ?? null}
                  />
                )}

                {/* Limits tab */}
                {tab === "limits" && <LimitsTab reward={reward} key={reward?._id ?? "new"} />}

                {/* Eligibility tab */}
                {tab === "eligibility" && (
                  <EligibilityTab
                    channelOptions={channelSelectOptions}
                    segmentOptions={segmentSelectOptions}
                    tierPolicyOpts={tierPolicyOpts}
                    eligibilityLoading={eligibilityLoading}
                    key={reward?._id ?? "new"}
                  />
                )}

                {/* Dynamic ext tabs */}
                {!isCoreTab && currentTab && (
                  <ExtTabBody
                    tab={currentTab}
                    schemaData={schemaData ?? null}
                    onPreviewUrl={openPreview}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={tryClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    (isEditing && !isDirty) ||
                    saving ||
                    schemaLoading
                  }
                >
                  {schemaLoading
                    ? "Loading..."
                    : saving
                      ? "Saving..."
                      : isEditing
                        ? "Save Changes"
                        : "Add Reward"}
                </Button>
              </div>
            </FormProvider>
            </form>
      </DrawerShell>

      {/* Discard confirmation */}
      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onDiscard={() => {
          setShowDiscardConfirm(false);
          onCancel();
        }}
      />

      {/* Image preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[calc(var(--z-modal)+2)] flex items-center justify-center bg-black/60"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[80vh] max-w-[80vw] rounded-lg bg-card p-4 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              data-testid="reward-form-close-preview"
              aria-label="Close image preview"
              className="absolute right-2 top-2 rounded-sm p-1 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-4 w-4" />
            </button>
            {previewError ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-light text-error text-h4">
                  !
                </span>
                <p className="text-body-sm text-foreground">
                  Failed to load image
                </p>
                <p className="text-caption text-foreground-muted break-all">
                  {previewUrl}
                </p>
              </div>
            ) : (
              <>
                {previewLoading && (
                  <div className="flex items-center justify-center p-8 text-body-sm text-foreground-muted">
                    Loading...
                  </div>
                )}
                <img alt="Preview"
                  src={previewUrl}
                  className="max-h-[70vh] max-w-[75vw] object-contain"
                  style={previewLoading ? { display: "none" } : undefined}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(true);
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default RewardFormDrawer;
