import { z } from "zod";
import { Settings, Layers } from "lucide-react";
import type { TierLevel } from "@/shared/types/member";
import type { FieldConfig } from "@/shared/components/form-modal";
import type { EntityEditConfig } from "@/shared/components/entity-edit-page";
import { TierLevelEditor } from "../components/tier-level-editor";
import type { UseFormReturn } from "react-hook-form";

const formFields: FieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "primary", label: "Primary", type: "checkbox", placeholder: "Mark as primary tier group" },
];

const tierLevelSchema = z.object({
  name: z.string().min(1, "Level name is required"),
  number: z.coerce.number().min(1),
  threshold: z.coerce.number().min(0).optional(),
  color: z.string().optional(),
  defaultLevel: z.boolean().optional(),
  expiryUnit: z.string().optional(),
  expiryValue: z.coerce.number().min(0).optional(),
  expirationSnapTo: z.string().optional(),
  expiryWarningDays: z.array(z.number()).optional(),
});

export const tierPolicySchema = z.object({
  name: z.string().min(1, "Name is required"),
  primary: z.boolean().optional(),
  levels: z.array(tierLevelSchema).min(1, "At least one level is required"),
});

function TierLevelEditorWrapper({ form }: { form: UseFormReturn }) {
  const levels = (form.watch("levels") as TierLevel[] | undefined) ?? [];

  return (
    <TierLevelEditor
      levels={levels}
      onChange={(newLevels) => form.setValue("levels", newLevels, { shouldDirty: true })}
    />
  );
}

export const tierPolicyEditConfig: EntityEditConfig = {
  entityName: "Tier Group",
  endpoint: "tierpolicies",
  testIdPrefix: "tier",
  listPath: "/program/tier-groups",
  schema: tierPolicySchema as unknown as import("zod").ZodObject<import("zod").ZodRawShape>,
  defaultValues: {
    primary: false,
    levels: [{ name: "Base", number: 1, threshold: 0, color: "#888888", defaultLevel: true }],
  },
  prepareCreate: (data, programId) => ({ ...data, program: programId }),
  tabs: [
    {
      id: "general",
      label: "General",
      icon: Settings,
      fields: formFields,
    },
    {
      id: "levels",
      label: "Levels",
      icon: Layers,
      renderContent: (form) => <TierLevelEditorWrapper form={form} />,
    },
  ],
};
