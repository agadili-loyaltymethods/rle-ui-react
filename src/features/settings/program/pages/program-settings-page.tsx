import { useState, useMemo, useEffect, type JSX } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/components/select";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { cn } from "@/shared/lib/cn";
import { usePermissions } from "@/shared/hooks/use-permissions";
import { useUIStore } from "@/shared/stores/ui-store";
import { useProgramMeta } from "@/features/programs/hooks/use-program-meta";
import { useRewardSchema } from "@/features/reward-catalog/hooks/use-reward-schema";
import { useTierPolicyOptions } from "@/features/reward-catalog/hooks/use-reward-eligibility";
import type { RewardsCatalogConfig, TierLevelFieldMap } from "@/features/reward-catalog/hooks/use-catalog-config";
import type { SelectOption } from "@/shared/components/select";

const schema = z.object({
  intendedUse: z.enum(["Reward", "Offer"]),
  cardImageField: z.string(),
  pricingMode: z.enum(["single", "per-tier"]),
  tierPolicyId: z.string(),
  tierLevelFields: z.record(z.string()),
});

type FormValues = z.infer<typeof schema>;

const INTENDED_USE_OPTIONS: SelectOption[] = [
  { value: "Reward", label: "Reward" },
  { value: "Offer", label: "Offer" },
];

const PRICING_MODE_OPTIONS: SelectOption[] = [
  { value: "single", label: "Single Price (Cost)" },
  { value: "per-tier", label: "Per-Tier Pricing" },
];

const TABS = [{ key: "rewards-catalog", label: "Rewards Catalog" }] as const;

