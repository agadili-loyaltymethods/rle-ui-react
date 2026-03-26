/**
 * Floating action bar shown when rows are selected in the table.
 * Provides Select All, Invert, Edit, Delete, and Clear actions.
 */

import { CheckCheck, ArrowLeftRight, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

interface BulkActionBarProps {
  count: number;
  totalCount?: number;
  onSelectAll?: () => void;
  selectingAll?: boolean;
  onInvert: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  count,
  totalCount,
  onSelectAll,
  selectingAll,
  onInvert,
  onEdit,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      data-testid="bulk-action-bar"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-sticky)]",
        "flex items-center gap-3 px-4 py-2.5",
        "bg-card text-foreground border border-border rounded-[var(--button-radius)]",
        "shadow-[var(--shadow-modal)]",
        "animate-in slide-in-from-bottom-2 duration-200",
      )}
    >
      {/* Count badge */}
      <span className="text-caption font-semibold whitespace-nowrap bg-brand text-foreground-inverse px-2.5 py-0.5 rounded-full tabular-nums">
        {count} selected
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {onSelectAll && totalCount != null && count < totalCount && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={selectingAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {selectingAll ? "Selecting\u2026" : `All ${totalCount}`}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onInvert}>
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Invert
        </Button>
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            data-testid="bulk-action-edit"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* Dismiss */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
