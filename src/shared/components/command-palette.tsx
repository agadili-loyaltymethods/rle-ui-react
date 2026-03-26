import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";

interface CommandPaletteProps {
  navigate?: (path: string) => void;
}

/**
 * Global search modal triggered by Ctrl+K (or Cmd+K on Mac).
 * Renders as a centered overlay dialog — classic command palette pattern.
 */
function CommandPalette({ navigate: _navigate }: CommandPaletteProps) {
  const programName = useUIStore((s) => s.currentProgramName);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when modal opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <>
      {/* Compact trigger in header — search bar style */}
      <button
        data-testid="command-palette-trigger"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-body-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">
          {programName ? `Search in ${programName}\u2026` : "Search\u2026"}
        </span>
        <kbd className="hidden sm:inline-flex shrink-0 items-center gap-0.5 rounded border border-[var(--color-border-light)] bg-[var(--color-bg-card)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] ml-2">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[20vh]"
          data-testid="command-palette-overlay"
        >
          {/* Backdrop — click to close */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div
            className={cn(
              "relative w-full max-w-[var(--modal-width-lg)] mx-4",
              "rounded-[var(--card-radius)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]",
              "shadow-[var(--shadow-modal)]",
              "overflow-hidden",
            )}
            data-testid="command-palette-dialog"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
              <input
                ref={inputRef}
                data-testid="command-palette-input"
                aria-label="Command palette search"
                placeholder={programName ? `Search in ${programName}\u2026` : "Search\u2026"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                className="flex-1 min-w-0 bg-transparent text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
            </div>

            {/* Results area */}
            <div className="max-h-[50vh] overflow-y-auto p-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-border-medium)]">
              {search.trim().length > 0 ? (
                <p className="py-8 text-center text-body-sm text-[var(--color-text-muted)]">
                  No results found for &ldquo;{search}&rdquo;
                </p>
              ) : (
                <p className="py-8 text-center text-body-sm text-[var(--color-text-muted)]">
                  Type to search across the platform...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { CommandPalette };
export type { CommandPaletteProps };
