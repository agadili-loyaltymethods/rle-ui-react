/**
 * BulkCoreField — reusable renderer for core fields in the bulk-edit drawer.
 *
 * Extracted from bulk-edit-drawer.tsx. Renders different field types
 * (boolean/switch, textarea, date, number, segments, channels, tierLevels,
 * availability, enum select, text) wrapped in BulkField.
 */

import type { JSX } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Select, type SelectOption } from "@/shared/components/select";
import { MultiSelect } from "@/shared/components/multi-select";
import { BulkField } from "@/shared/components/bulk-field";
import { getMixedValue } from "@/shared/lib/bulk-field-utils";
import {
  toDateOnly,
  DEFAULT_AVAILABILITY,
  DAY_KEYS,
  DAY_LABELS,
  timeToString,
  parseTime,
  type BulkEditFormValues,
} from "../../lib/reward-form-helpers";
import type {
  RewardCatalogItem,
  EntitySchemaData,
  TierPolicyLevel,
  WeekAvailability,
} from "../../types/reward-policy";

export interface CoreFieldDef {
  key: string;
  label: string;
  type: string;
}

export interface BulkCoreFieldProps {
  field: CoreFieldDef;
  enabledFields: Set<string>;
  toggleField: (key: string) => void;
  selectedRewards: RewardCatalogItem[];
  schemaData: EntitySchemaData;
  errors: Record<string, string | undefined>;
  /** Segment select options */
  segmentSelectOptions?: SelectOption[];
  segmentsLoading?: boolean;
  /** Channel select options */
  channelSelectOptions?: SelectOption[];
  /** Tier policy options — needed for tierLevels type */
  tierPolicyOpts?: Array<{ id: string; name: string; primary?: boolean; levels: Array<{ name: string }> }>;
  tiersLoading?: boolean;
}

