/**
 * Drawer chrome — right-sliding Radix Dialog with header (title + close button).
 * Consumers provide their own body, tabs, and footer as children.
 */

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { handleOpenAutoFocus, handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";

interface DrawerShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  /** Width class override — defaults to "w-1/2 min-w-[480px]" */
  widthClass?: string;
  /** data-testid for the content panel */
  testId?: string;
}

export function DrawerShell({
  open,
  onOpenChange,
  title,
  children,
  widthClass = "w-1/2 min-w-[480px]",
  testId,
}: DrawerShellProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[var(--z-modal)] bg-black/40
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=open]:duration-300
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            data-[state=closed]:duration-200"
        />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-[var(--z-modal)] h-full max-w-full",
            widthClass,
            "border-l border-border bg-card shadow-modal",
            "flex flex-col",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200",
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={handleOpenAutoFocus}
          onFocus={handleAutoSelectOnFocus}
          data-testid={testId}
        >
          <VisuallyHidden>
            <Dialog.Description>{title}</Dialog.Description>
          </VisuallyHidden>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="text-h4 text-foreground">
              {title}
            </Dialog.Title>
            <button
              type="button"
              data-testid="drawer-shell-close"
              aria-label="Close"
              className="rounded-sm p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Consumer-provided content (tabs, body, footer) */}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
