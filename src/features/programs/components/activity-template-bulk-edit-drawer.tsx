/**
 * Bulk edit drawer for activity templates.
 *
 * Fields are opt-in: users enable each field with a checkbox before the value
 * is included in the update. Array fields (reasonCodes, extensions, validationRules)
 * support Replace/Add toggle modes.
 */

import { toast } from "sonner";
import { useState, useEffect, useMemo, useCallback, type JSX } from "react";
import { useForm, Controller } from "react-hook-form";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { DrawerShell } from "@/shared/components/drawer-shell";
import { BulkField } from "@/shared/components/bulk-field";
import { MultiSelect } from "@/shared/components/multi-select";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";
import { getMixedValue } from "@/shared/lib/bulk-field-utils";
import { useReasonCodeOptions } from "../hooks/use-activity-templates";
import { Select } from "@/shared/components/select";
import { useUIStore } from "@/shared/stores/ui-store";
import { useDivisionOptions } from "@/shared/hooks/use-divisions";
import { useProgram } from "../hooks/use-programs";
import type { ActivityTemplateConfig } from "../types/activity-template-config";
import type { SelectOption } from "@/shared/components/select";

// ── Props ───────────────────────────────────────────────────────────────────

interface BulkEditDrawerProps {
  open: boolean;
  selectedIds: Set<string>;
  templates: ActivityTemplateConfig[];
  onSave: (configIds: string[], update: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

// ── Types ───────────────────────────────────────────────────────────────────

type ArrayField = "reasonCodes" | "extensions" | "validationRules";
type ArrayMode = "replace" | "add";

interface FormValues {
  label?: string;
  description?: string;
  divisions?: string[];
  reasonCodes?: string[];
}

const ARRAY_FIELDS: ArrayField[] = ["reasonCodes", "extensions", "validationRules"];

// ── Component ───────────────────────────────────────────────────────────────

function ActivityTemplateBulkEditDrawer({
  open,
  selectedIds,
  templates,
  onSave,
  onCancel,
}: BulkEditDrawerProps): JSX.Element {
  const selectedTemplates = useMemo(
    () => templates.filter((t) => selectedIds.has(t.id)),
    [templates, selectedIds],
  );

  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [arrayModes, setArrayModes] = useState<Record<ArrayField, ArrayMode>>({
    reasonCodes: "add",
    extensions: "add",
    validationRules: "add",
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extensionsSourceId, setExtensionsSourceId] = useState<string>("");
  const [validationRulesSourceId, setValidationRulesSourceId] = useState<string>("");

  // Build "copy from" options — all templates that have the relevant data
  const extensionSourceOptions: SelectOption[] = useMemo(
    () =>
      templates
        .filter((t) => t.extensions.length > 0)
        .map((t) => ({
          value: t.id,
          label: `${t.label} (${t.extensions.length} field${t.extensions.length > 1 ? "s" : ""})`,
        })),
    [templates],
  );
  const validationRuleSourceOptions: SelectOption[] = useMemo(
    () =>
      templates
        .filter((t) => t.validationRules.length > 0)
        .map((t) => ({
          value: t.id,
          label: `${t.label} (${t.validationRules.length} rule${t.validationRules.length > 1 ? "s" : ""})`,
        })),
    [templates],
  );

  // ── Data hooks ──────────────────────────────────────────────────────────

  const currentProgram = useUIStore((s) => s.currentProgram);
  const { data: programData } = useProgram(currentProgram ?? undefined);
  const { options: divisionOptions } = useDivisionOptions({
    programDivisionIds: programData?.divisions,
  });

  const { data: reasonCodeData } = useReasonCodeOptions();
  const reasonCodeOptions: SelectOption[] = useMemo(
    () => (reasonCodeData ?? []).map((rc) => ({ value: rc.value, label: rc.label })),
    [reasonCodeData],
  );

  // ── Form ────────────────────────────────────────────────────────────────

  const { control, reset, getValues } = useForm<FormValues>({
    defaultValues: {
      label: "",
      description: "",
      divisions: [],
      reasonCodes: [],
    },
  });

  // Reset all state when the drawer opens
  useEffect(() => {
    if (open) {
      reset({
        label: "",
        description: "",
        divisions: [],
        reasonCodes: [],
      });
      setEnabledFields(new Set());
      setArrayModes({
        reasonCodes: "add",
        extensions: "add",
        validationRules: "add",
      });
      setShowConfirm(false);
      setSaving(false);
      setExtensionsSourceId("");
      setValidationRulesSourceId("");
    }
  }, [open, reset]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const toggleField = useCallback((field: string) => {
    setEnabledFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  const toggleArrayMode = useCallback((field: ArrayField) => {
    setArrayModes((prev) => ({
      ...prev,
      [field]: prev[field] === "replace" ? "add" : "replace",
    }));
  }, []);

  const getMixed = useCallback(
    (field: string): boolean => getMixedValue(selectedTemplates, field, false),
    [selectedTemplates],
  );

  // True when an enabled field is missing a required value (e.g. source template)
  const hasIncompleteField =
    (enabledFields.has("extensions") && !extensionsSourceId) ||
    (enabledFields.has("validationRules") && !validationRulesSourceId);

  // Count of fields that will actually produce an update
  const effectiveFieldCount = Array.from(enabledFields).filter((f) => {
    if (f === "extensions") return !!extensionsSourceId;
    if (f === "validationRules") return !!validationRulesSourceId;
    return true;
  }).length;

  // ── Save handler ────────────────────────────────────────────────────────

  const handleApply = useCallback(async () => {
    setShowConfirm(false);
    setSaving(true);

    const values = getValues();
    const update: Record<string, unknown> = {};

    for (const field of enabledFields) {
      if (field === "label") update.label = values.label;
      else if (field === "description") update.description = values.description;
      else if (field === "divisions") update.divisions = values.divisions;
      else if (field === "reasonCodes") update.reasonCodes = values.reasonCodes;
      else if (field === "extensions") {
        const source = templates.find((t) => t.id === extensionsSourceId);
        if (source) update.extensions = source.extensions;
      } else if (field === "validationRules") {
        const source = templates.find((t) => t.id === validationRulesSourceId);
        if (source) update.validationRules = source.validationRules;
      }
    }

    // Attach array mode metadata for array fields that are enabled
    const modes: Record<string, ArrayMode> = {};
    for (const af of ARRAY_FIELDS) {
      if (enabledFields.has(af)) {
        modes[af] = arrayModes[af];
      }
    }
    if (Object.keys(modes).length > 0) {
      update._arrayModes = modes;
    }

    const configIds = Array.from(selectedIds);

    try {
      await onSave(configIds, update);
    } catch {
      toast.error("Failed to apply bulk edit");
    } finally {
      setSaving(false);
    }
  }, [enabledFields, getValues, arrayModes, selectedIds, onSave, templates, extensionsSourceId, validationRulesSourceId]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={(v) => !v && onCancel()}
        title={`Bulk Edit: ${selectedIds.size} templates`}
        widthClass="w-1/2 min-w-[560px]"
        testId="bulk-edit-drawer"
      >
        <form
          data-testid="activity-template-bulk-edit-form"
          aria-label="Activity template bulk edit form"
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-1 min-h-0 flex-col"
        >
          {/* Hint */}
          <p className="px-6 pt-3 text-body-sm text-foreground-muted">
            Enable fields with the checkbox to include them in the update.
          </p>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Label */}
            <BulkField
              fieldKey="label"
              enabled={enabledFields.has("label")}
              mixed={getMixed("label")}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="label"
                render={({ field: f }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">
                      Label
                    </label>
                    <Input
                      type="text"
                      value={String(f.value ?? "")}
                      onChange={(e) => f.onChange(e.target.value)}
                      disabled={!enabledFields.has("label")}
                    />
                  </div>
                )}
              />
            </BulkField>

            {/* Description */}
            <BulkField
              fieldKey="description"
              enabled={enabledFields.has("description")}
              mixed={getMixed("description")}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="description"
                render={({ field: f }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">
                      Description
                    </label>
                    <textarea
                      data-testid="bulk-edit-description-textarea"
                      aria-label="Description"
                      className={cn(
                        "flex w-full bg-[var(--input-bg)] text-foreground text-[14px]",
                        "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                        "border border-[var(--input-border)]",
                        "transition-colors duration-[var(--duration-fast)]",
                        "placeholder:text-foreground-muted",
                        "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                        "resize-y min-h-[60px]",
                      )}
                      value={String(f.value ?? "")}
                      onChange={(e) => f.onChange(e.target.value)}
                      rows={2}
                      disabled={!enabledFields.has("description")}
                    />
                  </div>
                )}
              />
            </BulkField>

            {/* Divisions */}
            <BulkField
              fieldKey="divisions"
              enabled={enabledFields.has("divisions")}
              mixed={getMixed("divisions")}
              onToggle={toggleField}
            >
              <Controller
                control={control}
                name="divisions"
                render={({ field: f }) => (
                  <div>
                    <label className="mb-3 block text-[13px] font-medium text-foreground">
                      Divisions
                    </label>
                    <MultiSelect
                      value={Array.isArray(f.value) ? f.value : []}
                      onChange={(v) => f.onChange(v)}
                      options={divisionOptions}
                      placeholder="Select divisions..."
                      disabled={!enabledFields.has("divisions")}
                      showBulkActions
                    />
                  </div>
                )}
              />
            </BulkField>

            {/* Reason Codes */}
            <BulkField
              fieldKey="reasonCodes"
              enabled={enabledFields.has("reasonCodes")}
              mixed={getMixed("reasonCodes")}
              onToggle={toggleField}
            >
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-[13px] font-medium text-foreground">
                    Reason Codes
                  </label>
                  {enabledFields.has("reasonCodes") && (
                    <button
                      type="button"
                      data-testid="bulk-edit-reason-codes-mode-toggle"
                      aria-label="Toggle reason codes array mode"
                      className="text-caption text-brand hover:underline cursor-pointer"
                      onClick={() => toggleArrayMode("reasonCodes")}
                    >
                      {arrayModes.reasonCodes === "replace"
                        ? "Replace"
                        : "Add to existing"}
                    </button>
                  )}
                </div>
                <Controller
                  control={control}
                  name="reasonCodes"
                  render={({ field: f }) => (
                    <MultiSelect
                      value={Array.isArray(f.value) ? f.value : []}
                      onChange={(v) => f.onChange(v)}
                      options={reasonCodeOptions}
                      placeholder="Select reason codes..."
                      disabled={!enabledFields.has("reasonCodes")}
                      showBulkActions
                    />
                  )}
                />
              </div>
            </BulkField>

            {/* Extension Fields — copy from template */}
            <BulkField
              fieldKey="extensions"
              enabled={enabledFields.has("extensions")}
              mixed={getMixed("extensions")}
              onToggle={toggleField}
            >
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-[13px] font-medium text-foreground">
                    Extension Fields
                  </label>
                  {enabledFields.has("extensions") && (
                    <button
                      type="button"
                      data-testid="bulk-edit-extensions-mode-toggle"
                      aria-label="Toggle extensions array mode"
                      className="text-caption text-brand hover:underline cursor-pointer"
                      onClick={() => toggleArrayMode("extensions")}
                    >
                      {arrayModes.extensions === "replace"
                        ? "Replace"
                        : "Add to existing"}
                    </button>
                  )}
                </div>
                {extensionSourceOptions.length > 0 ? (
                  <Select
                    value={extensionsSourceId}
                    onChange={setExtensionsSourceId}
                    options={extensionSourceOptions}
                    placeholder="Copy from template..."
                    disabled={!enabledFields.has("extensions")}
                  />
                ) : (
                  <p className="text-body-sm text-foreground-muted">
                    No templates have extension fields configured yet.
                  </p>
                )}
              </div>
            </BulkField>

            {/* Validation Rules — copy from template */}
            <BulkField
              fieldKey="validationRules"
              enabled={enabledFields.has("validationRules")}
              mixed={getMixed("validationRules")}
              onToggle={toggleField}
            >
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-[13px] font-medium text-foreground">
                    Validation Rules
                  </label>
                  {enabledFields.has("validationRules") && (
                    <button
                      type="button"
                      data-testid="bulk-edit-validation-rules-mode-toggle"
                      aria-label="Toggle validation rules array mode"
                      className="text-caption text-brand hover:underline cursor-pointer"
                      onClick={() => toggleArrayMode("validationRules")}
                    >
                      {arrayModes.validationRules === "replace"
                        ? "Replace"
                        : "Add to existing"}
                    </button>
                  )}
                </div>
                {validationRuleSourceOptions.length > 0 ? (
                  <Select
                    value={validationRulesSourceId}
                    onChange={setValidationRulesSourceId}
                    options={validationRuleSourceOptions}
                    placeholder="Copy from template..."
                    disabled={!enabledFields.has("validationRules")}
                  />
                ) : (
                  <p className="text-body-sm text-foreground-muted">
                    No templates have validation rules configured yet.
                  </p>
                )}
              </div>
            </BulkField>
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
              disabled={enabledFields.size === 0 || hasIncompleteField || saving}
              onClick={() => setShowConfirm(true)}
            >
              {saving
                ? "Applying..."
                : `Apply to ${selectedIds.size} Templates`}
            </Button>
          </div>
        </form>
      </DrawerShell>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleApply}
        title="Confirm Bulk Edit"
        description={`Apply changes to ${effectiveFieldCount} field(s) across ${selectedIds.size} template(s)?`}
        confirmLabel="Apply"
        isPending={saving}
      />
    </>
  );
}

export { ActivityTemplateBulkEditDrawer };
export type { BulkEditDrawerProps };
