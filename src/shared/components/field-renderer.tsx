import { Controller } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format-utils";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";
import { isNeverDate, NEVER_EXPIRES_DATE } from "@/shared/lib/date-utils";
import { MultiSelect, SearchableSelect } from "@/shared/components/multi-select";
import type { FieldConfig } from "@/shared/components/form-modal";

interface FieldRendererProps {
  field: FieldConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  testIdPrefix: string;
  disabled?: boolean;
  idPrefix?: string;
  className?: string;
}

/** Number input that displays with thousands separators as you type. */
function FormattedNumberInput({
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  error,
  disabled,
  id,
  className,
  "data-testid": testId,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  onBlur: () => void;
  name: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const displayValue =
    value === undefined || value === null ? "" : formatNumber(value);

  return (
    <Input
      id={id}
      data-testid={testId}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      name={name}
      className={className}
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw === "" || raw === "-") {
          onChange(undefined);
          return;
        }
        const num = Number(raw);
        if (!isNaN(num)) onChange(num);
      }}
      onBlur={onBlur}
    />
  );
}

function FieldRenderer({
  field,
  control,
  errors,
  testIdPrefix,
  disabled = false,
  idPrefix = "field",
  className,
}: FieldRendererProps) {
  const error = errors[field.name];
  const errorMessage = error?.message as string | undefined;

  return (
    <div className={className}>
      <label
        htmlFor={`${idPrefix}-${field.name}`}
        className="mb-1.5 block text-label font-medium text-foreground"
      >
        {field.label}
        {field.required && <span className="ml-0.5 text-error">*</span>}
      </label>

      <Controller
        name={field.name}
        control={control}
        render={({ field: formField }) => {
          switch (field.type) {
            case "text":
            case "date":
              return (
                <Input
                  id={`${idPrefix}-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  error={!!error}
                  disabled={disabled}
                  {...formField}
                  value={(formField.value as string | number) ?? ""}
                  onChange={(e) => formField.onChange(e.target.value)}
                />
              );

            case "number":
              return (
                <FormattedNumberInput
                  id={`${idPrefix}-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  placeholder={field.placeholder}
                  error={!!error}
                  disabled={disabled}
                  value={formField.value as number | undefined}
                  onChange={formField.onChange}
                  onBlur={formField.onBlur}
                  name={formField.name}
                />
              );

            case "textarea":
              return (
                <textarea
                  id={`${idPrefix}-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  rows={3}
                  className={cn(
                    "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                    "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                    "border border-[var(--input-border)]",
                    "transition-colors duration-[var(--duration-fast)]",
                    "placeholder:text-foreground-muted",
                    "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                    "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
                    error &&
                      "border-error focus-visible:border-error focus-visible:ring-error",
                  )}
                  {...formField}
                  value={(formField.value as string) ?? ""}
                />
              );

            case "select": {
              const hasEmptyOption = field.options?.some((opt) => !opt.value);
              const currentValue = (formField.value as string) || "__none__";
              return (
                <Select
                  value={currentValue}
                  onValueChange={(v) => formField.onChange(v === "__none__" ? "" : v)}
                  disabled={disabled}
                >
                  <SelectTrigger
                    id={`${idPrefix}-${field.name}`}
                    data-testid={`${testIdPrefix}-field-${field.name}`}
                    error={!!error}
                  >
                    <SelectValue placeholder={field.placeholder ?? "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {!hasEmptyOption && (
                      <SelectItem value="__none__">
                        {field.placeholder ?? "Select..."}
                      </SelectItem>
                    )}
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value || "__none__"} value={opt.value || "__none__"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }

            case "searchable-select":
              return (
                <SearchableSelect
                  value={(formField.value as string) ?? ""}
                  onChange={formField.onChange}
                  options={field.options ?? []}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  error={!!error}
                  testIdPrefix={`${testIdPrefix}-field-${field.name}`}
                />
              );

            case "multiselect": {
              const selected = (formField.value as string[]) ?? [];
              return (
                <div
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  className="flex flex-wrap gap-x-4 gap-y-2"
                >
                  {field.options?.map((opt) => {
                    const isChecked = selected.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "flex items-center gap-2",
                          !disabled && "cursor-pointer",
                        )}
                      >
                        <input
                          type="checkbox"
                          disabled={disabled}
                          data-testid={`${testIdPrefix}-field-${field.name}-${opt.value}`}
                          aria-label={opt.label}
                          className="h-4 w-4 rounded-sm border-border-strong accent-brand disabled:opacity-50"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selected, opt.value]
                              : selected.filter((v) => v !== opt.value);
                            formField.onChange(next);
                          }}
                        />
                        <span className="text-body-sm text-foreground">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              );
            }

            case "searchable-multiselect":
              return (
                <MultiSelect
                  value={(formField.value as string[]) ?? []}
                  onChange={formField.onChange}
                  options={field.options ?? []}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  error={!!error}
                  testIdPrefix={`${testIdPrefix}-field-${field.name}`}
                />
              );

            case "checkbox":
              return (
                <label className={cn("flex items-center gap-2", !disabled && "cursor-pointer")}>
                  <input
                    id={`${idPrefix}-${field.name}`}
                    data-testid={`${testIdPrefix}-field-${field.name}`}
                    type="checkbox"
                    disabled={disabled}
                    className="h-4 w-4 rounded-sm border-border-strong accent-brand disabled:opacity-50"
                    checked={(formField.value as boolean) ?? false}
                    onChange={(e) => formField.onChange(e.target.checked)}
                  />
                  <span className="text-body-sm text-foreground">
                    {field.placeholder}
                  </span>
                </label>
              );

            case "date-never": {
              const neverChecked = isNeverDate(formField.value as string);
              return (
                <div className="space-y-2">
                  <label className={cn("flex items-center gap-2", !disabled && "cursor-pointer")}>
                    <input
                      data-testid={`${testIdPrefix}-field-${field.name}-never`}
                      aria-label={field.placeholder ?? "Never expires"}
                      type="checkbox"
                      disabled={disabled}
                      className="h-4 w-4 rounded-sm border-border-strong accent-brand disabled:opacity-50"
                      checked={neverChecked}
                      onChange={(e) => {
                        formField.onChange(e.target.checked ? NEVER_EXPIRES_DATE : "");
                      }}
                    />
                    <span className="text-body-sm text-foreground">
                      {field.placeholder ?? "Never expires"}
                    </span>
                  </label>
                  {!neverChecked && (
                    <Input
                      id={`${idPrefix}-${field.name}`}
                      data-testid={`${testIdPrefix}-field-${field.name}`}
                      type="date"
                      error={!!error}
                      disabled={disabled}
                      {...formField}
                      value={(formField.value as string) ?? ""}
                    />
                  )}
                </div>
              );
            }

            case "warning-days": {
              const raw = (formField.value as string) ?? "";
              const days = raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map(Number)
                .filter((n) => !isNaN(n));

              const updateDays = (next: number[]) => {
                formField.onChange(next.length > 0 ? next.join(",") : "");
              };

              return (
                <div className="space-y-2">
                  {days.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <FormattedNumberInput
                        data-testid={`${testIdPrefix}-field-${field.name}-${i}`}
                        disabled={disabled}
                        className="h-9 w-24 text-label"
                        name={`${field.name}-${i}`}
                        value={d}
                        onChange={(v) => {
                          const next = [...days];
                          next[i] = v ?? 0;
                          updateDays(next);
                        }}
                        onBlur={() => {}}
                      />
                      <span className="text-label text-foreground-muted">
                        days before expiry
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          data-testid={`${testIdPrefix}-field-${field.name}-${i}-remove`}
                          aria-label={`Remove warning day ${d}`}
                          onClick={() => {
                            updateDays(days.filter((_, j) => j !== i));
                          }}
                          className="ml-auto rounded p-1 text-foreground-muted hover:bg-[var(--color-bg-hover)] hover:text-error"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!disabled && (
                    <button
                      type="button"
                      data-testid={`${testIdPrefix}-field-${field.name}-add`}
                      aria-label="Add warning day"
                      onClick={() => updateDays([...days, 30])}
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-label font-medium text-brand hover:bg-[var(--color-bg-hover)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add warning
                    </button>
                  )}
                </div>
              );
            }

            default:
              return <></>;
          }
        }}
      />

      {errorMessage && (
        <p className="mt-1 text-caption text-error">{errorMessage}</p>
      )}
    </div>
  );
}

export { FieldRenderer, FormattedNumberInput };
export type { FieldRendererProps };
