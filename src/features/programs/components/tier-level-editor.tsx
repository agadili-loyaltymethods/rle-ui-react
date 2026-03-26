import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, ChevronDown, Star, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format-utils";
import type { TierLevel } from "@/shared/types/member";

interface TierLevelEditorProps {
  levels: TierLevel[];
  onChange: (levels: TierLevel[]) => void;
  currencyLabel?: string;
  snapToOptions?: { value: string; label: string }[];
}

/** Generate a stable key for a level (prefer _id, fall back to index-based) */
function levelKey(level: TierLevel, index: number): string {
  return level._id ?? `new-${index}`;
}

function newLevel(num: number): TierLevel {
  return { name: "", number: num, threshold: 0, color: "#888888", defaultLevel: false };
}

/** Format number with thousands separators for display */
function formatThreshold(value: number | undefined): string {
  if (value === undefined || value === null) return "";
  return formatNumber(value);
}

/** Parse a formatted number string back to a number */
function parseThreshold(value: string): number {
  const cleaned = value.replace(/,/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/* ── Sortable Level Item (left panel) ── */

function SortableLevelItem({
  level,
  id,
  isSelected,
  onSelect,
  isOnly,
  currencyLabel,
}: {
  level: TierLevel;
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  isOnly: boolean;
  currencyLabel?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all cursor-pointer",
        isDragging && "z-10 shadow-lg opacity-80",
        isSelected
          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
          : "border-border bg-card hover:border-border-strong hover:bg-subtle/30",
      )}
      onClick={onSelect}
      data-testid={`tier-level-item-${id}`}
    >
      {/* Drag handle */}
      {!isOnly && (
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded p-0.5 text-foreground-muted/50 hover:text-foreground-muted active:cursor-grabbing"
          aria-label={`Drag to reorder ${level.name || "level"}`}
          data-testid={`tier-level-drag-${id}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Color dot */}
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: level.color || "#888" }}
      />

      {/* Name + info */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium text-foreground">
          {level.name || "Untitled"}
        </span>
        <span className="block text-caption-xs text-foreground-muted">
          {(level.threshold ?? 0) > 0
            ? `${formatThreshold(level.threshold)} ${currencyLabel || "pts"}`
            : "Base"}
        </span>
      </div>

      {/* Default star */}
      {level.defaultLevel && (
        <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" />
      )}
    </div>
  );
}

/* ── Level Detail Form (right panel) ── */

function LevelDetailForm({
  level,
  index,
  onUpdate,
  onRemove,
  canRemove,
  snapToOptions,
}: {
  level: TierLevel;
  index: number;
  onUpdate: (patch: Partial<TierLevel>) => void;
  onRemove: () => void;
  canRemove: boolean;
  snapToOptions: { value: string; label: string }[];
}) {
  const [expiryOpen, setExpiryOpen] = React.useState(false);

  return (
    <div className="space-y-5" data-testid={`tier-level-detail-${index}`}>
      {/* Header with color + name */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0 mt-1.5">
          <input
            type="color"
            data-testid={`tier-level-${index}-color-picker`}
            aria-label="Pick tier color"
            title="Pick tier color"
            value={level.color || "#888888"}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="h-10 w-10 rounded-full border-2 border-white shadow-sm ring-1 ring-border cursor-pointer transition-transform hover:scale-110"
            style={{ backgroundColor: level.color || "#888" }}
          />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-caption font-medium text-foreground-muted">
              Level Name
            </label>
            <Input
              value={level.name ?? ""}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g. Gold, Platinum, Diamond..."
              className="text-body font-medium"
              data-testid={`tier-level-${index}-name`}
              id={`tier-level-${index}-name`}
              aria-label="Level Name"
            />
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-caption font-medium text-foreground-muted">
            Threshold
          </label>
          <Input
            value={formatThreshold(level.threshold)}
            onChange={(e) => onUpdate({ threshold: parseThreshold(e.target.value) })}
            placeholder="0"
            className="text-body-sm"
            disabled={level.defaultLevel}
            data-testid={`tier-level-${index}-threshold`}
            id={`tier-level-${index}-threshold`}
            aria-label="Threshold"
          />
        </div>
        <div>
          <label className="mb-1 block text-caption font-medium text-foreground-muted">
            Color
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={level.color || ""}
              onChange={(e) => onUpdate({ color: e.target.value })}
              placeholder="#hex"
              className="flex-1 font-mono text-body-sm"
              data-testid={`tier-level-${index}-color-hex`}
              id={`tier-level-${index}-color-hex`}
              aria-label="Color hex value"
            />
            <div
              className="h-[var(--input-height)] w-10 shrink-0 rounded-[var(--input-radius)] border border-[var(--input-border)]"
              style={{ backgroundColor: level.color || "#888" }}
            />
          </div>
        </div>
      </div>

      {/* Default level toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          data-testid={`tier-level-${index}-default`}
          id={`tier-level-${index}-default`}
          aria-label="Default level"
          className="h-4 w-4 rounded-sm border-border-strong accent-brand"
          checked={level.defaultLevel ?? false}
          onChange={(e) => onUpdate({ defaultLevel: e.target.checked })}
        />
        <div>
          <span className="text-label font-medium text-foreground">Default level</span>
          <span className="block text-caption-xs text-foreground-muted">
            New members start at this tier
          </span>
        </div>
      </label>

      {/* Expiry settings — hidden for default level (never expires) */}
      {level.defaultLevel ? (
        <div className="rounded-lg border border-border px-4 py-3">
          <span className="text-label text-foreground-muted">
            The default tier level never expires.
          </span>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <button
            type="button"
            data-testid={`tier-level-${index}-expiry-toggle`}
            aria-label={expiryOpen ? "Collapse expiry settings" : "Expand expiry settings"}
            onClick={() => setExpiryOpen(!expiryOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-label font-medium text-foreground">Expiry Settings</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-foreground-muted transition-transform",
                expiryOpen && "rotate-180",
              )}
            />
          </button>

          {expiryOpen && (
            <div className="border-t border-border px-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-caption font-medium text-foreground-muted">
                    Expiry Unit
                  </label>
                  <Select
                    value={level.expiryUnit || "__none__"}
                    onValueChange={(v) => onUpdate({ expiryUnit: v === "__none__" ? undefined : v })}
                  >
                    <SelectTrigger className="text-body-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="Days">Days</SelectItem>
                      <SelectItem value="Hours">Hours</SelectItem>
                      <SelectItem value="Months">Months</SelectItem>
                      <SelectItem value="Years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-medium text-foreground-muted">
                    Expiry Value
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={level.expiryValue ?? ""}
                    onChange={(e) => onUpdate({ expiryValue: e.target.valueAsNumber || undefined })}
                    placeholder="0"
                    className="h-10 text-label"
                    data-testid={`tier-level-${index}-expiry-value`}
                    id={`tier-level-${index}-expiry-value`}
                    aria-label="Expiry Value"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-caption font-medium text-foreground-muted">
                    Snap To
                  </label>
                  <Select
                    value={level.expirationSnapTo || "now"}
                    onValueChange={(v) => onUpdate({ expirationSnapTo: v })}
                  >
                    <SelectTrigger className="text-body-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {snapToOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-medium text-foreground-muted">
                    Warning Days
                  </label>
                  <div className="space-y-2">
                    {(level.expiryWarningDays ?? []).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          className="h-9 w-24 text-body-sm"
                          value={d}
                          onChange={(e) => {
                            const next = [...(level.expiryWarningDays ?? [])];
                            next[i] = e.target.valueAsNumber || 0;
                            onUpdate({ expiryWarningDays: next });
                          }}
                          data-testid={`tier-level-${index}-warning-day-${i}`}
                          aria-label={`Warning day ${i + 1}`}
                        />
                        <span className="text-caption text-foreground-muted">
                          days before expiry
                        </span>
                        <button
                          type="button"
                          data-testid={`tier-level-${index}-remove-warning-${i}`}
                          aria-label={`Remove warning day ${i + 1}`}
                          className="ml-auto rounded p-1 text-foreground-muted hover:bg-[var(--color-bg-hover)] hover:text-error"
                          onClick={() => {
                            const next = (level.expiryWarningDays ?? []).filter((_, j) => j !== i);
                            onUpdate({ expiryWarningDays: next.length > 0 ? next : undefined });
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      data-testid={`tier-level-${index}-add-warning`}
                      aria-label="Add warning day"
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-caption font-medium text-brand hover:bg-[var(--color-bg-hover)]"
                      onClick={() => {
                        onUpdate({ expiryWarningDays: [...(level.expiryWarningDays ?? []), 30] });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add warning
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      {canRemove && (
        <div className="pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            className="text-error hover:text-error hover:bg-error/5 text-body-sm"
            onClick={onRemove}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove Level
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Main Editor ── */

const defaultSnapToOptions: { value: string; label: string }[] = [];

export function TierLevelEditor({ levels, onChange, currencyLabel, snapToOptions }: TierLevelEditorProps) {
  const resolvedSnapToOptions = snapToOptions ?? defaultSnapToOptions;
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Ensure selectedIndex is valid
  const safeIndex = Math.min(selectedIndex, Math.max(0, levels.length - 1));
  if (safeIndex !== selectedIndex && levels.length > 0) {
    // Will correct on next render
    React.startTransition(() => setSelectedIndex(safeIndex));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = levels.map((l, i) => levelKey(l, i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(active.id as string);
    const newIndex = sortableIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder levels and reassign numbers
    const reordered = [...levels];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);

    // Reassign level numbers based on new position
    const renumbered = reordered.map((l, i) => ({ ...l, number: i + 1 }));
    onChange(renumbered);

    // Track selection
    if (selectedIndex === oldIndex) {
      setSelectedIndex(newIndex);
    } else if (selectedIndex >= Math.min(oldIndex, newIndex) && selectedIndex <= Math.max(oldIndex, newIndex)) {
      setSelectedIndex(selectedIndex + (oldIndex > newIndex ? 1 : -1));
    }
  };

  const addLevel = () => {
    const nextNum = levels.length + 1;
    onChange([...levels, newLevel(nextNum)]);
    setSelectedIndex(levels.length); // select the new level
  };

  const removeLevel = (index: number) => {
    if (levels.length <= 1) return;
    const updated = levels.filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, number: i + 1 })); // renumber
    onChange(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(updated.length - 1);
    } else if (selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const updateLevel = (index: number, patch: Partial<TierLevel>) => {
    const updated = levels.map((l, i) => {
      if (i !== index) {
        if (patch.defaultLevel) return { ...l, defaultLevel: false };
        return l;
      }
      const merged = { ...l, ...patch };
      // Default level: threshold is always 0, never expires
      if (patch.defaultLevel) {
        merged.threshold = 0;
        merged.expiryUnit = undefined;
        merged.expiryValue = undefined;
        merged.expirationSnapTo = undefined;
        merged.expiryWarningDays = undefined;
      }
      return merged;
    });
    onChange(updated);
  };

  const selectedLevel = levels[safeIndex];

  return (
    <div data-testid="tier-level-editor">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-body font-medium text-foreground">Tier Levels</h3>
          <p className="text-caption text-foreground-muted mt-0.5">
            {levels.length} level{levels.length !== 1 ? "s" : ""} &middot; Drag to reorder, click to edit
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLevel} data-testid="tier-add-level">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Level
        </Button>
      </div>

      {levels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
          <p className="text-body-sm text-foreground-muted mb-3">No levels defined. Add at least one.</p>
          <Button type="button" size="sm" onClick={addLevel}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add First Level
          </Button>
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Left panel: sortable level list */}
          <div className="w-[var(--width-tier-panel)] shrink-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {levels.map((level, index) => {
                    const id = levelKey(level, index);
                    return (
                      <React.Fragment key={id}>
                        {index > 0 && (
                          <div className="flex justify-center py-0.5">
                            <div className="h-3 w-px bg-border" />
                          </div>
                        )}
                        <SortableLevelItem
                          id={id}
                          level={level}
                          isSelected={safeIndex === index}
                          onSelect={() => setSelectedIndex(index)}
                          isOnly={levels.length <= 1}
                          currencyLabel={currencyLabel}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add level button at bottom of list */}
            <button
              type="button"
              onClick={addLevel}
              aria-label="Add level"
              data-testid="tier-add-level-bottom"
              className={cn(
                "mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5",
                "border border-dashed border-border",
                "text-caption text-foreground-muted",
                "hover:border-brand/40 hover:text-brand transition-colors",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Level
            </button>
          </div>

          {/* Right panel: detail form */}
          <div className="flex-1 rounded-lg border border-border bg-card p-5">
            {selectedLevel ? (
              <LevelDetailForm
                key={safeIndex}
                level={selectedLevel}
                index={safeIndex}
                onUpdate={(patch) => updateLevel(safeIndex, patch)}
                onRemove={() => removeLevel(safeIndex)}
                canRemove={levels.length > 1}
                snapToOptions={resolvedSnapToOptions}
              />
            ) : (
              <p className="py-8 text-center text-body-sm text-foreground-muted">
                Select a level to edit
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
