import { type ColumnDef } from "@tanstack/react-table";
import { Controller, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { ArrowUpDown, Check, Minus, Pencil, Plus, Trash2, Calendar, Wallet, TrendingUp, ShieldAlert, Settings, Clock, Lock, X } from "lucide-react";
import { Switch } from "@/shared/ui/switch";
import type { PursePolicy } from "@/shared/types/policy";
import type { FieldConfig } from "@/shared/components/form-modal";
import type { PolicyListConfig } from "../components/policy-list-page";
import type { EntityEditConfig } from "@/shared/components/entity-edit-page";
import { Badge } from "@/shared/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";
import { FormattedNumberInput } from "@/shared/components/field-renderer";
import { formatDate, toDateOnly, todayDateOnly, NEVER_EXPIRES_DATE } from "@/shared/lib/date-utils";
import { formatNumber } from "@/shared/lib/format-utils";

/** A qualifying period is locked when its periodEndDate is in the past. */
function isPeriodPast(entity: Record<string, unknown>): { locked: boolean; message?: string } {
  const endDate = entity.periodEndDate as string | undefined;
  if (!endDate) return { locked: false };
  if (toDateOnly(endDate) < todayDateOnly()) {
    return { locked: true, message: "This period has ended and cannot be modified." };
  }
  return { locked: false };
}

function SortableHeader({ column, label }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" }; label: string }) {
  return (
    <button
      data-testid={`purse-sort-${label.toLowerCase().replace(/\s+/g, "-")}`}
      aria-label={`Sort by ${label}`}
      className="flex items-center gap-1 text-body-sm font-medium text-foreground-muted hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );
}

const columns: ColumnDef<PursePolicy, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="Name" />,
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: "group",
    header: ({ column }) => <SortableHeader column={column} label="Group" />,
    cell: ({ getValue }) => {
      const v = getValue<string>();
      return v ? <Badge variant="secondary">{v}</Badge> : <span className="text-foreground-muted">None</span>;
    },
  },
  {
    accessorKey: "primary",
    header: ({ column }) => <SortableHeader column={column} label="Primary" />,
    cell: ({ getValue }) => getValue<boolean>()
      ? <Check className="h-4 w-4 text-success" />
      : <Minus className="h-4 w-4 text-foreground-muted" />,
  },
  {
    accessorKey: "ptMultiplier",
    header: ({ column }) => <SortableHeader column={column} label="Pt Multiplier" />,
    cell: ({ getValue }) => formatNumber(getValue<number>(), 1),
  },
  {
    accessorKey: "effectiveDate",
    header: ({ column }) => <SortableHeader column={column} label="Effective Date" />,
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    accessorKey: "expirationDate",
    header: ({ column }) => <SortableHeader column={column} label="Expiration Date" />,
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    accessorKey: "expirationType",
    header: ({ column }) => <SortableHeader column={column} label="Expiration Type" />,
    cell: ({ getValue }) => {
      const v = getValue<string>();
      if (!v || v === "None") return <span className="text-foreground-muted">None</span>;
      return <Badge variant="info">{v}</Badge>;
    },
  },
  {
    accessorKey: "overdraftLimit",
    header: ({ column }) => <SortableHeader column={column} label="Overdraft" />,
    cell: ({ getValue }) => formatNumber(getValue<number>()),
  },
  {
    id: "actions",
    header: () => null,
    cell: () => null,
    enableSorting: false,
  },
];

const isEditMode = (v: Record<string, unknown>) => !!v._id;

export interface PurseEditDynamicOptions {
  groupOptions?: { value: string; label: string }[];
  timezoneOptions?: { value: string; label: string }[];
  aggregateTypeOptions?: { value: string; label: string }[];
  snapToOptions?: { value: string; label: string }[];
  divisionOptions?: { value: string; label: string }[];
}

