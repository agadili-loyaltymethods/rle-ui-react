import * as React from "react";
import { useNavigate, useParams, useLocation, useBlocker } from "react-router";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { generateObjectId } from "@/shared/lib/format-utils";
import { useBreadcrumbOverride } from "@/shared/components/breadcrumb-context";
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Filter,
  Info,
  Link,
  Loader2,
  Plus,
  Puzzle,
  ListChecks,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";
import {
  useActivityTemplate,
  useSaveActivityTemplate,
  useDeleteActivityTemplate,
  useReasonCodeOptions,
} from "../hooks/use-activity-templates";
import { useEnumOptions, useCreateEnum } from "@/shared/hooks/use-enums";
import { useModelFieldOptions, useModelExtensionFieldOptions } from "@/shared/hooks/use-schema";

import { MultiSelect } from "@/shared/components/multi-select";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { useDivisionOptions } from "@/shared/hooks/use-divisions";
import { useProgram } from "../hooks/use-programs";
import type { FieldOption } from "@/shared/types/schema";
import {
  EXTENSION_FIELD_TYPE_OPTIONS,
  VALIDATION_RULE_TYPE_OPTIONS,
  CONDITION_OPERATOR_OPTIONS,
  CHANNEL_MODE_OPTIONS,
  CALC_KIND_OPTIONS,
  CALC_AGGREGATION_OPTIONS,
  CALC_SOURCE_OPTIONS,
  CALC_FILTER_OPERATOR_OPTIONS,
  CALC_ROUNDING_MODE_OPTIONS,
} from "../types/activity-template-config";
import { sortByDependencies, validateExpression, extractFieldRefs } from "../lib/calc-expression";
import type {
  ActivityTemplateConfig,
  CalculatedFieldDef,
  CalcFilter,
  CalcFilterOperator,
  ExtensionFieldDef,
  ExtensionFieldType,
  ValidationRuleDef,
  ValidationRuleType,
  ConditionOperator,
  RoundingMode,
} from "../types/activity-template-config";


/** An extension field discovered from the org-level Activity ExtensionSchema. */
interface ExternalFieldInfo {
  /** Sub-field name within the namespace (e.g. "storeRegion" from "fb.storeRegion"). */
  name: string;
  /** Display label from extUISchema uiDefs. */
  label: string;
  /** Field type mapped from JSON Schema. */
  fieldType: string;
  /** True if this template published this field (tracked in publishedFields). */
  owned: boolean;
}

type FieldRow =
  | { kind: "template"; field: ExtensionFieldDef }
  | { kind: "external"; info: ExternalFieldInfo };

// Tab → field mapping for error indicators
const TAB_FIELDS: Record<string, string[]> = {
  general: ["fieldName", "typeValues", "label"],
  validation: ["validationRules"],
  calculations: ["calculatedFields"],
};

// ── Extension Field Editor Modal ──

