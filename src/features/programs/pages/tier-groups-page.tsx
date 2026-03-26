import * as React from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBlocker, useNavigate } from "react-router";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Crown,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { FieldRenderer } from "@/shared/components/field-renderer";
import { useUIStore } from "@/shared/stores/ui-store";
import { useEntityList } from "@/shared/hooks/use-api";
import {
  useCreateTierPolicy,
  useUpdateTierPolicy,
  useDeleteTierPolicy,
  useAllPursePolicies,
} from "../hooks/use-policies";
import { useProgramMeta } from "../hooks/use-program-meta";
import { useEnumOptions } from "@/shared/hooks/use-enums";
import { tierPolicySchema } from "../config/tier-policy-config";
import { TierLevelEditor } from "../components/tier-level-editor";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { usePermissions } from "@/shared/hooks/use-permissions";
import type { TierPolicy } from "@/shared/types/policy";
import type { TierLevel } from "@/shared/types/member";
import { useDivisionOptions } from "@/shared/hooks/use-divisions";
import { useProgram } from "../hooks/use-programs";
import type { FieldConfig, FieldOption } from "@/shared/components/form-modal";

interface TierPolicyMeta {
  tierPolicyCurrency?: Record<string, string>;
}


function buildFormFields(pursePolicyOptions: FieldOption[], divisionOptions: FieldOption[]): FieldConfig[] {
  return [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "divisions",
      label: "Divisions",
      type: "searchable-multiselect",
      options: divisionOptions,
      placeholder: "Select divisions",
    },
    {
      name: "primary",
      label: "Primary",
      type: "checkbox",
      placeholder: "Mark as primary tier group",
    },
    {
      name: "qualifyingCurrency",
      label: "Qualifying Currency",
      type: "select",
      placeholder: "Select currency...",
      options: pursePolicyOptions,
    },
  ];
}

const schema = tierPolicySchema
  .extend({ qualifyingCurrency: z.string().optional(), divisions: z.array(z.string()).optional() }) as unknown as import("zod").ZodObject<
  import("zod").ZodRawShape
>;

const defaultValues = {
  name: "",
  primary: false,
  levels: [
    { name: "Base", number: 1, threshold: 0, color: "var(--color-text-muted)", defaultLevel: true },
  ],
};

function TierLevelEditorWrapper({ form, snapToOptions }: { form: UseFormReturn; snapToOptions: { value: string; label: string }[] }) {
  const levels = (form.watch("levels") as TierLevel[] | undefined) ?? [];
  const currencyLabel = form.watch("qualifyingCurrency") as string | undefined;
  return (
    <TierLevelEditor
      levels={levels}
      onChange={(newLevels) =>
        form.setValue("levels", newLevels, { shouldDirty: true })
      }
      currencyLabel={currencyLabel}
      snapToOptions={snapToOptions}
    />
  );
}


