import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  description?: string;
}

/**
 * Reusable "You have unsaved changes" confirmation dialog.
 *
 * Use for both explicit cancel actions and route-blocker navigation guards.
 * The cancel/keep-editing action maps to `onCancel`; leaving maps to `onDiscard`.
 */
function UnsavedChangesDialog({
  open,
  onCancel,
  onDiscard,
  description = "You have unsaved changes that will be lost. Are you sure you want to leave?",
}: UnsavedChangesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-[var(--modal-width-sm)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-modal">
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-h4 text-foreground">
              Unsaved Changes
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                data-testid="unsaved-changes-close"
                className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-body-sm text-foreground-muted">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Keep Editing
            </Button>
            <Button variant="destructive" onClick={onDiscard}>
              Discard Changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { UnsavedChangesDialog };
export type { UnsavedChangesDialogProps };