function buildGeneralFields(dynamicOptions?: PurseEditDynamicOptions): FieldConfig[] {
  const tzOpts = dynamicOptions?.timezoneOptions ?? [];
  return [
    { name: "name", label: "Name", type: "text", required: true, disabled: isEditMode, fullWidth: true },
    { name: "desc", label: "Description", type: "textarea" },
    {
      name: "divisions",
      label: "Divisions",
      type: "searchable-multiselect",
      options: dynamicOptions?.divisionOptions ?? [],
      placeholder: "Select divisions",
    },
    // Create mode: checkbox to opt in to qualifying, then free-text group name
    { name: "_qualifying", label: "Qualifying", type: "checkbox", placeholder: "This is a qualifying purse", visible: (v) => !v._id },
    {
      name: "group",
      label: "Qualifying Group Name",
      type: "text",
      placeholder: "e.g. Tier Credits",
      visible: (v) => v._id ? !!v.group : !!v._qualifying,
      disabled: isEditMode,
    },
    { name: "effectiveDate", label: "Effective Date", type: "date", required: true },
    { name: "expirationDate", label: "Expiration Date", type: "date-never", required: true, placeholder: "Never expires", visible: (v) => !isQualifying(v) },
    { name: "ptMultiplier", label: "Point Multiplier", type: "number", placeholder: "1" },
    { name: "primary", label: "Primary", type: "checkbox", placeholder: "Mark as primary purse" },
    { name: "overdraftLimit", label: "Overdraft Limit", type: "number", placeholder: "0" },
    { name: "reverseSign", label: "Reverse Sign", type: "checkbox", placeholder: "Reverse point sign" },
    { name: "periodStartDate", label: "Period Start Date", type: "date", visible: isQualifying, disabled: isEditMode },
    { name: "periodEndDate", label: "Period End Date", type: "date", visible: isQualifying, disabled: isEditMode },
    { name: "periodCloseDate", label: "Period Close Date", type: "date", visible: isQualifying },
    {
      name: "periodTimezone",
      label: "Period Timezone",
      type: tzOpts.length > 0 ? "searchable-select" : "text",
      ...(tzOpts.length > 0
        ? { options: tzOpts, placeholder: "Search timezones..." }
        : { placeholder: "e.g. America/New_York" }),
      visible: isQualifying,
    },
    {
      name: "aggregates",
      label: "Aggregates",
      type: "multiselect",
      options: dynamicOptions?.aggregateTypeOptions ?? [],
      placeholder: "Select aggregate types",
      visible: isQualifying,
    },
  ];
}

const expiryUnitOptions = [
  { value: "Days", label: "Days" },
  { value: "Hours", label: "Hours" },
  { value: "Months", label: "Months" },
  { value: "Years", label: "Years" },
];

