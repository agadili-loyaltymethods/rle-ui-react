/** Mongoose schema field type strings returned by the validation schema API. */
export type SchemaFieldType =
  | "string"
  | "number"
  | "date"
  | "objectid"
  | "boolean"
  | "array"
  | "object"
  | "mixed"
  | "buffer"
  | "map";

/** Metadata for a single field in a Mongoose model schema. */
export interface SchemaFieldDef {
  type: SchemaFieldType;
  required?: boolean;
  maxlength?: number;
  minlength?: number;
  ref?: string;
  enum?: string[];
  default?: unknown;
  match?: string;
  /** For array subdocs, nested field definitions keyed by "0". */
  [key: string]: unknown;
}

/** One model's block in the validation schema response. */
export interface ModelSchemaBlock {
  dbSchema: Record<string, SchemaFieldDef>;
  extSchema: Record<string, unknown> | null;
  extUISchema: Record<string, unknown> | null;
}

/** Full response shape from GET /api/schema/validation. */
export type ValidationSchemaResponse = Record<string, ModelSchemaBlock>;

/** Dropdown-ready option for a model field. */
export interface FieldOption {
  value: string;
  label: string;
  fieldType: SchemaFieldType;
}
