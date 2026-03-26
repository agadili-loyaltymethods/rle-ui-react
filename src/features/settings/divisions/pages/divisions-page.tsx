import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FolderTree } from "lucide-react";
import { PageHeader } from "@/shared/components/page-header";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { usePermissions } from "@/shared/hooks/use-permissions";
import {
  useEntityList,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "@/shared/hooks/use-api";
import { DivisionTree } from "../components/division-tree";
import { DivisionDetailPanel } from "../components/division-detail-panel";
import { useDivisionTree } from "../hooks/use-division-tree";
import { findDescendantIds, filterTreeByActive, getParentId } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";
import type { ApiError } from "@/shared/types/api";

export default function DivisionsPage() {
  const { t } = useTranslation("settings");
  const permissions = usePermissions("divisions");
  const { data, isLoading } = useEntityList<Division>("divisions", {
    limit: 0,
    sort: "name",
  });
  const divisions = useMemo(() => data?.data ?? [], [data?.data]);

  const {
    filteredTree,
    selectedId,
    setSelectedId,
    expandedIds,
    toggleExpanded,
    expandToNode,
    searchQuery,
    setSearchQuery,
  } = useDivisionTree(divisions);

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(
    null,
  );
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);

  const displayTree = useMemo(
    () => (activeOnly ? filterTreeByActive(filteredTree) : filteredTree),
    [activeOnly, filteredTree],
  );

  const selectedDivision = divisions.find((d) => d._id === selectedId) ?? null;

  const createEntity = useCreateEntity<Division>("divisions");
  const updateEntity = useUpdateEntity<Division>("divisions");
  const deleteEntity = useDeleteEntity("divisions");

  const handleSelect = useCallback(
    (id: string) => {
      if (formIsDirty) {
        setPendingSelectionId(id);
        setShowUnsavedDialog(true);
        return;
      }
      setSelectedId(id);
      setIsCreateMode(false);
      expandToNode(id);
    },
    [formIsDirty, setSelectedId, expandToNode],
  );

  const handleCreateNew = useCallback(
    (parentId?: string) => {
      if (formIsDirty) {
        setPendingSelectionId(null);
        setShowUnsavedDialog(true);
        return;
      }
      setSelectedId(null);
      setCreateParentId(parentId ?? null);
      setIsCreateMode(true);
    },
    [formIsDirty, setSelectedId],
  );

  const handleCancelCreate = useCallback(() => {
    setIsCreateMode(false);
    setCreateParentId(null);
    setFormIsDirty(false);
  }, []);

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false);
    setFormIsDirty(false);
    if (pendingSelectionId) {
      setSelectedId(pendingSelectionId);
      setIsCreateMode(false);
      expandToNode(pendingSelectionId);
    } else {
      setSelectedId(null);
      setIsCreateMode(true);
    }
    setPendingSelectionId(null);
  }, [pendingSelectionId, setSelectedId, expandToNode]);

  const handleSave = useCallback(
    async (formData: {
      name: string;
      description?: string;
      isActive: boolean;
      parent: string | null;
      permissions: {
        read: boolean;
        update: boolean;
        create: boolean;
        delete: boolean;
      };
    }) => {
      try {
        if (isCreateMode) {
          const created = await createEntity.mutateAsync({
            name: formData.name,
            description: formData.description || undefined,
            isActive: formData.isActive,
            parent: formData.parent || undefined,
            permissions: formData.permissions,
          } as Partial<Division>);
          setIsCreateMode(false);
          setSelectedId(created._id);
          expandToNode(created._id);
          toast.success(t("divisions.created"));
        } else if (selectedId) {
          await updateEntity.mutateAsync({
            id: selectedId,
            data: {
              name: formData.name,
              description: formData.description || undefined,
              isActive: formData.isActive,
              parent: formData.parent || undefined,
              permissions: formData.permissions,
            } as Partial<Division>,
          });
          toast.success(t("divisions.updated"));
        }
        setFormIsDirty(false);
      } catch (err: unknown) {
        const error = err as ApiError;
        if (error.code === 2160) {
          toast.error(t("divisions.errorCircular"));
        } else if (error.code === 2152) {
          toast.error(t("divisions.errorDependencies"));
        } else if (error.code === 1104) {
          toast.error(t("divisions.errorPermission"));
        } else {
          toast.error(t("divisions.errorSave"));
        }
      }
    },
    [
      isCreateMode,
      selectedId,
      createEntity,
      updateEntity,
      setSelectedId,
      expandToNode,
      t,
    ],
  );

  const handleDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!selectedId) return;
    try {
      await deleteEntity.mutateAsync(selectedId);
      setSelectedId(null);
      setIsCreateMode(false);
      setShowDeleteDialog(false);
      setFormIsDirty(false);
      toast.success(t("divisions.deleted"));
    } catch (err: unknown) {
      const error = err as ApiError;
      if (error.code === 2152) {
        toast.error(t("divisions.errorDeleteDependencies"));
      } else if (error.code === 1104) {
        toast.error(t("divisions.errorDeletePermission"));
      } else {
        toast.error(t("divisions.errorDelete"));
      }
      setShowDeleteDialog(false);
    }
  }, [selectedId, deleteEntity, setSelectedId, t]);

  const handleDrop = useCallback(
    async (draggedId: string, targetId: string | null) => {
      const dragged = divisions.find((d) => d._id === draggedId);
      if (!dragged) return;

      // No-op if parent didn't change
      const currentParent = getParentId(dragged) ?? null;
      if (currentParent === targetId) return;

      if (targetId) {
        const target = divisions.find((d) => d._id === targetId);
        if (target && !target.isActive) {
          toast.error(t("divisions.errorMoveInactive"));
          return;
        }
        const descendants = findDescendantIds(draggedId, divisions);
        if (descendants.has(targetId) || draggedId === targetId) {
          toast.error(t("divisions.errorCircular"));
          return;
        }
      }

      try {
        await updateEntity.mutateAsync({
          id: draggedId,
          data: { parent: targetId || undefined } as Partial<Division>,
        });
        toast.success(t("divisions.moved"));
      } catch {
        toast.error(t("divisions.errorMove"));
      }
    },
    [divisions, updateEntity, t],
  );

  if (!permissions.isLoading && !permissions.canRead) {
    return (
      <div data-testid="page-divisions" className="flex h-full flex-col">
        <PageHeader
          title={t("divisions.title")}
          description={t("divisions.description")}
          icon={FolderTree}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-body-sm text-foreground-muted">{t("divisions.noAccess")}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-divisions" className="flex h-full flex-col">
      <PageHeader
        title={t("divisions.title")}
        description={t("divisions.description")}
        icon={FolderTree}
      />

      <div className="flex min-h-0 flex-1 rounded-lg border border-border bg-card">
        {/* Left panel — tree */}
        <div className="w-[40%] border-r border-border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-body-sm text-foreground-muted">{t("divisions.loading")}</p>
            </div>
          ) : (
            <DivisionTree
              tree={displayTree}
              expandedIds={expandedIds}
              selectedId={selectedId}
              searchQuery={searchQuery}
              activeOnly={activeOnly}
              onActiveOnlyChange={setActiveOnly}
              onSelect={handleSelect}
              onToggleExpand={toggleExpanded}
              onSearchChange={setSearchQuery}
              onCreateNew={permissions.canCreate ? handleCreateNew : undefined}
              onDrop={permissions.canUpdate ? handleDrop : undefined}
            />
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1">
          <DivisionDetailPanel
            division={selectedDivision}
            allDivisions={divisions}
            isCreateMode={isCreateMode}
            createParentId={createParentId}
            onSave={handleSave}
            onDelete={permissions.canDelete ? handleDelete : undefined}
            onCancelCreate={handleCancelCreate}
            isSaving={createEntity.isPending || updateEntity.isPending}
            isDeleting={deleteEntity.isPending}
            onDirtyChange={setFormIsDirty}
            canCreate={permissions.canCreate}
            canUpdate={permissions.canUpdate}
          />
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onCancel={() => setShowUnsavedDialog(false)}
        onDiscard={handleDiscardChanges}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        itemName={selectedDivision?.name}
        isPending={deleteEntity.isPending}
      />
    </div>
  );
}
