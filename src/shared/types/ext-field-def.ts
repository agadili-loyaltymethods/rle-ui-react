export type ExtFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "date-time"
  | "object"
  | "array"
  | "url";

export interface ExtFieldDef {
  type: ExtFieldType;
  title: string;
  format?: string;
  required: boolean;
  enum?: string[];
  category: string;
  displayOrder: number;
  showInList: boolean;
  searchable: boolean;
  sortable: boolean;
  defaultValue?: unknown;
  parentField?: string;
  isParent?: boolean;
}

export interface CategoryDef {
  name: string;
  columns: number;
}

export interface EntitySchemaData {
  extRequiredFields: Set<string>;
  coreRequiredFields: Set<string>;
  enumFields: Record<string, string[]>;
  extFields: Record<string, ExtFieldDef>;
  categories: CategoryDef[];
  bulkEditableFields: Set<string>;
  /** Non-fatal warnings from schema fetch (e.g. failed enum or extension schema loads). */
  warnings?: string[];
}

export interface FormTab {
  key: string;
  label: string;
  fields: string[];
  columns: number;
}

export interface TableLayout {
  columns: { key: string; visible: boolean }[];
}
