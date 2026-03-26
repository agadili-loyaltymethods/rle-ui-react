/**
 * Generic entity form drawer for create/edit with core + extension tabs.
 *
 * Uses React Hook Form + Zod for form state, validation, and dirty tracking.
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type JSX,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { DrawerShell } from "@/shared/components/drawer-shell";
import { CoreFieldRenderer } from "@/shared/components/core-field-renderer";
import { useEnumOptions } from "@/shared/hooks/use-enums";
import { useRefFieldOptions } from "@/shared/hooks/use-ref-field-options";
import { handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";
import { unflattenDotPaths } from "@/shared/lib/dot-path";
import type { CoreFieldDef } from "@/shared/types/core-field";
import type { ApiError } from "@/shared/types/api";
import {
  buildFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  flattenRhfErrors,
  buildEntityFormZodSchema,
  buildEntityDefaultValues,
} from "../lib/form-tab-helpers";
import { ExtTabBody } from "./ext-tab-body";
import type {
  ServerTableConfig,
  ServerEntitySchemaData,
} from "../types/server-table-types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntityFormDrawerProps {
  open: boolean;
  entity: Record<string, unknown> | null;
  config: ServerTableConfig;
  schema: ServerEntitySchemaData;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  /** Persisted tab order */
  savedTabOrder?: string[];
  /** Called when tab order changes via drag */
  onTabOrderChange?: (order: string[]) => void;
}

// ── Dependent enum field ──────────────────────────────────────────────────────

function DependentEnumField({
  def,
  value,
  onChange,
  error,
  parentValue,
}: {
  def: CoreFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  parentValue: string;
}) {
  const { data: options } = useEnumOptions(parentValue, !!parentValue);
  const enumOptions = useMemo(
    () => options?.map((o) => o.value) ?? [],
    [options],
  );
  return (
    <CoreFieldRenderer
      def={def}
      value={value}
      onChange={onChange}
      error={error}
      enumOptions={enumOptions.length > 0 ? enumOptions : undefined}
    />
  );
}

// ── Main drawer component ─────────────────────────────────────────────────────

