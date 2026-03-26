import { useState } from "react";
import { ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { generateObjectId } from "@/shared/lib/format-utils";
import type { Category } from "@/features/reward-catalog/types/reward-policy";

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (category: Category) => void;
  onUpdate: (category: Category) => void;
  onDelete: (id: string) => void;
}

export function CategoryManager({
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const cat = categories.find((c) => c._id === editingId);
    if (!cat) return;
    onUpdate({ ...cat, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd({
      _id: generateObjectId(),
      name: newName.trim(),
      color: newColor,
      createdAt: new Date().toISOString(),
    });
    setNewName("");
    setNewColor("#3B82F6");
  };

  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        data-testid="category-manager-toggle"
        aria-label="Manage Categories"
        className="flex items-center gap-2 w-full px-4 py-3 text-body-sm font-medium text-foreground hover:bg-subtle transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span>Manage Categories</span>
        <span className="ml-auto text-caption text-foreground-muted bg-subtle rounded-sm px-1.5 py-0.5">
          {categories.length}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {/* Category list */}
          <div className="space-y-1">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="flex items-center gap-2 py-1.5"
              >
                {editingId === cat._id ? (
                  <>
                    <input
                      type="color"
                      data-testid={`category-edit-color-${cat._id}`}
                      aria-label="Edit category color"
                      className="h-6 w-6 shrink-0 cursor-pointer border-0 p-0 bg-transparent"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    />
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Save"
                      onClick={saveEdit}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Cancel"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-body-sm text-foreground">
                      {cat.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 px-2 text-caption")}
                      onClick={() => startEdit(cat)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-caption text-error hover:text-error"
                      onClick={() => onDelete(cat._id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input
              type="color"
              data-testid="category-new-color"
              aria-label="New category color"
              className="h-6 w-6 shrink-0 cursor-pointer border-0 p-0 bg-transparent"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <Input
              type="text"
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="flex-1"
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleAdd}
              disabled={!newName.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
