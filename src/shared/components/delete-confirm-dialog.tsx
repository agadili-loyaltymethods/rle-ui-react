import { ConfirmDialog } from "@/shared/components/confirm-dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  /** Name of the item being deleted — shown in the description if no custom description is given. */
  itemName?: string;
  isPending?: boolean;
  confirmLabel?: string;
  "data-testid"?: string;
}

/**
 * Delete confirmation dialog.
 *
 * Thin wrapper around ConfirmDialog with destructive defaults.
 * Pass `itemName` for the default description, or provide a custom `description`.
 */
function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete",
  description,
  itemName,
  isPending = false,
  confirmLabel = "Delete",
  "data-testid": testId,
}: DeleteConfirmDialogProps) {
  const resolvedDescription =
    description ??
    (itemName
      ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
      : "Are you sure you want to delete this item? This action cannot be undone.");

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={resolvedDescription}
      isPending={isPending}
      confirmLabel={confirmLabel}
      confirmVariant="destructive"
      data-testid={testId}
    />
  );
}

export { DeleteConfirmDialog };
export type { DeleteConfirmDialogProps };
