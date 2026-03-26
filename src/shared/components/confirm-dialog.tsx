import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isPending?: boolean;
  confirmLabel?: string;
  /** Button variant for the confirm action (defaults to "default"). */
  confirmVariant?: "default" | "destructive";
  "data-testid"?: string;
}

/**
 * General-purpose confirmation dialog.
 *
 * Use directly for non-destructive confirmations (bulk edit, etc.)
 * or via DeleteConfirmDialog for delete-specific confirmations.
 */
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isPending = false,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  "data-testid": testId,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-[var(--modal-width-sm)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-modal">
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-h4 text-foreground">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                data-testid="confirm-dialog-close"
                className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
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
            <Dialog.Close asChild>
              <Button variant="ghost">Cancel</Button>
            </Dialog.Close>
            <Button
              variant={confirmVariant}
              loading={isPending}
              onClick={onConfirm}
              data-testid={testId}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
