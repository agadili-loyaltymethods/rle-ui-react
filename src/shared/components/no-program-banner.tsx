import { LayoutGrid } from "lucide-react";

interface NoProgramBannerProps {
  /** Describes what you're trying to view, e.g. "activity templates", "purse policies". */
  context?: string;
  "data-testid"?: string;
}

/**
 * Standard empty state shown when no program is selected in the sidebar.
 *
 * Drop this in page-level guards that check `!currentProgram`.
 */
function NoProgramBanner({ context, "data-testid": testId }: NoProgramBannerProps) {
  const thing = context ? ` to view ${context}` : "";

  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <LayoutGrid className="mb-4 h-12 w-12 text-foreground-muted opacity-40" />
      <h2 className="text-h4 text-foreground mb-2">No program selected</h2>
      <p className="text-body-sm text-foreground-muted">
        Select a program from the sidebar{thing}.
      </p>
    </div>
  );
}

export { NoProgramBanner };
export type { NoProgramBannerProps };
