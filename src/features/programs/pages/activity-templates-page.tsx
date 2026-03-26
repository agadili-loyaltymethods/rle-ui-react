import * as React from "react";
import { useNavigate } from "react-router";
import { generateObjectId } from "@/shared/lib/format-utils";
import {
  ArrowLeft,
  Filter,
  Plus,
  Check,
  FileText,
  Calculator,
  Loader2,
  RefreshCw,
  Search,
  Puzzle,
  ListChecks,
  ShieldCheck,
  Pencil,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { SearchBar } from "@/shared/components/search-bar";
import { BulkActionBar } from "@/shared/components/bulk-action-bar";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { TablePagination } from "@/shared/components/table-pagination";
import { useClientTable, renderSortIcon } from "@/shared/hooks/use-client-table";
import { ViewToggle, type ViewMode } from "../components/view-toggle";
import { useActivityTemplates, useDeleteActivityTemplate, useSaveActivityTemplate, useBulkDeleteActivityTemplates, useBulkEditActivityTemplates } from "../hooks/use-activity-templates";
import { ActivityTemplateBulkEditDrawer } from "../components/activity-template-bulk-edit-drawer";
import { useEnumOptions, useCreateEnum } from "@/shared/hooks/use-enums";
import { useModelFieldOptions } from "@/shared/hooks/use-schema";
import { useActivityTemplateSelection } from "../hooks/use-activity-template-selection";
import { useBulkCreateNamespaces, generateNamespace } from "../hooks/use-bulk-create-namespaces";
import { planBulkEdit, applyBulkEditToTemplate } from "../utils/bulk-edit-merge";
import { Input } from "@/shared/ui/input";
import type { ActivityTemplateConfig } from "../types/activity-template-config";

const VIEW_MODE_KEY = "rcx.ui.activityTemplateViewMode";

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "card" || stored === "list") return stored;
  } catch { /* noop */ }
  return "list";
}

