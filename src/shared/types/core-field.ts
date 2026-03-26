/**
 * Core field types shared between the server-table framework and shared renderers.
 */

export type CoreFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "enum"
  | "boolean"
  | "ref-select"
  | "ref-multiselect";

export interface CoreFieldBase {
  /** Dot-path field accessor on the entity (e.g. "name", "ext.siteId") */
  field: string;
  /** Display label / column header text */
  label: string;
  /** Data type for rendering */
  type: CoreFieldType;
  /** If true, shown as required in forms */
  required?: boolean;
  /** For enum fields — fetches values via useEnumOptions */
  enumType?: string;
}

export interface CoreFieldDef extends CoreFieldBase {
  /** Input placeholder text */
  placeholder?: string;
  /** Default value for new entities */
  defaultValue?: unknown;
  /** Static options for enum-style dropdowns (used instead of API-loaded options) */
  staticOptions?: string[];
  /** Show this field only when another field has a specific value.
   *  e.g. `{ field: "valueType", value: "Enum" }` */
  visibleWhen?: { field: string; value: unknown };
  /** If true, field is only shown on create (hidden when editing) */
  createOnly?: boolean;
  /** If true, field spans both columns in the 2-column grid */
  fullWidth?: boolean;
  /** Values to exclude from enum options */
  excludeOptions?: string[];
  /** Load enum options dynamically from the enum type selected in this other field */
  enumFromField?: string;
  /** API endpoint to load reference options (for ref-select / ref-multiselect) */
  refEndpoint?: string;
  /** Field on the referenced entity to use as the display label (default: "name") */
  refLabelField?: string;
  /** Filter this field's options to only those selected in another field */
  filterByField?: string;
  /** If true, field is rendered as read-only (disabled) in forms */
  readOnly?: boolean;
}
