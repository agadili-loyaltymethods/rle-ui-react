import { useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderTree, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { cn } from "@/shared/lib/cn";
import { useModelSchema } from "@/shared/hooks/use-schema";
import { findDescendantIds } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

/** Build a Zod schema from the API's Division dbSchema. */
function buildDivisionZodSchema(
  fields: Record<string, { type: string; required?: boolean; maxlength?: number }>,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  let nameField: z.ZodTypeAny = z.string();
  const maxLen = fields.name?.maxlength ?? 250;
  if (fields.name?.required) {
    nameField = z.string().min(1, t("divisions.nameRequired")).max(maxLen, t("divisions.nameMaxLength", { max: maxLen }));
  } else {
    nameField = z.string().max(maxLen).optional().default("");
  }

  let descField: z.ZodTypeAny = z.string().optional().default("");
  if (fields.description?.required) {
    descField = z.string().min(1, t("divisions.descriptionRequired"));
  }

  return z.object({
    name: nameField,
    description: descField,
    isActive: z.boolean().default(false),
    parent: z.string().nullable().default(null),
    permissions: z.object({
      read: z.boolean().default(true),
      update: z.boolean().default(false),
      create: z.boolean().default(false),
      delete: z.boolean().default(false),
    }),
  });
}

type DivisionFormValues = z.infer<ReturnType<typeof buildDivisionZodSchema>>;

interface DivisionDetailPanelProps {
  division: Division | null;
  allDivisions: Division[];
  isCreateMode: boolean;
  createParentId?: string | null;
  onSave: (data: DivisionFormValues) => Promise<void>;
  onDelete?: () => void;
  onCancelCreate: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  canCreate?: boolean;
  canUpdate?: boolean;
}

export function DivisionDetailPanel({
  division,
  allDivisions,
  isCreateMode,
  createParentId,
  onSave,
  onDelete,
  onCancelCreate,
  isSaving,
  isDeleting,
  onDirtyChange,
  canCreate = true,
  canUpdate = true,
}: DivisionDetailPanelProps) {
  const { t } = useTranslation("settings");
  const { fields: schemaFields } = useModelSchema("Division");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const schema = useMemo(
    () => buildDivisionZodSchema(schemaFields as Record<string, { type: string; required?: boolean; maxlength?: number }>, t),
    [schemaFields, t],
  );

  const isRequired = useMemo(() => {
    const req: Record<string, boolean> = {};
    for (const [key, def] of Object.entries(schemaFields)) {
      req[key] = !!(def as { required?: boolean }).required;
    }
    return req;
  }, [schemaFields]);

  const canSave = isCreateMode ? canCreate : canUpdate;
  const isReadOnly = !canSave;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isDirty, errors },
  } = useForm<DivisionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      isActive: false,
      parent: null,
      permissions: { read: true, update: false, create: false, delete: false },
    },
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (isCreateMode) {
      reset({
        name: "",
        description: "",
        isActive: false,
        parent: createParentId ?? null,
        permissions: {
          read: true,
          update: false,
          create: false,
          delete: false,
        },
      });
      // Focus the name field after reset
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    } else if (division) {
      reset({
        name: division.name,
        description: division.description ?? "",
        isActive: division.isActive ?? false,
        parent: typeof division.parent === "string" ? division.parent : null,
        permissions: {
          read: division.permissions?.read ?? true,
          update: division.permissions?.update ?? false,
          create: division.permissions?.create ?? false,
          delete: division.permissions?.delete ?? false,
        },
      });
    }
  }, [division, isCreateMode, createParentId, reset]);

  const parentOptions = useMemo(() => {
    if (!division && !isCreateMode) return [];
    const excludeIds = division
      ? new Set([
          division._id,
          ...findDescendantIds(division._id, allDivisions),
        ])
      : new Set<string>();

    // Include the current parent even if inactive, to avoid accidental reparenting
    const currentParentId = division
      ? typeof division.parent === "string"
        ? division.parent
        : null
      : null;

    return allDivisions
      .filter(
        (d) =>
          !excludeIds.has(d._id) &&
          (d.isActive || d._id === currentParentId),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [division, isCreateMode, allDivisions]);

  if (!division && !isCreateMode) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-foreground-muted">
        <FolderTree className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-body-sm">{t("divisions.selectOrCreate")}</p>
      </div>
    );
  }

  const { ref: nameRegRef, ...nameRegProps } = register("name");

  const permKeys = ["read", "update", "create", "delete"] as const;
  const permLabelKeys: Record<string, string> = {
    read: "divisions.permRead",
    update: "divisions.permUpdate",
    create: "divisions.permCreate",
    delete: "divisions.permDelete",
  };

  return (
    <form
      data-testid="division-detail-form"
      id="division-detail-form"
      className="flex h-full flex-col"
      onSubmit={handleSubmit(onSave)}
    >
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-h4 text-foreground">
              {isCreateMode ? t("divisions.newDivision") : division?.name}
            </h2>
            {isCreateMode && createParentId && (
              <p className="mt-0.5 text-body-sm text-foreground-muted">
                {t("divisions.under", { name: allDivisions.find((d) => d._id === createParentId)?.name })}
              </p>
            )}
          </div>
          {isCreateMode && (
            <button
              type="button"
              data-testid="cancel-create-button"
              aria-label={t("divisions.cancelCreate")}
              title={t("divisions.discardNew")}
              className="rounded p-1.5 cursor-pointer text-foreground-muted hover:bg-subtle hover:text-foreground"
              onClick={onCancelCreate}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="div-name"
              className="mb-1.5 block text-label text-foreground"
            >
              {t("divisions.name")}
              {isRequired.name && <span className="ml-0.5 text-error">*</span>}
            </label>
            <Input
              id="div-name"
              data-testid="div-name-input"
              ref={(el) => {
                nameRegRef(el);
                (nameInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }}
              {...nameRegProps}
              aria-invalid={!!errors.name}
              disabled={isReadOnly}
            />
            {errors.name && (
              <p className="mt-1 text-caption text-error">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="div-description"
              className="mb-1.5 block text-label text-foreground"
            >
              {t("divisions.description")}
              {isRequired.description && <span className="ml-0.5 text-error">*</span>}
            </label>
            <Input
              id="div-description"
              data-testid="div-description-input"
              {...register("description")}
              disabled={isReadOnly}
            />
            {errors.description && (
              <p className="mt-1 text-caption text-error">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="div-parent-select"
              className="mb-1.5 block text-label text-foreground"
            >
              {t("divisions.parent")}
            </label>
            <Controller
              name="parent"
              control={control}
              render={({ field }) => (
                <select
                  data-testid="parent-select"
                  id="div-parent-select"
                  className={cn(
                    "flex h-9 w-full cursor-pointer rounded-md border border-border bg-card px-3 py-1 text-body-sm text-foreground transition-colors",
                    "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
                    isReadOnly && "pointer-events-none opacity-60",
                  )}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  disabled={isReadOnly}
                >
                  <option value="">{t("divisions.parentNone")}</option>
                  {parentOptions.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}{!d.isActive ? ` (${t("divisions.inactive")})` : ""}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="div-isActive" className="text-label text-foreground">
              {t("divisions.isActive")}
            </label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={isReadOnly}
                />
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-label text-foreground">{t("divisions.permissions")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {permKeys.map((perm) => (
              <div
                key={perm}
                className="flex items-center justify-between rounded-md border border-border p-2.5"
              >
                <span className="text-body-sm text-foreground">
                  {t(permLabelKeys[perm]!)}
                </span>
                <Controller
                  name={`permissions.${perm}`}
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isReadOnly}
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        {!isCreateMode && onDelete && (
          <Button
            type="button"
            variant="destructive"
            data-testid="delete-button"
            aria-label={t("divisions.delete")}
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? t("divisions.deleting") : t("divisions.delete")}
          </Button>
        )}
        <div className={cn(!isCreateMode && onDelete && "ml-auto")}>
          {canSave && (
            <Button
              type="submit"
              data-testid="save-button"
              aria-label={isCreateMode ? t("divisions.create") : t("divisions.save")}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? t("divisions.saving") : isCreateMode ? t("divisions.create") : t("divisions.save")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

export type { DivisionFormValues, DivisionDetailPanelProps };
