/**
 * Eligibility tab — extracted from reward-form-drawer.tsx.
 * Renders channels, segments, tier levels, and availability schedule.
 */

import { useState, useMemo } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { MultiSelect } from "@/shared/components/multi-select";
import type { SelectOption } from "@/shared/components/select";
import {
  type RewardFormValues,
  timeToString,
  parseTime,
  DEFAULT_AVAILABILITY,
  DAY_KEYS,
  DAY_LABELS,
  flattenRhfErrors,
} from "../../lib/reward-form-helpers";
import type { TierPolicyOption } from "../../hooks/use-reward-eligibility";

interface EligibilityTabProps {
  channelOptions: SelectOption[];
  segmentOptions: SelectOption[];
  tierPolicyOpts: TierPolicyOption[];
  eligibilityLoading: boolean;
}

export function EligibilityTab({
  channelOptions,
  segmentOptions,
  tierPolicyOpts,
  eligibilityLoading,
}: EligibilityTabProps): React.JSX.Element {
  const {
    control,
    watch,
    setValue,
    formState: { errors: rhfErrors },
  } = useFormContext<RewardFormValues>();

  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  // Track explicit "All Times" override: null = not overridden (compute from data).
  // Cleared whenever availability data is edited through the grid.
  const [allTimesOverride, setAllTimesOverride] = useState<boolean | null>(null);

  return (
    <div className="space-y-8">
      {/* Channels */}
      <div className="flex flex-col gap-2">
        <label className="text-label text-foreground-muted">
          Channels
        </label>
        <p className="text-caption text-foreground-muted mb-1">
          Restrict which channels this reward can be obtained through. Leave empty for all channels.
        </p>
        <Controller
          control={control}
          name="eligibleChannels"
          render={({ field }) => (
            <MultiSelect
              value={field.value}
              onChange={field.onChange}
              options={channelOptions}
              placeholder="All channels"
              showBulkActions
            />
          )}
        />
      </div>

      {/* Segments — 2-column row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-label text-foreground-muted">
            Segments
          </label>
          <Controller
            control={control}
            name="segments"
            render={({ field }) => (
              <MultiSelect
                value={field.value}
                onChange={field.onChange}
                options={segmentOptions}
                placeholder="Select segments..."
                disabled={eligibilityLoading}
                showBulkActions
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-label text-foreground-muted">
            Mandatory Segments
          </label>
          <Controller
            control={control}
            name="mandatorySegments"
            render={({ field }) => (
              <MultiSelect
                value={field.value}
                onChange={field.onChange}
                options={segmentOptions}
                placeholder="Select mandatory segments..."
                disabled={eligibilityLoading}
                showBulkActions
              />
            )}
          />
        </div>
      </div>

      {/* Tier Levels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="text-label text-foreground-muted">
            Tier Levels
          </h3>
          {!eligibilityLoading && tierPolicyOpts.length > 0 && (
            <div className="inline-flex items-center gap-2">
              <span className="text-[12px] text-foreground-muted">
                All Tiers
              </span>
              <Switch
                checked={watch("tierPolicyLevels").length === 0}
                onChange={(v) => {
                  if (v) {
                    setValue("tierPolicyLevels", [], { shouldDirty: true });
                  } else {
                    // Pre-select all levels from all policies
                    const all = tierPolicyOpts.flatMap((tp) =>
                      tp.levels.map((l) => ({ policyId: tp.id, level: l.name })),
                    );
                    setValue("tierPolicyLevels", all, { shouldDirty: true });
                  }
                }}
              />
            </div>
          )}
        </div>
        {eligibilityLoading ? (
          <p className="text-body-sm text-foreground-muted">
            Loading...
          </p>
        ) : tierPolicyOpts.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">
            No tier policies available
          </p>
        ) : (
          (() => {
            const allTiers = watch("tierPolicyLevels").length === 0;
            return (
              <div className={cn(
                "space-y-4",
                allTiers && "opacity-40 pointer-events-none",
              )}>
                {tierPolicyOpts.map((tp) => (
                  <div key={tp.id}>
                    {tierPolicyOpts.length > 1 && (
                      <p className="mb-2 text-caption font-semibold text-foreground-muted uppercase tracking-wide">
                        {tp.name}{tp.primary ? " (primary)" : ""}
                      </p>
                    )}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-12">
                      {tp.levels.map((level) => {
                        const tierLevels = watch("tierPolicyLevels");
                        const isChecked = tierLevels.some(
                          (tpl) => tpl.policyId === tp.id && tpl.level === level.name,
                        );
                        return (
                          <label
                            key={`${tp.id}-${level.name}`}
                            className="inline-flex items-center gap-3 cursor-pointer group"
                          >
                            <Switch
                              checked={isChecked}
                              onChange={(v) => {
                                if (v) {
                                  setValue("tierPolicyLevels", [
                                    ...tierLevels,
                                    { policyId: tp.id, level: level.name },
                                  ], { shouldDirty: true });
                                } else {
                                  setValue(
                                    "tierPolicyLevels",
                                    tierLevels.filter(
                                      (tpl) => !(tpl.policyId === tp.id && tpl.level === level.name),
                                    ),
                                    { shouldDirty: true },
                                  );
                                }
                              }}
                            />
                            <span className="text-body-sm text-foreground-muted group-hover:text-foreground">
                              {level.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Availability */}
      <div className="space-y-4">
        {(() => {
          const availability = watch("availability");
          const dataIsAllTimes = DAY_KEYS.every((k) => {
            const d = availability[k];
            return d.isEnabled && d.startHours === 0 && d.startMins === 0 && d.endHours === 23 && d.endMins === 59;
          });
          const isAllTimes = allTimesOverride ?? dataIsAllTimes;
          return (
            <>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-label text-foreground-muted">
                Availability
              </h3>
              <div className="inline-flex items-center gap-2">
                <span className="text-[12px] text-foreground-muted">
                  All Times
                </span>
                <Switch
                  checked={isAllTimes}
                  onChange={(v) => {
                    if (v) {
                      setValue("availability", DEFAULT_AVAILABILITY, { shouldDirty: true });
                      setAllTimesOverride(null); // data matches, clear override
                    } else {
                      setAllTimesOverride(false); // explicit OFF
                    }
                  }}
                />
              </div>
            </div>
            {errors.availability && (
              <p className="text-caption text-error">
                {errors.availability}
              </p>
            )}
            <div className={cn(
              "border border-border rounded-xl overflow-hidden shadow-sm",
              isAllTimes && "opacity-40 pointer-events-none",
            )}>
              {/* Header */}
              <div className="grid grid-cols-12 bg-muted/50 px-6 py-3 border-b border-border text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                <div className="col-span-3">Day</div>
                <div className="col-span-1 text-center">On</div>
                <div className="col-span-4 px-4">Start Time</div>
                <div className="col-span-4 px-4">End Time</div>
              </div>
              {/* Rows */}
              <div className="divide-y divide-border">
                {DAY_KEYS.map((dayKey) => {
                  const day = availability[dayKey];
                  return (
                    <div
                      key={dayKey}
                      className="grid grid-cols-12 items-center px-6 py-3"
                    >
                      <div
                        className={cn(
                          "col-span-3 text-body-sm font-medium",
                          day.isEnabled
                            ? "text-foreground"
                            : "text-foreground-muted",
                        )}
                      >
                        {DAY_LABELS[dayKey]}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Switch
                          checked={day.isEnabled}
                          onChange={(v) => {
                            setAllTimesOverride(null);
                            setValue("availability", {
                              ...availability,
                              [dayKey]: {
                                ...day,
                                isEnabled: v,
                              },
                            }, { shouldDirty: true });
                          }}
                        />
                      </div>
                      <div className="col-span-4 px-4">
                        <Input
                          type="time"
                          value={timeToString(
                            day.startHours,
                            day.startMins,
                          )}
                          disabled={!day.isEnabled}
                          onChange={(e) => {
                            const {
                              hours,
                              mins,
                            } = parseTime(e.target.value);
                            setAllTimesOverride(null);
                            setValue("availability", {
                              ...availability,
                              [dayKey]: {
                                ...day,
                                startHours: hours,
                                startMins: mins,
                              },
                            }, { shouldDirty: true });
                          }}
                        />
                      </div>
                      <div className="col-span-4 px-4">
                        <Input
                          type="time"
                          value={timeToString(
                            day.endHours,
                            day.endMins,
                          )}
                          disabled={!day.isEnabled}
                          onChange={(e) => {
                            const {
                              hours,
                              mins,
                            } = parseTime(e.target.value);
                            setAllTimesOverride(null);
                            setValue("availability", {
                              ...availability,
                              [dayKey]: {
                                ...day,
                                endHours: hours,
                                endMins: mins,
                              },
                            }, { shouldDirty: true });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