export default function ProgramSettingsPage(): JSX.Element {
  const currentProgram = useUIStore((s) => s.currentProgram);
  const permissions = usePermissions("rules");
  const [activeTab, setActiveTab] = useState<string>("rewards-catalog");

  const { data: config, isLoading: configLoading, save } =
    useProgramMeta<RewardsCatalogConfig>(currentProgram ?? undefined, "Rewards Catalog");

  const { data: schemaData } = useRewardSchema();
  const { options: tierPolicies } = useTierPolicyOptions();

  // Build card image field options from schema
  const cardImageOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: "", label: "None" }];
    opts.push({ value: "url", label: "URL (core field)" });
    if (schemaData?.extFields) {
      for (const [name, def] of Object.entries(schemaData.extFields)) {
        const isUrl =
          def.format === "uri" ||
          def.format === "url" ||
          (def.type === "string" && /url/i.test(name));
        if (isUrl) {
          opts.push({ value: name, label: def.title || name });
        }
      }
    }
    return opts;
  }, [schemaData]);

  // Build numeric ext field options for tier level mapping
  const numericExtFieldOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: "", label: "None" }];
    if (!schemaData?.extFields) return opts;
    const fields = Object.entries(schemaData.extFields)
      .filter(([, def]) => def.type === "number" || def.type === "integer")
      .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
      .map(([name, def]) => ({ value: name, label: def.title || name }));
    return [...opts, ...fields];
  }, [schemaData]);

  // Tier policy select options
  const tierPolicyOptions: SelectOption[] = useMemo(() =>
    tierPolicies.map((tp) => ({ value: tp.id, label: tp.name })),
    [tierPolicies],
  );

  // Auto-select: if no policy configured, pick the first (or primary) one
  const autoSelectedPolicyId = useMemo(() => {
    if (config?.tierPolicyId) return config.tierPolicyId;
    const primary = tierPolicies.find((tp) => tp.primary);
    return primary?.id ?? tierPolicies[0]?.id ?? "";
  }, [config, tierPolicies]);

  // Get levels for the currently selected tier policy
  const selectedPolicy = useMemo(() =>
    tierPolicies.find((tp) => tp.id === autoSelectedPolicyId),
    [tierPolicies, autoSelectedPolicyId],
  );

  const defaultImageField = cardImageOptions.length > 1 ? cardImageOptions[1]!.value : "";

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      intendedUse: config?.intendedUse ?? "Reward",
      cardImageField: config?.cardImageField ?? defaultImageField,
      pricingMode: config?.pricingMode ?? "per-tier",
      tierPolicyId: autoSelectedPolicyId,
      tierLevelFields: config?.tierLevelFields ?? {},
    },
  });

  const pricingMode = watch("pricingMode");
  const watchedTierPolicyId = watch("tierPolicyId");
  const watchedLevelFields = watch("tierLevelFields");

  // The policy whose levels we render
  const activePolicyForLevels = useMemo(() =>
    tierPolicies.find((tp) => tp.id === watchedTierPolicyId),
    [tierPolicies, watchedTierPolicyId],
  );

  // Reset form when config loads
  useEffect(() => {
    if (config) {
      reset({
        intendedUse: config.intendedUse ?? "Reward",
        cardImageField: config.cardImageField ?? defaultImageField,
        pricingMode: config.pricingMode ?? "per-tier",
        tierPolicyId: config.tierPolicyId || autoSelectedPolicyId,
        tierLevelFields: config.tierLevelFields ?? {},
      });
    }
  }, [config, reset, defaultImageField, autoSelectedPolicyId]);

  // Auto-set tierPolicyId when tier policies load and form has no value
  useEffect(() => {
    if (!watchedTierPolicyId && autoSelectedPolicyId) {
      setValue("tierPolicyId", autoSelectedPolicyId, { shouldDirty: false });
    }
  }, [watchedTierPolicyId, autoSelectedPolicyId, setValue]);

  const [saving, setSaving] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      await save(data as RewardsCatalogConfig);
      toast.success("Settings saved");
      reset(data);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  });

  if (!currentProgram) {
    return (
      <div data-testid="page-program-settings">
        <PageHeader title="Program Settings" />
        <NoProgramBanner context="program settings" data-testid="program-settings-no-program" />
      </div>
    );
  }

  return (
    <div data-testid="page-program-settings">
      <PageHeader title="Program Settings" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6" role="tablist" data-testid="program-settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            aria-label={t.label}
            data-testid={`program-settings-tab-${t.key}`}
            className={cn(
              "px-4 py-2 text-body-sm transition-colors cursor-pointer border-b-2 -mb-px",
              activeTab === t.key
                ? "border-brand text-brand font-medium"
                : "border-transparent text-foreground-muted hover:text-foreground",
            )}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rewards Catalog tab */}
      {activeTab === "rewards-catalog" && (
        <form
          onSubmit={onSubmit}
          className="max-w-[var(--width-form-max)] space-y-6"
          data-testid="program-settings-rewards-form"
          aria-label="Rewards Catalog settings"
        >
          {configLoading ? (
            <p className="text-body-sm text-foreground-muted">Loading...</p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Wallet
                </label>
                <p className="mb-3 text-caption text-foreground-muted">
                  Controls which wallet the rewards will be deposited into once obtained.
                </p>
                <Controller
                  control={control}
                  name="intendedUse"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      options={INTENDED_USE_OPTIONS}
                      testIdPrefix="program-intended-use"
                    />
                  )}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Card Image Field
                </label>
                <p className="mb-3 text-caption text-foreground-muted">
                  Which field to use for the reward image in the card grid and table thumbnail.
                </p>
                <Controller
                  control={control}
                  name="cardImageField"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      options={cardImageOptions}
                      testIdPrefix="program-card-image"
                    />
                  )}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Card Pricing
                </label>
                <p className="mb-3 text-caption text-foreground-muted">
                  How pricing is displayed on reward cards. Single price uses the core Cost field;
                  per-tier associates extension fields with tier levels.
                </p>
                <Controller
                  control={control}
                  name="pricingMode"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      options={PRICING_MODE_OPTIONS}
                      testIdPrefix="program-pricing-mode"
                    />
                  )}
                />
              </div>

              {pricingMode === "per-tier" && (
                <>
                  {tierPolicyOptions.length > 1 && (
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">
                        Tier Policy
                      </label>
                      <Controller
                        control={control}
                        name="tierPolicyId"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onChange={field.onChange}
                            options={tierPolicyOptions}
                            testIdPrefix="program-tier-policy"
                          />
                        )}
                      />
                    </div>
                  )}

                  {tierPolicyOptions.length === 1 && (
                    <p className="text-caption text-foreground-muted">
                      Tier Policy: <span className="font-medium text-foreground">{tierPolicyOptions[0]!.label}</span>
                    </p>
                  )}

                  {activePolicyForLevels && activePolicyForLevels.levels.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">
                        Level Cost Fields
                      </label>
                      <p className="mb-3 text-caption text-foreground-muted">
                        Map each tier level to a numeric extension field for card pricing.
                      </p>
                      <div className="space-y-3">
                        {activePolicyForLevels.levels.map((level) => (
                          <div key={level.name} className="flex items-center gap-3">
                            <span className="w-28 shrink-0 text-label text-foreground-muted truncate" title={level.name}>
                              {level.name}
                            </span>
                            <Select
                              value={watchedLevelFields[level.name] ?? ""}
                              onChange={(val) => {
                                const next: TierLevelFieldMap = { ...watchedLevelFields };
                                if (val) {
                                  next[level.name] = val;
                                } else {
                                  delete next[level.name];
                                }
                                setValue("tierLevelFields", next, { shouldDirty: true });
                              }}
                              options={numericExtFieldOptions}
                              placeholder="Select field..."
                              testIdPrefix={`program-tier-level-${level.name}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tierPolicies.length === 0 && (
                    <p className="text-caption text-foreground-muted">
                      No tier policies found for this program.
                    </p>
                  )}
                </>
              )}

              {permissions.canUpdate && (
                <Button
                  type="submit"
                  disabled={!isDirty || saving}
                  data-testid="program-settings-save"
                  aria-label="Save settings"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </>
          )}
        </form>
      )}
    </div>
  );
}
