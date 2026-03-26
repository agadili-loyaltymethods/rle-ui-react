import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { cn } from "@/shared/lib/cn";
import { DivisionTreeNode } from "./division-tree-node";
import type { TreeNode } from "../lib/division-tree-utils";

interface DivisionTreeProps {
  tree: TreeNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  searchQuery: string;
  activeOnly: boolean;
  onActiveOnlyChange: (value: boolean) => void;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSearchChange: (query: string) => void;
  onCreateNew?: (parentId?: string) => void;
  onDrop?: (draggedId: string, targetId: string | null) => void;
}

export function DivisionTree({
  tree,
  expandedIds,
  selectedId,
  searchQuery,
  activeOnly,
  onActiveOnlyChange,
  onSelect,
  onToggleExpand,
  onSearchChange,
  onCreateNew,
  onDrop,
}: DivisionTreeProps) {
  const { t } = useTranslation("settings");
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Clear root drag-over state when any drag ends (drop or cancel)
  useEffect(() => {
    function handleDragEnd() {
      setIsRootDragOver(false);
    }
    document.addEventListener("dragend", handleDragEnd);
    return () => document.removeEventListener("dragend", handleDragEnd);
  }, []);

  function handleRootDragOver(e: React.DragEvent) {
    if (!onDrop) return;
    e.preventDefault();
    // Only highlight if the drag is directly over the root container, not a child node
    if (e.target === rootRef.current) {
      setIsRootDragOver(true);
    }
  }

  function handleRootDragLeave(e: React.DragEvent) {
    if (!rootRef.current?.contains(e.relatedTarget as Node)) {
      setIsRootDragOver(false);
    }
  }

  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsRootDragOver(false);
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && onDrop) {
      onDrop(draggedId, null);
    }
  }

  function handleAddChild(parentId: string) {
    onCreateNew?.(parentId);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            data-testid="division-search-input"
            aria-label={t("divisions.searchPlaceholder")}
            placeholder={t("divisions.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {onCreateNew && (
          <Button
            size="sm"
            data-testid="division-create-button"
            aria-label={t("divisions.newDivision")}
            onClick={() => onCreateNew()}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("divisions.newDivision")}
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between px-3 pb-2">
        <label className="flex cursor-pointer items-center gap-2 text-body-sm text-foreground-muted">
          <Switch
            data-testid="division-active-only-switch"
            checked={activeOnly}
            onChange={onActiveOnlyChange}
          />
          {t("divisions.activeOnly")}
        </label>
      </div>
      <div
        ref={rootRef}
        className={cn(
          "flex-1 overflow-y-auto px-1 pb-2 transition-colors",
          isRootDragOver && "bg-subtle/50 ring-2 ring-brand/30 ring-inset rounded-md",
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {tree.length === 0 ? (
          <p className="p-4 text-center text-body-sm text-foreground-muted">
            {searchQuery
              ? t("divisions.noMatch")
              : t("divisions.noDivisionsYet")}
          </p>
        ) : (
          tree.map((node) => (
            <DivisionTreeNode
              key={node.division._id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDrop={onDrop}
              onAddChild={onCreateNew ? handleAddChild : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