export default function ActivityTemplatesPage() {
  const navigate = useNavigate();
  const currentProgram = useUIStore((s) => s.currentProgram);
  const currentOrg = useUIStore((s) => s.currentOrg);
  const [viewMode, setViewMode] = React.useState<ViewMode>(getStoredViewMode);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ActivityTemplateConfig | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [search, setSearch] = React.useState("");

  const { types: allTypes, isLoading } = useActivityTemplates(currentProgram ?? undefined);
  const deleteTemplate = useDeleteActivityTemplate(currentProgram ?? undefined);
  const saveTemplate = useSaveActivityTemplate(currentProgram ?? undefined);
  const bulkEdit = useBulkEditActivityTemplates(currentProgram ?? undefined);
  const bulkDelete = useBulkDeleteActivityTemplates(currentProgram ?? undefined);
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = React.useState(false);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const types = React.useMemo(() => {
    if (!search.trim()) return allTypes;
    const lower = search.trim().toLowerCase();
    return allTypes.filter(
      (t) =>
        t.label.toLowerCase().includes(lower) ||
        t.typeValues.some((v) => v.toLowerCase().includes(lower)),
    );
  }, [allTypes, search]);

  // --- Sort / filter / paginate for list view ---

  const getDisplayValue = React.useCallback((config: ActivityTemplateConfig, key: string): string => {
    switch (key) {
      case "type": return `${config.label} ${config.typeValues.join(" ")}`;
      case "field": return `ext.${config.fieldName}`;
      case "description": return config.description || "";
      case "fields": return String(config.extensions.length);
      case "reasonCodes": return String(config.reasonCodes.length);
      case "rules": return String(config.validationRules.length);
      case "calculations": return String((config.calculatedFields ?? []).length);
      default: return "";
    }
  }, []);

  const getSortValue = React.useCallback((config: ActivityTemplateConfig, key: string): string | number => {
    switch (key) {
      case "type": return config.label.toLowerCase();
      case "field": return config.fieldName.toLowerCase();
      case "description": return (config.description || "").toLowerCase();
      case "fields": return config.extensions.length;
      case "reasonCodes": return config.reasonCodes.length;
      case "rules": return config.validationRules.length;
      case "calculations": return (config.calculatedFields ?? []).length;
      default: return "";
    }
  }, []);

  const {
    sort,
    columnFilters,
    setColumnFilter,
    filtersVisible,
    setFiltersVisible,
    hasActiveFilters,
    clearAllFilters,
    processedItems: processedTypes,
    paginatedItems: paginatedTypes,
    page,
    pageSize,
    setPage,
    setPageSize,
    toggleSort,
  } = useClientTable({
    items: types,
    getDisplayValue,
    getSortValue,
    pageResetDeps: [search],
  });

  // --- Selection ---
  const paginatedIds = React.useMemo(() => paginatedTypes.map((t) => t.id), [paginatedTypes]);
  const processedIds = React.useMemo(() => processedTypes.map((t) => t.id), [processedTypes]);

  const {
    selectedIds,
    clearSelection,
    handleRowSelect,
    handleSelectAllVisible,
    handleInvertSelection,
    handleSelectAll,
  } = useActivityTemplateSelection({
    visibleIds: paginatedIds,
    allFilteredIds: processedIds,
  });

  // Clear selection when search changes
  React.useEffect(() => { clearSelection(); }, [search, clearSelection]);

  const columnDefs: { key: string; label: string; align?: "center" | "right" }[] = [
    { key: "type", label: "Type" },
    { key: "field", label: "Field" },
    { key: "description", label: "Description" },
    { key: "fields", label: "Fields", align: "center" },
    { key: "reasonCodes", label: "Reason Codes", align: "center" },
    { key: "rules", label: "Rules", align: "center" },
    { key: "calculations", label: "Calcs", align: "center" },
  ];

  // Enum options for create modal
  const { data: activityTypeOptions } = useEnumOptions("ActivityType");
  const createEnum = useCreateEnum();

  // Filter out types already configured (flatMap for multi-type)
  const usedTypeValues = React.useMemo(
    () => new Set(allTypes.flatMap((t) => t.typeValues)),
    [allTypes],
  );
  const availableTypeOptions = React.useMemo(
    () => (activityTypeOptions ?? []).filter((o) => !usedTypeValues.has(o.value)),
    [activityTypeOptions, usedTypeValues],
  );

  const [selectedTypeValues, setSelectedTypeValues] = React.useState<string[]>([]);
  const [pendingNewValues, setPendingNewValues] = React.useState<string[]>([]);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [newTypeInput, setNewTypeInput] = React.useState("");
  const [templateName, setTemplateName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Namespace confirmation dialog
  const { fieldNames: activityFieldNames } = useModelFieldOptions("Activity");
  const {
    namespaceConfirmOpen,
    setNamespaceConfirmOpen,
    namespaceMap,
    setNamespaceMap,
    openNamespaceDialog,
    getNamespaceError,
    hasNamespaceErrors,
  } = useBulkCreateNamespaces({
    existingTemplates: allTypes,
    modelFieldNames: activityFieldNames,
  });

  const filteredTypeOptions = React.useMemo(() => {
    if (!typeFilter.trim()) return availableTypeOptions;
    const lower = typeFilter.trim().toLowerCase();
    return availableTypeOptions.filter(
      (o) => o.value.toLowerCase().includes(lower) || o.label.toLowerCase().includes(lower),
    );
  }, [availableTypeOptions, typeFilter]);

  // Check if the new type input matches an existing enum or is already selected
  const newTypeExists = React.useMemo(() => {
    if (!newTypeInput.trim()) return true;
    const lower = newTypeInput.trim().toLowerCase();
    const inEnum = (activityTypeOptions ?? []).some((o) => o.value.toLowerCase() === lower);
    const inPending = pendingNewValues.some((v) => v.toLowerCase() === lower);
    return inEnum || inPending;
  }, [newTypeInput, activityTypeOptions, pendingNewValues]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleCreate = () => {
    setSelectedTypeValues([]);
    setPendingNewValues([]);
    setTypeFilter("");
    setNewTypeInput("");
    setTemplateName("");
    setCreateOpen(true);
  };

  const handleToggleType = (value: string) => {
    setSelectedTypeValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleAddNewType = () => {
    const value = newTypeInput.trim();
    if (!value || newTypeExists) return;
    setPendingNewValues((prev) => [...prev, value]);
    setSelectedTypeValues((prev) => [...prev, value]);
    setNewTypeInput("");
  };

  const handleRemoveSelected = (value: string) => {
    setSelectedTypeValues((prev) => prev.filter((v) => v !== value));
    setPendingNewValues((prev) => prev.filter((v) => v !== value));
  };

  const handleCreateConfirm = async () => {
    if (selectedTypeValues.length === 0) return;
    setCreating(true);
    try {
      // Create enum entries for pending new values
      for (const value of pendingNewValues) {
        await createEnum.mutateAsync({
          type: "ActivityType",
          lang: "en",
          value,
          label: value,
          valueType: "String",
          org: currentOrg,
        } as Record<string, unknown>);
      }
      const id = generateObjectId();
      const nameToUse = templateName.trim()
        || activityTypeOptions?.find((o) => o.value === selectedTypeValues[0])?.label
        || selectedTypeValues[0];
      navigate(`/program/activity-templates/new`, {
        state: { id, typeValues: selectedTypeValues, label: nameToUse },
      });
    } catch {
      toast.error("Failed to create activity type enum");
    } finally {
      setCreating(false);
    }
  };

  // Open the namespace confirmation dialog instead of creating immediately
  const handleBulkCreateClick = () => {
    if (selectedTypeValues.length < 2) return;
    setCreateOpen(false);
    openNamespaceDialog(selectedTypeValues);
  };

  const handleBulkCreateConfirm = async () => {
    if (hasNamespaceErrors) return;
    setCreating(true);
    try {
      // Create enum entries for pending new values first
      for (const value of pendingNewValues) {
        await createEnum.mutateAsync({
          type: "ActivityType",
          lang: "en",
          value,
          label: value,
          valueType: "String",
          org: currentOrg,
        } as Record<string, unknown>);
      }

      // Create one template per selected type using customized namespaces
      const results = await Promise.allSettled(
        selectedTypeValues.map((typeValue) => {
          const label =
            activityTypeOptions?.find((o) => o.value === typeValue)?.label ?? typeValue;
          const config: ActivityTemplateConfig = {
            id: generateObjectId(),
            fieldName: namespaceMap[typeValue] ?? generateNamespace(typeValue),
            label,
            typeValues: [typeValue],
            extensions: [],
            reasonCodes: [],
            validationRules: [],
            calculatedFields: [],
          };
          return saveTemplate(config);
        }),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.filter((r) => r.status === "fulfilled").length;

      if (failed > 0) {
        toast.error(`${failed} of ${results.length} templates failed to create`);
      }
      if (succeeded > 0) {
        toast.success(`Created ${succeeded} activity template${succeeded > 1 ? "s" : ""}`);
      }

      setNamespaceConfirmOpen(false);
    } catch {
      toast.error("Failed to create activity type enums");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (config: ActivityTemplateConfig) => {
    navigate(`/program/activity-templates/${config.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
      toast.success("Activity template deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete activity template");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      await bulkDelete(Array.from(selectedIds));
      toast.success(`Deleted ${selectedIds.size} activity template${selectedIds.size > 1 ? "s" : ""}`);
      clearSelection();
      setBulkDeleteConfirmOpen(false);
    } catch {
      toast.error("Failed to delete activity templates");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkEditSave = async (configIds: string[], update: Record<string, unknown>) => {
    const { directUpdate, hasMerge } = planBulkEdit(update);

    if (hasMerge) {
      // When any field needs merging, do everything via per-template saves
      // to avoid race conditions between multiedit and individual saves.
      const templatesToUpdate = allTypes.filter((t) => configIds.includes(t.id));
      const results = await Promise.allSettled(
        templatesToUpdate.map((template) => saveTemplate(applyBulkEditToTemplate(template, update))),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`${failed} of ${templatesToUpdate.length} template(s) failed to update`);
        return;
      }
    } else if (Object.keys(directUpdate).length > 0) {
      // All fields are replace-mode — use multiedit API (single fast call)
      await bulkEdit(configIds, directUpdate);
    }

    clearSelection();
    setBulkEditOpen(false);
  };

  const [refreshKey, setRefreshKey] = React.useState(0);
  const isFetching = isLoading;

  if (!currentProgram) {
    return (
      <NoProgramBanner
        context="activity templates"
        data-testid="activity-templates-no-program"
      />
    );
  }

  return (
    <div data-testid="activity-templates-page" key={refreshKey}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            data-testid="activity-templates-back"
            aria-label="Back to Program Elements"
            onClick={() => navigate("/program")}
            className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-h3 text-foreground">Activity Templates</h1>
            <p className="text-body-sm text-foreground-muted">Define how you will recognize, validate, and enrich signals from your customers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search templates..."
            testIdPrefix="activity-templates"
            className="w-[var(--width-search-bar)]"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isFetching}
            aria-label="Refresh"
            data-testid="activity-templates-refresh"
          >
            <RefreshCw className={cn("h-[18px] w-[18px]", isFetching && "animate-spin")} />
          </Button>
          <ViewToggle value={viewMode} onChange={handleViewModeChange} />
          <Button onClick={handleCreate} data-testid="activity-templates-add">
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === "list" ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-2/3 rounded bg-subtle" />
                    <div className="h-3 w-1/2 rounded bg-subtle" />
                    <div className="h-3 w-full rounded bg-subtle" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <ListChecks className="h-10 w-10 text-foreground-muted mb-3" />
          <p className="text-body-sm text-foreground-muted mb-3">
            {search.trim() ? "No matching activity templates" : "No activity templates configured"}
          </p>
          {!search.trim() && (
            <Button variant="outline" size="sm" onClick={handleCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Activity Template
            </Button>
          )}
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((config) => (
            <Card
              key={config.id}
              hover
              className={cn(
                "cursor-pointer flex flex-col",
                selectedIds.has(config.id) && "ring-2 ring-brand",
              )}
              onClick={() => handleEdit(config)}
              data-testid={`activity-template-card-${config.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(config.id)}
                      onCheckedChange={() => {/* handled by onClick */}}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleRowSelect(config.id, e);
                      }}
                      className="shrink-0 mt-0.5"
                      aria-label={`Select ${config.label}`}
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-violet-light)] text-[var(--color-accent-violet)]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-body font-medium">{config.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      data-testid={`activity-template-card-edit-${config.id}`}
                      aria-label={`Edit ${config.label}`}
                      title="Edit"
                      className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleEdit(config); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      data-testid={`activity-template-card-delete-${config.id}`}
                      aria-label={`Delete ${config.label}`}
                      title="Delete"
                      className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-error/5 hover:text-error transition-colors"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(config); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1 ml-10">
                  <code className="rounded bg-subtle px-1.5 py-0.5 text-caption font-mono text-foreground-muted">ext.{config.fieldName}</code>
                  {config.typeValues.map((tv) => (
                    <Badge key={tv} variant="violet">{tv}</Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {config.description && (
                  <p className="mb-2 text-body-sm text-foreground-muted line-clamp-2">{config.description}</p>
                )}
                <div className="space-y-2 text-body-sm">
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Puzzle className="h-3.5 w-3.5" />
                    <span>Fields: <span className="text-foreground">{config.extensions.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <ListChecks className="h-3.5 w-3.5" />
                    <span>Reason Codes: <span className="text-foreground">{config.reasonCodes.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Validation Rules: <span className="text-foreground">{config.validationRules.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Calculations: <span className="text-foreground">{(config.calculatedFields ?? []).length}</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card flex flex-col overflow-hidden">
          <TablePagination
            page={page}
            totalItems={processedTypes.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-page border-b border-border text-left">
                <th className="w-10 px-2 h-12">
                  <Checkbox
                    checked={paginatedTypes.length > 0 && paginatedTypes.every((t) => selectedIds.has(t.id))}
                    onCheckedChange={handleSelectAllVisible}
                    aria-label="Select all visible"
                  />
                </th>
                {columnDefs.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3.5 h-12 text-[11px] font-semibold uppercase tracking-[0.5px] whitespace-nowrap select-none cursor-pointer",
                      sort?.key === col.key ? "text-foreground" : "text-foreground-muted",
                      col.align === "center" && "text-center",
                    )}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className={cn("inline-flex items-center gap-1", col.align === "center" && "justify-center")}>
                      <span>{col.label}</span>
                      {renderSortIcon(col.key, sort)}
                    </span>
                  </th>
                ))}
                <th className="px-3.5 h-12 text-[11px] font-semibold text-foreground-muted uppercase tracking-[0.5px] text-right">
                  <button
                    className={cn(
                      "inline-flex items-center justify-center h-7 w-7 rounded cursor-pointer transition-colors",
                      "hover:bg-subtle",
                      hasActiveFilters && "text-brand",
                    )}
                    title={filtersVisible ? "Hide filters" : "Show filters"}
                    aria-label={filtersVisible ? "Hide filters" : "Show filters"}
                    data-testid="activity-templates-filter-toggle"
                    onClick={() => {
                      if (filtersVisible && hasActiveFilters) {
                        clearAllFilters();
                      } else {
                        setFiltersVisible((v) => !v);
                      }
                    }}
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </th>
              </tr>
              {filtersVisible && (
                <tr>
                  <th className="h-10 bg-card border-b border-border" />
                  {columnDefs.map((col) => (
                    <th key={col.key} className="h-10 px-1.5 bg-card border-b border-border">
                      <input
                        type="text"
                        data-testid={`activity-templates-filter-${col.key}`}
                        aria-label={`Filter ${col.label}`}
                        className="w-full h-7 px-2 border border-border rounded-[6px] bg-page text-xs text-foreground font-normal placeholder:text-foreground-tertiary placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-brand"
                        placeholder={`Filter ${col.label.toLowerCase()}...`}
                        value={columnFilters[col.key] ?? ""}
                        onChange={(e) => setColumnFilter(col.key, e.target.value)}
                      />
                    </th>
                  ))}
                  <th className="h-10 px-2 bg-card border-b border-border text-right">
                    {hasActiveFilters && (
                      <button
                        className="inline-flex items-center justify-center h-6 w-6 rounded cursor-pointer hover:bg-subtle"
                        title="Clear all filters"
                        aria-label="Clear all filters"
                        data-testid="activity-templates-clear-filters"
                        onClick={clearAllFilters}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {paginatedTypes.map((config) => (
                <tr
                  key={config.id}
                  className={cn(
                    "border-b border-subtle last:border-b-0 hover:bg-subtle cursor-pointer transition-colors duration-150",
                    selectedIds.has(config.id) && "bg-[var(--table-selected)] hover:bg-[var(--table-selected-hover)]",
                  )}
                  onClick={() => handleEdit(config)}
                  data-testid={`activity-template-row-${config.id}`}
                >
                  <td className="w-10 px-2 py-2">
                    <Checkbox
                      checked={selectedIds.has(config.id)}
                      onCheckedChange={() => {/* handled by onClick */}}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRowSelect(config.id, e); }}
                      aria-label={`Select ${config.label}`}
                    />
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{config.label}</span>
                      {config.typeValues.map((tv) => (
                        <Badge key={tv} variant="violet">{tv}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px]">
                    <code className="rounded bg-subtle px-1.5 py-0.5 text-caption font-mono text-foreground-muted">ext.{config.fieldName}</code>
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px] text-foreground-muted max-w-xs truncate">
                    {config.description || "\u2014"}
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px] text-center text-foreground">
                    {config.extensions.length}
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px] text-center text-foreground">
                    {config.reasonCodes.length}
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px] text-center text-foreground">
                    {config.validationRules.length}
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px] text-center text-foreground">
                    {(config.calculatedFields ?? []).length}
                  </td>
                  <td className="px-3.5 h-14 py-2 text-[13px] text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        data-testid={`activity-template-row-edit-${config.id}`}
                        aria-label="Edit"
                        className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleEdit(config); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        data-testid={`activity-template-row-delete-${config.id}`}
                        aria-label="Delete"
                        className="rounded p-1.5 text-foreground-muted hover:bg-error/10 hover:text-error cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(config); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {processedTypes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-body-sm text-foreground-secondary">
                    {hasActiveFilters ? "No templates match the current filters." : "No matching activity templates"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <TablePagination
            page={page}
            totalItems={processedTypes.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <BulkActionBar
        count={selectedIds.size}
        totalCount={processedTypes.length}
        onSelectAll={handleSelectAll}
        onInvert={handleInvertSelection}
        onEdit={() => setBulkEditOpen(true)}
        onDelete={() => setBulkDeleteConfirmOpen(true)}
        onClear={clearSelection}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Activity Templates"
        description={`Permanently delete ${selectedIds.size} activity template${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={bulkDeleting}
      />

      <ActivityTemplateBulkEditDrawer
        open={bulkEditOpen}
        selectedIds={selectedIds}
        templates={allTypes}
        onSave={handleBulkEditSave}
        onCancel={() => setBulkEditOpen(false)}
      />

      {/* Create Modal — Multi-select with create-new */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-[var(--modal-width-md)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card shadow-modal"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const target = e.currentTarget as HTMLElement | null;
              requestAnimationFrame(() => {
                const el = target?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled])');
                el?.focus();
              });
            }}
          >
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <Dialog.Title className="text-h4 text-foreground">New Activity Template</Dialog.Title>
                <Dialog.Close asChild>
                  <button data-testid="activity-templates-create-close" aria-label="Close" className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="mt-2 text-body-sm text-foreground-muted">
                Select one or more activity types, or create new ones.
              </Dialog.Description>

              {/* Template name */}
              <div className="mt-4">
                <label className="mb-1.5 block text-caption font-medium uppercase tracking-wider text-foreground-muted">
                  Template Name
                </label>
                <input
                  type="text"
                  data-testid="activity-templates-name-input"
                  id="activity-templates-name-input"
                  aria-label="Template Name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Add Preference, Hotel Stay"
                  className={cn(
                    "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                    "py-2 px-3 text-body-sm text-foreground placeholder:text-foreground-muted",
                    "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                  )}
                />
                <p className="mt-1 text-caption text-foreground-muted">
                  Optional — defaults to the first selected type if left blank.
                </p>
              </div>
            </div>

            {/* Create new type */}
            <div className="px-6 pt-4">
              <label className="mb-1.5 block text-caption font-medium uppercase tracking-wider text-foreground-muted">
                Create new type
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
                  <input
                    type="text"
                    data-testid="activity-templates-new-type-input"
                    id="activity-templates-new-type-input"
                    aria-label="New type value"
                    value={newTypeInput}
                    onChange={(e) => setNewTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewType();
                      }
                    }}
                    placeholder="Enter new type value..."
                    className={cn(
                      "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                      "py-2 pl-9 pr-3 text-body-sm text-foreground placeholder:text-foreground-muted",
                      "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                    )}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddNewType}
                  disabled={!newTypeInput.trim() || newTypeExists}
                  data-testid="activity-templates-add-new-type"
                  className="shrink-0"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>

            {/* Selected summary */}
            {selectedTypeValues.length > 0 && (
              <div className="px-6 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {selectedTypeValues.map((val) => {
                    const isPending = pendingNewValues.includes(val);
                    return (
                      <Badge
                        key={val}
                        variant={isPending ? "default" : "secondary"}
                        className="flex items-center gap-1 pr-1"
                      >
                        {val}
                        {isPending && (
                          <span className="ml-0.5 text-caption-xs opacity-70">New</span>
                        )}
                        <button
                          data-testid={`activity-templates-remove-type-${val}`}
                          aria-label={`Remove ${val}`}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                          onClick={() => handleRemoveSelected(val)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="px-6 pt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  data-testid="activity-templates-create-search"
                  id="activity-templates-create-search"
                  aria-label="Search existing types"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  placeholder="Search existing types..."
                  className={cn(
                    "w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)]",
                    "py-2 pl-9 pr-3 text-body-sm text-foreground placeholder:text-foreground-muted",
                    "focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-brand",
                  )}
                />
              </div>
            </div>

            {/* Scrollable checklist */}
            <div className="mt-3 h-[var(--height-dropdown-max)] overflow-y-auto px-2 pb-2">
              {filteredTypeOptions.length === 0 ? (
                <p className="px-4 py-6 text-center text-body-sm text-foreground-muted">
                  {availableTypeOptions.length === 0
                    ? "All available activity types have been configured."
                    : "No matching activity types"}
                </p>
              ) : (
                filteredTypeOptions.map((opt) => {
                  const isSelected = selectedTypeValues.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      data-testid={`activity-template-option-${opt.value}`}
                      aria-label={`Toggle ${opt.label}`}
                      onClick={() => handleToggleType(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-body-sm transition-colors",
                        "hover:bg-subtle",
                        isSelected && "bg-brand/10",
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-brand bg-brand text-white"
                          : "border-border-strong bg-transparent",
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className={cn(
                        "truncate",
                        isSelected ? "font-medium text-brand" : "text-foreground",
                      )}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <span className="text-label text-foreground-muted">
                {selectedTypeValues.length} selected
              </span>
              <div className="flex items-center gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancel</Button>
                </Dialog.Close>
                {selectedTypeValues.length >= 2 && (
                  <Button
                    variant="outline"
                    onClick={handleBulkCreateClick}
                    disabled={creating}
                    loading={creating}
                    data-testid="activity-templates-bulk-create"
                  >
                    1 Per Type ({selectedTypeValues.length})
                  </Button>
                )}
                <Button
                  onClick={handleCreateConfirm}
                  disabled={selectedTypeValues.length === 0 || creating}
                  loading={creating}
                  data-testid="activity-templates-create-confirm"
                >
                  Create
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Namespace confirmation dialog for bulk "1 Per Type" creation */}
      <Dialog.Root open={namespaceConfirmOpen} onOpenChange={(open) => {
        if (!open) setNamespaceConfirmOpen(false);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-[var(--modal-width-md)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card shadow-modal"
            data-testid="namespace-confirm-dialog"
          >
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <Dialog.Title className="text-h4 text-foreground">Confirm Namespaces</Dialog.Title>
                <Dialog.Close asChild>
                  <button data-testid="namespace-confirm-close-btn" className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="mt-2 text-body-sm text-foreground-muted">
                Review and customize the namespace for each template before creating.
              </Dialog.Description>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto px-6 pb-2">
              <div className="space-y-3">
                {selectedTypeValues.map((tv) => {
                  const label = activityTypeOptions?.find((o) => o.value === tv)?.label ?? tv;
                  const ns = namespaceMap[tv] ?? "";
                  const error = getNamespaceError(tv, ns);
                  return (
                    <div key={tv} className="rounded-lg border border-border p-3">
                      <div className="mb-1.5 text-label font-medium text-foreground">{label}</div>
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-body-sm font-mono text-foreground-muted">ext.</span>
                        <Input
                          value={ns}
                          onChange={(e) => setNamespaceMap((prev) => ({ ...prev, [tv]: e.target.value }))}
                          error={!!error}
                          data-testid={`namespace-input-${tv}`}
                          className="font-mono"
                        />
                      </div>
                      {error && <p className="mt-1 text-caption text-error">{error}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="ghost" onClick={() => setNamespaceConfirmOpen(false)}>Cancel</Button>
              <Button
                onClick={handleBulkCreateConfirm}
                disabled={hasNamespaceErrors || creating}
                loading={creating}
                data-testid="namespace-confirm-create"
              >
                Create All ({selectedTypeValues.length})
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Activity Template"
        itemName={deleteTarget?.label}
        isPending={deleting}
        data-testid="activity-templates-delete-confirm"
      />
    </div>
  );
}