export function BulkCoreField({
  field,
  enabledFields,
  toggleField,
  selectedRewards,
  schemaData,
  errors,
  segmentSelectOptions = [],
  segmentsLoading = false,
  channelSelectOptions = [],
  tierPolicyOpts = [],
  tiersLoading = false,
}: BulkCoreFieldProps): JSX.Element | null {
  const { control } = useFormContext<BulkEditFormValues>();

  const enabled = enabledFields.has(field.key);
  const mixed = getMixedValue(selectedRewards, field.key, false);
  const error = errors[field.key];
  const enumValues = schemaData.enumFields[field.key];

  let inner: React.ReactNode;

  if (field.type === "boolean") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={!!f.value}
              onChange={f.onChange}
              disabled={!enabled}
            />
            <span className="text-body-sm text-foreground">{field.label}</span>
          </label>
        )}
      />
    );
  } else if (field.type === "textarea") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <textarea
              data-testid={`bulk-field-${field.key}-textarea`}
              id={`bulk-field-${field.key}`}
              className={cn(
                "flex w-full bg-[var(--input-bg)] text-foreground text-[14px]",
                "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                "border border-[var(--input-border)]",
                "transition-colors duration-[var(--duration-fast)]",
                "placeholder:text-foreground-muted",
                "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                "resize-y min-h-[60px]",
                error &&
                  "border-error focus-visible:border-error focus-visible:ring-error",
              )}
              value={String(f.value ?? "")}
              onChange={(e) => f.onChange(e.target.value)}
              rows={2}
              disabled={!enabled}
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  } else if (field.type === "date") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <Input
              type="date"
              value={toDateOnly(f.value as string)}
              onChange={(e) => f.onChange(e.target.value)}
              disabled={!enabled}
              error={!!error}
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  } else if (field.type === "number") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <Input
              type="number"
              value={f.value != null ? String(f.value) : ""}
              onChange={(e) => {
                const num = e.target.valueAsNumber;
                f.onChange(Number.isNaN(num) ? "" : num);
              }}
              min="0"
              disabled={!enabled}
              error={!!error}
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  } else if (field.type === "segments") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <MultiSelect
              value={Array.isArray(f.value) ? (f.value as string[]) : []}
              onChange={(v) => f.onChange(v)}
              options={segmentSelectOptions}
              placeholder="Select..."
              error={!!error}
              disabled={!enabled || segmentsLoading}
              showBulkActions
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  } else if (field.type === "channels") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <MultiSelect
              value={Array.isArray(f.value) ? (f.value as string[]) : []}
              onChange={(v) => f.onChange(v)}
              options={channelSelectOptions}
              placeholder="Select..."
              error={!!error}
              disabled={!enabled}
              showBulkActions
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  } else if (field.type === "tierLevels") {
    const tp = tierPolicyOpts.find((t) => t.primary) ?? tierPolicyOpts[0];
    inner = tiersLoading ? (
      <p className="text-body-sm text-foreground-muted py-2">Loading...</p>
    ) : !tp ? (
      <p className="text-body-sm text-foreground-muted py-2">No tier policies available</p>
    ) : (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => {
          const tls: TierPolicyLevel[] = Array.isArray(f.value) ? (f.value as TierPolicyLevel[]) : [];
          const allTiers = tls.length === 0;
          return (
            <div>
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <span className="text-[13px] font-medium text-foreground">{field.label}</span>
                <div className="inline-flex items-center gap-2">
                  <span className="text-[12px] text-foreground-muted">All Tiers</span>
                  <Switch
                    checked={allTiers}
                    onChange={(v) => {
                      if (v) {
                        f.onChange([]);
                      } else {
                        f.onChange(tp.levels.map((l) => ({ policyId: tp.id, level: l.name })));
                      }
                    }}
                    disabled={!enabled}
                  />
                </div>
              </div>
              <div className={cn(
                "grid grid-cols-2 gap-y-4 gap-x-6",
                (allTiers || !enabled) && "opacity-40 pointer-events-none",
              )}>
                {tp.levels.map((level) => {
                  const isChecked = tls.some((tl) => tl.policyId === tp.id && tl.level === level.name);
                  return (
                    <label key={level.name} className="inline-flex items-center gap-3 cursor-pointer group">
                      <Switch
                        checked={isChecked}
                        onChange={(v) => {
                          if (v) {
                            f.onChange([...tls, { policyId: tp.id, level: level.name }]);
                          } else {
                            f.onChange(tls.filter((tl) => !(tl.policyId === tp.id && tl.level === level.name)));
                          }
                        }}
                        disabled={!enabled || allTiers}
                      />
                      <span className="text-body-sm group-hover:text-foreground transition-colors">{level.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }}
      />
    );
  } else if (field.type === "availability") {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => {
          const value = (f.value as WeekAvailability) ?? DEFAULT_AVAILABILITY;
          const dataIsAllTimes = DAY_KEYS.every((k) => {
            const d = value[k];
            return d.isEnabled && d.startHours === 0 && d.startMins === 0 && d.endHours === 23 && d.endMins === 59;
          });
          return (
            <div>
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <span className="text-[13px] font-medium text-foreground">{field.label}</span>
                <div className="inline-flex items-center gap-2">
                  <span className="text-[12px] text-foreground-muted">All Times</span>
                  <Switch
                    checked={dataIsAllTimes}
                    onChange={(v) => {
                      if (v) {
                        f.onChange(DEFAULT_AVAILABILITY);
                      }
                    }}
                    disabled={!enabled}
                  />
                </div>
              </div>
              <div className={cn(
                "border border-border rounded-xl overflow-hidden shadow-sm",
                dataIsAllTimes && "opacity-40 pointer-events-none",
              )}>
                <div className="grid grid-cols-12 bg-muted/50 px-6 py-3 border-b border-border text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                  <div className="col-span-3">Day</div>
                  <div className="col-span-1 text-center">On</div>
                  <div className="col-span-4 px-4">Start Time</div>
                  <div className="col-span-4 px-4">End Time</div>
                </div>
                <div className="divide-y divide-border">
                  {DAY_KEYS.map((dayKey) => {
                    const day = value[dayKey];
                    return (
                      <div key={dayKey} className="grid grid-cols-12 items-center px-6 py-3">
                        <div className={cn(
                          "col-span-3 text-body-sm font-medium",
                          day.isEnabled ? "text-foreground" : "text-foreground-muted",
                        )}>
                          {DAY_LABELS[dayKey]}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Switch
                            checked={day.isEnabled}
                            onChange={(v) => {
                              f.onChange({ ...value, [dayKey]: { ...day, isEnabled: v } });
                            }}
                            disabled={!enabled}
                          />
                        </div>
                        <div className="col-span-4 px-4">
                          <Input
                            type="time"
                            value={timeToString(day.startHours, day.startMins)}
                            disabled={!enabled || !day.isEnabled}
                            onChange={(e) => {
                              const { hours, mins } = parseTime(e.target.value);
                              f.onChange({ ...value, [dayKey]: { ...day, startHours: hours, startMins: mins } });
                            }}
                          />
                        </div>
                        <div className="col-span-4 px-4">
                          <Input
                            type="time"
                            value={timeToString(day.endHours, day.endMins)}
                            disabled={!enabled || !day.isEnabled}
                            onChange={(e) => {
                              const { hours, mins } = parseTime(e.target.value);
                              f.onChange({ ...value, [dayKey]: { ...day, endHours: hours, endMins: mins } });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }}
      />
    );
  } else if (enumValues) {
    const options: SelectOption[] = enumValues.map((v) => ({
      value: v,
      label: v,
    }));
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <Select
              value={String(f.value ?? "")}
              onChange={(v) => f.onChange(v)}
              options={options}
              placeholder="—"
              error={!!error}
              disabled={!enabled}
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  } else {
    inner = (
      <Controller
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <div>
            <label className="mb-3 block text-[13px] font-medium text-foreground">{field.label}</label>
            <Input
              type="text"
              value={String(f.value ?? "")}
              onChange={(e) => f.onChange(e.target.value)}
              disabled={!enabled}
              error={!!error}
            />
            {error && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>
        )}
      />
    );
  }

  return (
    <BulkField
      key={field.key}
      fieldKey={field.key}
      enabled={enabled}
      mixed={mixed}
      onToggle={toggleField}
    >
      {inner}
    </BulkField>
  );
}