function ExtensionFieldModal({
  open,
  onOpenChange,
  field,
  onSave,
  existingNames,
  externalNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: ExtensionFieldDef | null;
  onSave: (field: ExtensionFieldDef) => void;
  existingNames: Set<string>;
  externalNames: Set<string>;
}) {
  const [name, setName] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<ExtensionFieldType>("string");
  const [required, setRequired] = React.useState(false);
  const [defaultValue, setDefaultValue] = React.useState("");
  const [options, setOptions] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (field) {
        setName(field.name);
        setLabel(field.label);
        setType(field.type);
        setRequired(field.required ?? false);
        setDefaultValue(field.defaultValue ?? "");
        setOptions(field.options?.join(", ") ?? "");
        setDescription(field.description ?? "");
      } else {
        setName("");
        setLabel("");
        setType("string");
        setRequired(false);
        setDefaultValue("");
        setOptions("");
        setDescription("");
      }
    }
  }, [open, field]);

  const nameError = React.useMemo(() => {
    if (!name) return "Field name is required";
    if (!/^[a-zA-Z_]\w*$/.test(name)) return "Must be a valid identifier";
    if (externalNames.has(name)) return "This field already exists in the external schema";
    if (existingNames.has(name) && name !== field?.name) return "Name already exists";
    return null;
  }, [name, existingNames, externalNames, field]);

  const handleSave = () => {
    if (nameError || !label) return;
    onSave({
      id: field?.id ?? generateObjectId(),
      name,
      label,
      type,
      required,
      defaultValue: defaultValue || undefined,
      options: type === "select" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      description: description || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-[var(--modal-width-md)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card shadow-modal max-h-[85vh] flex flex-col"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLElement | null;
            requestAnimationFrame(() => {
              const el = target?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled])');
              el?.focus();
            });
          }}
        >
          <VisuallyHidden>
            <Dialog.Description>
              {field ? "Edit extension field properties" : "Configure new extension field"}
            </Dialog.Description>
          </VisuallyHidden>
          <div className="flex items-start justify-between border-b border-border p-6 pb-4">
            <Dialog.Title className="text-h4 text-foreground">
              {field ? "Edit Field" : "Add Extension Field"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button data-testid="ext-field-modal-close" aria-label="Close" className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="space-y-4 p-6 overflow-y-auto">
            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">
                Field Name <span className="text-error">*</span>
              </label>
              <Input
                data-testid="ext-field-name"
                id="ext-field-name"
                aria-label="Field Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. storeRegion"
                error={!!(name && nameError)}
              />
              {name && nameError && <p className="mt-1 text-caption text-error">{nameError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">
                Label <span className="text-error">*</span>
              </label>
              <Input
                data-testid="ext-field-label"
                id="ext-field-label"
                aria-label="Label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Store Region"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as ExtensionFieldType)}>
                <SelectTrigger data-testid="ext-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[var(--z-toast)]">
                  {EXTENSION_FIELD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === "select" && (
              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">Options</label>
                <Input
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Option1, Option2, Option3"
                  data-testid="ext-field-options"
                />
                <p className="mt-1 text-caption text-foreground-muted">Comma-separated list of options</p>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                data-testid="ext-field-required"
                id="ext-field-required"
                aria-label="Required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="h-4 w-4 rounded-sm border-border-strong accent-brand"
              />
              <span className="text-body-sm text-foreground">Required</span>
            </label>
            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">Default Value</label>
              <Input
                data-testid="ext-field-default"
                id="ext-field-default"
                aria-label="Default Value"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Optional default"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-label font-medium text-foreground">Description</label>
              <textarea
                data-testid="ext-field-description"
                id="ext-field-description"
                aria-label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description"
                className={cn(
                  "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                  "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                  "border border-[var(--input-border)]",
                  "placeholder:text-foreground-muted resize-y",
                  "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                )}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border p-6 pt-4">
            <Dialog.Close asChild>
              <Button variant="ghost">Cancel</Button>
            </Dialog.Close>
            <Button
              onClick={handleSave}
              disabled={!!nameError || !label}
              data-testid="ext-field-save"
            >
              {field ? "Update" : "Add"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Searchable Field Picker ──

const TYPE_COLORS: Record<string, string> = {
  string: "bg-info-light text-on-info",
  number: "bg-accent-emerald-light text-accent-emerald",
  date: "bg-accent-amber-light text-accent-amber",
  boolean: "bg-accent-violet-light text-accent-violet",
  objectid: "bg-subtle text-foreground-muted",
};

function FieldTypeBadge({ type }: { type?: string }) {
  if (!type || type === "mixed") return null;
  const display = type === "objectid" ? "ref" : type;
  return (
    <span className={cn(
      "ml-auto shrink-0 rounded px-1.5 py-0.5 text-caption-xs font-medium leading-none",
      TYPE_COLORS[type] ?? "bg-subtle text-foreground-muted",
    )}>
      {display}
    </span>
  );
}

/** Numeric input that keeps the raw string while typing to allow decimals like 0.001. */
function NumericValueInput({ value, onChange, ...props }: { value: number | undefined; onChange: (v: number | undefined) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [raw, setRaw] = React.useState(value != null ? String(value) : "");
  const externalRef = React.useRef(value);

  // Sync from external value changes (e.g. rule type switch)
  React.useEffect(() => {
    if (value !== externalRef.current) {
      setRaw(value != null ? String(value) : "");
      externalRef.current = value;
    }
  }, [value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={(e) => {
        const v = e.target.value;
        // Allow empty, digits, decimal point, negative sign
        if (v !== "" && !/^-?\d*\.?\d*$/.test(v)) return;
        setRaw(v);
        const num = v ? Number(v) : undefined;
        if (num !== undefined && !isNaN(num)) {
          externalRef.current = num;
          onChange(num);
        } else if (v === "" || v === "-" || v === ".") {
          externalRef.current = undefined;
          onChange(undefined);
        }
      }}
      placeholder="Enter value"
    />
  );
}

// ── Pattern Editor ──

type PatternType = "starts_with" | "ends_with" | "contains" | "is_one_of" | "email" | "url" | "date" | "datetime" | "custom";

const PATTERN_TYPE_OPTIONS: { value: PatternType; label: string; needsInput: boolean; placeholder?: string }[] = [
  { value: "starts_with", label: "Starts with", needsInput: true, placeholder: "Enter text..." },
  { value: "ends_with", label: "Ends with", needsInput: true, placeholder: "Enter text..." },
  { value: "contains", label: "Contains", needsInput: true, placeholder: "Enter text..." },
  { value: "is_one_of", label: "Is one of", needsInput: true, placeholder: "value1, value2, value3" },
  { value: "email", label: "Valid Email", needsInput: false },
  { value: "url", label: "Valid URL", needsInput: false },
  { value: "date", label: "Valid Date — e.g. 2026-03-09", needsInput: false },
  { value: "datetime", label: "Valid Date/Time — e.g. 2026-03-09T14:30:00Z", needsInput: false },
  { value: "custom", label: "Custom Regex", needsInput: true, placeholder: "^[A-Z]+$" },
];

const PRESET_REGEXES = {
  email: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$",
  url: "^https?://[^\\s/$.?#].[^\\s]*$",
  date: "^\\d{4}-\\d{2}-\\d{2}$",
  datetime: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2})?(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})?$",
} as const;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeRegex(s: string) {
  return s.replace(/\\([.*+?^${}()|[\]\\])/g, "$1");
}

function buildRegex(type: PatternType, input: string): string {
  switch (type) {
    case "starts_with": return `^${escapeRegex(input)}`;
    case "ends_with": return `${escapeRegex(input)}$`;
    case "contains": return escapeRegex(input);
    case "is_one_of": return `^(${input.split(",").map((s) => escapeRegex(s.trim())).filter(Boolean).join("|")})$`;
    case "email": return PRESET_REGEXES.email;
    case "url": return PRESET_REGEXES.url;
    case "date": return PRESET_REGEXES.date;
    case "datetime": return PRESET_REGEXES.datetime;
    case "custom": return input;
  }
}

/** Attempt to reverse-parse a stored regex into a pattern type + user input. */
function parseRegex(regex: string): { type: PatternType; input: string } {
  if (!regex) return { type: "starts_with", input: "" };
  // Check presets first
  for (const [key, val] of Object.entries(PRESET_REGEXES)) {
    if (regex === val) return { type: key as PatternType, input: "" };
  }
  // Is one of: ^(a|b|c)$
  const oneOfMatch = regex.match(/^\^\((.+)\)\$$/);
  if (oneOfMatch?.[1]) {
    const parts = oneOfMatch[1].split("|").map(unescapeRegex);
    return { type: "is_one_of", input: parts.join(", ") };
  }
  // Starts with: ^value (no unescaped special chars after unescaping)
  if (regex.startsWith("^") && !regex.endsWith("$")) {
    const inner = regex.slice(1);
    const unescaped = unescapeRegex(inner);
    if (escapeRegex(unescaped) === inner) {
      return { type: "starts_with", input: unescaped };
    }
  }
  // Ends with: value$
  if (regex.endsWith("$") && !regex.startsWith("^")) {
    const inner = regex.slice(0, -1);
    const unescaped = unescapeRegex(inner);
    if (escapeRegex(unescaped) === inner) {
      return { type: "ends_with", input: unescaped };
    }
  }
  // Contains: plain escaped text (no anchors)
  if (!regex.startsWith("^") && !regex.endsWith("$")) {
    const unescaped = unescapeRegex(regex);
    if (escapeRegex(unescaped) === regex) {
      return { type: "contains", input: unescaped };
    }
  }
  return { type: "custom", input: regex };
}

function PatternEditor({ value, onChange }: { value: string; onChange: (regex: string) => void }) {
  const parsed = React.useMemo(() => parseRegex(value), [value]);
  const [patternType, setPatternType] = React.useState<PatternType>(parsed.type);
  const [input, setInput] = React.useState(parsed.input);

  // Sync when the external value changes (e.g. switching rules)
  const prevValueRef = React.useRef(value);
  React.useEffect(() => {
    if (value !== prevValueRef.current) {
      const p = parseRegex(value);
      setPatternType(p.type);
      setInput(p.input);
      prevValueRef.current = value;
    }
  }, [value]);

  const opt = PATTERN_TYPE_OPTIONS.find((o) => o.value === patternType)!;

  const handleTypeChange = (newType: PatternType) => {
    setPatternType(newType);
    const newOpt = PATTERN_TYPE_OPTIONS.find((o) => o.value === newType)!;
    if (!newOpt.needsInput) {
      const regex = buildRegex(newType, "");
      onChange(regex);
      prevValueRef.current = regex;
    } else {
      // Keep existing input if switching between input types, clear for custom
      const newInput = newType === "custom" ? (value || "") : input;
      setInput(newInput);
      if (newInput) {
        const regex = buildRegex(newType, newInput);
        onChange(regex);
        prevValueRef.current = regex;
      }
    }
  };

  const handleInputChange = (newInput: string) => {
    setInput(newInput);
    const regex = buildRegex(patternType, newInput);
    onChange(regex);
    prevValueRef.current = regex;
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-label font-medium text-foreground">
          Pattern Type <span className="text-error">*</span>
        </label>
        <Select value={patternType} onValueChange={(v) => handleTypeChange(v as PatternType)}>
          <SelectTrigger data-testid="rule-pattern-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PATTERN_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {opt.needsInput && (
        <div>
          <label className="mb-1.5 block text-label font-medium text-foreground">
            {patternType === "custom" ? "Regex" : "Value"} <span className="text-error">*</span>
          </label>
          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={opt.placeholder}
            data-testid="rule-value"
          />
        </div>
      )}
    </div>
  );
}

/** Renders a field label as: `Business Name [field.path]` with path in muted gray. */
function FieldItemLabel({ label, path, isSelected }: { label: string; path: string; isSelected: boolean }) {
  return (
    <span className={cn("truncate", isSelected ? "font-medium text-brand" : "text-foreground")}>
      {label}
      <span className="ml-1.5 font-normal text-foreground-muted/60">[{path}]</span>
    </span>
  );
}

function SearchableFieldPicker({
  value,
  onChange,
  standardFields,
  fieldOptions,
  apiExtFields = [],
  namespace,
  placeholder = "Select field...",
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  standardFields: FieldOption[];
  fieldOptions: { value: string; label: string; fieldType?: string }[];
  apiExtFields?: { value: string; label: string; fieldType?: string }[];
  namespace?: string;
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Deduplicate: exclude API ext fields that are already in template fieldOptions
  const templateExtNames = React.useMemo(
    () => new Set(fieldOptions.map((f) => f.value)),
    [fieldOptions],
  );
  const dedupedApiExt = React.useMemo(
    () => apiExtFields.filter((f) => !templateExtNames.has(f.value)),
    [apiExtFields, templateExtNames],
  );

  const lower = query.trim().toLowerCase();
  const filteredStandard = React.useMemo(
    () =>
      standardFields
        .filter((f) => !lower || f.label.toLowerCase().includes(lower) || f.value.toLowerCase().includes(lower))
        .sort((a, b) => {
          const aIsArray = a.label.startsWith("[") ? 1 : 0;
          const bIsArray = b.label.startsWith("[") ? 1 : 0;
          return aIsArray - bIsArray || a.label.localeCompare(b.label);
        }),
    [standardFields, lower],
  );
  const filteredExt = React.useMemo(
    () =>
      fieldOptions.filter(
        (f) => !lower || f.label.toLowerCase().includes(lower) || f.value.toLowerCase().includes(lower),
      ),
    [fieldOptions, lower],
  );
  const filteredApiExt = React.useMemo(
    () =>
      dedupedApiExt.filter(
        (f) => !lower || f.label.toLowerCase().includes(lower) || f.value.toLowerCase().includes(lower),
      ),
    [dedupedApiExt, lower],
  );

  const resolveLabel = (val: string) => {
    if (!val) return null;
    if (val.startsWith("ext.")) {
      const name = val.slice(4);
      const ext = fieldOptions.find((f) => f.value === name);
      if (ext) return ext.label;
      const apiExt = apiExtFields.find((f) => f.value === name);
      if (apiExt) return apiExt.label;
      return val;
    }
    const std = standardFields.find((f) => f.value === val);
    return std?.label ?? val;
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  const totalFiltered = filteredStandard.length + filteredExt.length + filteredApiExt.length;
  let sectionIndex = 0;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setQuery("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid={testId}
          aria-label={placeholder}
          className={cn(
            "flex w-full items-center justify-between",
            "bg-[var(--input-bg)] text-body-sm",
            "h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)]",
            "border border-[var(--input-border)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            value ? "text-foreground" : "text-foreground-muted",
          )}
        >
          <span className="truncate">{value ? resolveLabel(value) : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-foreground-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[var(--z-toast)] w-[var(--radix-popover-trigger-width)] rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--card-bg)] shadow-dropdown"
          side="bottom"
          sideOffset={4}
          align="start"
          avoidCollisions
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
              <input
                ref={searchRef}
                type="text"
                data-testid={testId ? `${testId}-search` : "field-picker-search"}
                aria-label="Search fields"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fields..."
                className={cn(
                  "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                  "py-1.5 pl-8 pr-3 text-label text-foreground placeholder:text-foreground-muted",
                  "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                )}
              />
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto px-1 pb-1">
            {totalFiltered === 0 ? (
              <p className="px-2 py-4 text-center text-label text-foreground-muted">No matching fields</p>
            ) : (
              <>
                {filteredStandard.length > 0 && (
                  <>
                    {sectionIndex++ > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                    <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                      Standard Fields
                    </div>
                    {filteredStandard.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        data-testid={`field-option-${f.value}`}
                        aria-label={`Select ${f.label}`}
                        onClick={() => handleSelect(f.value)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-label transition-colors",
                          "hover:bg-subtle",
                          value === f.value && "bg-brand/10",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            value === f.value ? "text-brand" : "text-transparent",
                          )}
                        />
                        <FieldItemLabel label={f.label} path={f.value} isSelected={value === f.value} />
                        <FieldTypeBadge type={f.fieldType} />
                      </button>
                    ))}
                  </>
                )}
                {filteredExt.length > 0 && (
                  <>
                    {sectionIndex++ > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                    <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                      Template Fields
                    </div>
                    {filteredExt.map((f) => {
                      const val = `ext.${f.value}`;
                      const displayPath = namespace ? `ext.${namespace}.${f.value}` : val;
                      return (
                        <button
                          key={val}
                          type="button"
                          data-testid={`field-option-ext-${f.value}`}
                          aria-label={`Select ${f.label}`}
                          onClick={() => handleSelect(val)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-label transition-colors",
                            "hover:bg-subtle",
                            value === val && "bg-brand/10",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              value === val ? "text-brand" : "text-transparent",
                            )}
                          />
                          <FieldItemLabel label={f.label} path={displayPath} isSelected={value === val} />
                          <FieldTypeBadge type={f.fieldType} />
                        </button>
                      );
                    })}
                  </>
                )}
                {filteredApiExt.length > 0 && (
                  <>
                    {sectionIndex++ > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                    <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                      Activity Extensions
                    </div>
                    {filteredApiExt.map((f) => {
                      const val = `ext.${f.value}`;
                      return (
                        <button
                          key={val}
                          type="button"
                          data-testid={`field-option-apiext-${f.value}`}
                          aria-label={`Select ${f.label}`}
                          onClick={() => handleSelect(val)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-label transition-colors",
                            "hover:bg-subtle",
                            value === val && "bg-brand/10",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              value === val ? "text-brand" : "text-transparent",
                            )}
                          />
                          <FieldItemLabel label={f.label} path={`ext.${f.value}`} isSelected={value === val} />
                          <FieldTypeBadge type={f.fieldType} />
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ── Multi-Field Picker (for required / conditional_required) ──

function SearchableMultiFieldPicker({
  value,
  onChange,
  standardFields,
  fieldOptions,
  apiExtFields = [],
  namespace,
  placeholder = "Select fields...",
  testId,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  standardFields: FieldOption[];
  fieldOptions: { value: string; label: string; fieldType?: string }[];
  apiExtFields?: { value: string; label: string; fieldType?: string }[];
  namespace?: string;
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedOnly, setSelectedOnly] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const templateExtNames = React.useMemo(
    () => new Set(fieldOptions.map((f) => f.value)),
    [fieldOptions],
  );
  const dedupedApiExt = React.useMemo(
    () => apiExtFields.filter((f) => !templateExtNames.has(f.value)),
    [apiExtFields, templateExtNames],
  );

  // Build the full list of all option keys (for invert)
  const allOptionKeys = React.useMemo(() => {
    const keys: string[] = [];
    for (const f of standardFields) keys.push(f.value);
    for (const f of fieldOptions) keys.push(`ext.${f.value}`);
    for (const f of dedupedApiExt) keys.push(`ext.${f.value}`);
    return keys;
  }, [standardFields, fieldOptions, dedupedApiExt]);

  const lower = query.trim().toLowerCase();

  const applyFilters = React.useCallback(
    (items: { value: string; label: string; fieldType?: string }[], prefix = "") =>
      items.filter((f) => {
        const key = prefix ? `${prefix}${f.value}` : f.value;
        if (selectedOnly && !value.includes(key)) return false;
        if (lower && !f.label.toLowerCase().includes(lower) && !f.value.toLowerCase().includes(lower)) return false;
        return true;
      }),
    [lower, selectedOnly, value],
  );

  const filteredStandard = React.useMemo(
    () => applyFilters(standardFields).sort((a, b) => {
      const aIsArray = a.label.startsWith("[") ? 1 : 0;
      const bIsArray = b.label.startsWith("[") ? 1 : 0;
      return aIsArray - bIsArray || a.label.localeCompare(b.label);
    }),
    [applyFilters, standardFields],
  );
  const filteredExt = React.useMemo(() => applyFilters(fieldOptions, "ext."), [applyFilters, fieldOptions]);
  const filteredApiExt = React.useMemo(() => applyFilters(dedupedApiExt, "ext."), [applyFilters, dedupedApiExt]);

  const resolveLabel = (val: string) => {
    if (!val) return val;
    if (val.startsWith("ext.")) {
      const name = val.slice(4);
      const ext = fieldOptions.find((f) => f.value === name);
      if (ext) return ext.label;
      const apiExt = apiExtFields.find((f) => f.value === name);
      if (apiExt) return apiExt.label;
      return val;
    }
    const std = standardFields.find((f) => f.value === val);
    return std?.label ?? val;
  };

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const handleInvert = () => {
    const inverted = allOptionKeys.filter((k) => !value.includes(k));
    onChange(inverted);
  };

  const totalFiltered = filteredStandard.length + filteredExt.length + filteredApiExt.length;
  let sectionIndex = 0;

  const renderOption = (val: string, label: string, path: string, fieldType?: string) => {
    const isSelected = value.includes(val);
    return (
      <button
        key={val}
        type="button"
        data-testid={`multi-field-option-${val.replace(/\./g, "-")}`}
        aria-label={`Toggle ${label}`}
        onClick={() => toggle(val)}
        className={cn(
          "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-label transition-colors",
          "hover:bg-subtle",
          isSelected && "bg-brand/10",
        )}
      >
        <span className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
          isSelected ? "border-brand bg-brand text-foreground-inverse" : "border-border-strong",
        )}>
          {isSelected && <Check className="h-3 w-3" />}
        </span>
        <FieldItemLabel label={label} path={path} isSelected={isSelected} />
        <FieldTypeBadge type={fieldType} />
      </button>
    );
  };

  const displayText = value.length === 0
    ? placeholder
    : value.length <= 2
      ? value.map(resolveLabel).join(", ")
      : `${value.slice(0, 2).map(resolveLabel).join(", ")} +${value.length - 2}`;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) { setQuery(""); setSelectedOnly(false); }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid={testId}
          aria-label={placeholder}
          className={cn(
            "flex w-full items-center justify-between",
            "bg-[var(--input-bg)] text-body-sm",
            "min-h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)]",
            "border border-[var(--input-border)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            value.length > 0 ? "text-foreground" : "text-foreground-muted",
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-foreground-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[var(--z-toast)] w-[var(--radix-popover-trigger-width)] rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--card-bg)] shadow-dropdown"
          side="bottom"
          sideOffset={4}
          align="start"
          avoidCollisions
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
              <input
                ref={searchRef}
                type="text"
                data-testid={testId ? `${testId}-search` : "multi-field-picker-search"}
                aria-label="Search fields"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fields..."
                className={cn(
                  "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                  "py-1.5 pl-8 pr-3 text-label text-foreground placeholder:text-foreground-muted",
                  "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                )}
              />
            </div>
          </div>
          {/* Helper buttons */}
          <div className="flex items-center gap-1 px-2 pb-1.5">
            <button
              type="button"
              data-testid="multi-field-filter-selected"
              aria-label="Filter selected"
              onClick={() => setSelectedOnly((p) => !p)}
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--badge-radius)] px-2 py-0.5 text-caption-xs font-medium transition-colors",
                selectedOnly ? "bg-brand text-foreground-inverse" : "bg-subtle text-foreground-muted hover:text-foreground",
              )}
            >
              <Filter className="h-3 w-3" />
              Selected
            </button>
            <button
              type="button"
              data-testid="multi-field-invert"
              aria-label="Invert selection"
              onClick={handleInvert}
              className="inline-flex items-center gap-1 rounded-[var(--badge-radius)] bg-subtle px-2 py-0.5 text-caption-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              Invert
            </button>
            {value.length > 0 && (
              <button
                type="button"
                data-testid="multi-field-clear"
                aria-label="Clear selection"
                onClick={() => onChange([])}
                className="inline-flex items-center gap-1 rounded-[var(--badge-radius)] bg-subtle px-2 py-0.5 text-caption-xs font-medium text-foreground-muted hover:text-error transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
            {value.length > 0 && (
              <span className="ml-auto text-caption-xs text-foreground-muted">{value.length} selected</span>
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto px-1 pb-1">
            {totalFiltered === 0 ? (
              <p className="px-2 py-4 text-center text-label text-foreground-muted">
                {selectedOnly && value.length === 0 ? "No fields selected" : "No matching fields"}
              </p>
            ) : (
              <>
                {filteredStandard.length > 0 && (
                  <>
                    {sectionIndex++ > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                    <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                      Standard Fields
                    </div>
                    {filteredStandard.map((f) => renderOption(f.value, f.label, f.value, f.fieldType))}
                  </>
                )}
                {filteredExt.length > 0 && (
                  <>
                    {sectionIndex++ > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                    <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                      Template Fields
                    </div>
                    {filteredExt.map((f) => renderOption(`ext.${f.value}`, f.label, namespace ? `ext.${namespace}.${f.value}` : `ext.${f.value}`, f.fieldType))}
                  </>
                )}
                {filteredApiExt.length > 0 && (
                  <>
                    {sectionIndex++ > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                    <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                      Activity Extensions
                    </div>
                    {filteredApiExt.map((f) => renderOption(`ext.${f.value}`, f.label, `ext.${f.value}`, f.fieldType))}
                  </>
                )}
              </>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ── Add Type Popover (for General tab) ──

function AddTypePopover({
  currentTypeValues,
  allTypes,
  activityTypeOptions,
  currentOrg,
  createEnumMutation,
  onAdd,
  configId,
}: {
  currentTypeValues: string[];
  allTypes: ActivityTemplateConfig[];
  activityTypeOptions: { value: string; label: string }[];
  currentOrg: string | null;
  createEnumMutation: ReturnType<typeof useCreateEnum>;
  onAdd: (values: string[]) => void;
  configId: string | undefined;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [newInput, setNewInput] = React.useState("");
  const [pendingNew, setPendingNew] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Types used by other templates (not this one)
  const usedByOthers = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of allTypes) {
      if (t.id !== configId) {
        for (const v of t.typeValues) set.add(v);
      }
    }
    return set;
  }, [allTypes, configId]);

  const available = React.useMemo(() => {
    return activityTypeOptions.filter(
      (o) => !currentTypeValues.includes(o.value) && !usedByOthers.has(o.value),
    );
  }, [activityTypeOptions, currentTypeValues, usedByOthers]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return available;
    const lower = search.trim().toLowerCase();
    return available.filter(
      (o) => o.value.toLowerCase().includes(lower) || o.label.toLowerCase().includes(lower),
    );
  }, [available, search]);

  const newExists = React.useMemo(() => {
    if (!newInput.trim()) return true;
    const lower = newInput.trim().toLowerCase();
    return activityTypeOptions.some((o) => o.value.toLowerCase() === lower)
      || pendingNew.some((v) => v.toLowerCase() === lower)
      || currentTypeValues.some((v) => v.toLowerCase() === lower);
  }, [newInput, activityTypeOptions, pendingNew, currentTypeValues]);

  const handleAddNew = () => {
    const val = newInput.trim();
    if (!val || newExists) return;
    setPendingNew((prev) => [...prev, val]);
    setSelected((prev) => [...prev, val]);
    setNewInput("");
  };

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      for (const v of pendingNew) {
        await createEnumMutation.mutateAsync({
          type: "ActivityType",
          lang: "en",
          value: v,
          label: v,
          valueType: "String",
          org: currentOrg,
        } as Record<string, unknown>);
      }
      onAdd(selected);
      setOpen(false);
      setSelected([]);
      setPendingNew([]);
      setSearch("");
      setNewInput("");
    } catch {
      toast.error("Failed to create new activity type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setSelected([]);
          setPendingNew([]);
          setSearch("");
          setNewInput("");
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="add-type-trigger"
          aria-label="Add Type"
          className="flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1.5 text-label text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Type
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[var(--z-toast)] w-[var(--width-popover-md)] rounded-lg border border-border bg-card shadow-dropdown"
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
        >
          {/* Create new */}
          <div className="border-b border-border p-3">
            <label className="mb-1 block text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
              Create new
            </label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  data-testid="add-type-new-input"
                  aria-label="New type value"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNew(); } }}
                  placeholder="New type..."
                  className={cn(
                    "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                    "py-1.5 pl-7 pr-2 text-label text-foreground placeholder:text-foreground-muted",
                    "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                  )}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddNew} disabled={!newInput.trim() || newExists} className="shrink-0 h-8 px-2" aria-label="Add new type" data-testid="add-type-new-btn">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="border-b border-border px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {selected.map((v) => (
                  <Badge key={v} variant={pendingNew.includes(v) ? "default" : "secondary"} className="flex items-center gap-0.5 pr-0.5 text-caption">
                    {v}
                    {pendingNew.includes(v) && <span className="text-caption-xs opacity-70 ml-0.5">New</span>}
                    <button
                      data-testid={`add-type-remove-${v}`}
                      aria-label={`Remove ${v}`}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={() => {
                        setSelected((prev) => prev.filter((s) => s !== v));
                        setPendingNew((prev) => prev.filter((p) => p !== v));
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
              <input
                ref={searchRef}
                type="text"
                data-testid="add-type-search"
                aria-label="Search types"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search types..."
                className={cn(
                  "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                  "py-1.5 pl-8 pr-2 text-label text-foreground placeholder:text-foreground-muted",
                  "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                )}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[var(--height-dropdown-sm)] overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-label text-foreground-muted">
                {available.length === 0 ? "No available types" : "No matches"}
              </p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`add-type-option-${opt.value}`}
                    aria-label={`Toggle ${opt.label}`}
                    onClick={() => setSelected((prev) => isSelected ? prev.filter((v) => v !== opt.value) : [...prev, opt.value])}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-label transition-colors hover:bg-subtle",
                      isSelected && "bg-brand/10",
                    )}
                  >
                    <div className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected ? "border-brand bg-brand text-white" : "border-border-strong bg-transparent",
                    )}>
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span className={cn("truncate", isSelected ? "font-medium text-brand" : "text-foreground")}>
                      {opt.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-caption text-foreground-muted">{selected.length} selected</span>
            <Button size="sm" onClick={handleConfirm} disabled={selected.length === 0 || saving} loading={saving} data-testid="add-type-confirm" aria-label="Confirm add types">
              Add
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ── Main Edit Page ──

const EMPTY_FORM_SNAPSHOT = JSON.stringify({
  fieldName: "", label: "", description: "", typeValues: [] as string[],
  extensions: [] as unknown[], reasonCodes: [] as string[], validationRules: [] as unknown[], calculatedFields: [] as unknown[],
});

export default function ActivityTemplateEditPage() {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const location = useLocation();
  const currentProgram = useUIStore((s) => s.currentProgram);

  const isCreateMode = paramId === undefined || location.pathname.endsWith("/new");
  const createState = React.useMemo(
    () =>
      (location.state ?? {}) as {
        id?: string;
        typeValues?: string[];
        label?: string;
      },
    [location.state],
  );

  const configId = isCreateMode ? createState.id : paramId;

  const { config, isLoading, allTypes } = useActivityTemplate(
    currentProgram ?? undefined,
    isCreateMode ? undefined : configId,
  );
  const saveTemplate = useSaveActivityTemplate(currentProgram ?? undefined);
  const deleteTemplate = useDeleteActivityTemplate(currentProgram ?? undefined);

  // Enum options for add-type popover
  const { data: activityTypeOptions } = useEnumOptions("ActivityType");
  const { data: channelTypeOptions = [] } = useEnumOptions("ChannelType");
  const createEnumMutation = useCreateEnum();
  const currentOrg = useUIStore((s) => s.currentOrg);

  // Activity model schema fields
  const {
    options: activityFieldOptions,
    getLabel: getActivityFieldLabel,
    fieldNames: activityFieldNames,
  } = useModelFieldOptions("Activity");

  // Org-level extension fields on Activity (from ExtensionSchema)
  const {
    options: activityApiExtOptions,
    getLabel: getApiExtLabel,
  } = useModelExtensionFieldOptions("Activity");

  // Reason code options
  const { data: reasonCodeOptions } = useReasonCodeOptions();

  // Division options — active only, filtered to program's assigned divisions
  const { data: programData } = useProgram(currentProgram ?? undefined);
  const { options: divisionOptions } = useDivisionOptions({
    programDivisionIds: programData?.divisions,
  });

  // Local form state
  const [fieldName, setFieldName] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [typeValues, setTypeValues] = React.useState<string[]>([]);
  const [divisions, setDivisions] = React.useState<string[]>([]);
  const [extensions, setExtensions] = React.useState<ExtensionFieldDef[]>([]);
  const [publishedFields, setPublishedFields] = React.useState<string[]>([]);
  const [reasonCodes, setReasonCodes] = React.useState<string[]>([]);
  const [validationRules, setValidationRules] = React.useState<ValidationRuleDef[]>([]);
  const [calculatedFields, setCalculatedFields] = React.useState<CalculatedFieldDef[]>([]);
  const [selectedCalcFieldId, setSelectedCalcFieldId] = React.useState<string | null>(null);
  const [calcPaletteSearch, setCalcPaletteSearch] = React.useState("");
  const [calcPaletteOpen, setCalcPaletteOpen] = React.useState(false);
  const [calcCursorToken, setCalcCursorToken] = React.useState("");
  const [calcAcIndex, setCalcAcIndex] = React.useState(0);
  const [calcFieldsTouched, setCalcFieldsTouched] = React.useState<Set<string>>(new Set());

  // Breadcrumb override — show label instead of raw ID
  useBreadcrumbOverride(paramId, label || (isCreateMode ? "New" : undefined));

  // Dirty tracking
  const [initialSnapshot, setInitialSnapshot] = React.useState<string>(EMPTY_FORM_SNAPSHOT);
  const skipBlockerRef = React.useRef(false);
  const [hasSavedOnce, setHasSavedOnce] = React.useState(!isCreateMode);
  const isDirty = React.useMemo(() => {
    // In create mode, always dirty until first save
    if (!hasSavedOnce) return true;
    const current = JSON.stringify({ fieldName, label, description, typeValues, divisions, extensions, publishedFields, reasonCodes, validationRules, calculatedFields });
    return current !== initialSnapshot;
  }, [fieldName, label, description, typeValues, divisions, extensions, publishedFields, reasonCodes, validationRules, calculatedFields, initialSnapshot, hasSavedOnce]);

  // Initialize form from config or create state
  const hasInitialized = React.useRef(false);
  React.useEffect(() => {
    if (hasInitialized.current) return;
    if (isCreateMode && createState.typeValues?.length) {
      setFieldName("");
      setTypeValues(createState.typeValues);
      setLabel(createState.label ?? createState.typeValues[0] ?? "");
      setDescription("");
      setDivisions([]);
      setExtensions([]);
      setPublishedFields([]);
      setReasonCodes([]);
      setValidationRules([]);
      setCalculatedFields([]);
      setInitialSnapshot(JSON.stringify({
        fieldName: "",
        label: createState.label ?? createState.typeValues[0] ?? "",
        description: "",
        typeValues: createState.typeValues,
        divisions: [],
        extensions: [],
        publishedFields: [],
        reasonCodes: [],
        validationRules: [],
        calculatedFields: [],
      }));
      hasInitialized.current = true;
    } else if (!isCreateMode && config) {
      setFieldName(config.fieldName);
      setTypeValues(config.typeValues);
      setLabel(config.label);
      setDescription(config.description ?? "");
      setDivisions(config.divisions ?? []);
      setExtensions(config.extensions);
      setPublishedFields(config.publishedFields ?? []);
      setReasonCodes(config.reasonCodes);
      setValidationRules(config.validationRules);
      setCalculatedFields(config.calculatedFields ?? []);
      // Mark loaded rules as pristine so validation errors don't show until user edits or saves
      setPristineRuleIds(new Set(config.validationRules.map((r) => r.id)));
      if (config.reasonCodes.length > 0) setShowSelectedOnly(true);
      setInitialSnapshot(JSON.stringify({
        fieldName: config.fieldName,
        label: config.label,
        description: config.description ?? "",
        typeValues: config.typeValues,
        divisions: config.divisions ?? [],
        extensions: config.extensions,
        publishedFields: config.publishedFields ?? [],
        reasonCodes: config.reasonCodes,
        validationRules: config.validationRules,
        calculatedFields: config.calculatedFields ?? [],
      }));
      hasInitialized.current = true;
    }
  }, [isCreateMode, config, createState]);

  // Safety: if the component survives a route change (React reuses same element
  // type for /new and /:id), reset skipBlockerRef so the unsaved-changes guard
  // isn't permanently disabled from a previous create-save cycle.
  React.useEffect(() => {
    skipBlockerRef.current = false;
  }, [paramId]);

  // Blocker
  const blocker = useBlocker(() => {
    if (skipBlockerRef.current) return false;
    return isDirty;
  });

  // Browser close warning
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Tab state
  const [activeTab, setActiveTab] = React.useState("general");

  // Cancel dialog state (matches EntityEditPage pattern)
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const handleCancel = () => {
    if (isDirty) {
      setCancelOpen(true);
    } else {
      navigate("/program/activity-templates");
    }
  };

  // Modal state
  const [extFieldModalOpen, setExtFieldModalOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<ExtensionFieldDef | null>(null);
  const [selectedRuleId, setSelectedRuleId] = React.useState<string | null>(null);
  const [pristineRuleIds, setPristineRuleIds] = React.useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [reasonCodeFilter, setReasonCodeFilter] = React.useState("");
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);
  const [newReasonCodeValue, setNewReasonCodeValue] = React.useState("");
  const [newReasonCodeLabel, setNewReasonCodeLabel] = React.useState("");
  const [creatingReasonCode, setCreatingReasonCode] = React.useState(false);

  // Saving state
  const [saving, setSaving] = React.useState(false);
  const [deletingState, setDeletingState] = React.useState(false);

  // Form validation errors (field name → error message)
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // External extension fields that share this template's namespace
  const externalNamespaceFields = React.useMemo<ExternalFieldInfo[]>(() => {
    if (!fieldName) return [];
    const prefix = `${fieldName.toLowerCase()}.`;
    const publishedSet = new Set(publishedFields);
    return activityApiExtOptions
      .filter((opt) => opt.value.toLowerCase().startsWith(prefix))
      .map((opt) => {
        const subName = opt.value.slice(prefix.length);
        return {
          name: subName,
          label: opt.label,
          fieldType: opt.fieldType ?? "string",
          owned: publishedSet.has(subName),
        };
      });
  }, [fieldName, activityApiExtOptions, publishedFields]);

  const fieldNameError = React.useMemo(() => {
    if (!fieldName) return null;
    if (!/^[a-zA-Z_]\w*$/.test(fieldName)) return "Must be a valid identifier (letters, numbers, underscores)";
    // Check if another template in this program already uses this fieldName
    const otherFieldNames = allTypes
      .filter((t) => t.id !== configId)
      .map((t) => t.fieldName.toLowerCase());
    if (otherFieldNames.includes(fieldName.toLowerCase())) return "This namespace is already used by another template";
    // Check against standard Activity schema fields to prevent confusion
    const lowerName = fieldName.toLowerCase();
    for (const fn of activityFieldNames) {
      if (fn.toLowerCase() === lowerName) return `"${fieldName}" is a standard Activity field name`;
    }
    return null;
  }, [fieldName, allTypes, configId, activityFieldNames]);

  // Extension field names — template-defined + external (for duplicate check in Add Field modal)
  const extFieldNames = React.useMemo(
    () => new Set([
      ...extensions.map((f) => f.name),
      ...externalNamespaceFields.map((f) => f.name),
    ]),
    [extensions, externalNamespaceFields],
  );

  // External-only field names (for specific error message in Add Field modal)
  const externalExtFieldNames = React.useMemo(
    () => new Set(externalNamespaceFields.map((f) => f.name)),
    [externalNamespaceFields],
  );

  // Merged field rows for the Fields tab table (template + external, sorted)
  const mergedFieldRows = React.useMemo<FieldRow[]>(() => {
    const rows: FieldRow[] = [];
    for (const f of extensions) {
      rows.push({ kind: "template", field: f });
    }
    for (const info of externalNamespaceFields) {
      // Skip if a template field has the same name (template takes precedence)
      if (extensions.some((f) => f.name === info.name)) continue;
      rows.push({ kind: "external", info });
    }
    rows.sort((a, b) => {
      const nameA = a.kind === "template" ? a.field.name : a.info.name;
      const nameB = b.kind === "template" ? b.field.name : b.info.name;
      return nameA.localeCompare(nameB);
    });
    return rows;
  }, [extensions, externalNamespaceFields]);

  // Field options for validation rules (template extension fields + external namespace fields)
  const extFieldOptions = React.useMemo(
    () => {
      const templateOpts = extensions.map((f) => ({
        value: f.name,
        label: f.label,
        fieldType: (f.type === "select" ? "string" : f.type) as FieldOption["fieldType"],
      }));
      const externalOpts = externalNamespaceFields
        .filter((info) => !extensions.some((f) => f.name === info.name))
        .map((info) => ({
          value: info.name,
          label: info.label,
          fieldType: info.fieldType as FieldOption["fieldType"],
        }));
      return [...templateOpts, ...externalOpts];
    },
    [extensions, externalNamespaceFields],
  );

  // Org-level ext fields minus those in the template's namespace (already in extFieldOptions)
  const dedupedApiExtOptions = React.useMemo(
    () => {
      if (!fieldName) return activityApiExtOptions;
      const prefix = `${fieldName.toLowerCase()}.`;
      return activityApiExtOptions.filter((opt) => !opt.value.toLowerCase().startsWith(prefix));
    },
    [activityApiExtOptions, fieldName],
  );

  // Filtered reason codes
  const filteredReasonCodes = React.useMemo(() => {
    let opts = reasonCodeOptions ?? [];
    if (showSelectedOnly) {
      opts = opts.filter((o) => reasonCodes.includes(o.value));
    }
    if (!reasonCodeFilter) return opts;
    const lower = reasonCodeFilter.toLowerCase();
    return opts.filter(
      (o) => o.value.toLowerCase().includes(lower) || o.label.toLowerCase().includes(lower),
    );
  }, [reasonCodeOptions, reasonCodeFilter, showSelectedOnly, reasonCodes]);

  // Field name → DOM id/selector for focusing errored fields
  const FIELD_SELECTORS: Record<string, string> = {
    fieldName: "#at-field-name",
    label: "#at-label",
    typeValues: '[data-testid="add-type-trigger"]',
  };

  const formRef = React.useRef<HTMLDivElement>(null);

  /** Focus the first field that has a validation error in the given errors map. */
  const focusFirstErrorField = (errs: Record<string, string>) => {
    // Double-RAF: first lets React flush the tab switch render, second lets browser paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const field of ["fieldName", "typeValues", "label"]) {
        if (errs[field]) {
          const selector = FIELD_SELECTORS[field];
          if (selector) {
            const el = formRef.current?.querySelector<HTMLElement>(selector);
            if (el) { el.focus(); return; }
          }
        }
      }
    }));
  };

  // Per-rule issues (duplicate combos + missing required fields)
  const ruleIssues = React.useMemo(() => {
    const issues = new Map<string, string>();
    // Missing target field(s) — skip pristine (just-added) rules
    for (const rule of validationRules) {
      if (pristineRuleIds.has(rule.id)) continue;
      if (rule.type === "allowed_channels") {
        if (!rule.channels || rule.channels.length === 0) {
          issues.set(rule.id, "At least one channel must be selected");
        }
        continue;
      }
      const empty = Array.isArray(rule.field)
        ? rule.field.length === 0
        : !rule.field;
      if (empty) {
        issues.set(rule.id, Array.isArray(rule.field) ? "At least one target field is required" : "Target field is required");
      } else if (rule.type === "min" || rule.type === "max") {
        if (rule.value == null || rule.value === "") {
          issues.set(rule.id, "Value is required");
        } else {
          // Validate min/max is only used on numeric fields
          const fieldPath = typeof rule.field === "string" ? rule.field : rule.field[0];
          if (fieldPath) {
            let ft: string | undefined;
            if (fieldPath.startsWith("ext.")) {
              const name = fieldPath.slice(4);
              const ext = extensions.find((f) => f.name === name);
              ft = ext ? (ext.type === "select" ? "string" : ext.type) : extFieldOptions.find((f) => f.value === name)?.fieldType;
            } else {
              ft = activityFieldOptions.find((f) => f.value === fieldPath)?.fieldType;
            }
            if (ft && ft !== "number") {
              issues.set(rule.id, `${rule.type === "min" ? "Minimum" : "Maximum"} is only valid for numeric fields`);
            }
          }
        }
      } else if (rule.type === "pattern") {
        if (rule.value == null || rule.value === "") {
          issues.set(rule.id, "Pattern is required");
        }
      }
    }
    // Duplicate (type, field) combos — for array fields, check each field individually
    const seen = new Map<string, string>();
    for (const rule of validationRules) {
      if (rule.type === "allowed_channels") continue;
      const fields = Array.isArray(rule.field) ? rule.field : rule.field ? [rule.field] : [];
      for (const f of fields) {
        const key = `${rule.type}:${f}`;
        const existingId = seen.get(key);
        if (existingId && existingId !== rule.id) {
          issues.set(rule.id, "Duplicate rule (overlapping field + rule type)");
          if (!issues.has(existingId)) {
            issues.set(existingId, "Duplicate rule (overlapping field + rule type)");
          }
        } else {
          seen.set(key, rule.id);
        }
      }
    }
    return issues;
  }, [validationRules, pristineRuleIds, extensions, extFieldOptions, activityFieldOptions]);

  const tabsWithErrors = React.useMemo(() => {
    const errored = new Set<string>();
    const errorFields = Object.keys(formErrors);
    if (errorFields.length === 0) return errored;
    for (const [tabId, fields] of Object.entries(TAB_FIELDS)) {
      if (errorFields.some((ef) => fields.includes(ef))) {
        errored.add(tabId);
      }
    }
    return errored;
  }, [formErrors]);

  // Detect activity types used by other templates (for overlap validation)
  const overlappingTypes = React.useMemo(() => {
    const usedByOthers = new Map<string, string>();
    for (const t of allTypes) {
      if (t.id === configId) continue;
      for (const v of t.typeValues) {
        usedByOthers.set(v, t.label);
      }
    }
    return typeValues
      .filter((v) => usedByOthers.has(v))
      .map((v) => ({ value: v, template: usedByOthers.get(v)! }));
  }, [allTypes, configId, typeValues]);

  // Validate all fields; returns errors map (empty = valid)
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!fieldName) errs.fieldName = "Namespace is required";
    else if (fieldNameError) errs.fieldName = fieldNameError;
    if (typeValues.length === 0) errs.typeValues = "At least one activity type is required";
    else if (overlappingTypes.length > 0) {
      const names = overlappingTypes.map((o) => `"${o.value}" (used by ${o.template})`).join(", ");
      errs.typeValues = `Activity type overlap: ${names}`;
    }
    if (!label.trim()) errs.label = "Label is required";
    // Validate rules — check all rules including pristine ones on save
    for (const rule of validationRules) {
      if (rule.type === "allowed_channels") {
        if (!rule.channels || rule.channels.length === 0) {
          errs.validationRules = "At least one channel must be selected";
          break;
        }
        continue;
      }
      const empty = Array.isArray(rule.field) ? rule.field.length === 0 : !rule.field;
      if (empty) {
        errs.validationRules = Array.isArray(rule.field) ? "At least one target field is required" : "Target field is required";
        break;
      }
    }
    if (!errs.validationRules && ruleIssues.size > 0) {
      const firstIssue = ruleIssues.values().next().value;
      errs.validationRules = firstIssue ?? "Validation rules have errors";
    }
    // Validate calculated fields
    const seenCalcNames = new Set<string>();
    for (const cf of calculatedFields) {
      if (!cf.name) {
        errs.calculatedFields = "All calculations must have a name";
        break;
      }
      if (seenCalcNames.has(cf.name)) {
        errs.calculatedFields = `Duplicate calculation name "${cf.name}"`;
        break;
      }
      seenCalcNames.add(cf.name);
      if (!cf.label) {
        errs.calculatedFields = `Calculation "${cf.name}" is missing a label`;
        break;
      }
      if (!cf.expression) {
        errs.calculatedFields = `Calculation "${cf.label || cf.name}" is missing an expression`;
        break;
      }
      const exprErr = validateExpression(cf.expression);
      if (exprErr) {
        errs.calculatedFields = `Calculation "${cf.label || cf.name}": ${exprErr}`;
        break;
      }
    }
    return errs;
  };

  // Handlers
  const handleSave = async () => {
    // Clear pristine status so all rules/calc fields show validation errors
    setPristineRuleIds(new Set());
    setCalcFieldsTouched(new Set(calculatedFields.map((f) => f.id)));
    const errs = validate();
    if (Object.keys(errs).length > 0 || !configId) {
      setFormErrors(errs);
      // Switch to first tab with errors and focus the first errored field
      const firstErroredTab = Object.entries(TAB_FIELDS).find(([, fields]) =>
        Object.keys(errs).some((ef) => fields.includes(ef)),
      );
      if (firstErroredTab) setActiveTab(firstErroredTab[0]);
      // If the first errored tab is validation, select the first problematic rule
      if (firstErroredTab?.[0] === "validation" && ruleIssues.size > 0) {
        const firstBadRuleId = ruleIssues.keys().next().value;
        if (firstBadRuleId) setSelectedRuleId(firstBadRuleId);
      } else if (firstErroredTab?.[0] === "calculations" && errs.calculatedFields) {
        // Select the first problematic calculated field
        const badField = calculatedFields.find((cf) => !cf.name || !cf.label || !cf.expression || validateExpression(cf.expression));
        if (badField) setSelectedCalcFieldId(badField.id);
      } else {
        focusFirstErrorField(errs);
      }
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      const configToSave: ActivityTemplateConfig = {
        id: configId,
        fieldName,
        typeValues,
        label,
        description: description || undefined,
        divisions: divisions.length > 0 ? divisions : undefined,
        extensions,
        publishedFields: publishedFields.length > 0 ? publishedFields : undefined,
        reasonCodes,
        validationRules,
        calculatedFields,
      };
      await saveTemplate(configToSave);
      setHasSavedOnce(true);
      setInitialSnapshot(JSON.stringify({
        fieldName,
        label,
        description: description || "",
        typeValues,
        divisions,
        extensions,
        publishedFields,
        reasonCodes,
        validationRules,
        calculatedFields,
      }));
      toast.success(isCreateMode ? "Activity template created" : "Activity template saved");
      if (isCreateMode) {
        skipBlockerRef.current = true;
        navigate("/program/activity-templates", { replace: true });
      }
    } catch {
      toast.error("Failed to save activity template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!configId) return;
    setDeletingState(true);
    try {
      await deleteTemplate(configId);
      toast.success("Activity template deleted");
      skipBlockerRef.current = true;
      navigate("/program/activity-templates", { replace: true });
    } catch {
      toast.error("Failed to delete activity template");
    } finally {
      setDeletingState(false);
    }
  };

  // Extension field handlers
  const handleAddField = () => {
    setEditingField(null);
    setExtFieldModalOpen(true);
  };
  const handleEditField = (field: ExtensionFieldDef) => {
    setEditingField(field);
    setExtFieldModalOpen(true);
  };
  const handleSaveField = (field: ExtensionFieldDef) => {
    setExtensions((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      if (idx >= 0) return prev.map((f) => (f.id === field.id ? field : f));
      return [...prev, field];
    });
  };
  const handleDeleteField = (fieldId: string) => {
    setExtensions((prev) => prev.filter((f) => f.id !== fieldId));
    // Also remove validation rules targeting this extension field
    setValidationRules((prev) => prev.filter((r) => {
      const deleted = extensions.find((f) => f.id === fieldId);
      if (!deleted) return true;
      return r.field !== `ext.${deleted.name}` && r.conditionField !== `ext.${deleted.name}`;
    }));
  };

  // Calculated field handlers
  const selectedCalcField = React.useMemo(
    () => calculatedFields.find((f) => f.id === selectedCalcFieldId) ?? null,
    [calculatedFields, selectedCalcFieldId],
  );

  // Per-field validation issues (only shown for touched fields)
  const calcFieldIssues = React.useMemo(() => {
    const issues = new Map<string, { name?: string; label?: string; expression?: string }>();
    for (const cf of calculatedFields) {
      if (!calcFieldsTouched.has(cf.id)) continue;
      const fieldErrors: { name?: string; label?: string; expression?: string } = {};
      if (!cf.name) fieldErrors.name = "Name is required";
      else if (!/^[a-zA-Z_]\w*$/.test(cf.name)) fieldErrors.name = "Must be a valid identifier";
      else if (calculatedFields.some((o) => o.id !== cf.id && o.name === cf.name)) fieldErrors.name = "Name already exists";
      if (!cf.label) fieldErrors.label = "Label is required";
      if (!cf.expression) fieldErrors.expression = "Expression is required";
      else {
        const err = validateExpression(cf.expression);
        if (err) fieldErrors.expression = err;
      }
      if (Object.keys(fieldErrors).length > 0) issues.set(cf.id, fieldErrors);
    }
    return issues;
  }, [calculatedFields, calcFieldsTouched]);

  const handleAddCalcField = () => {
    const newField: CalculatedFieldDef = {
      id: generateObjectId(),
      name: "",
      label: "",
      kind: "scalar",
      expression: "",
      roundingMode: "halfUp",
      roundingDecimals: 2,
    };
    setCalculatedFields((prev) => [...prev, newField]);
    setSelectedCalcFieldId(newField.id);
  };

  const handleDeleteCalcField = (fieldId: string) => {
    setCalculatedFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedCalcFieldId === fieldId) setSelectedCalcFieldId(null);
  };

  const handleUpdateCalcField = (patch: Partial<CalculatedFieldDef>) => {
    if (!selectedCalcFieldId) return;
    setCalculatedFields((prev) => {
      const updated = prev.map((f) => (f.id === selectedCalcFieldId ? { ...f, ...patch } : f));
      try {
        return sortByDependencies(updated) as CalculatedFieldDef[];
      } catch {
        return updated;
      }
    });
  };

  const calcExprRef = React.useRef<HTMLTextAreaElement>(null);
  const calcAcDropdownRef = React.useRef<HTMLDivElement>(null);

  const insertCalcExprAtCursor = (text: string) => {
    const ta = calcExprRef.current;
    if (!ta || !selectedCalcField) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const expr = selectedCalcField.expression;
    const newExpr = expr.slice(0, start) + text + expr.slice(end);
    handleUpdateCalcField({ expression: newExpr });
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
    });
  };

  const calcFieldGroups = React.useMemo(() => {
    const activity = (activityFieldOptions ?? []).filter(
      (f) => !f.value.startsWith("lineItems.") && !f.value.startsWith("tenderItems."),
    );
    const lineItems = (activityFieldOptions ?? []).filter((f) => f.value.startsWith("lineItems."));
    const tenderItems = (activityFieldOptions ?? []).filter((f) => f.value.startsWith("tenderItems."));
    const calc = calculatedFields
      .filter((f) => f.id !== selectedCalcFieldId && f.name)
      .map((f) => ({ value: f.name, label: f.label || f.name, fieldType: "number" as const }));
    return [
      { label: "Activity Fields", fields: activity },
      { label: "Line Item Fields", fields: lineItems },
      { label: "Tender Item Fields", fields: tenderItems },
      ...(calc.length > 0 ? [{ label: "Calculated Fields", fields: calc }] : []),
    ].filter((g) => g.fields.length > 0);
  }, [activityFieldOptions, calculatedFields, selectedCalcFieldId]);

  // Autocomplete for calc expression
  const calcAllFieldOptions = React.useMemo(() => {
    const fields: (FieldOption & { group: string })[] = [];
    if (selectedCalcField?.kind === "aggregate") {
      const src = selectedCalcField.source ?? "lineItems";
      for (const f of activityFieldOptions?.filter((o) => o.value.startsWith(`${src}.`)) ?? []) {
        fields.push({ ...f, group: "Source" });
      }
    } else {
      for (const f of activityFieldOptions ?? []) {
        if (f.value.startsWith("lineItems.")) fields.push({ ...f, group: "Line Items" });
        else if (f.value.startsWith("tenderItems.")) fields.push({ ...f, group: "Tender Items" });
        else fields.push({ ...f, group: "Activity" });
      }
      for (const cf of calculatedFields.filter((c) => c.id !== selectedCalcFieldId && c.name)) {
        fields.push({ value: cf.name, label: cf.label || cf.name, fieldType: "number" as const, group: "Calculated" });
      }
    }
    return fields;
  }, [selectedCalcField?.kind, selectedCalcField?.source, activityFieldOptions, calculatedFields, selectedCalcFieldId]);

  const calcAcMatches = React.useMemo(() => {
    if (!calcCursorToken) return [];
    const q = calcCursorToken.toLowerCase();
    return calcAllFieldOptions
      .filter((f) => f.value.toLowerCase().includes(q) || f.label.toLowerCase().includes(q))
      .slice(0, 10);
  }, [calcCursorToken, calcAllFieldOptions]);

  // Position the autocomplete dropdown using fixed positioning to escape overflow clipping.
  // Recalculate on scroll/resize so it stays anchored to the textarea.
  const [calcAcPos, setCalcAcPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const updateCalcAcPos = React.useCallback(() => {
    if (calcExprRef.current) {
      const rect = calcExprRef.current.getBoundingClientRect();
      setCalcAcPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  React.useEffect(() => {
    if (calcAcMatches.length === 0) {
      setCalcAcPos(null);
      return;
    }
    updateCalcAcPos();
    window.addEventListener("scroll", updateCalcAcPos, true);
    window.addEventListener("resize", updateCalcAcPos);
    return () => {
      window.removeEventListener("scroll", updateCalcAcPos, true);
      window.removeEventListener("resize", updateCalcAcPos);
    };
  }, [calcAcMatches.length, updateCalcAcPos]);

  // Memoize expression validation + unknown field detection for the selected calc field
  const calcExprValidation = React.useMemo(() => {
    if (!selectedCalcField?.expression) return { error: null, unknownFields: [] as string[] };
    const error = validateExpression(selectedCalcField.expression);
    if (error) return { error, unknownFields: [] as string[] };
    const refs = extractFieldRefs(selectedCalcField.expression);
    const knownFields = new Set(calcAllFieldOptions.map((f) => f.value));
    const unknownFields = refs.filter((r) => !knownFields.has(r));
    return { error: null, unknownFields };
  }, [selectedCalcField?.expression, calcAllFieldOptions]);

  const insertCalcAutocompleteField = (fieldValue: string) => {
    const ta = calcExprRef.current;
    if (!ta || !selectedCalcField) return;
    const pos = ta.selectionStart;
    const before = selectedCalcField.expression.slice(0, pos);
    const after = selectedCalcField.expression.slice(pos);
    const match = /[a-zA-Z_][\w.]*$/.exec(before);
    const tokenStart = match ? pos - match[0].length : pos;
    const newExpr = selectedCalcField.expression.slice(0, tokenStart) + fieldValue + after;
    handleUpdateCalcField({ expression: newExpr });
    setCalcCursorToken("");
    setCalcAcIndex(0);
    requestAnimationFrame(() => {
      const newPos = tokenStart + fieldValue.length;
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
    });
  };

  const handleCalcExprChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    handleUpdateCalcField({ expression: value });
    const pos = e.target.selectionStart;
    const before = value.slice(0, pos);
    const match = /[a-zA-Z_][\w.]*$/.exec(before);
    setCalcCursorToken(match ? match[0] : "");
    setCalcAcIndex(0);
  };

  const handleCalcExprKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (calcAcMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCalcAcIndex((i) => (i + 1) % calcAcMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCalcAcIndex((i) => (i - 1 + calcAcMatches.length) % calcAcMatches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const match = calcAcMatches[calcAcIndex];
      if (match) insertCalcAutocompleteField(match.value);
    } else if (e.key === "Escape") {
      setCalcCursorToken("");
    }
  };

  // Aggregate filter helpers for calc fields
  const handleAddCalcFilter = () => {
    if (!selectedCalcField) return;
    const existing = selectedCalcField.filters ?? [];
    handleUpdateCalcField({ filters: [...existing, { field: "", operator: "eq" as const, value: "" }] });
  };

  const handleRemoveCalcFilter = (index: number) => {
    if (!selectedCalcField) return;
    handleUpdateCalcField({ filters: (selectedCalcField.filters ?? []).filter((_, i) => i !== index) });
  };

  const handleUpdateCalcFilter = (index: number, patch: Partial<CalcFilter>) => {
    if (!selectedCalcField) return;
    handleUpdateCalcField({
      filters: (selectedCalcField.filters ?? []).map((f, i) => (i === index ? { ...f, ...patch } : f)),
    });
  };

  const calcSourceFields = React.useMemo(
    () => (activityFieldOptions ?? []).filter((f) => f.value.startsWith(`${selectedCalcField?.source ?? "lineItems"}.`)),
    [activityFieldOptions, selectedCalcField?.source],
  );

  // Validation rule handlers (split-pane inline editing)
  const selectedRule = React.useMemo(
    () => validationRules.find((r) => r.id === selectedRuleId) ?? null,
    [validationRules, selectedRuleId],
  );

  const handleAddRule = () => {
    const newRule: ValidationRuleDef = {
      id: generateObjectId(),
      type: "required",
      field: [],
    };
    setValidationRules((prev) => [...prev, newRule]);
    setSelectedRuleId(newRule.id);
    setPristineRuleIds((prev) => new Set(prev).add(newRule.id));
  };

  const updateSelectedRule = (patch: Partial<ValidationRuleDef>) => {
    if (!selectedRuleId) return;
    setPristineRuleIds((prev) => {
      if (!prev.has(selectedRuleId)) return prev;
      const next = new Set(prev);
      next.delete(selectedRuleId);
      return next;
    });
    setValidationRules((prev) =>
      prev.map((r) => (r.id === selectedRuleId ? { ...r, ...patch } : r)),
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setValidationRules((prev) => prev.filter((r) => r.id !== ruleId));
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
  };

  // Reason code toggle
  const handleToggleReasonCode = (code: string) => {
    setReasonCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  // Create a new reason code enum entry and auto-select it
  const handleCreateReasonCode = async () => {
    const val = newReasonCodeValue.trim();
    const lbl = newReasonCodeLabel.trim();
    if (!val || !lbl) return;
    // Check for duplicates
    if (reasonCodeOptions?.some((o) => o.value === val)) {
      toast.error("A reason code with this value already exists");
      return;
    }
    setCreatingReasonCode(true);
    try {
      await createEnumMutation.mutateAsync({
        type: "ActivityReasonCode",
        lang: "en",
        value: val,
        label: lbl,
        valueType: "String",
        org: currentOrg,
      } as Record<string, unknown>);
      // Auto-select the newly created code
      setReasonCodes((prev) => [...prev, val]);
      setNewReasonCodeValue("");
      setNewReasonCodeLabel("");
      toast.success(`Reason code "${lbl}" created`);
    } catch {
      toast.error("Failed to create reason code");
    } finally {
      setCreatingReasonCode(false);
    }
  };

  // Filter rule type options based on selected field type
  const selectedRuleField = selectedRule
    ? typeof selectedRule.field === "string" ? selectedRule.field : selectedRule.field[0]
    : undefined;

  const availableRuleTypes = React.useMemo(() => {
    if (!selectedRuleField) return VALIDATION_RULE_TYPE_OPTIONS;
    let fieldType: string | undefined;
    if (selectedRuleField.startsWith("ext.")) {
      const name = selectedRuleField.slice(4);
      const ext = extensions.find((f) => f.name === name);
      if (ext) fieldType = ext.type === "select" ? "string" : ext.type;
      else {
        const extOpt = extFieldOptions.find((f) => f.value === name);
        if (extOpt) fieldType = extOpt.fieldType;
        else {
          const apiOpt = dedupedApiExtOptions.find((f) => f.value === name);
          if (apiOpt) fieldType = apiOpt.fieldType;
        }
      }
    } else {
      const std = activityFieldOptions.find((f) => f.value === selectedRuleField);
      fieldType = std?.fieldType;
    }
    const isNumeric = fieldType === "number";
    return VALIDATION_RULE_TYPE_OPTIONS.filter((opt) => {
      if (opt.value === "min" || opt.value === "max") {
        return !fieldType || isNumeric;
      }
      return true;
    });
  }, [selectedRuleField, extensions, extFieldOptions, dedupedApiExtOptions, activityFieldOptions]);

  // Loading / error states
  if (!currentProgram) {
    return <NoProgramBanner context="activity templates" />;
  }

  if (!isCreateMode && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!isCreateMode && !isLoading && !config) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-foreground-muted mb-4" />
        <h2 className="text-h4 text-foreground mb-2">Activity template not found</h2>
        <Button variant="ghost" onClick={() => navigate("/program/activity-templates")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Activity Templates
        </Button>
      </div>
    );
  }

  // Resolve field label for display in validation rules table
  const resolveFieldLabel = (fieldPath: string) => {
    if (fieldPath.startsWith("ext.")) {
      const name = fieldPath.slice(4);
      const ext = extensions.find((f) => f.name === name);
      if (ext) return fieldName ? `ext.${fieldName}.${ext.label}` : `ext.${ext.label}`;
      // Fall back to API extension field label
      const apiLabel = getApiExtLabel(name);
      if (apiLabel !== name) return apiLabel;
      return fieldPath;
    }
    return getActivityFieldLabel(fieldPath);
  };

  return (
    <div ref={formRef} data-testid="activity-template-edit-page">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            data-testid="activity-template-back"
            aria-label="Back"
            onClick={handleCancel}
            className="shrink-0 rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            {isCreateMode && (
              <span className="text-caption-xs font-semibold uppercase tracking-wider text-brand mb-0.5 block">New Template</span>
            )}
            <input
              data-testid="activity-template-title-input"
              id="activity-template-title-input"
              aria-label="Template name"
              value={label}
              onChange={(e) => { setLabel(e.target.value); clearError("label"); }}
              placeholder="Enter template name..."
              className="text-h3 text-foreground bg-transparent border-none outline-none placeholder:text-foreground-muted/50 w-full focus:ring-0 p-0"
            />
            <p className="text-body-sm text-foreground-muted mt-0.5">Define how you will recognize, validate, and enrich signals from your customers</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!isCreateMode && (
            <Button
              type="button"
              variant="ghost"
              className="text-error hover:text-error hover:bg-error/5"
              onClick={() => setDeleteOpen(true)}
              data-testid="activity-template-delete"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            data-testid="activity-template-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty && !isCreateMode}
            data-testid="activity-template-save"
          >
            {isCreateMode ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        // Auto-select first validation rule when switching to validation tab
        if (tab === "validation" && validationRules.length > 0 && !selectedRuleId) {
          setSelectedRuleId(validationRules[0]!.id);
        }
        // If switching to a tab with errors, focus the first errored field
        if (Object.keys(formErrors).length > 0) {
          const tabFields = TAB_FIELDS[tab];
          if (tabFields?.some((f) => formErrors[f])) {
            focusFirstErrorField(formErrors);
          }
        }
        // Auto-select first calc field when switching to calculations tab
        if (tab === "calculations" && calculatedFields.length > 0 && !selectedCalcFieldId) {
          setSelectedCalcFieldId(calculatedFields[0]!.id);
        }
      }}>
        <Tabs.List className="mb-6 flex border-b border-border">
          {[
            { value: "general", label: "General", icon: Settings },
            { value: "extensions", label: "Fields", icon: Puzzle },
            { value: "reason-codes", label: "Reason Codes", icon: ListChecks },
            { value: "validation", label: "Validation", icon: ShieldCheck },
            { value: "calculations", label: "Calculations", icon: Calculator },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              data-testid={`activity-template-tab-${tab.value}`}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 font-medium transition-colors",
                "text-foreground-muted hover:text-foreground",
                "data-[state=active]:text-brand",
                "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                "after:bg-transparent data-[state=active]:after:bg-brand",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tabsWithErrors.has(tab.value) && (
                <span className="ml-1 inline-block h-2 w-2 rounded-full bg-error" />
              )}
              {tab.value === "extensions" && mergedFieldRows.length > 0 && (
                <Badge variant="secondary" className="ml-1">{mergedFieldRows.length}</Badge>
              )}
              {tab.value === "reason-codes" && reasonCodes.length > 0 && (
                <Badge variant="secondary" className="ml-1">{reasonCodes.length}</Badge>
              )}
              {tab.value === "validation" && validationRules.length > 0 && (
                <Badge variant="secondary" className="ml-1">{validationRules.length}</Badge>
              )}
              {tab.value === "calculations" && calculatedFields.length > 0 && (
                <Badge variant="secondary" className="ml-1">{calculatedFields.length}</Badge>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* General Tab */}
        <Tabs.Content value="general" className="outline-none">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="max-w-[var(--width-form-max)] space-y-4">
              <div>
                <label htmlFor="at-field-name" className="mb-1.5 block text-label font-medium text-foreground">
                  Namespace <span className="text-error">*</span>
                </label>
                {isCreateMode ? (
                  <>
                    <Input
                      id="at-field-name"
                      value={fieldName}
                      onChange={(e) => { setFieldName(e.target.value); clearError("fieldName"); }}
                      placeholder="e.g. fb, hotel, retail"
                      error={!!(fieldName && fieldNameError) || !!formErrors.fieldName}
                      data-testid="activity-template-field-name"
                    />
                    {(fieldName && fieldNameError) || formErrors.fieldName ? (
                      <p className="mt-1 text-caption text-error">{fieldNameError ?? formErrors.fieldName}</p>
                    ) : (
                      <p className="mt-1 text-caption text-foreground-muted">
                        The namespace under which this template&apos;s custom fields will be stored (e.g. <code className="rounded bg-subtle px-1 py-0.5">ext.{fieldName || "fb"}</code>)
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-body-sm px-3 py-1.5 font-mono">{fieldName}</Badge>
                    <span className="text-caption text-foreground-muted">ext.{fieldName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Type Values <span className="text-error">*</span>
                </label>
                <div className={cn(
                  "flex flex-wrap items-center gap-1.5",
                  formErrors.typeValues && "rounded-[var(--input-radius)] border border-error p-2",
                )}>
                  {typeValues.map((tv) => (
                    <Badge key={tv} className="flex items-center gap-1 text-body-sm px-3 py-1.5 pr-1.5 text-accent-violet bg-accent-violet-light">
                      {tv}
                      <button
                        data-testid={`activity-template-remove-type-${tv}`}
                        aria-label={`Remove ${tv}`}
                        className="ml-1 rounded-full p-0.5 hover:bg-accent-violet-light/70 hover:text-error transition-colors"
                        onClick={() => setTypeValues((prev) => prev.filter((v) => v !== tv))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <AddTypePopover
                    currentTypeValues={typeValues}
                    allTypes={allTypes}
                    activityTypeOptions={activityTypeOptions ?? []}
                    currentOrg={currentOrg}
                    createEnumMutation={createEnumMutation}
                    onAdd={(values) => { setTypeValues((prev) => [...prev, ...values]); clearError("typeValues"); }}
                    configId={configId}
                  />
                </div>
                {formErrors.typeValues && (
                  <p className="mt-1 text-caption text-error">{formErrors.typeValues}</p>
                )}
              </div>
              <div>
                <label htmlFor="at-label" className="mb-1.5 block text-label font-medium text-foreground">
                  Label <span className="text-error">*</span>
                </label>
                <Input
                  id="at-label"
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); clearError("label"); }}
                  placeholder="Display name"
                  error={!!formErrors.label}
                  data-testid="activity-template-field-label"
                />
                {formErrors.label && (
                  <p className="mt-1 text-caption text-error">{formErrors.label}</p>
                )}
              </div>
              <div>
                <label htmlFor="at-description" className="mb-1.5 block text-label font-medium text-foreground">Description</label>
                <textarea
                  data-testid="activity-template-field-description"
                  id="at-description"
                  aria-label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description"
                  className={cn(
                    "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                    "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                    "border border-[var(--input-border)]",
                    "placeholder:text-foreground-muted resize-y",
                    "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                  )}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">Divisions</label>
                <MultiSelect
                  value={divisions}
                  onChange={setDivisions}
                  options={divisionOptions}
                  placeholder="Select divisions"
                  searchPlaceholder="Search divisions..."
                  testIdPrefix="activity-template-divisions"
                />
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Fields Tab */}
        <Tabs.Content value="extensions" className="outline-none">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-light px-4 py-3 text-label text-on-info">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <span>
                Define fields specific to this activity type, in addition to standard fields like Type, Date, Channel Type, Channel ID, and Coupon Code.
                {fieldName && (
                  <> Fields will be stored under <code className="rounded bg-info-light px-1 py-0.5 font-mono text-caption">ext.{fieldName}</code>.</>
                )}
              </span>
            </div>
            {externalNamespaceFields.length > 0 && (
              <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-label text-on-warning">
                <Link className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  <strong>{externalNamespaceFields.length} field{externalNamespaceFields.length !== 1 ? "s" : ""}</strong> already
                  exist in the <code className="rounded bg-warning-light px-1 py-0.5 font-mono text-caption">ext.{fieldName}</code> namespace
                  from existing configuration. {externalNamespaceFields.filter((f) => !f.owned).length > 0 && "Fields marked \"External\" are read-only."}
                </span>
              </div>
            )}
            <div className="mb-4 mt-4 flex items-center justify-between">
              <h3 className="text-body font-medium text-foreground">Custom Fields</h3>
              <Button variant="outline" size="sm" onClick={handleAddField} data-testid="ext-add-field">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Field
              </Button>
            </div>
            {mergedFieldRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Puzzle className="h-10 w-10 text-foreground-muted mb-3" />
                <p className="text-body-sm text-foreground-muted mb-3">
                  No custom fields defined yet
                </p>
                <Button variant="outline" size="sm" onClick={handleAddField}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>
            ) : (
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2.5 font-medium text-foreground-muted">Name</th>
                    <th className="px-3 py-2.5 font-medium text-foreground-muted">Label</th>
                    <th className="px-3 py-2.5 font-medium text-foreground-muted">Type</th>
                    <th className="px-3 py-2.5 font-medium text-foreground-muted text-center">Required</th>
                    <th className="px-3 py-2.5 font-medium text-foreground-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedFieldRows.map((row) => {
                    if (row.kind === "external") {
                      const { info } = row;
                      return (
                        <tr key={`ext-${info.name}`} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2.5 font-mono text-label text-foreground-muted">
                            {fieldName ? <><span className="text-foreground-muted/60">{fieldName}.</span>{info.name}</> : info.name}
                            <Badge variant="outline" className="ml-2 text-caption">
                              {info.owned ? "Published" : "External"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-foreground-muted">{info.label}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant="secondary">{info.fieldType}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center text-foreground-muted">&mdash;</td>
                          <td className="px-3 py-2.5 text-right text-foreground-muted">
                            <span className="text-caption">&mdash;</span>
                          </td>
                        </tr>
                      );
                    }

                    const { field } = row;
                    return (
                      <tr key={field.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2.5 font-mono text-label text-foreground">
                          {fieldName ? <><span className="text-foreground-muted">{fieldName}.</span>{field.name}</> : field.name}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{field.label}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary">
                            {EXTENSION_FIELD_TYPE_OPTIONS.find((o) => o.value === field.type)?.label ?? field.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {field.required ? (
                            <span className="text-brand">Yes</span>
                          ) : (
                            <span className="text-foreground-muted">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              data-testid={`ext-field-edit-${field.id}`}
                              aria-label={`Edit field ${field.name}`}
                              className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
                              onClick={() => handleEditField(field)}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                            <button
                              data-testid={`ext-field-delete-${field.id}`}
                              aria-label={`Delete field ${field.name}`}
                              className="rounded p-1.5 text-foreground-muted hover:bg-error/10 hover:text-error cursor-pointer"
                              onClick={() => handleDeleteField(field.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Tabs.Content>

        {/* Reason Codes Tab — split pane */}
        <Tabs.Content value="reason-codes" className="outline-none">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden min-h-[var(--height-split-pane)]">
            {/* Main panel — checklist */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 bg-subtle/30">
                <div className="flex items-center gap-3 flex-1 min-w-60">
                  <h3 className="text-body font-medium text-foreground whitespace-nowrap">
                    Reason Codes
                    <span className="ml-1.5 text-caption font-normal text-foreground-muted">
                      ({reasonCodes.length} selected)
                    </span>
                  </h3>
                  <div className="relative flex-1 max-w-[var(--width-popover-sm)]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
                    <input
                      type="text"
                      data-testid="reason-code-filter"
                      id="reason-code-filter"
                      aria-label="Filter reason codes"
                      value={reasonCodeFilter}
                      onChange={(e) => setReasonCodeFilter(e.target.value)}
                      placeholder="Filter by name or value..."
                      className={cn(
                        "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                        "py-1.5 pl-8 pr-3 text-label text-foreground placeholder:text-foreground-muted",
                        "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                      )}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    data-testid="reason-codes-show-selected"
                    aria-label="Show selected only"
                    onClick={() => setShowSelectedOnly((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-caption font-medium transition-colors",
                      showSelectedOnly
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border text-foreground-muted hover:bg-subtle hover:text-foreground",
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Selected only
                  </button>
                  <button
                    data-testid="reason-codes-select-all"
                    aria-label="Select all reason codes"
                    disabled={filteredReasonCodes.length === 0}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-caption font-medium text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => {
                      const filtered = filteredReasonCodes.map((o) => o.value);
                      const allSelected = filtered.every((v) => reasonCodes.includes(v));
                      if (allSelected) {
                        setReasonCodes((prev) => prev.filter((c) => !filtered.includes(c)));
                      } else {
                        setReasonCodes((prev) => [...new Set([...prev, ...filtered])]);
                      }
                    }}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {filteredReasonCodes.length > 0 && filteredReasonCodes.every((o) => reasonCodes.includes(o.value))
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {(reasonCodeOptions ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ListChecks className="h-10 w-10 text-foreground-muted mb-3" />
                    <p className="text-body-sm text-foreground-muted">No ActivityReasonCode enum values found</p>
                  </div>
                ) : filteredReasonCodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="h-8 w-8 text-foreground-muted mb-2" />
                    <p className="text-body-sm text-foreground-muted">
                      {showSelectedOnly && reasonCodes.length === 0
                        ? "No reason codes selected"
                        : "No matching reason codes"}
                    </p>
                  </div>
                ) : (
                  filteredReasonCodes.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-subtle cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        data-testid={`reason-code-toggle-${opt.value}`}
                        aria-label={`Toggle ${opt.label}`}
                        checked={reasonCodes.includes(opt.value)}
                        onChange={() => handleToggleReasonCode(opt.value)}
                        className="h-4 w-4 rounded-sm border-border-strong accent-brand"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-body-sm font-medium text-foreground">{opt.label}</span>
                        <span className="ml-2 text-caption text-foreground-muted">({opt.value})</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-5 py-2.5 bg-subtle/30 text-caption text-foreground-muted">
                Showing {filteredReasonCodes.length} of {(reasonCodeOptions ?? []).length} reason codes
              </div>
            </div>

            {/* Right sidebar — Quick Create */}
            <aside className="w-[var(--width-popover-sm)] shrink-0 border-l border-border p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-body font-medium text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-brand" />
                  Quick Create
                </h3>
                <p className="text-caption text-foreground-muted mt-1">Add a new reason code to the system catalog.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-caption-xs font-semibold text-foreground-muted uppercase tracking-wider">Value</label>
                  <Input
                    value={newReasonCodeValue}
                    onChange={(e) => setNewReasonCodeValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateReasonCode(); } }}
                    placeholder="e.g. 5000001"
                    data-testid="reason-code-new-value"
                    id="reason-code-new-value"
                    aria-label="New reason code value"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-caption-xs font-semibold text-foreground-muted uppercase tracking-wider">Label</label>
                  <Input
                    value={newReasonCodeLabel}
                    onChange={(e) => setNewReasonCodeLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateReasonCode(); } }}
                    placeholder="e.g. Winter Sale Credit"
                    data-testid="reason-code-new-label"
                    id="reason-code-new-label"
                    aria-label="New reason code label"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateReasonCode}
                  disabled={!newReasonCodeValue.trim() || !newReasonCodeLabel.trim() || creatingReasonCode}
                  loading={creatingReasonCode}
                  data-testid="reason-code-create"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create and Add
                </Button>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-caption-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">Summary</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-label">
                    <span className="text-foreground-muted">Selected</span>
                    <span className="font-semibold text-brand">{reasonCodes.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-label">
                    <span className="text-foreground-muted">Available</span>
                    <span className="font-medium text-foreground">{(reasonCodeOptions ?? []).length}</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto rounded-lg border border-brand/10 bg-brand/5 p-3">
                <p className="text-caption text-foreground-muted leading-relaxed">
                  New codes created here will be automatically added to the selection list and global enum registry.
                </p>
              </div>
            </aside>
          </div>
        </Tabs.Content>

        {/* Validation Rules Tab — split pane */}
        <Tabs.Content value="validation" className="outline-none">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden min-h-[var(--height-split-pane-sm)]">
            {/* Left sidebar — rule list */}
            <aside className="w-[var(--width-popover-sm)] shrink-0 border-r border-border flex flex-col">
              <div className="flex items-center justify-between p-4 pb-3">
                <h3 className="text-body font-medium text-foreground">Rules</h3>
                <Button variant="outline" size="sm" onClick={handleAddRule} data-testid="rule-add">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {validationRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <ShieldCheck className="h-8 w-8 text-foreground-muted mb-2" />
                    <p className="text-label text-foreground-muted">No rules defined</p>
                  </div>
                ) : (
                  validationRules.map((rule) => {
                    const isActive = rule.id === selectedRuleId;
                    const issue = ruleIssues.get(rule.id);
                    return (
                      <button
                        key={rule.id}
                        type="button"
                        data-testid={`rule-item-${rule.id}`}
                        aria-label={`Edit rule ${VALIDATION_RULE_TYPE_OPTIONS.find((o) => o.value === rule.type)?.label ?? rule.type}`}
                        onClick={() => setSelectedRuleId(rule.id)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg p-3 mb-1 text-left transition-all cursor-pointer",
                          "border-l-4",
                          issue
                            ? isActive ? "bg-error/5 border-error" : "border-error/50 hover:bg-subtle group"
                            : isActive
                              ? "bg-brand/5 border-brand"
                              : "border-transparent hover:bg-subtle group",
                        )}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-caption-xs font-bold uppercase tracking-wider mb-0.5",
                            issue ? "text-error" : isActive ? "text-brand" : "text-foreground-muted",
                          )}>
                            {VALIDATION_RULE_TYPE_OPTIONS.find((o) => o.value === rule.type)?.label ?? rule.type}
                          </span>
                          <span className={cn(
                            "text-label font-medium truncate",
                            issue ? "text-error/80" : isActive ? "text-foreground" : "text-foreground-muted",
                          )}>
                            {rule.type === "allowed_channels"
                              ? (rule.channels?.length ?? 0) > 0
                                ? `${rule.mode === "exclude" ? "Disallow" : "Allow"}: ${rule.channels!.length} channel${rule.channels!.length !== 1 ? "s" : ""}`
                                : "No channels selected"
                              : Array.isArray(rule.field)
                                ? rule.field.length > 0
                                  ? rule.field.length <= 2
                                    ? rule.field.map(resolveFieldLabel).join(", ")
                                    : `${rule.field.slice(0, 2).map(resolveFieldLabel).join(", ")} +${rule.field.length - 2}`
                                  : "No fields selected"
                                : rule.field ? resolveFieldLabel(rule.field) : "No field selected"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {issue && (
                            <AlertCircle className="h-3.5 w-3.5 text-error" />
                          )}
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-foreground-muted" : "text-transparent group-hover:text-foreground-muted",
                          )} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right panel — rule detail form */}
            <section className="flex-1 flex flex-col bg-subtle/30">
              {!selectedRule ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <ShieldCheck className="h-10 w-10 text-foreground-muted mb-3" />
                  <p className="text-body-sm text-foreground-muted mb-1">
                    {validationRules.length === 0 ? "No validation rules defined" : "Select a rule to edit"}
                  </p>
                  {validationRules.length === 0 && (
                    <p className="text-caption text-foreground-muted mb-3">
                      Add a rule to enforce field constraints on activities.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Detail header */}
                  <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div>
                      <h3 className="text-body font-medium text-foreground">Rule Details</h3>
                      <p className="text-caption text-foreground-muted mt-0.5">Configure the validation logic for this field.</p>
                    </div>
                    <button
                      data-testid="rule-delete"
                      aria-label="Delete rule"
                      className="rounded p-1.5 text-foreground-muted hover:bg-error/10 hover:text-error transition-colors"
                      onClick={() => handleDeleteRule(selectedRule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Detail form */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {ruleIssues.has(selectedRule.id) && (
                      <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-label text-error">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {ruleIssues.get(selectedRule.id)}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="mb-1.5 block text-label font-medium text-foreground">
                          Rule Type <span className="text-error">*</span>
                        </label>
                        <Select
                          value={selectedRule.type}
                          onValueChange={(v) => {
                            const newType = v as ValidationRuleType;
                            const isMulti = newType === "required" || newType === "conditional_required";
                            const wasMulti = selectedRule.type === "required" || selectedRule.type === "conditional_required";
                            const isChannels = newType === "allowed_channels";
                            // Convert field between string and string[] when switching
                            let newField: string | string[] = isChannels ? "" : selectedRule.field;
                            if (!isChannels) {
                              if (isMulti && !wasMulti) {
                                newField = typeof selectedRule.field === "string" && selectedRule.field ? [selectedRule.field] : [];
                              } else if (!isMulti && wasMulti) {
                                newField = Array.isArray(selectedRule.field) ? (selectedRule.field[0] ?? "") : selectedRule.field;
                              }
                            }
                            updateSelectedRule({
                              type: newType,
                              field: newField,
                              // Clear irrelevant fields when switching type
                              value: newType === "min" || newType === "max" || newType === "pattern" ? selectedRule.value : undefined,
                              conditionField: newType === "conditional_required" ? selectedRule.conditionField : undefined,
                              conditionOperator: newType === "conditional_required" ? (selectedRule.conditionOperator ?? "equals") : undefined,
                              conditionValue: newType === "conditional_required" ? selectedRule.conditionValue : undefined,
                              mode: isChannels ? (selectedRule.mode ?? "include") : undefined,
                              channels: isChannels ? (selectedRule.channels ?? []) : undefined,
                            });
                          }}
                        >
                          <SelectTrigger data-testid="rule-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRuleTypes.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedRule.type !== "allowed_channels" && (
                        <div>
                          <label className="mb-1.5 block text-label font-medium text-foreground">
                            Target Field{selectedRule.type === "required" || selectedRule.type === "conditional_required" ? "s" : ""} <span className="text-error">*</span>
                          </label>
                          {selectedRule.type === "required" || selectedRule.type === "conditional_required" ? (
                            <SearchableMultiFieldPicker
                              value={Array.isArray(selectedRule.field) ? selectedRule.field : selectedRule.field ? [selectedRule.field] : []}
                              onChange={(v) => updateSelectedRule({ field: v })}
                              standardFields={activityFieldOptions}
                              fieldOptions={extFieldOptions}
                              apiExtFields={dedupedApiExtOptions}
                              namespace={fieldName}
                              testId="rule-field"
                            />
                          ) : (
                            <SearchableFieldPicker
                              value={typeof selectedRule.field === "string" ? selectedRule.field : (selectedRule.field[0] ?? "")}
                              onChange={(v) => updateSelectedRule({ field: v })}
                              standardFields={activityFieldOptions}
                              fieldOptions={extFieldOptions}
                              apiExtFields={dedupedApiExtOptions}
                              namespace={fieldName}
                              testId="rule-field"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Value — shown for min/max */}
                    {(selectedRule.type === "min" || selectedRule.type === "max") && (
                      <div>
                        <label className="mb-1.5 block text-label font-medium text-foreground">
                          Value <span className="text-error">*</span>
                        </label>
                        <NumericValueInput
                          value={selectedRule.value as number | undefined}
                          onChange={(v) => updateSelectedRule({ value: v })}
                          data-testid="rule-value"
                        />
                      </div>
                    )}

                    {/* Pattern editor — shown for pattern type */}
                    {selectedRule.type === "pattern" && (
                      <PatternEditor
                        value={selectedRule.value != null ? String(selectedRule.value) : ""}
                        onChange={(regex) => updateSelectedRule({ value: regex })}
                      />
                    )}

                    {/* Selected fields summary for required type */}
                    {selectedRule.type === "required" && Array.isArray(selectedRule.field) && selectedRule.field.length > 0 && (
                      <div>
                        <label className="mb-1.5 block text-label font-medium text-foreground-muted">
                          {selectedRule.field.length} field{selectedRule.field.length !== 1 ? "s" : ""} will be required
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRule.field.map((f) => (
                            <span key={f} className="inline-flex items-center rounded-[var(--badge-radius)] bg-info-light px-2 py-0.5 text-caption font-medium text-on-info">
                              {resolveFieldLabel(f)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conditional required fields */}
                    {selectedRule.type === "conditional_required" && (
                      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                        <p className="text-caption font-medium uppercase tracking-wider text-foreground-muted">Condition</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1.5 block text-label font-medium text-foreground">Condition Field</label>
                            <SearchableFieldPicker
                              value={selectedRule.conditionField ?? ""}
                              onChange={(v) => updateSelectedRule({ conditionField: v })}
                              standardFields={activityFieldOptions}
                              fieldOptions={extFieldOptions}
                              apiExtFields={dedupedApiExtOptions}
                              namespace={fieldName}
                              testId="rule-condition-field"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-label font-medium text-foreground">Operator</label>
                            <Select
                              value={selectedRule.conditionOperator ?? "equals"}
                              onValueChange={(v) => updateSelectedRule({ conditionOperator: v as ConditionOperator })}
                            >
                              <SelectTrigger data-testid="rule-condition-operator">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_OPERATOR_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {(selectedRule.conditionOperator ?? "equals") !== "exists" && (
                          <div>
                            <label className="mb-1.5 block text-label font-medium text-foreground">Condition Value</label>
                            <Input
                              value={selectedRule.conditionValue ?? ""}
                              onChange={(e) => updateSelectedRule({ conditionValue: e.target.value })}
                              placeholder="Enter condition value"
                              data-testid="rule-condition-value"
                            id="rule-condition-value"
                            aria-label="Condition value"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Allowed channels */}
                    {selectedRule.type === "allowed_channels" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="mb-1.5 block text-label font-medium text-foreground">Mode</label>
                          <Select
                            value={selectedRule.mode ?? "include"}
                            onValueChange={(v) => updateSelectedRule({ mode: v as "include" | "exclude" })}
                          >
                            <SelectTrigger data-testid="rule-channel-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHANNEL_MODE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="mt-1.5 text-caption text-foreground-muted">
                            {(selectedRule.mode ?? "include") === "include"
                              ? "Only the selected channels will be accepted."
                              : "All channels except the selected ones will be accepted."}
                          </p>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-label font-medium text-foreground">
                            Channels <span className="text-error">*</span>
                          </label>
                          <MultiSelect
                            value={selectedRule.channels ?? []}
                            onChange={(v) => updateSelectedRule({ channels: v })}
                            options={channelTypeOptions}
                            placeholder="Select channels..."
                            searchPlaceholder="Search channels..."
                            showBulkActions
                            testIdPrefix="rule-channels"
                          />
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">Custom Error Message</label>
                      <textarea
                        data-testid="rule-message"
                        id="rule-message"
                        aria-label="Custom error message"
                        value={selectedRule.message ?? ""}
                        onChange={(e) => updateSelectedRule({ message: e.target.value || undefined })}
                        placeholder="Enter the message shown when validation fails..."
                        rows={3}
                        className={cn(
                          "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                          "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                          "border border-[var(--input-border)]",
                          "placeholder:text-foreground-muted resize-none",
                          "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                        )}
                      />
                      <p className="mt-1 text-caption-xs text-foreground-muted italic">Leave blank to use default system message.</p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </Tabs.Content>

        {/* Calculations Tab */}
        <Tabs.Content value="calculations" className="outline-none">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden min-h-[var(--height-split-pane-sm)]">
            {/* Left sidebar — calc field list */}
            <aside className="w-[var(--width-popover-sm)] shrink-0 border-r border-border flex flex-col">
              <div className="flex items-center justify-between p-4 pb-3">
                <h3 className="text-body font-medium text-foreground">Calculations</h3>
                <Button variant="outline" size="sm" onClick={handleAddCalcField} data-testid="calc-field-add">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {calculatedFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <Calculator className="h-8 w-8 text-foreground-muted mb-2" />
                    <p className="text-label text-foreground-muted">No calculations defined</p>
                  </div>
                ) : (
                  calculatedFields.map((field, index) => {
                    const isActive = field.id === selectedCalcFieldId;
                    const hasIssue = calcFieldIssues.has(field.id);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        data-testid={`calc-field-item-${field.id}`}
                        aria-label={`Select calculation field ${field.name || field.id}`}
                        onClick={() => setSelectedCalcFieldId(field.id)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg p-3 mb-1 text-left transition-all cursor-pointer",
                          "border-l-4",
                          hasIssue
                            ? isActive ? "bg-error/5 border-error" : "border-error/50 hover:bg-subtle group"
                            : isActive
                              ? "bg-brand/5 border-brand"
                              : "border-transparent hover:bg-subtle group",
                        )}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-caption-xs font-bold uppercase tracking-wider mb-0.5",
                            hasIssue ? "text-error" : isActive ? "text-brand" : "text-foreground-muted",
                          )}>
                            {field.kind === "scalar" ? "Single Value" : "Aggregate"}
                          </span>
                          <span className={cn(
                            "text-label font-medium truncate",
                            hasIssue ? "text-error/80" : isActive ? "text-foreground" : "text-foreground-muted",
                          )}>
                            {field.label || field.name || `Calculation ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasIssue && (
                            <AlertCircle className="h-3.5 w-3.5 text-error" />
                          )}
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-foreground-muted" : "text-transparent group-hover:text-foreground-muted",
                          )} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right panel — calc field detail */}
            <section className="flex-1 flex flex-col bg-subtle/30">
              {!selectedCalcField ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <Calculator className="h-10 w-10 text-foreground-muted mb-3" />
                  <p className="text-body-sm text-foreground-muted mb-3">
                    {calculatedFields.length === 0
                      ? "Add a calculation to define computed fields"
                      : "Select a calculation to edit"}
                  </p>
                  {calculatedFields.length === 0 && (
                    <Button variant="outline" size="sm" onClick={handleAddCalcField}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Calculation
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Detail header */}
                  <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div>
                      <h3 className="text-body font-medium text-foreground">Calculation Details</h3>
                      <p className="text-caption text-foreground-muted mt-0.5">Configure the calculation formula and options.</p>
                    </div>
                    <button
                      data-testid="calc-field-delete"
                      aria-label="Delete calculation"
                      onClick={() => handleDeleteCalcField(selectedCalcField.id)}
                      className="rounded p-1.5 text-foreground-muted hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Detail form */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Name + Label */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">
                        Name <span className="text-error">*</span>
                      </label>
                      <Input
                        value={selectedCalcField.name}
                        onChange={(e) => handleUpdateCalcField({ name: e.target.value })}
                        placeholder="e.g. eligibleSpend"
                        error={!!calcFieldIssues.get(selectedCalcField.id)?.name}
                        data-testid="calc-field-name"
                      />
                      {calcFieldIssues.get(selectedCalcField.id)?.name && (
                        <p className="mt-1 text-caption text-error">{calcFieldIssues.get(selectedCalcField.id)!.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">
                        Label <span className="text-error">*</span>
                      </label>
                      <Input
                        value={selectedCalcField.label}
                        onChange={(e) => handleUpdateCalcField({ label: e.target.value })}
                        placeholder="e.g. Eligible Spend"
                        error={!!calcFieldIssues.get(selectedCalcField.id)?.label}
                        data-testid="calc-field-label"
                      />
                      {calcFieldIssues.get(selectedCalcField.id)?.label && (
                        <p className="mt-1 text-caption text-error">{calcFieldIssues.get(selectedCalcField.id)!.label}</p>
                      )}
                    </div>
                  </div>

                  {/* Kind toggle */}
                  <div>
                    <label className="mb-1.5 block text-label font-medium text-foreground">Kind</label>
                    <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
                      {CALC_KIND_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          data-testid={`calc-field-kind-${opt.value}`}
                          aria-label={`Set kind to ${opt.label}`}
                          onClick={() => handleUpdateCalcField({ kind: opt.value as "scalar" | "aggregate" })}
                          className={cn(
                            "rounded-md px-4 py-1.5 text-body-sm font-medium transition-colors cursor-pointer",
                            selectedCalcField.kind === opt.value
                              ? "bg-brand text-foreground-inverse"
                              : "text-foreground-muted hover:text-foreground hover:bg-subtle",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block text-label font-medium text-foreground">Description</label>
                    <Input
                      value={selectedCalcField.description ?? ""}
                      onChange={(e) => handleUpdateCalcField({ description: e.target.value || undefined })}
                      placeholder="Optional description"
                      data-testid="calc-field-description"
                    />
                  </div>

                  {/* Rounding */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">Rounding Mode</label>
                      <Select
                        value={selectedCalcField.roundingMode ?? "halfUp"}
                        onValueChange={(v) => handleUpdateCalcField({ roundingMode: v as RoundingMode })}
                        data-testid="calc-field-rounding-mode"
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CALC_ROUNDING_MODE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">Decimal Places</label>
                      <Input
                        type="number"
                        min={0}
                        max={6}
                        value={selectedCalcField.roundingDecimals ?? 2}
                        onChange={(e) => {
                          const val = Math.min(6, Math.max(0, parseInt(e.target.value, 10) || 0));
                          handleUpdateCalcField({ roundingDecimals: val });
                        }}
                        disabled={(selectedCalcField.roundingMode ?? "halfUp") === "none"}
                        data-testid="calc-field-rounding-decimals"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Aggregate-only: Source + Aggregation */}
                  {selectedCalcField.kind === "aggregate" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-label font-medium text-foreground">Source</label>
                        <Select
                          value={selectedCalcField.source ?? "lineItems"}
                          onValueChange={(v) => handleUpdateCalcField({ source: v as "lineItems" | "tenderItems", filters: [], groupBy: undefined })}
                        >
                          <SelectTrigger className="cursor-pointer" data-testid="calc-field-source"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[var(--z-toast)]">
                            {CALC_SOURCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-label font-medium text-foreground">Aggregation</label>
                        <Select
                          value={selectedCalcField.aggregation ?? "sum"}
                          onValueChange={(v) => handleUpdateCalcField({ aggregation: v as "sum" | "count" | "min" | "max" | "avg" })}
                        >
                          <SelectTrigger className="cursor-pointer" data-testid="calc-field-aggregation"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[var(--z-toast)]">
                            {CALC_AGGREGATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Expression — operator toolbar + textarea */}
                  <div>
                    <label className="mb-1.5 block text-label font-medium text-foreground">
                      Expression <span className="text-error">*</span>
                    </label>
                    <div className="mb-1.5 flex gap-1">
                      {[
                        { label: "+", text: " + " },
                        { label: "\u2212", text: " - " },
                        { label: "\u00d7", text: " * " },
                        { label: "\u00f7", text: " / " },
                        { label: "(", text: "(" },
                        { label: ")", text: ")" },
                      ].map((op) => (
                        <button
                          key={op.label}
                          type="button"
                          data-testid={`calc-op-${op.label}`}
                          aria-label={`Insert operator ${op.label}`}
                          onMouseDown={(e) => { e.preventDefault(); insertCalcExprAtCursor(op.text); }}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md border border-border",
                            "text-body-sm font-medium text-foreground",
                            "hover:bg-subtle cursor-pointer transition-colors",
                          )}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <textarea
                        ref={calcExprRef}
                        data-testid="calc-field-expression"
                        aria-label="Calculated field expression"
                        value={selectedCalcField.expression}
                        onChange={handleCalcExprChange}
                        onKeyDown={handleCalcExprKeyDown}
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        onClick={(e) => {
                          const ta = e.currentTarget;
                          const before = ta.value.slice(0, ta.selectionStart);
                          const match = /[a-zA-Z_][\w.]*$/.exec(before);
                          setCalcCursorToken(match ? match[0] : "");
                          setCalcAcIndex(0);
                        }}
                        onBlur={() => setTimeout(() => setCalcCursorToken(""), 150)}
                        rows={3}
                        placeholder={selectedCalcField.kind === "scalar" ? "e.g. value * 0.1" : "e.g. itemAmount"}
                        className={cn(
                          "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm font-mono",
                          "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                          "border",
                          (calcExprValidation.error && selectedCalcField.expression)
                            || calcFieldIssues.get(selectedCalcField.id)?.expression
                            ? "border-error"
                            : "border-[var(--input-border)]",
                          "placeholder:text-foreground-muted resize-none",
                          "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                        )}
                      />
                    </div>
                    {/* Autocomplete dropdown — fixed positioning to escape overflow clipping */}
                    {calcAcMatches.length > 0 && calcAcPos && (
                      <div
                        ref={calcAcDropdownRef}
                        className="fixed z-[var(--z-toast)] rounded-md border border-border bg-card shadow-modal max-h-[var(--height-dropdown-max)] overflow-y-auto"
                        style={{ top: calcAcPos.top, left: calcAcPos.left, width: calcAcPos.width }}
                      >
                        {calcAcMatches.map((match, i) => (
                          <button
                            key={match.value}
                            type="button"
                            data-testid={`calc-autocomplete-${match.value}`}
                            aria-label={`Insert field ${match.value}`}
                            onMouseDown={(e) => { e.preventDefault(); insertCalcAutocompleteField(match.value); }}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-1.5 text-left cursor-pointer",
                              i === calcAcIndex ? "bg-subtle" : "hover:bg-subtle",
                            )}
                          >
                            <span className="font-mono text-body-sm text-foreground truncate">{match.value}</span>
                            <span className="text-caption text-foreground-muted ml-2 shrink-0">{match.group}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!selectedCalcField.expression && calcFieldIssues.get(selectedCalcField.id)?.expression ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />
                        <p className="text-caption text-error">{calcFieldIssues.get(selectedCalcField.id)!.expression}</p>
                      </div>
                    ) : selectedCalcField.expression ? (
                      calcExprValidation.error ? (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />
                          <p className="text-caption text-error">{calcExprValidation.error}</p>
                        </div>
                      ) : calcExprValidation.unknownFields.length > 0 ? (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                          <p className="text-caption text-warning">
                            Unknown field{calcExprValidation.unknownFields.length > 1 ? "s" : ""}: {calcExprValidation.unknownFields.map((u) => (
                              <code key={u} className="mx-0.5 rounded-sm bg-warning-light px-1 py-0.5 font-mono text-caption-xs">{u}</code>
                            ))}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <p className="text-caption text-success">Valid expression</p>
                        </div>
                      )
                    ) : null}
                  </div>

                  {/* Collapsible Field Palette — right after expression */}
                  <div>
                    <button
                      type="button"
                      data-testid="calc-palette-toggle"
                      aria-label="Toggle available fields palette"
                      onClick={() => setCalcPaletteOpen(!calcPaletteOpen)}
                      className="flex items-center gap-1.5 text-label font-medium text-foreground cursor-pointer mb-2"
                    >
                      {calcPaletteOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />
                      )}
                      Available Fields
                    </button>
                    {calcPaletteOpen && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="p-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
                            <input
                              type="text"
                              data-testid="calc-palette-search"
                              aria-label="Search calculated fields"
                              value={calcPaletteSearch}
                              onChange={(e) => setCalcPaletteSearch(e.target.value)}
                              placeholder="Search fields..."
                              className={cn(
                                "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                                "py-1.5 pl-8 pr-3 text-label text-foreground placeholder:text-foreground-muted",
                                "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                              )}
                            />
                          </div>
                        </div>
                        <div className="max-h-[var(--height-dropdown-lg)] overflow-y-auto px-1 pb-1">
                          {calcFieldGroups.map((group) => {
                            const lower = calcPaletteSearch.toLowerCase();
                            const filtered = lower
                              ? group.fields.filter((f) => f.value.toLowerCase().includes(lower) || f.label.toLowerCase().includes(lower))
                              : group.fields;
                            if (filtered.length === 0) return null;
                            return (
                              <div key={group.label}>
                                <div className="px-2 py-1.5 text-caption-xs font-medium uppercase tracking-wider text-foreground-muted">
                                  {group.label}
                                </div>
                                {filtered.map((f) => (
                                  <button
                                    key={f.value}
                                    type="button"
                                    data-testid={`calc-palette-field-${f.value}`}
                                    aria-label={`Insert field ${f.label}`}
                                    onMouseDown={(e) => { e.preventDefault(); insertCalcExprAtCursor(f.value); }}
                                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-label hover:bg-subtle cursor-pointer"
                                  >
                                    <FieldItemLabel label={f.label} path={f.value} isSelected={false} />
                                    <FieldTypeBadge type={f.fieldType} />
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aggregate-only: Filters */}
                  {selectedCalcField.kind === "aggregate" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-label font-medium text-foreground">Filters</label>
                        <Button variant="ghost" size="sm" onClick={handleAddCalcFilter} data-testid="calc-field-add-filter">
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add Filter
                        </Button>
                      </div>
                      {(selectedCalcField.filters ?? []).length === 0 ? (
                        <p className="text-caption text-foreground-muted">No filters — all items included</p>
                      ) : (
                        <div className="space-y-2">
                          {(selectedCalcField.filters ?? []).map((filter, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="flex-1">
                                <SearchableFieldPicker
                                  value={filter.field}
                                  onChange={(v) => handleUpdateCalcFilter(index, { field: v })}
                                  standardFields={calcSourceFields}
                                  fieldOptions={[]}
                                  placeholder="Select field..."
                                  testId={`calc-filter-field-${index}`}
                                />
                              </div>
                              <Select
                                value={filter.operator}
                                onValueChange={(v) => handleUpdateCalcFilter(index, { operator: v as CalcFilterOperator })}
                              >
                                <SelectTrigger className="w-44 cursor-pointer" data-testid={`calc-filter-op-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[var(--z-toast)]">
                                  {CALC_FILTER_OPERATOR_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={String(filter.value)}
                                onChange={(e) => handleUpdateCalcFilter(index, { value: e.target.value })}
                                placeholder="Value"
                                className="flex-1"
                                data-testid={`calc-filter-value-${index}`}
                              />
                              <button
                                type="button"
                                data-testid={`calc-filter-remove-${index}`}
                                aria-label="Remove filter"
                                onClick={() => handleRemoveCalcFilter(index)}
                                className="rounded p-1.5 mt-2 text-foreground-muted hover:bg-error/10 hover:text-error cursor-pointer shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aggregate-only: Group By */}
                  {selectedCalcField.kind === "aggregate" && (
                    <div>
                      <label className="mb-1.5 block text-label font-medium text-foreground">Group By</label>
                      <SearchableFieldPicker
                        value={selectedCalcField.groupBy ?? ""}
                        onChange={(v) => handleUpdateCalcField({ groupBy: v || undefined })}
                        standardFields={calcSourceFields}
                        fieldOptions={[]}
                        placeholder="None (no grouping)"
                        testId="calc-field-groupby"
                      />
                    </div>
                  )}

                </div>
                </>
              )}
            </section>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Extension Field Modal */}
      <ExtensionFieldModal
        open={extFieldModalOpen}
        onOpenChange={setExtFieldModalOpen}
        field={editingField}
        onSave={handleSaveField}
        existingNames={extFieldNames}
        externalNames={externalExtFieldNames}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Activity Template"
        itemName={label}
        isPending={deletingState}
        data-testid="activity-template-delete-confirm"
      />

      {/* Unsaved changes — cancel button */}
      <UnsavedChangesDialog
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onDiscard={() => {
          setCancelOpen(false);
          skipBlockerRef.current = true;
          navigate("/program/activity-templates");
        }}
      />

      {/* Unsaved changes — route navigation (sidebar, browser back) */}
      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onCancel={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
    </div>
  );
}
