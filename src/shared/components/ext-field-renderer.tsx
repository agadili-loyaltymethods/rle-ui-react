/**
 * Extension field renderer for schema-driven forms.
 *
 * Renders individual extension fields based on their type from the metaschema.
 * Shared between reference-data and reward-catalog features.
 */

import { type JSX } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Select, type SelectOption } from "@/shared/components/select";

/** Minimal ext field definition — subset used by the renderer. */
export interface ExtFieldRendererDef {
  type: string;
  title: string;
  format?: string;
  required: boolean;
  enum?: string[];
}

/** Minimal schema shape needed by ExtFieldRenderer — satisfied by both EntitySchemaData and RewardSchemaData. */
export interface ExtFieldSchemaData {
  extFields: Record<string, { enum?: string[] }>;
  enumFields: Record<string, string[]>;
}

function toDateOnly(iso: string | undefined | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function isUrlField(fieldName: string, def: ExtFieldRendererDef): boolean {
  if (def.format === "uri" || def.format === "url") return true;
  const lower = fieldName.toLowerCase();
  return lower.includes("url") || lower.includes("imagelistpage");
}

export function ExtFieldRenderer({
  fieldName,
  def,
  value,
  onChange,
  error,
  schemaData,
  onPreviewUrl,
}: {
  fieldName: string;
  def: ExtFieldRendererDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  schemaData: ExtFieldSchemaData | null;
  onPreviewUrl?: (url: string) => void;
}): JSX.Element {
  const label = def.title || fieldName;
  const requiredStar = def.required ? (
    <span className="ml-0.5 text-error">*</span>
  ) : null;
  const enumValues = schemaData?.enumFields[fieldName] ?? def.enum;

  // Enum → Select dropdown
  if (enumValues && enumValues.length > 0) {
    const options: SelectOption[] = enumValues.map((v) => ({
      value: v,
      label: v,
    }));
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <Select
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
          options={options}
          placeholder="—"
          error={!!error}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Boolean → Toggle switch
  if (def.type === "boolean") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch checked={!!value} onChange={(v) => onChange(v)} />
        <span className="text-body-sm text-foreground">{label}</span>
      </label>
    );
  }

  // Number
  if (def.type === "number" || def.type === "integer") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <Input
          type="number"
          value={value != null ? String(value) : ""}
          onChange={(e) => {
            const num = e.target.valueAsNumber;
            onChange(Number.isNaN(num) ? "" : num);
          }}
          min="0"
          error={!!error}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Date
  if (def.format === "date-time" || def.format === "date") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <Input
          type="date"
          value={toDateOnly(value as string)}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // URL — text input with preview button
  if (isUrlField(fieldName, def)) {
    const strVal = String(value ?? "");
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <div className="flex gap-1">
          <Input
            type="text"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            error={!!error}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!strVal.trim()}
            onClick={() => {
              let normalized = strVal.trim();
              if (normalized && !/^https?:\/\//i.test(normalized)) {
                normalized = "https://" + normalized;
              }
              if (!/^https?:\/\//i.test(normalized)) return;
              if (
                /\.(png|jpe?g|gif|svg|webp|bmp|ico)(\?.*)?$/i.test(normalized)
              ) {
                onPreviewUrl?.(normalized);
              } else {
                window.open(normalized, "_blank", "noopener,noreferrer");
              }
            }}
            title="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Default → text input
  return (
    <div>
      <label className="mb-3 block text-label text-foreground-muted">
        {label}
        {requiredStar}
      </label>
      <Input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
      />
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}
