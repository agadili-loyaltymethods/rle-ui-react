import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodObject, ZodRawShape } from "zod";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { handleOpenAutoFocus, handleAutoSelectOnFocus } from "@/shared/lib/focus-utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";

type FieldType =
  | "text"
  | "number"
  | "date"
  | "date-never"
  | "select"
  | "searchable-select"
  | "multiselect"
  | "checkbox"
  | "textarea"
  | "searchable-multiselect"
  | "warning-days";

interface FieldOption {
  value: string;
  label: string;
}

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  placeholder?: string;
  required?: boolean;
  visible?: (values: Record<string, unknown>) => boolean;
  disabled?: boolean | ((values: Record<string, unknown>) => boolean);
  /** When used in a multi-column grid, span full width. */
  fullWidth?: boolean;
}

interface FormModalProps<T extends Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodObject<ZodRawShape>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void> | void;
  fields: FieldConfig[];
  testIdPrefix?: string;
}

function FormModal<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  fields,
  testIdPrefix = "form-modal",
}: FormModalProps<T>) {
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

  // Reset form when dialog opens with new defaults
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
          data-testid={`${testIdPrefix}-dialog`}
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-card shadow-modal",
            "max-h-[85vh] overflow-y-auto",
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

          {/* Form */}
          <form
            data-testid={`${testIdPrefix}-form`}
            aria-label={title}
            onSubmit={handleFormSubmit}
            className="p-6"
          >
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
                  />
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end gap-3">
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

/* ── Field Renderer ── */

interface FieldRendererProps {
  field: FieldConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  testIdPrefix: string;
  disabled?: boolean;
}

function FieldRenderer({
  field,
  control,
  errors,
  testIdPrefix,
  disabled = false,
}: FieldRendererProps) {
  const error = errors[field.name];
  const errorMessage = error?.message as string | undefined;

  return (
    <div>
      <label
        htmlFor={`field-${field.name}`}
        className="mb-1.5 block text-label font-medium text-foreground"
      >
        {field.label}
        {field.required && <span className="ml-0.5 text-error">*</span>}
      </label>

      <Controller
        name={field.name}
        control={control}
        render={({ field: formField }) => {
          switch (field.type) {
            case "text":
            case "number":
            case "date":
              return (
                <Input
                  id={`field-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  error={!!error}
                  disabled={disabled}
                  {...formField}
                  value={(formField.value as string | number) ?? ""}
                  onChange={(e) => {
                    const val =
                      field.type === "number"
                        ? e.target.valueAsNumber
                        : e.target.value;
                    formField.onChange(val);
                  }}
                />
              );

            case "textarea":
              return (
                <textarea
                  id={`field-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  rows={3}
                  className={cn(
                    "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                    "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                    "border border-[var(--input-border)]",
                    "transition-colors duration-[var(--duration-fast)]",
                    "placeholder:text-foreground-muted",
                    "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                    "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
                    error &&
                      "border-error focus-visible:border-error focus-visible:ring-error",
                  )}
                  {...formField}
                  value={(formField.value as string) ?? ""}
                />
              );

            case "select":
              return (
                <select
                  id={`field-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  disabled={disabled}
                  className={cn(
                    "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                    "h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)]",
                    "border border-[var(--input-border)]",
                    "transition-colors duration-[var(--duration-fast)]",
                    "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    error &&
                      "border-error focus-visible:border-error focus-visible:ring-error",
                  )}
                  {...formField}
                  value={(formField.value as string) ?? ""}
                >
                  <option value="">
                    {field.placeholder ?? "Select..."}
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              );

            case "multiselect":
              return (
                <select
                  id={`field-${field.name}`}
                  data-testid={`${testIdPrefix}-field-${field.name}`}
                  multiple
                  disabled={disabled}
                  className={cn(
                    "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
                    "min-h-[80px] rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
                    "border border-[var(--input-border)]",
                    "transition-colors duration-[var(--duration-fast)]",
                    "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    error &&
                      "border-error focus-visible:border-error focus-visible:ring-error",
                  )}
                  value={(formField.value as string[]) ?? []}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (opt) => opt.value,
                    );
                    formField.onChange(selected);
                  }}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              );

            case "checkbox":
              return (
                <label className={cn("flex items-center gap-2", !disabled && "cursor-pointer")}>
                  <input
                    id={`field-${field.name}`}
                    data-testid={`${testIdPrefix}-field-${field.name}`}
                    type="checkbox"
                    disabled={disabled}
                    className="h-4 w-4 rounded-sm border-border-strong accent-brand disabled:opacity-50"
                    checked={(formField.value as boolean) ?? false}
                    onChange={(e) => formField.onChange(e.target.checked)}
                  />
                  <span className="text-body-sm text-foreground">
                    {field.placeholder}
                  </span>
                </label>
              );

            default:
              return <></>;
          }
        }}
      />

      {errorMessage && (
        <p className="mt-1 text-caption text-error">{errorMessage}</p>
      )}
    </div>
  );
}

export { FormModal };
export type { FormModalProps, FieldConfig, FieldOption, FieldType };