function TierGroupEditor({
  tierGroup,
  onSaved,
  onDeleted,
  onCancel,
  onDirtyChange,
  pursePolicyOptions,
  divisionOptions,
  initialCurrency,
  onSaveMeta,
  snapToOptions,
  permissions,
}: {
  tierGroup: TierPolicy | null;
  onSaved: () => void;
  onDeleted?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  pursePolicyOptions: FieldOption[];
  divisionOptions: FieldOption[];
  initialCurrency: string;
  onSaveMeta: (tierPolicyId: string, pursePolicyId: string) => Promise<void>;
  snapToOptions: { value: string; label: string }[];
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
}) {
  const currentProgram = useUIStore((s) => s.currentProgram);
  const isCreate = !tierGroup;

  const createMutation = useCreateTierPolicy();
  const updateMutation = useUpdateTierPolicy();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const deleteMutation = useDeleteTierPolicy();

  const formFields = React.useMemo(
    () => buildFormFields(pursePolicyOptions, divisionOptions),
    [pursePolicyOptions, divisionOptions],
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isCreate ? defaultValues : {},
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = form;

  const watchedValues = watch();

  // Report dirty state to parent
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Warn on browser close / refresh
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Reset form when tier group data changes
  const hasReset = React.useRef(false);
  const tierGroupId = tierGroup?._id;
  React.useEffect(() => {
    if (tierGroup && !hasReset.current) {
      reset(tierGroup);
      if (initialCurrency) {
        form.setValue("qualifyingCurrency", initialCurrency, { shouldDirty: false });
      }
      hasReset.current = true;
    }
  }, [tierGroup, reset, initialCurrency, form]);

  // Reset the ref when switching tier groups
  React.useEffect(() => {
    hasReset.current = false;
  }, [tierGroupId]);

  // Auto-select qualifying currency when there's only one option
  React.useEffect(() => {
    if (
      pursePolicyOptions.length === 1 &&
      !form.getValues("qualifyingCurrency")
    ) {
      form.setValue("qualifyingCurrency", pursePolicyOptions[0]!.value, {
        shouldDirty: false,
      });
    }
  }, [pursePolicyOptions, form]);

  // Tab state
  const [activeTab, setActiveTab] = React.useState("general");

  // Find tabs with errors
  const tabsWithErrors = React.useMemo(() => {
    const errored = new Set<string>();
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return errored;
    const generalFieldNames = formFields.map((f) => f.name);
    if (errorFields.some((ef) => generalFieldNames.includes(ef))) {
      errored.add("general");
    }
    if (errorFields.includes("levels")) {
      errored.add("levels");
    }
    return errored;
  }, [errors]);

  const handleSave = handleSubmit(
    async (data) => {
      try {
        const { qualifyingCurrency, ...tierData } = data as Record<string, unknown> & { qualifyingCurrency?: string };
        let savedId: string;

        if (isCreate) {
          const created = await createMutation.mutateAsync({
            ...tierData,
            program: currentProgram ?? undefined,
          });
          savedId = (created as TierPolicy)._id;
          toast.success("Tier group created");
        } else {
          await updateMutation.mutateAsync({
            id: tierGroup._id,
            data: tierData,
          });
          savedId = tierGroup._id;
          toast.success("Tier group updated");
        }

        if (qualifyingCurrency) {
          try {
            await onSaveMeta(savedId, qualifyingCurrency);
          } catch {
            toast.error("Failed to save qualifying currency");
          }
        }

        onSaved();
      } catch {
        toast.error("Failed to save tier group");
      }
    },
    () => {
      // Switch to first errored tab
      const generalFieldNames = formFields.map((f) => f.name);
      const hasGeneralError = Object.keys(form.formState.errors).some((ef) =>
        generalFieldNames.includes(ef),
      );
      if (hasGeneralError) {
        setActiveTab("general");
      } else if (form.formState.errors.levels) {
        setActiveTab("levels");
      }
    },
  );

  const handleDeleteConfirm = async () => {
    if (!tierGroup) return;
    try {
      await deleteMutation.mutateAsync(tierGroup._id);
      toast.success("Tier group deleted");
      setDeleteOpen(false);
      onDeleted?.();
    } catch {
      toast.error("Failed to delete tier group");
    }
  };

  // Focus the first editable control after form is ready.
  const editorRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isCreate || tierGroup) {
      const timer = setTimeout(() => {
        const el = editorRef.current?.querySelector<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])',
        );
        el?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCreate, tierGroup]);

  return (
    <div ref={editorRef} data-testid="tier-editor">
      {/* Save / Delete bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-h4 text-foreground">
            {isCreate ? "New Tier Group" : tierGroup.name}
          </h2>
          {!isCreate && tierGroup.primary && (
            <p className="text-body-sm text-foreground-muted">Primary tier group</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isCreate && permissions.canDelete && (
            <Button
              type="button"
              variant="ghost"
              className="text-error hover:text-error hover:bg-error/5"
              onClick={() => setDeleteOpen(true)}
              data-testid="tier-delete"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              data-testid="tier-cancel"
            >
              Cancel
            </Button>
          )}
          {((isCreate && permissions.canCreate) || (!isCreate && permissions.canUpdate)) && (
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={!isDirty && !isCreate}
              data-testid="tier-save"
            >
              {isCreate ? "Create" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="mb-6 flex border-b border-border">
          <Tabs.Trigger
            value="general"
            data-testid="tier-tab-general"
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-2.5 font-medium transition-colors",
              "text-foreground-muted hover:text-foreground",
              "data-[state=active]:text-brand",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:bg-transparent data-[state=active]:after:bg-brand",
            )}
          >
            <Settings className="h-4 w-4" />
            General
            {tabsWithErrors.has("general") && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-error" />
            )}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="levels"
            data-testid="tier-tab-levels"
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-2.5 font-medium transition-colors",
              "text-foreground-muted hover:text-foreground",
              "data-[state=active]:text-brand",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:bg-transparent data-[state=active]:after:bg-brand",
            )}
          >
            <Layers className="h-4 w-4" />
            Levels
            {tabsWithErrors.has("levels") && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-error" />
            )}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="general" className="outline-none">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="max-w-[var(--width-form-max)] space-y-4">
              {formFields.map((field) => {
                if (field.visible && !field.visible(watchedValues)) return null;
                const isDisabled =
                  typeof field.disabled === "function"
                    ? field.disabled(watchedValues)
                    : field.disabled ?? false;
                return (
                  <FieldRenderer
                    key={field.name}
                    field={field}
                    control={control}
                    errors={errors}
                    testIdPrefix="tier"
                    disabled={isDisabled}
                    idPrefix="edit-field"
                  />
                );
              })}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="levels" className="outline-none">
          <div className="rounded-lg border border-border bg-card p-6">
            <TierLevelEditorWrapper form={form} snapToOptions={snapToOptions} />
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Tier Group"
        itemName={tierGroup?.name}
        isPending={deleteMutation.isPending}
        data-testid="tier-delete-confirm"
      />
    </div>
  );
}

export default function TierGroupsPage() {
  const navigate = useNavigate();
  const currentProgram = useUIStore((s) => s.currentProgram);
  const permissions = usePermissions("tierpolicies");

  const { data, isLoading, refetch, isFetching } = useEntityList<TierPolicy>(
    "tierpolicies",
    {
      query: currentProgram
        ? JSON.stringify({ program: currentProgram })
        : undefined,
      enabled: !!currentProgram,
    },
  );

  // Divisions for multiselect — active only, filtered to program's assigned divisions
  const { data: programData } = useProgram(currentProgram ?? undefined);
  const { options: divisionOptions } = useDivisionOptions({
    programDivisionIds: programData?.divisions,
  });

  // SnapTo enum for tier level expiration
  const { data: snapToRaw } = useEnumOptions("SnapTo");
  const snapToOptions = React.useMemo(() => {
    const raw = snapToRaw ?? [];
    return raw
      .filter((o) => o.value !== "ExpirationDate")
      .map((o) => ({ value: o.value, label: o.label.replace(/\b\w/g, (c) => c.toUpperCase()) }));
  }, [snapToRaw]);

  // Qualifying currency dropdown: unique group names from qualifying purse policies
  const { data: allPursePolicies } = useAllPursePolicies(currentProgram ?? undefined);
  const pursePolicyOptions: FieldOption[] = React.useMemo(() => {
    const groups = new Set<string>();
    for (const pp of allPursePolicies ?? []) {
      if (pp.group && pp.periodStartDate) {
        groups.add(pp.group);
      }
    }
    return [...groups].sort().map((g) => ({ value: g, label: g }));
  }, [allPursePolicies]);

  // _meta: tier policy → currency association
  const meta = useProgramMeta<TierPolicyMeta>(currentProgram ?? undefined, "Tier Policy Config");

  const handleSaveMeta = React.useCallback(
    async (tierPolicyId: string, pursePolicyId: string) => {
      const current = meta.data ?? { tierPolicyCurrency: {} };
      await meta.save({
        ...current,
        tierPolicyCurrency: {
          ...current.tierPolicyCurrency,
          [tierPolicyId]: pursePolicyId,
        },
      });
    },
    [meta],
  );

  const items = data?.data ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  // Track dirty state from editor
  const editorDirtyRef = React.useRef(false);
  const handleDirtyChange = React.useCallback((dirty: boolean) => {
    editorDirtyRef.current = dirty;
  }, []);

  // Pending navigation action (for unsaved-changes dialog)
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);

  /** Guard an action that would discard changes */
  const guardedAction = React.useCallback((action: () => void) => {
    if (editorDirtyRef.current) {
      setPendingAction(() => action);
    } else {
      action();
    }
  }, []);

  // Block route navigation (sidebar links, browser back) when dirty
  const blocker = useBlocker(() => editorDirtyRef.current);

  // Auto-select first tier group when data loads
  React.useEffect(() => {
    if (!isLoading && items.length > 0 && !selectedId && !creating) {
      setSelectedId(items[0]!._id);
    }
  }, [isLoading, items, selectedId, creating]);

  if (!currentProgram) {
    return (
      <NoProgramBanner
        context="tier groups"
        data-testid="tier-no-program"
      />
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex h-64 items-center justify-center"
        data-testid="tier-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  // No tier groups — empty state
  if (items.length === 0 && !creating) {
    return (
      <div data-testid="tier-page">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              data-testid="tier-back-empty"
              aria-label="Back to Program Elements"
              onClick={() => navigate("/program")}
              className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-h3 text-foreground">Tier Groups</h1>
              <p className="text-body-sm text-foreground-muted">Define tier levels, thresholds, and tier-based benefits</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Crown className="h-8 w-8 text-[var(--color-accent-indigo)]" />
          </div>
          <h2 className="text-h4 text-foreground mb-2">No tier groups yet</h2>
          <p className="text-body-sm text-foreground-muted mb-6 max-w-[var(--width-popover-md)] text-center">
            Create a tier group to define membership levels for this program.
          </p>
          {permissions.canCreate && (
            <Button onClick={() => setCreating(true)} data-testid="tier-add">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Tier Group
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Creating new tier group
  if (creating) {
    return (
      <div data-testid="tier-page">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              data-testid="tier-back-create"
              aria-label="Back to Program Elements"
              onClick={() => navigate("/program")}
              className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-h3 text-foreground">Tier Groups</h1>
              <p className="text-body-sm text-foreground-muted">Define tier levels, thresholds, and tier-based benefits</p>
            </div>
          </div>
        </div>
        <TierGroupEditor
          tierGroup={null}
          onSaved={() => {
            setCreating(false);
            setSelectedId(null);
            refetch();
          }}
          onCancel={() => {
            guardedAction(() => {
              setCreating(false);
              if (items.length > 0) setSelectedId(items[0]!._id);
            });
          }}
          onDirtyChange={handleDirtyChange}
          permissions={permissions}
          pursePolicyOptions={pursePolicyOptions}
          divisionOptions={divisionOptions}
          initialCurrency=""
          onSaveMeta={handleSaveMeta}
          snapToOptions={snapToOptions}
        />

        {/* Unsaved changes dialog (in-page actions) */}
        <UnsavedChangesDialog
          open={!!pendingAction}
          onCancel={() => setPendingAction(null)}
          onDiscard={() => {
            const action = pendingAction;
            setPendingAction(null);
            editorDirtyRef.current = false;
            action?.();
          }}
        />

        {/* Unsaved changes dialog (route navigation) */}
        <UnsavedChangesDialog
          open={blocker.state === "blocked"}
          onCancel={() => blocker.reset?.()}
          onDiscard={() => blocker.proceed?.()}
        />
      </div>
    );
  }

  const selectedTierGroup =
    items.find((item) => item._id === selectedId) ?? items[0] ?? null;

  // Single tier group (common case) — show directly
  if (items.length === 1) {
    return (
      <div data-testid="tier-page">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              data-testid="tier-back-single"
              aria-label="Back to Program Elements"
              onClick={() => navigate("/program")}
              className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-h3 text-foreground">Tier Groups</h1>
              <p className="text-body-sm text-foreground-muted">Define tier levels, thresholds, and tier-based benefits</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh"
              data-testid="tier-refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            {permissions.canCreate && (
              <Button
                variant="outline"
                onClick={() => guardedAction(() => setCreating(true))}
                data-testid="tier-add"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Tier Group
              </Button>
            )}
          </div>
        </div>
        <TierGroupEditor
          key={selectedTierGroup?._id}
          tierGroup={selectedTierGroup}
          onSaved={() => refetch()}
          onDeleted={() => {
            setSelectedId(null);
            refetch();
          }}
          onDirtyChange={handleDirtyChange}
          permissions={permissions}
          pursePolicyOptions={pursePolicyOptions}
          divisionOptions={divisionOptions}
          initialCurrency={
            selectedTierGroup
              ? (meta.data?.tierPolicyCurrency?.[selectedTierGroup._id] ?? "")
              : ""
          }
          onSaveMeta={handleSaveMeta}
          snapToOptions={snapToOptions}
        />

        {/* Unsaved changes dialog (in-page actions) */}
        <UnsavedChangesDialog
          open={!!pendingAction}
          onCancel={() => setPendingAction(null)}
          onDiscard={() => {
            const action = pendingAction;
            setPendingAction(null);
            editorDirtyRef.current = false;
            action?.();
          }}
        />

        {/* Unsaved changes dialog (route navigation) */}
        <UnsavedChangesDialog
          open={blocker.state === "blocked"}
          onCancel={() => blocker.reset?.()}
          onDiscard={() => blocker.proceed?.()}
        />
      </div>
    );
  }

  // Multiple tier groups — show selector pills + inline editor
  return (
    <div data-testid="tier-page">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            data-testid="tier-back-multi"
            aria-label="Back to Program Elements"
            onClick={() => navigate("/program")}
            className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-h3 text-foreground">Tier Groups</h1>
            <p className="text-body-sm text-foreground-muted">Define tier levels, thresholds, and tier-based benefits</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
            data-testid="tier-refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          {permissions.canCreate && (
            <Button
              variant="outline"
              onClick={() => guardedAction(() => setCreating(true))}
              data-testid="tier-add"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Tier Group
            </Button>
          )}
        </div>
      </div>

      {/* Tier group selector pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item._id}
            data-testid={`tier-select-${item._id}`}
            aria-label={`Select tier group ${item.name}`}
            onClick={() => {
              if (item._id !== selectedTierGroup?._id) {
                guardedAction(() => setSelectedId(item._id));
              }
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-body-sm font-medium transition-colors",
              selectedTierGroup?._id === item._id
                ? "border-brand bg-brand/10 text-brand"
                : "border-border bg-card text-foreground-muted hover:border-brand/50 hover:text-foreground",
            )}
          >
            <Crown className="h-3.5 w-3.5" />
            {item.name}
            {item.primary && (
              <span className="text-caption-xs font-normal opacity-70">
                (Primary)
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedTierGroup && (
        <TierGroupEditor
          key={selectedTierGroup._id}
          tierGroup={selectedTierGroup}
          permissions={permissions}
          onSaved={() => refetch()}
          onDeleted={() => {
            setSelectedId(null);
            refetch();
          }}
          onDirtyChange={handleDirtyChange}
          pursePolicyOptions={pursePolicyOptions}
          divisionOptions={divisionOptions}
          initialCurrency={
            meta.data?.tierPolicyCurrency?.[selectedTierGroup._id] ?? ""
          }
          onSaveMeta={handleSaveMeta}
          snapToOptions={snapToOptions}
        />
      )}

      {/* Unsaved changes dialog (in-page actions) */}
      <UnsavedChangesDialog
        open={!!pendingAction}
        onCancel={() => setPendingAction(null)}
        onDiscard={() => {
          const action = pendingAction;
          setPendingAction(null);
          editorDirtyRef.current = false;
          action?.();
        }}
      />

      {/* Unsaved changes dialog (route navigation) */}
      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onCancel={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
    </div>
  );
}
