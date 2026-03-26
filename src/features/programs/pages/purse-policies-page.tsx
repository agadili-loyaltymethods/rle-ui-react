import * as React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Loader2, RefreshCw } from "lucide-react";
import { SearchBar } from "@/shared/components/search-bar";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { usePermissions } from "@/shared/hooks/use-permissions";
import { toast } from "sonner";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ViewToggle, type ViewMode } from "../components/view-toggle";
import { PurseGroupedTable } from "../components/purse-grouped-table";
import { PurseGroupedCards } from "../components/purse-grouped-cards";
import { useAllPursePolicies, useDeletePursePolicy } from "../hooks/use-policies";
import { groupPursePolicies } from "../utils/group-purse-policies";
import type { PursePolicy } from "@/shared/types/policy";

const VIEW_MODE_KEY = "rcx.ui.pursePolicyViewMode";

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "card" || stored === "list") return stored;
  } catch { /* noop */ }
  return "list";
}

export default function PursePoliciesPage() {
  const navigate = useNavigate();
  const currentProgram = useUIStore((s) => s.currentProgram);
  const permissions = usePermissions("pursepolicies");
  const [viewMode, setViewMode] = React.useState<ViewMode>(getStoredViewMode);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = React.useState<PursePolicy | null>(null);
  const [search, setSearch] = React.useState("");

  const { data: policies, isLoading, refetch, isFetching } = useAllPursePolicies(currentProgram ?? undefined);
  const deleteMutation = useDeletePursePolicy();

  const filteredPolicies = React.useMemo(() => {
    if (!search.trim()) return policies ?? [];
    const lower = search.trim().toLowerCase();
    return (policies ?? []).filter((p) => p.name?.toLowerCase().includes(lower));
  }, [policies, search]);

  const entries = React.useMemo(
    () => groupPursePolicies(filteredPolicies),
    [filteredPolicies],
  );

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleToggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleCreate = () => {
    navigate("/program/purse-policies/new");
  };

  const handleEdit = (policy: PursePolicy) => {
    navigate(`/program/purse-policies/${policy._id}`);
  };

  const handleDelete = (policy: PursePolicy) => {
    setDeleteTarget(policy);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success("Purse Policy deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete purse policy");
    }
  };

  if (!currentProgram) {
    return (
      <NoProgramBanner
        context="purse policies"
        data-testid="purse-no-program"
      />
    );
  }

  return (
    <div data-testid="purse-page">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            data-testid="purse-back"
            aria-label="Back to Program Elements"
            onClick={() => navigate("/program")}
            className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-h3 text-foreground">Purse Policies</h1>
            <p className="text-body-sm text-foreground-muted">Manage point purses, multipliers, expiration, and escrow settings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search purse policies..."
            testIdPrefix="purse"
            className="w-[var(--width-search-bar)]"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
            data-testid="purse-refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          <ViewToggle value={viewMode} onChange={handleViewModeChange} />
          {permissions.canCreate && (
            <Button onClick={handleCreate} data-testid="purse-add">
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          )}
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
            {Array.from({ length: 6 }).map((_, i) => (
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
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <p className="text-body text-foreground-muted mb-4">
            {search.trim() ? "No matching purse policies" : "No purse policies found"}
          </p>
          {!search.trim() && permissions.canCreate && (
            <Button onClick={handleCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <PurseGroupedTable
          entries={entries}
          expandedGroups={expandedGroups}
          onToggleGroup={handleToggleGroup}
          onEdit={permissions.canUpdate ? handleEdit : undefined}
          onDelete={permissions.canDelete ? handleDelete : undefined}
        />
      ) : (
        <PurseGroupedCards
          entries={entries}
          expandedGroups={expandedGroups}
          onToggleGroup={handleToggleGroup}
          onEdit={permissions.canUpdate ? handleEdit : undefined}
          onDelete={permissions.canDelete ? handleDelete : undefined}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Purse Policy"
        itemName={deleteTarget?.name}
        isPending={deleteMutation.isPending}
        data-testid="purse-delete-confirm"
      />
    </div>
  );
}
