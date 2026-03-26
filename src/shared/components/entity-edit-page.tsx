import * as React from "react";
import { useParams, useNavigate, useBlocker } from "react-router";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodObject, ZodRawShape } from "zod";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Lock, Loader2, type LucideIcon } from "lucide-react";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { toast } from "sonner";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { FieldRenderer } from "@/shared/components/field-renderer";
import { useBreadcrumbOverride } from "@/shared/components/breadcrumb-context";
import { useEntity } from "@/shared/hooks/use-api";
import { useUIStore } from "@/shared/stores/ui-store";
import { usePermissions } from "@/shared/hooks/use-permissions";
import type { FieldConfig } from "@/shared/components/form-modal";

interface TabConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
  fields?: FieldConfig[];
  /** Render fields in a multi-column grid (default 1). */
  columns?: 1 | 2;
  renderContent?: (form: UseFormReturn, mode: "create" | "edit", options?: { readOnly?: boolean }) => React.ReactNode;
  /** When provided, the tab is only shown if this predicate returns true for the current form values. */
  visible?: (values: Record<string, unknown>) => boolean;
}

interface EntityEditConfig {
  entityName: string;
  endpoint: string;
  testIdPrefix: string;
  tabs: TabConfig[];
  schema: ZodObject<ZodRawShape>;
  editSchema?: ZodObject<ZodRawShape>;
  defaultValues?: Record<string, unknown>;
  prepareCreate?: (data: Record<string, unknown>, programId: string) => Record<string, unknown>;
  nameField?: string;
  listPath: string;
  /** When true, the entity is displayed read-only with a lock banner and no Save button. */
  isReadOnly?: (entity: Record<string, unknown>) => { locked: boolean; message?: string };
}

