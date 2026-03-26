import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodObject, ZodRawShape } from "zod";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { handleOpenAutoFocus, handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";
import { Button } from "@/shared/ui/button";
import { FieldRenderer } from "@/shared/components/field-renderer";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import type { FieldConfig } from "@/shared/components/form-modal";

interface FormDrawerProps<T extends Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodObject<ZodRawShape>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void> | void;
  fields: FieldConfig[];
  testIdPrefix?: string;
  renderAfterFields?: (form: UseFormReturn, mode: "create" | "edit") => React.ReactNode;
  mode?: "create" | "edit";
}

function FormDrawer<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  fields,
  testIdPrefix = "form-drawer",
  renderAfterFields,
  mode = "create",
}: FormDrawerProps<T>) {
  const [submitting, setSubmitting] = React.useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as Record<string, unknown>,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = form;

  const watchedValues = watch();

  React.useEffect(() => {
    if (open) {
      reset(defaultValues as Record<string, unknown>);
    }
  }, [open, defaultValues, reset]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setShowUnsavedDialog(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleFormSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      await onSubmit(data as T);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-testid={`${testIdPrefix}-drawer`}
          className={cn(
            "fixed right-0 top-0 z-[var(--z-modal)] h-full w-[480px] max-w-full",
            "border-l border-border bg-card shadow-modal",
            "flex flex-col",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          )}
          onOpenAutoFocus={handleOpenAutoFocus}
          onFocus={handleAutoSelectOnFocus}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6 pb-4">
            <div>
              <Dialog.Title className="text-h4 text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-body-sm text-foreground-muted">
                  {description}
                </Dialog.Description>
              ) : (
                <VisuallyHidden>
                  <Dialog.Description>{title}</Dialog.Description>
                </VisuallyHidden>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                data-testid={`${testIdPrefix}-close`}
                className="rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form Body */}
          <form
            data-testid={`${testIdPrefix}-form`}
            aria-label={title}
            onSubmit={handleFormSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {fields.map((field) => {
                  if (field.visible && !field.visible(watchedValues)) return null;
                  const isDisabled = typeof field.disabled === "function"
                    ? field.disabled(watchedValues)
                    : field.disabled ?? false;
                  return (
                    <FieldRenderer
                      key={field.name}
                      field={field}
                      control={control}
                      errors={errors}
                      testIdPrefix={testIdPrefix}
                      disabled={isDisabled}
                      idPrefix="drawer-field"
                    />
                  );
                })}
              </div>
              {renderAfterFields?.(form, mode)}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border p-6 pt-4">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  data-testid={`${testIdPrefix}-cancel`}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                loading={submitting}
                data-testid={`${testIdPrefix}-submit`}
              >
                Save
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <UnsavedChangesDialog
      open={showUnsavedDialog}
      onCancel={() => setShowUnsavedDialog(false)}
      onDiscard={() => {
        setShowUnsavedDialog(false);
        onOpenChange(false);
      }}
    />
    </>
  );
}

export { FormDrawer };
export type { FormDrawerProps };