export function EntityFormDrawer({
  open,
  entity,
  config,
  schema,
  onSave,
  onCancel,
  saving = false,
  savedTabOrder,
  onTabOrderChange,
}: EntityFormDrawerProps): JSX.Element {
  const isEditing = !!entity;

  // ── Zod schema ──────────────────────────────────────────────────────
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
    formState: { errors: rhfErrors, isDirty },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: {},
  });

  const formValues = watch();
  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  // ── Ref-field options (for ref-select / ref-multiselect) ──────────
  const { getRefOptions } = useRefFieldOptions(config.coreFormFields);

  // ── Local UI state ──────────────────────────────────────────────────
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

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

  // ── Draggable tab ordering ─────────────────────────────────────────
  const [orderedTabs, setOrderedTabs] = useState(tabs);
  const dragTabRef = useRef<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  useEffect(() => {
    if (tabs.length <= 1) return;
    setOrderedTabs(() => {
      if (savedTabOrder && savedTabOrder.length > 0) {
        const tabMap = Object.fromEntries(tabs.map((t) => [t.key, t]));
        const ordered: typeof tabs = [];
        for (const key of savedTabOrder) {
          if (tabMap[key]) {
            ordered.push(tabMap[key]);
            delete tabMap[key];
          }
        }
        for (const t of tabs) {
          if (tabMap[t.key]) ordered.push(t);
        }
        return ordered;
      }
      return tabs;
    });
  }, [tabs, savedTabOrder]);

  // ── Initialize form when drawer opens ───────────────────────────────
  useEffect(() => {
    if (!open) return;
    const defaults = buildEntityDefaultValues(config, schema, entity);
    reset(defaults);
    setGeneralError(null);
    setActiveTab("details");
  }, [open, entity, config, schema, reset]);

  // ── Field setter ────────────────────────────────────────────────────
  const setFieldValue = useCallback(
    (field: string, value: unknown) => {
      setFormValue(field, value, { shouldDirty: true });
    },
    [setFormValue],
  );

  // ── Reset dependent fields when parent enum changes ───────────────
  const enumFromFieldDeps = useMemo(
    () =>
      config.coreFormFields
        .filter((def) => def.enumFromField)
        .map((def) => ({ child: def.field, parent: def.enumFromField! })),
    [config.coreFormFields],
  );
  const prevParentValues = useRef<Record<string, unknown>>({});
  useEffect(() => {
    for (const { child, parent } of enumFromFieldDeps) {
      const current = formValues[parent];
      const prev = prevParentValues.current[parent];
      if (prev !== undefined && prev !== current) {
        setFormValue(child, "", { shouldDirty: true });
      }
      prevParentValues.current[parent] = current;
    }
  }, [enumFromFieldDeps, formValues, setFormValue]);

  // ── Close handling ──────────────────────────────────────────────────
  const tryClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) tryClose();
    },
    [tryClose],
  );

  // ── Focus helpers ───────────────────────────────────────────────────
  const focusFirstError = useCallback(() => {
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      const el = bodyRef.current.querySelector<HTMLElement>(
        '[aria-invalid="true"], .text-error',
      );
      if (el) el.focus();
    });
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(
    async (data) => {
      setGeneralError(null);

      // Build payload — core fields with type coercion
      const payload: Record<string, unknown> = {};

      for (const def of config.coreFormFields) {
        let val = data[def.field];
        if (def.type === "number" && typeof val === "string") {
          val = val === "" ? undefined : Number(val);
        }
        if (def.type === "boolean") {
          val = !!val;
        }
        if (def.type === "date" && typeof val === "string" && val) {
          val = val.includes("T") ? val : val + "T00:00:00.000Z";
        }
        if (def.type === "enum" && (val === "" || val == null)) {
          val = undefined;
        }
        if (def.type === "ref-select" && (val === "" || val == null)) {
          val = undefined;
        }
        // ref-multiselect: pass array as-is
        payload[def.field] = val;
      }

      // Extension fields — unflatten + convert types
      const flatExt: Record<string, unknown> = {};
      for (const [fieldName, def] of Object.entries(schema.extFields)) {
        if (def.isParent) continue;
        const val = data[fieldName];
        if (def.type === "number" || def.type === "integer") {
          flatExt[fieldName] = val === "" || val == null ? undefined : Number(val);
        } else if (def.type === "boolean") {
          flatExt[fieldName] = !!val;
        } else if (def.format === "date-time" || def.format === "date") {
          const strVal = String(val ?? "").trim();
          flatExt[fieldName] = strVal
            ? strVal +
              (def.format === "date-time" && !strVal.includes("T")
                ? "T23:59:59.999Z"
                : "")
            : "";
        } else {
          flatExt[fieldName] =
            typeof val === "string" ? val.trim() : (val ?? "");
        }
      }

      const ext = unflattenDotPaths(flatExt);

      if (isEditing && entity) {
        const existing = entity as Record<string, unknown>;
        const existingExt = (existing.ext ?? {}) as Record<string, unknown>;
        payload.ext = { ...existingExt, ...ext };
      } else {
        payload.ext = ext;
      }

      try {
        await onSave(payload);
      } catch (err: unknown) {
        const apiErr = err as ApiError | undefined;
        if (apiErr?.details && apiErr.details.length > 0) {
          for (const d of apiErr.details) {
            const fieldKey = d.path.startsWith("ext.")
              ? d.path.slice(4)
              : d.path;
            setError(fieldKey, { message: d.message });
          }
          const apiErrors: Record<string, string> = {};
          for (const d of apiErr.details) {
            const fieldKey = d.path.startsWith("ext.")
              ? d.path.slice(4)
              : d.path;
            apiErrors[fieldKey] = d.message;
          }
          const targetTab = firstTabWithError(fieldTabMap, apiErrors);
          if (targetTab) {
            setActiveTab(targetTab);
            requestAnimationFrame(() => focusFirstError());
          }
        } else {
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === "object" &&
                    err !== null &&
                    "message" in err
                ? String((err as { message: unknown }).message)
                : String(err);
          setGeneralError(msg);
        }
      }
    },
    (validationErrors) => {
      // Zod validation failed — navigate to first tab with an error
      const flat = flattenRhfErrors(validationErrors);
      const targetTab = firstTabWithError(fieldTabMap, flat);
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
      requestAnimationFrame(() => focusFirstError());
    },
  );

  // ── Tab keyboard navigation ─────────────────────────────────────────
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keys = orderedTabs.map((t) => t.key);
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
    [orderedTabs, activeTab],
  );

  // ── Render ──────────────────────────────────────────────────────────
  const currentTab = orderedTabs.find((t) => t.key === activeTab);
  const isDetailsTab = activeTab === "details";
  const entityName = isEditing
    ? String((entity as Record<string, unknown>)?.name ?? "")
    : "";

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={handleOpenChange}
        title={isEditing ? `Edit: ${entityName}` : `Add ${config.pageTitle.replace(/s$/, "")}`}
        testId={`${config.testIdPrefix}-form-drawer`}
      >
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex h-full flex-col"
              data-testid={`${config.testIdPrefix}-entity-form`}
              aria-label="Entity form"
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
                    data-testid="entity-form-dismiss-error"
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
              {orderedTabs.length > 1 && (
                <div
                  className="flex gap-0 overflow-x-auto overflow-y-hidden border-b border-border px-6 mt-3"
                  role="tablist"
                  onKeyDown={handleTabKeyDown}
                >
                  {orderedTabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === t.key}
                      data-testid={`entity-form-tab-${t.key}`}
                      aria-label={`${t.label} tab`}
                      className={cn(
                        "relative whitespace-nowrap px-3 py-2.5 text-body-sm transition-colors cursor-pointer",
                        "border-b-2 -mb-px",
                        activeTab === t.key
                          ? "border-brand text-brand font-medium"
                          : "border-transparent text-foreground-muted hover:text-foreground",
                        dragOverTab === t.key && "bg-brand/10",
                      )}
                      onClick={() => setActiveTab(t.key)}
                      draggable
                      onDragStart={() => {
                        dragTabRef.current = t.key;
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTab(t.key);
                      }}
                      onDrop={() => {
                        const from = dragTabRef.current;
                        if (from && from !== t.key) {
                          const newOrder = [...orderedTabs];
                          const fromIdx = newOrder.findIndex((x) => x.key === from);
                          const toIdx = newOrder.findIndex((x) => x.key === t.key);
                          const [moved] = newOrder.splice(fromIdx, 1);
                          if (moved) {
                            newOrder.splice(toIdx, 0, moved);
                            setOrderedTabs(newOrder);
                            onTabOrderChange?.(newOrder.map((x) => x.key));
                          }
                        }
                        dragTabRef.current = null;
                        setDragOverTab(null);
                      }}
                      onDragEnd={() => {
                        dragTabRef.current = null;
                        setDragOverTab(null);
                      }}
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
                ref={bodyRef}
                onFocus={handleAutoSelectOnFocus}
              >
                {isDetailsTab && (
                  <div className="grid grid-cols-2 gap-4">
                    {config.coreFormFields
                      .filter((def) => {
                        if (def.createOnly && isEditing) return false;
                        if (def.visibleWhen && formValues[def.visibleWhen.field] !== def.visibleWhen.value) return false;
                        return true;
                      })
                      .map((def) => (
                      <div key={def.field} className={def.fullWidth ? "col-span-2" : undefined}>
                        {def.enumFromField ? (
                          <DependentEnumField
                            def={def}
                            value={formValues[def.field]}
                            onChange={(v) => setFieldValue(def.field, v)}
                            error={errors[def.field]}
                            parentValue={String(formValues[def.enumFromField] ?? "")}
                          />
                        ) : (
                          <CoreFieldRenderer
                            def={def}
                            value={formValues[def.field]}
                            onChange={(v) => setFieldValue(def.field, v)}
                            error={errors[def.field]}
                            enumOptions={schema.enumFields[def.field] ?? (def.enumType ? schema.enumFields[def.enumType] : undefined)}
                            refOptions={getRefOptions(def, formValues)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isDetailsTab && currentTab && (
                  <ExtTabBody
                    tab={currentTab}
                    extValues={formValues}
                    onExtFieldChange={setFieldValue}
                    errors={errors}
                    schemaData={schema}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={tryClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || (!isDirty && isEditing)}>
                  {saving
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : `Add ${config.pageTitle.replace(/s$/, "")}`}
                </Button>
              </div>
            </form>
      </DrawerShell>

      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onDiscard={() => {
          setShowDiscardConfirm(false);
          onCancel();
        }}
      />
    </>
  );
}
