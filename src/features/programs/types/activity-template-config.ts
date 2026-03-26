import { z } from "zod";

// ── Interfaces ──

export interface ActivityTemplatesMeta {
  types: ActivityTemplateConfig[];
}

export interface ActivityTemplateConfig {
  id: string;
  fieldName: string;
  typeValues: string[];
  label: string;
  description?: string;
  divisions?: string[];
  extensions: ExtensionFieldDef[];
  publishedFields?: string[];
  reasonCodes: string[];
  validationRules: ValidationRuleDef[];
  calculatedFields: CalculatedFieldDef[];
}

export interface ExtensionFieldDef {
  id: string;
  name: string;
  label: string;
  type: ExtensionFieldType;
  required?: boolean;
  defaultValue?: string;
  options?: string[];
  description?: string;
}

export type ExtensionFieldType = "string" | "number" | "date" | "boolean" | "select";

export interface ValidationRuleDef {
  id: string;
  type: ValidationRuleType;
  /** Single field for min/max/pattern; array for required/conditional_required. Not used for allowed_channels. */
  field: string | string[];
  value?: string | number;
  conditionField?: string;
  conditionOperator?: ConditionOperator;
  conditionValue?: string;
  message?: string;
  /** Include/exclude mode for allowed_channels rule type. */
  mode?: "include" | "exclude";
  /** Selected channel values for allowed_channels rule type. */
  channels?: string[];
}

export type ValidationRuleType = "required" | "min" | "max" | "pattern" | "conditional_required" | "allowed_channels";
export type ConditionOperator = "equals" | "not_equals" | "exists" | "gt" | "lt";

// ── Calculated Fields ──

export interface CalcFilter {
  field: string;
  operator: CalcFilterOperator;
  value: string | number | string[];
}

export type CalcFilterOperator = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "nin";

export type RoundingMode = "halfUp" | "halfEven" | "floor" | "ceil" | "none";

export interface CalculatedFieldDef {
  id: string;
  name: string;
  label: string;
  description?: string;
  kind: "scalar" | "aggregate";
  expression: string;
  source?: "lineItems" | "tenderItems";
  aggregation?: "sum" | "count" | "min" | "max" | "avg";
  filters?: CalcFilter[];
  groupBy?: string;
  roundingDecimals?: number;
  roundingMode?: RoundingMode;
}

// ── Zod Schemas ──

export const extensionFieldSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, "Field name is required")
    .regex(/^[a-zA-Z_]\w*$/, "Must be a valid identifier (letters, numbers, underscores)"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(["string", "number", "date", "boolean", "select"]),
  required: z.boolean().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const validationRuleSchema = z.object({
  id: z.string(),
  type: z.enum(["required", "min", "max", "pattern", "conditional_required", "allowed_channels"]),
  field: z.union([
    z.string().min(1, "Target field is required"),
    z.array(z.string()).min(1, "At least one target field is required"),
  ]),
  value: z.union([z.string(), z.number()]).optional(),
  conditionField: z.string().optional(),
  conditionOperator: z.enum(["equals", "not_equals", "exists", "gt", "lt"]).optional(),
  conditionValue: z.string().optional(),
  message: z.string().optional(),
  mode: z.enum(["include", "exclude"]).optional(),
  channels: z.array(z.string()).optional(),
});

export const calcFilterSchema = z.object({
  field: z.string().min(1, "Filter field is required"),
  operator: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "in", "nin"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const calculatedFieldSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[a-zA-Z_]\w*$/, "Must be a valid identifier"),
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  kind: z.enum(["scalar", "aggregate"]),
  expression: z.string().min(1, "Expression is required"),
  source: z.enum(["lineItems", "tenderItems"]).optional(),
  aggregation: z.enum(["sum", "count", "min", "max", "avg"]).optional(),
  filters: z.array(calcFilterSchema).optional(),
  groupBy: z.string().optional(),
  roundingDecimals: z.number().int().min(0).max(6).optional(),
  roundingMode: z.enum(["halfUp", "halfEven", "floor", "ceil", "none"]).optional(),
});

export const activityTemplateConfigSchema = z.object({
  id: z.string(),
  fieldName: z
    .string()
    .min(1, "Namespace is required")
    .regex(/^[a-zA-Z_]\w*$/, "Must be a valid identifier (letters, numbers, underscores)"),
  typeValues: z.array(z.string()).min(1, "At least one activity type is required"),
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  divisions: z.array(z.string()).optional(),
  extensions: z.array(extensionFieldSchema),
  publishedFields: z.array(z.string()).optional(),
  reasonCodes: z.array(z.string()),
  validationRules: z.array(validationRuleSchema),
  calculatedFields: z.array(calculatedFieldSchema),
});

// ── Constants ──

export const EXTENSION_FIELD_TYPE_OPTIONS = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
] as const;

export const VALIDATION_RULE_TYPE_OPTIONS = [
  { value: "required", label: "Required" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "pattern", label: "Pattern" },
  { value: "conditional_required", label: "Conditional Required" },
  { value: "allowed_channels", label: "Allowed Channels" },
] as const;

export const CHANNEL_MODE_OPTIONS = [
  { value: "include", label: "Allow" },
  { value: "exclude", label: "Disallow" },
] as const;

export const CONDITION_OPERATOR_OPTIONS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "exists", label: "Exists" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
] as const;

export const CALC_KIND_OPTIONS = [
  { value: "scalar", label: "Single Value" },
  { value: "aggregate", label: "Aggregate" },
] as const;

export const CALC_AGGREGATION_OPTIONS = [
  { value: "sum", label: "Sum" },
  { value: "count", label: "Count" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "avg", label: "Average" },
] as const;

export const CALC_SOURCE_OPTIONS = [
  { value: "lineItems", label: "Line Items" },
  { value: "tenderItems", label: "Tender Items" },
] as const;

export const CALC_ROUNDING_MODE_OPTIONS = [
  { value: "halfUp", label: "Half Up" },
  { value: "halfEven", label: "Half Even (Banker's)" },
  { value: "floor", label: "Floor" },
  { value: "ceil", label: "Ceiling" },
  { value: "none", label: "None" },
] as const;

export const CALC_FILTER_OPERATOR_OPTIONS = [
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "lte", label: "Less or Equal" },
  { value: "in", label: "In" },
  { value: "nin", label: "Not In" },
] as const;
