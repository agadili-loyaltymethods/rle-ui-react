/**
 * Shared renderer for core (non-extension) form fields.
 *
 * Used by both EntityFormDrawer and BulkEditDrawer to avoid duplication.
 */

import type { JSX } from "react";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Select, type SelectOption } from "@/shared/components/select";
import { MultiSelect } from "@/shared/components/multi-select";
import type { CoreFieldDef } from "@/shared/types/core-field";

interface CoreFieldRendererProps {
  def: CoreFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  enumOptions?: string[];
  /** Pre-loaded reference options for ref-select / ref-multiselect */
  refOptions?: SelectOption[];
  /** Override readOnly from def (e.g. computed at runtime) */
  readOnly?: boolean;
}

export function CoreFieldRenderer({
  def,
  value,
  onChange,
  error,
  enumOptions,
  refOptions,
  readOnly: readOnlyOverride,
}: CoreFieldRendererProps): JSX.Element {
  const isReadOnly = readOnlyOverride ?? def.readOnly ?? false;

  const requiredStar = def.required ? (
    <span className="ml-0.5 text-error">*</span>
  ) : null;

  const rawEnumOptions = def.staticOptions ?? enumOptions;
  const resolvedEnumOptions = rawEnumOptions && def.excludeOptions
    ? rawEnumOptions.filter((v) => !def.excludeOptions!.includes(v))
    : rawEnumOptions;
  if (def.type === "enum" && resolvedEnumOptions && resolvedEnumOptions.length > 0) {
    const opts: SelectOption[] = [
      ...(def.required ? [] : [{ value: "", label: "None" }]),
      ...resolvedEnumOptions.map((v) => ({ value: v, label: v })),
    ];
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {def.label}
          {requiredStar}
        </label>
        <Select
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
          options={opts}
          placeholder="—"
          error={!!error}
          disabled={isReadOnly}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  if (def.type === "ref-select") {
    const opts: SelectOption[] = [
      ...(def.required ? [] : [{ value: "", label: "None" }]),
      ...(refOptions ?? []),
    ];
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {def.label}
          {requiredStar}
        </label>
        <Select
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
          options={opts}
          placeholder="—"
          error={!!error}
          disabled={isReadOnly}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  if (def.type === "ref-multiselect") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {def.label}
          {requiredStar}
        </label>
        <MultiSelect
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(v)}
          options={refOptions ?? []}
          placeholder="Select..."
          showBulkActions
          error={!!error}
          disabled={isReadOnly}
          testIdPrefix={`core-field-${def.field}`}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  if (def.type === "boolean") {
    return (
      <label className={cn("flex items-center gap-2", isReadOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
        <Switch checked={!!value} onChange={(v) => onChange(v)} disabled={isReadOnly} />
        <span className="text-body-sm text-foreground">{def.label}</span>
      </label>
    );
  }

  if (def.type === "textarea") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {def.label}
          {requiredStar}
        </label>
        <textarea
          data-testid={`core-field-${def.label.toLowerCase().replace(/\s+/g, "-")}`}
          aria-label={def.label}
          className={cn(
            "w-full rounded-[var(--input-radius)] border bg-[var(--input-bg)] px-[var(--input-padding-x)] py-2 text-body-sm text-foreground placeholder:text-foreground-muted",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            error ? "border-error focus-visible:border-error focus-visible:ring-error" : "border-[var(--input-border)]",
          )}
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  if (def.type === "number") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {def.label}
          {requiredStar}
        </label>
        <Input
          type="number"
          value={value != null ? String(value) : ""}
          onChange={(e) => {
            const num = e.target.valueAsNumber;
            onChange(Number.isNaN(num) ? "" : num);
          }}
          error={!!error}
          disabled={isReadOnly}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  if (def.type === "date") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {def.label}
          {requiredStar}
        </label>
        <Input
          type="date"
          value={value ? String(value).slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          disabled={isReadOnly}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Default: text
  return (
    <div>
      <label className="mb-3 block text-label text-foreground-muted">
        {def.label}
        {requiredStar}
      </label>
      <Input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.placeholder}
        error={!!error}
        disabled={isReadOnly}
      />
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}