interface EntityEditPageProps {
  config: EntityEditConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCreate: () => { mutateAsync: (data: any) => Promise<any>; isPending: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useUpdate: () => { mutateAsync: (args: { id: string; data: any }) => Promise<any>; isPending: boolean };
}

function EntityEditPage({ config, useCreate, useUpdate }: EntityEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentProgram = useUIStore((s) => s.currentProgram);

  const isCreate = id === "new";
  const mode = isCreate ? "create" : "edit";
  const nameField = config.nameField ?? "name";
  const permissions = usePermissions(config.endpoint);

  const schema = mode === "edit" && config.editSchema ? config.editSchema : config.schema;

  const { data: entity, isLoading: entityLoading } = useEntity<Record<string, unknown>>(
    config.endpoint,
    isCreate ? undefined : id,
  );

  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: config.defaultValues ?? {},
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = form;

  const watchedValues = watch();

  // Collect field names by type so we can transform API data for the form
  const { dateFieldNames, warningDaysFieldNames } = React.useMemo(() => {
    const dates = new Set<string>();
    const warningDays = new Set<string>();
    for (const tab of config.tabs) {
      if (!tab.fields) continue;
      for (const f of tab.fields) {
        if (f.type === "date") dates.add(f.name);
        if (f.type === "warning-days") warningDays.add(f.name);
      }
    }
    return { dateFieldNames: dates, warningDaysFieldNames: warningDays };
  }, [config.tabs]);

  // Zod schema fields that expect a string — used to auto-convert API arrays
  // (e.g. expiryWarningDays: [30] → "30") for fields in custom renderContent tabs
  const schemaStringFields = React.useMemo(() => {
    const fields = new Set<string>();
    if ("shape" in schema) {
      const shape = (schema as import("zod").ZodObject<import("zod").ZodRawShape>).shape;
      for (const [key, zodType] of Object.entries(shape)) {
        // Unwrap ZodOptional / ZodDefault to get the inner type
        let inner = zodType;
        while (inner && "_def" in inner) {
          const def = (inner as { _def: { typeName?: string; innerType?: unknown } })._def;
          if (def.typeName === "ZodOptional" || def.typeName === "ZodDefault") {
            inner = def.innerType as typeof inner;
          } else break;
        }
        if (inner && "_def" in inner && (inner as { _def: { typeName?: string } })._def.typeName === "ZodString") {
          fields.add(key);
        }
      }
    }
    return fields;
  }, [schema]);

  // Reset form when entity data loads (edit mode)
  const hasReset = React.useRef(false);
  React.useEffect(() => {
    if (entity && !hasReset.current) {
      // Transform ISO date strings to YYYY-MM-DD for <input type="date">.
      // Checks both declared date fields and any ISO-like string values
      // (covers date fields rendered via custom renderContent tabs).
      const isoDateRe = /^\d{4}-\d{2}-\d{2}T/;
      const transformed = { ...entity };
      for (const [key, val] of Object.entries(transformed)) {
        if (typeof val === "string" && (dateFieldNames.has(key) || isoDateRe.test(val))) {
          transformed[key] = val.slice(0, 10);
        }
        // API returns warning-days as number arrays; form uses comma-separated strings.
        // Check both declared warning-days fields AND any array that the Zod schema
        // expects as a string (covers custom renderContent tabs like Expiration).
        if (Array.isArray(val) && (warningDaysFieldNames.has(key) || schemaStringFields.has(key))) {
          transformed[key] = val.filter((v) => v != null).join(",");
        }
      }
      // Merge config defaultValues so virtual fields (e.g. _qualifying) that
      // aren't in the entity data still appear in both values AND defaults,
      // preventing a false isDirty from key-count mismatches.
      reset({ ...config.defaultValues, ...transformed });
      hasReset.current = true;
    }
  }, [entity, reset, dateFieldNames, warningDaysFieldNames, schemaStringFields]);

  // Check if entity is read-only (locked)
  const lockState = React.useMemo(() => {
    if (!entity || isCreate || !config.isReadOnly) return { locked: false };
    return config.isReadOnly(entity);
  }, [entity, isCreate, config]);
  const isLocked = lockState.locked;

  // Register breadcrumb override for entity name
  const entityDisplayName = isCreate
    ? "New"
    : (entity?.[nameField] as string | undefined);
  useBreadcrumbOverride(id, entityDisplayName);

  // Warn on browser tab close/refresh with unsaved changes
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Filter tabs by visibility
  const visibleTabs = React.useMemo(
    () => config.tabs.filter((tab) => !tab.visible || tab.visible(watchedValues)),
    [config.tabs, watchedValues],
  );

  // Tab state
  const firstTabId = visibleTabs[0]?.id ?? "general";
  const [activeTab, setActiveTab] = React.useState(firstTabId);

  // Reset to first visible tab if active tab becomes hidden
  React.useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? "general");
    }
  }, [visibleTabs, activeTab]);

  // Find which tabs have errors
  const tabsWithErrors = React.useMemo(() => {
    const errored = new Set<string>();
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return errored;

    for (const tab of config.tabs) {
      if (!tab.fields) continue;
      const tabFieldNames = tab.fields.map((f) => f.name);
      if (errorFields.some((ef) => tabFieldNames.includes(ef))) {
        errored.add(tab.id);
      }
    }
    return errored;
  }, [errors, config.tabs]);

  const handleSave = handleSubmit(async (data) => {
    try {
      if (isCreate) {
        const payload = config.prepareCreate && currentProgram
          ? config.prepareCreate(data as Record<string, unknown>, currentProgram)
          : { ...(data as Record<string, unknown>), program: currentProgram };
        await createMutation.mutateAsync(payload);
        toast.success(`${config.entityName} created`);
      } else {
        await updateMutation.mutateAsync({ id: id!, data: data as Record<string, unknown> });
        toast.success(`${config.entityName} updated`);
      }
      skipBlockerRef.current = true;
      navigate(config.listPath);
    } catch (err) {
      // Extract meaningful error message from API response
      const axiosErr = err as { response?: { data?: { message?: string; name?: string } } };
      const apiMsg = axiosErr.response?.data?.message ?? axiosErr.response?.data?.name;
      const detail = apiMsg ? `: ${apiMsg}` : "";
      toast.error(`Failed to save ${config.entityName.toLowerCase()}${detail}`);
    }
  }, (validationErrors) => {
    // Show a toast with the first validation error so the user knows what's wrong
    const firstKey = Object.keys(validationErrors)[0];
    const firstErr = firstKey ? validationErrors[firstKey] : undefined;
    const msg = firstErr?.message ? `${firstKey}: ${String(firstErr.message)}` : "Please check the form for errors";
    toast.error(msg);

    // On validation error, switch to first tab with errors and focus the first errored field
    const currentErrors = form.formState.errors;
    const firstErroredTab = config.tabs.find((tab) => {
      if (!tab.fields) return false;
      const tabFieldNames = tab.fields.map((f) => f.name);
      return Object.keys(currentErrors).some((ef) => tabFieldNames.includes(ef));
    });
    if (firstErroredTab) {
      setActiveTab(firstErroredTab.id);
    }
    // Focus first errored field after tab switch renders
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const tab of config.tabs) {
        if (!tab.fields) continue;
        for (const field of tab.fields) {
          if (currentErrors[field.name]) {
            const el = formRef.current?.querySelector<HTMLElement>(
              `#edit-field-${field.name}, [data-testid="${config.testIdPrefix}-field-${field.name}"]`,
            );
            if (el) { el.focus(); return; }
          }
        }
      }
    }));
  });

  // Block route navigation when dirty (skip if user already confirmed via cancel dialog)
  const skipBlockerRef = React.useRef(false);
  const blocker = useBlocker(() => isDirty && !skipBlockerRef.current);

  // Pending cancel action
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const handleCancel = () => {
    if (isDirty) {
      setCancelOpen(true);
    } else {
      navigate(config.listPath);
    }
  };

  // Focus the first editable control after form is ready
  const formRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isCreate || hasReset.current) {
      // Double-RAF: first lets React flush the re-render from reset(),
      // second lets the browser paint, then we focus.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])',
        );
        el?.focus();
      }));
    }
  }, [isCreate, entity]);

  // Loading state for edit mode
  if (!isCreate && entityLoading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid={`${config.testIdPrefix}-loading`}>
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div ref={formRef} data-testid={`${config.testIdPrefix}-edit-page`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            data-testid={`${config.testIdPrefix}-back`}
            className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-h3 text-foreground">
              {isCreate ? `Add ${config.entityName}` : `Edit ${config.entityName}`}
            </h1>
            {entityDisplayName && entityDisplayName !== "New" && (
              <p className="text-body-sm text-foreground-muted">{entityDisplayName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            data-testid={`${config.testIdPrefix}-cancel`}
          >
            {isLocked ? "Back" : "Cancel"}
          </Button>
          {!isLocked && ((isCreate && permissions.canCreate) || (!isCreate && permissions.canUpdate)) && (
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={!isDirty && !isCreate}
              data-testid={`${config.testIdPrefix}-save`}
            >
              {isCreate ? "Create" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* Read-only lock banner */}
      {isLocked && lockState.message && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-subtle px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-foreground-muted" />
          <span className="text-body-sm text-foreground-muted">{lockState.message}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        // If switching to a tab with errors, focus the first errored field
        if (tabsWithErrors.has(tab)) {
          const matchedTab = config.tabs.find((t) => t.id === tab);
          if (matchedTab?.fields) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
              for (const field of matchedTab.fields!) {
                if (errors[field.name]) {
                  const el = formRef.current?.querySelector<HTMLElement>(
                    `#edit-field-${field.name}, [data-testid="${config.testIdPrefix}-field-${field.name}"]`,
                  );
                  if (el) { el.focus(); return; }
                }
              }
            }));
          }
        }
      }}>
        <Tabs.List className="mb-6 flex border-b border-border">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                data-testid={`${config.testIdPrefix}-tab-${tab.id}`}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2.5 font-medium transition-colors",
                  "text-foreground-muted hover:text-foreground",
                  "data-[state=active]:text-brand",
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                  "after:bg-transparent data-[state=active]:after:bg-brand",
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {tabsWithErrors.has(tab.id) && (
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-error" />
                )}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {visibleTabs.map((tab) => (
          <Tabs.Content key={tab.id} value={tab.id} className="outline-none">
            <div className="rounded-lg border border-border bg-card p-6">
              {tab.renderContent ? (
                tab.renderContent(form, mode, { readOnly: isLocked })
              ) : tab.fields ? (
                <div className={cn(
                  tab.columns === 2
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                    : "max-w-[var(--width-form-max)] space-y-4",
                )}>
                  {tab.fields.map((field) => {
                    if (field.visible && !field.visible(watchedValues)) return null;
                    const isDisabled = isLocked || (typeof field.disabled === "function"
                      ? field.disabled(watchedValues)
                      : field.disabled ?? false);
                    const spanFull = field.fullWidth
                      || field.type === "textarea"
                      || field.type === "multiselect"
                      || field.type === "warning-days"
                      || field.type === "date-never";
                    return (
                      <FieldRenderer
                        key={field.name}
                        field={field}
                        control={control}
                        errors={errors}
                        testIdPrefix={config.testIdPrefix}
                        disabled={isDisabled}
                        idPrefix="edit-field"
                        className={tab.columns === 2 && spanFull ? "sm:col-span-2" : undefined}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* Unsaved changes — cancel button */}
      <UnsavedChangesDialog
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onDiscard={() => {
          setCancelOpen(false);
          skipBlockerRef.current = true;
          navigate(config.listPath);
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

export { EntityEditPage };
export type { EntityEditConfig, TabConfig };
