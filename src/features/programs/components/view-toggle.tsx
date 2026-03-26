import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type ViewMode = "card" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border" data-testid="view-toggle">
      <button
        type="button"
        data-testid="view-toggle-card"
        aria-label="Card view"
        title="Card view"
        onClick={() => onChange("card")}
        className={cn(
          "flex items-center justify-center rounded-l-md px-3 h-[var(--button-height)] transition-colors",
          value === "card"
            ? "bg-brand text-foreground-inverse"
            : "bg-card text-foreground-muted hover:text-foreground hover:bg-subtle",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-testid="view-toggle-list"
        aria-label="List view"
        title="List view"
        onClick={() => onChange("list")}
        className={cn(
          "flex items-center justify-center rounded-r-md px-3 h-[var(--button-height)] transition-colors border-l border-border",
          value === "list"
            ? "bg-brand text-foreground-inverse"
            : "bg-card text-foreground-muted hover:text-foreground hover:bg-subtle",
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

export type { ViewMode };
