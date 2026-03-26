import { useState, useRef, useEffect } from "react";
import { Layers, ChevronDown, Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";
import { usePrograms } from "@/features/programs/hooks/use-programs";

export function ProgramSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentProgram = useUIStore((s) => s.currentProgram);
  const currentProgramName = useUIStore((s) => s.currentProgramName);
  const setProgram = useUIStore((s) => s.setProgram);

  const { data, isLoading } = usePrograms({ sort: "name", limit: 200, select: "name" });
  const programs = data?.data ?? [];

  // Auto-select first program if none is selected
  useEffect(() => {
    if (!currentProgram && programs.length > 0) {
      setProgram(programs[0]!._id, programs[0]!.name);
    }
  }, [currentProgram, programs, setProgram]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        data-testid="program-selector-trigger"
        aria-label="Select program"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-body-sm transition-colors",
          "hover:bg-[var(--color-bg-subtle)]",
          open && "bg-[var(--color-bg-subtle)]",
        )}
      >
        <Layers className="h-4 w-4 shrink-0 text-[var(--color-brand-primary)]" />
        <span className="max-w-[200px] truncate font-medium text-[var(--color-text-primary)]">
          {isLoading ? "Loading..." : currentProgramName ?? "Select program"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-[var(--z-dropdown)] mt-1 w-72 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-card)]",
            "shadow-[var(--shadow-dropdown)]",
          )}
          data-testid="program-selector-dropdown"
        >
          {/* Program list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {programs.length === 0 ? (
              <p className="px-3 py-4 text-center text-caption text-[var(--color-text-muted)]">
                {isLoading ? "Loading programs..." : "No programs available"}
              </p>
            ) : (
              programs.map((program) => (
                <button
                  key={program._id}
                  data-testid={`program-option-${program._id}`}
                  aria-label={`Select ${program.name}`}
                  onClick={() => {
                    setProgram(program._id, program.name);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-body-sm transition-colors",
                    "hover:bg-[var(--color-bg-subtle)]",
                    currentProgram === program._id && "bg-[var(--sidebar-active-bg)]",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      currentProgram === program._id
                        ? "text-[var(--color-brand-primary)]"
                        : "text-transparent",
                    )}
                  />
                  <span className="truncate text-[var(--color-text-primary)]">{program.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
