import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import type { TreeNode } from "../lib/division-tree-utils";

interface DivisionTreeNodeProps {
  node: TreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDrop?: (draggedId: string, targetId: string | null) => void;
  onAddChild?: (parentId: string) => void;
}

export function DivisionTreeNode({
  node,
  depth,
  expandedIds,
  selectedId,
  onSelect,
  onToggleExpand,
  onDrop,
  onAddChild,
}: DivisionTreeNodeProps) {
  const { t } = useTranslation("settings");
  const { division, children } = node;
  const isExpanded = expandedIds.has(division._id);
  const isSelected = selectedId === division._id;
  const hasChildren = children.length > 0;
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", division._id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    if (!onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when actually leaving this element, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== division._id && onDrop) {
      onDrop(draggedId, division._id);
    }
  }

  return (
    <div>
      <div
        data-testid={`tree-node-${division._id}`}
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md py-1.5 pr-2 text-body-sm transition-colors hover:bg-subtle",
          isSelected && "bg-subtle text-foreground",
          isDragOver && "ring-2 ring-brand ring-inset",
        )}
        style={{ paddingLeft: `${depth * 1.5 + 0.25}rem` }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelect(division._id)}
      >
        {onDrop ? (
          <span
            draggable
            data-testid={`drag-handle-${division._id}`}
            aria-label={t("divisions.dragHandle", { name: division.name })}
            title={t("divisions.dragHandle", { name: division.name })}
            onDragStart={handleDragStart}
            className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        {hasChildren ? (
          <button
            type="button"
            data-testid={`expand-toggle-${division._id}`}
            aria-label={isExpanded ? t("divisions.collapseNode", { name: division.name }) : t("divisions.expandNode", { name: division.name })}
            title={isExpanded ? t("divisions.collapseNode", { name: division.name }) : t("divisions.expandNode", { name: division.name })}
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-border"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(division._id);
            }}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-foreground-muted transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <span className="truncate">{division.name}</span>
        {division.isActive && onAddChild && (
          <button
            type="button"
            data-testid={`add-child-${division._id}`}
            aria-label={t("divisions.addChild", { name: division.name })}
            title={t("divisions.addChildTitle")}
            className="ml-auto flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground-muted opacity-0 transition-opacity hover:bg-border hover:text-foreground group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(division._id);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <Badge
          variant={division.isActive ? "success" : "secondary"}
          className="shrink-0 text-caption-xs"
        >
          {division.isActive ? t("divisions.isActive") : t("divisions.inactive")}
        </Badge>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <DivisionTreeNode
              key={child.division._id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDrop={onDrop}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
