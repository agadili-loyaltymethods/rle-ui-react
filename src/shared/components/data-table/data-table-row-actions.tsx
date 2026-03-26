import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface DataTableRowActionsProps {
  actions: RowAction[];
  testIdPrefix?: string;
  rowId?: string;
}

function DataTableRowActions({
  actions,
  testIdPrefix = "table",
  rowId,
}: DataTableRowActionsProps) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          data-testid={`${testIdPrefix}-row-actions-${rowId ?? "trigger"}`}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-foreground-muted hover:bg-subtle hover:text-foreground"
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[var(--z-dropdown)] min-w-[160px] rounded-md border border-border bg-card p-1 shadow-dropdown"
          align="end"
          sideOffset={4}
        >
          {actions.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              data-testid={`${testIdPrefix}-row-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-label outline-none",
                "transition-colors focus:bg-subtle",
                action.variant === "destructive"
                  ? "text-error focus:text-error"
                  : "text-foreground",
              )}
              onSelect={action.onClick}
            >
              {action.icon && (
                <span className="shrink-0">{action.icon}</span>
              )}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export { DataTableRowActions };
export type { DataTableRowActionsProps, RowAction };
