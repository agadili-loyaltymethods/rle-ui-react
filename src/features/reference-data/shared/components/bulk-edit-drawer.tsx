/**
 * Bulk edit drawer with opt-in checkboxes and mixed-value detection.
 *
 * Uses React Hook Form for form state. Only fields with their checkbox
 * enabled are included in the update. Shows "(mixed)" indicator when
 * selected items have different values.
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  type JSX,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { DrawerShell } from "@/shared/components/drawer-shell";
import { CoreFieldRenderer } from "@/shared/components/core-field-renderer";
import { handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";
import { getMixedValue } from "@/shared/lib/bulk-field-utils";
import { BulkField } from "@/shared/components/bulk-field";
import type { ApiError } from "@/shared/types/api";
import {
  buildFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  flattenRhfErrors,
  buildEntityFormZodSchema,
} from "../lib/form-tab-helpers";
import { ExtFieldRenderer } from "@/shared/components/ext-field-renderer";
import type {
  ServerTableConfig,
  ServerEntitySchemaData,
} from "../types/server-table-types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BulkEditDrawerProps {
  open: boolean;
  selectedIds: Set<string>;
  items: Record<string, unknown>[];
  config: ServerTableConfig;
  schema: ServerEntitySchemaData;
  onSave: (update: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────

export function BulkEditDrawer({
  open,
  selectedIds,
  items,
  config,
  schema,
  onSave,
  onCancel,
  saving = false,
}: BulkEditDrawerProps): JSX.Element {
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(String(item._id))),
    [items, selectedIds],
  );

  // ── Zod schema (permissive — all fields optional for bulk edit) ────
  const zodSchema = useMemo(
    () => buildEntityFormZodSchema(config, schema),
    [config, schema],
  );

  // ── React Hook Form ─────────────────────────────────────────────────
  const {
    watch,
    setValue: setFormValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors: rhfErrors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: {},
  });

  const formValues = watch();
  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  // ── Local UI state ──────────────────────────────────────────────────
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Tabs ────────────────────────────────────────────────────────────
  const tabs = useMemo(
    () => buildFormTabs(config, schema),
    [config, schema],
  );

  const fieldTabMap = useMemo(() => buildFieldTabMap(tabs), [tabs]);

  const errCounts = useMemo(
    () => tabErrorCounts(tabs, errors),
    [tabs, errors],
  );

  // ── Filter fields to bulk-editable ones ─────────────────────────────
  const bulkCoreFields = useMemo(
    () =>
      config.coreFormFields.filter(
        (f) => schema.bulkEditableFields.has(f.field),
      ),
    [config.coreFormFields, schema.bulkEditableFields],
  );

  // ── Initialize when drawer opens ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    reset({});
    setEnabledFields(new Set());
    setGeneralError(null);
    setActiveTab("details");
  }, [open, reset]);

  // ── Handlers ────────────────────────────────────────────────────────
  const toggleField = useCallback((key: string) => {
    setEnabledFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setFormValue(key, undefined);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [setFormValue]);

  const setFieldValue = useCallback(
    (key: string, value: unknown) => {
      setFormValue(key, value, { shouldDirty: true });
    },
    [setFormValue],
  );

  // ── Save ────────────────────────────────────────────────────────────
  const onApply = handleSubmit(
    async (data) => {
      setShowConfirm(false);
      setGeneralError(null);

      const update: Record<string, unknown> = {};
      for (const field of enabledFields) {
        const isExt = !!schema.extFields[field];
        const key = isExt ? `ext.${field}` : field;
        update[key] = data[field] ?? null;
      }

      try {
        await onSave(update);
      } catch (err: unknown) {
        const apiErr = err as ApiError | undefined;
        if (apiErr?.details && apiErr.details.length > 0) {
          const fieldErrors: Record<string, string> = {};
          for (const d of apiErr.details) {
            const fieldKey = d.path.startsWith("ext.")
              ? d.path.slice(4)
              : d.path;
            setError(fieldKey, { message: d.message });
            fieldErrors[fieldKey] = d.message;
          }
          const targetTab = firstTabWithError(fieldTabMap, fieldErrors);
          if (targetTab) setActiveTab(targetTab);
        } else {
          setGeneralError(
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    },
    (validationErrors) => {
      // Zod validation failed — close confirm dialog and navigate to first tab with error
      setShowConfirm(false);
      const flat = flattenRhfErrors(validationErrors);
      const targetTab = firstTabWithError(fieldTabMap, flat);
      if (targetTab) setActiveTab(targetTab);
    },
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (enabledFields.size === 0) return;
      setShowConfirm(true);
    },
    [enabledFields],
  );

  // ── Tab keyboard navigation ─────────────────────────────────────────
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keys = tabs.map((t) => t.key);
      const idx = keys.indexOf(activeTab);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveTab(keys[(idx + 1) % keys.length] ?? "details");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveTab(
          keys[(idx - 1 + keys.length) % keys.length] ?? "details",
        );
      }
    },
    [tabs, activeTab],
  );

  // ── Render ──────────────────────────────────────────────────────────
  const currentTab = tabs.find((t) => t.key === activeTab);
  const isDetailsTab = activeTab === "details";

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={(o) => !o && onCancel()}
        title={`Bulk Edit (${selectedIds.size} items)`}
        testId={`${config.testIdPrefix}-bulk-edit-drawer`}
      >
            <form
              onSubmit={handleFormSubmit}
              noValidate
              className="flex h-full flex-col"
              data-testid={`${config.testIdPrefix}-bulk-edit-form`}
              aria-label="Bulk edit form"
            >

              {/* Error banner */}
              {generalError && (
                <div
                  className="mx-6 mt-3 flex items-center justify-between rounded-md border border-error bg-error-light px-3 py-2"
                  role="alert"
                >
                  <span className="text-body-sm text-error">
                    {generalError}
                  </span>
                  <button
                    data-testid="refdata-bulk-edit-dismiss-error"
                    aria-label="Dismiss error"
                    type="button"
                    className="ml-2 text-error hover:text-error/80 cursor-pointer"
                    onClick={() => setGeneralError(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Tab bar */}
              {tabs.length > 1 && (
                <div
                  className="flex gap-0 overflow-x-auto overflow-y-hidden border-b border-border px-6 mt-3"
                  role="tablist"
                  onKeyDown={handleTabKeyDown}
                >
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === t.key}
                      data-testid={`bulk-edit-tab-${t.key}`}
                      aria-label={`${t.label} tab`}
                      className={cn(
                        "relative whitespace-nowrap px-3 py-2.5 text-body-sm transition-colors cursor-pointer",
                        "border-b-2 -mb-px",
                        activeTab === t.key
                          ? "border-brand text-brand font-medium"
                          : "border-transparent text-foreground-muted hover:text-foreground",
                      )}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                      {(errCounts[t.key] ?? 0) > 0 && (
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Body */}
              <div
                className="flex-1 overflow-y-auto p-6"
                onFocus={handleAutoSelectOnFocus}
              >
                {isDetailsTab && (
                  <div className="space-y-4">
                    {bulkCoreFields.map((def) => {
                      const mixed = getMixedValue(
                        selectedItems,
                        def.field,
                        false,
                      );
                      return (
                        <BulkField
                          key={def.field}
                          fieldKey={def.field}
                          enabled={enabledFields.has(def.field)}
                          mixed={mixed}
                          onToggle={toggleField}
                        >
                          <CoreFieldRenderer
                            def={def}
                            value={formValues[def.field]}
                            onChange={(v) => setFieldValue(def.field, v)}
                            error={errors[def.field]}
                            enumOptions={schema.enumFields[def.field] ?? (def.enumType ? schema.enumFields[def.enumType] : undefined)}
                          />
                        </BulkField>
                      );
                    })}
                  </div>
                )}
                {!isDetailsTab && currentTab && (
                  <div className="space-y-4">
                    {currentTab.fields.map((fieldName) => {
                      const def = schema.extFields[fieldName];
                      if (!def || def.isParent) return null;
                      const mixed = getMixedValue(
                        selectedItems,
                        fieldName,
                        true,
                      );
                      return (
                        <BulkField
                          key={fieldName}
                          fieldKey={fieldName}
                          enabled={enabledFields.has(fieldName)}
                          mixed={mixed}
                          onToggle={toggleField}
                        >
                          <ExtFieldRenderer
                            fieldName={fieldName}
                            def={def}
                            value={formValues[fieldName]}
                            onChange={(v) => setFieldValue(fieldName, v)}
                            error={errors[fieldName]}
                            schemaData={schema}
                          />
                        </BulkField>
                      );
                    })}
                  </div>
                )}
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
                  type="submit"
                  disabled={saving || enabledFields.size === 0}
                >
                  {saving
                    ? "Applying..."
                    : `Apply to ${selectedIds.size}`}
                </Button>
              </div>
            </form>
      </DrawerShell>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={onApply}
        title="Confirm Bulk Edit"
        description={`Apply changes to ${enabledFields.size} field(s) across ${selectedIds.size} item(s)?`}
        confirmLabel="Apply"
      />
    </>
  );
}
