import * as React from "react";
import { cn } from "@/shared/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional icon rendered before the title. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Content rendered in the right-hand action area (buttons, selects, etc.). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page-level header with title, optional description, and an action slot.
 *
 * Replaces ad-hoc `<h1 className="text-h3">` + surrounding layout in every page component.
 */
function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && <Icon className="mt-0.5 h-6 w-6 shrink-0 text-brand" />}
        <div className="min-w-0">
        <h1 className="text-h3 text-foreground truncate">{title}</h1>
        {description && (
          <p className="mt-1 text-body-sm text-foreground-muted">{description}</p>
        )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