/* ── Expiration tab custom content ── */
function ExpirationTabContent({ form, snapToOptions }: { form: UseFormReturn; mode: "create" | "edit"; snapToOptions: { value: string; label: string }[] }) {
  const expirationType = form.watch("expirationType") as string | undefined;
  const hasRolling = expirationType === "Custom" || expirationType === "Both";
  const hasInactivity = expirationType === "Activity-Based" || expirationType === "Both";

  const setExpirationFlags = (rolling: boolean, inactivity: boolean) => {
    let val: string;
    if (rolling && inactivity) val = "Both";
    else if (rolling) val = "Custom";
    else if (inactivity) val = "Activity-Based";
    else val = "None";
    form.setValue("expirationType", val, { shouldDirty: true });
  };

  // Warning days state
  const rawWarningVal = form.watch("expiryWarningDays");
  const rawWarning = rawWarningVal != null ? String(rawWarningVal) : "";
  const warningDays = rawWarning
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));

  const updateWarningDays = (next: number[]) => {
    form.setValue("expiryWarningDays", next.length > 0 ? next.join(",") : "", { shouldDirty: true });
  };

  return (
    <div className="max-w-[var(--width-form-max)] space-y-6">
      {/* Rolling Expiration group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={hasRolling}
            onChange={(v) => setExpirationFlags(v, hasInactivity)}
            data-testid="purse-expiry-rolling-switch"
            aria-label="Enable rolling expiration"
          />
          <span className="text-label font-medium text-foreground">Rolling Expiration</span>
        </label>
        <p className="text-caption text-foreground-muted">
          Points expire after a fixed period from the time they are earned.
        </p>

        {hasRolling && (
          <>
            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">
                Expiration Duration
              </label>
              <div className="flex items-center gap-3">
                <span className="text-body-sm text-foreground-muted whitespace-nowrap">Expire after</span>
                <Controller
                  name="expiryValue"
                  control={form.control}
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
                <InlineSelect
                  name="expiryUnit"
                  control={form.control}
                  options={expiryUnitOptions}
                  placeholder="Unit"
                  className="w-35"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">
                Snap To
              </label>
              <p className="mb-3 text-caption text-foreground-muted">
                Round the expiration to the nearest time boundary.
              </p>
              <InlineSelect
                name="expirationSnapTo"
                control={form.control}
                options={snapToOptions}
                placeholder="None"
              />
            </div>
          </>
        )}
      </div>

      {/* Inactivity-Based Expiration group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={hasInactivity}
            onChange={(v) => setExpirationFlags(hasRolling, v)}
            data-testid="purse-expiry-inactivity-switch"
            aria-label="Enable inactivity-based expiration"
          />
          <span className="text-label font-medium text-foreground">Inactivity-Based Expiration</span>
        </label>
        <p className="text-caption text-foreground-muted">
          Entire balance expires after a period of inactivity.
        </p>

        {hasInactivity && (
          <div>
            <label className="mb-1.5 block text-label font-medium text-foreground">
              Inactivity Threshold
            </label>
            <div className="flex items-center gap-3">
              <span className="text-body-sm text-foreground-muted whitespace-nowrap">Expire after</span>
              <Controller
                name="inactiveDays"
                control={form.control}
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
              <span className="text-body-sm text-foreground-muted whitespace-nowrap">days of inactivity</span>
            </div>
          </div>
        )}
      </div>

      {/* Warning Days — shown when any expiration is enabled */}
      {(hasRolling || hasInactivity) && (
        <div>
          <label className="mb-1.5 block text-label font-medium text-foreground">
            Warning Notifications
          </label>
          <p className="mb-3 text-caption text-foreground-muted">
            Send warnings before points expire.
          </p>
          <div className="space-y-2">
            {warningDays.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <FormattedNumberInput
                  className="h-9 w-24 text-label"
                  name={`expiryWarningDays-${i}`}
                  value={d}
                  onChange={(v) => {
                    const next = [...warningDays];
                    next[i] = v ?? 0;
                    updateWarningDays(next);
                  }}
                  onBlur={() => {}}
                />
                <span className="text-label text-foreground-muted">
                  days before expiry
                </span>
                <button
                  type="button"
                  data-testid={`purse-expiry-remove-warning-${i}`}
                  aria-label={`Remove warning day ${i + 1}`}
                  className="ml-auto rounded p-1 text-foreground-muted hover:bg-[var(--color-bg-hover)] hover:text-error"
                  onClick={() => updateWarningDays(warningDays.filter((_, j) => j !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              data-testid="purse-expiry-add-warning"
              aria-label="Add warning day"
              className="flex items-center gap-1.5 rounded px-2 py-1 text-label font-medium text-brand hover:bg-[var(--color-bg-hover)]"
              onClick={() => updateWarningDays([...warningDays, 30])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add warning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const unitOptions = [
  { value: "__none__", label: "None" },
  { value: "Days", label: "Days" },
  { value: "Hours", label: "Hours" },
  { value: "Months", label: "Months" },
  { value: "Years", label: "Years" },
];


/* ── Inline select helper for custom tab rendering ── */
function InlineSelect({
  name,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control,
  options,
  placeholder,
  disabled,
  className,
}: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const rawValue = (field.value as string) || "";
        // Find a matching option; fall back to first option if no match
        const selectedOpt = options.find((o) => o.value === rawValue);
        const currentValue = selectedOpt ? rawValue : options[0]?.value ?? "__none__";
        const displayText = (selectedOpt ?? options[0])?.label;
        return (
          <Select
            value={currentValue}
            onValueChange={(v) => field.onChange(v)}
            disabled={disabled}
          >
            <SelectTrigger className={className}>
              <SelectValue placeholder={placeholder ?? "Select..."}>
                {displayText}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}

/* ── Escrow tab custom content ── */
function EscrowTabContent({ form, snapToOptions }: { form: UseFormReturn; mode: "create" | "edit"; snapToOptions: { value: string; label: string }[] }) {
  return (
    <div className="max-w-[var(--width-form-max)] space-y-6">
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
            name="escrowValue"
            control={form.control}
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
          <InlineSelect
            name="escrowUnit"
            control={form.control}
            options={unitOptions}
            placeholder="Unit"
            className="w-35"
          />
        </div>
      </div>

      {/* Escrow Snap To */}
      <div>
        <label className="mb-1.5 block text-label font-medium text-foreground">
          Snap To
        </label>
        <p className="mb-3 text-caption text-foreground-muted">
          Round the escrow release to the nearest time boundary.
        </p>
        <InlineSelect
          name="escrowSnapTo"
          control={form.control}
          options={snapToOptions}
          placeholder="None"
        />
      </div>
    </div>
  );
}

const isQualifying = (v: Record<string, unknown>) => !!v.group || !!v._qualifying;

export const pursePolicySchema = z.object({
  name: z.string().min(1, "Name is required").max(250),
  desc: z.string().max(250).optional(),
  _qualifying: z.boolean().optional(),
  group: z.string().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  expirationDate: z.string().min(1, "Expiration date is required"),
  ptMultiplier: z.coerce.number().optional(),
  primary: z.boolean().optional(),
  overdraftLimit: z.coerce.number().min(0).optional(),
  reverseSign: z.boolean().optional(),
  expirationType: z.string().optional(),
  expiryUnit: z.string().optional(),
  expiryValue: z.coerce.number().min(0).optional(),
  expirationSnapTo: z.string().optional(),
  expiryWarningDays: z.string().optional(),
  escrowUnit: z.string().optional(),
  escrowValue: z.coerce.number().min(0).optional(),
  escrowSnapTo: z.string().optional(),
  periodStartDate: z.string().optional(),
  periodEndDate: z.string().optional(),
  periodCloseDate: z.string().optional(),
  periodTimezone: z.string().optional(),
  aggregates: z.array(z.string()).optional(),
  divisions: z.array(z.string()).optional(),
  enableAutomaticExpiration: z.boolean().optional(),
  inactiveDays: z.coerce.number().min(1).optional(),
  expirationStartDate: z.string().optional(),
  expirationEndDate: z.string().optional(),
  repeatInterval: z.coerce.number().min(1).optional(),
  frequency: z.string().optional(),
});

function PursePolicyCard({ item, onEdit, onDelete }: { item: PursePolicy; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card hover key={item._id} data-testid={`purse-card-${item._id}`} className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-amber-light)] text-[var(--color-accent-amber)]">
              <Wallet className="h-4 w-4" />
            </div>
            <CardTitle className="text-body font-medium">{item.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
              onClick={onEdit}
              title="Edit"
              aria-label={`Edit ${item.name}`}
              data-testid={`purse-config-card-edit-${item._id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-error/5 hover:text-error transition-colors"
              onClick={onDelete}
              title="Delete"
              aria-label={`Delete ${item.name}`}
              data-testid={`purse-config-card-delete-${item._id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1 ml-10">
          {item.primary && <Badge variant="success" className="text-[10px] px-2 py-0.5">Primary</Badge>}
          {item.group && <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{item.group}</Badge>}
          {item.expirationType && item.expirationType !== "None" && (
            <Badge variant="info" className="text-[10px] px-2 py-0.5">
              {item.expirationType === "Custom" ? "Rolling" : item.expirationType === "Activity-Based" ? "Inactivity" : item.expirationType === "Both" ? "Rolling + Inactivity" : item.expirationType}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2 text-body-sm">
          <div className="flex items-center gap-2 text-foreground-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Pt Multiplier: <span className="text-foreground">{formatNumber(item.ptMultiplier, 1)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground-muted">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Overdraft: <span className="text-foreground">{formatNumber(item.overdraftLimit)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground-muted">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(item.effectiveDate)} &rarr; {formatDate(item.expirationDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function buildPursePolicyEditConfig(dynamicOptions?: PurseEditDynamicOptions): EntityEditConfig {
  const snapToOpts = dynamicOptions?.snapToOptions ?? [];

  return {
    entityName: "Purse Policy",
    endpoint: "pursepolicies",
    testIdPrefix: "purse",
    listPath: "/program/purse-policies",
    schema: pursePolicySchema as unknown as import("zod").ZodObject<import("zod").ZodRawShape>,
    defaultValues: {
      _qualifying: false,
      ptMultiplier: 1,
      overdraftLimit: 0,
      primary: false,
      reverseSign: false,
      expirationType: "None",
      expirationSnapTo: "now",
      escrowSnapTo: "now",
      enableAutomaticExpiration: false,
      expirationDate: NEVER_EXPIRES_DATE,
      aggregates: [],
    },
    isReadOnly: isPeriodPast,
    prepareCreate: (data, programId) => {
      const { _qualifying: _, ...rest } = data;
      return { ...rest, program: programId };
    },
    tabs: [
      {
        id: "general",
        label: "General",
        icon: Settings,
        columns: 2,
        fields: buildGeneralFields(dynamicOptions),
      },
      {
        id: "expiration",
        label: "Expiration",
        icon: Clock,
        renderContent: (form, mode) => <ExpirationTabContent form={form} mode={mode} snapToOptions={snapToOpts} />,
        visible: (v) => !isQualifying(v),
      },
      {
        id: "escrow",
        label: "Escrow",
        icon: Lock,
        renderContent: (form, mode) => <EscrowTabContent form={form} mode={mode} snapToOptions={snapToOpts} />,
        visible: (v) => !isQualifying(v),
      },
    ],
  };
}

export const pursePolicyConfig: PolicyListConfig<PursePolicy> = {
  title: "Purse Policies",
  testIdPrefix: "purse",
  endpoint: "pursepolicies",
  basePath: "/program/purse-policies",
  columns,
  renderCard: (item, actions) => (
    <PursePolicyCard key={item._id} item={item} onEdit={actions.onEdit} onDelete={actions.onDelete} />
  ),
};
