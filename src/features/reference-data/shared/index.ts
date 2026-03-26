// Hooks
export { useEntitySchema } from "./hooks/use-entity-schema";
export { useServerTable } from "./hooks/use-server-table";
export { useBulkOperations } from "./hooks/use-bulk-operations";

// Components
export { ServerTablePage } from "./components/server-table-page";
export { EntityFormDrawer } from "./components/entity-form-drawer";
export { BulkEditDrawer } from "./components/bulk-edit-drawer";
export { BulkActionBar } from "@/shared/components/bulk-action-bar";
export { ExtFieldRenderer } from "@/shared/components/ext-field-renderer";
export { ExtTabBody } from "./components/ext-tab-body";

// Utilities
export { buildColumns, getColumnValue, formatCellValue } from "./lib/build-columns";
export type { ColumnDescriptor } from "./lib/build-columns";
export {
  buildFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  flattenRhfErrors,
  buildEntityFormZodSchema,
  buildEntityDefaultValues,
} from "./lib/form-tab-helpers";
export {
  flattenNested,
  unflattenDotPaths,
  summarizeNested,
} from "@/shared/lib/dot-path";

// Types
export type {
  ServerTableConfig,
  CoreColumnDef,
  CoreFieldDef,
  CoreFieldType,
  ExtFieldType,
  DbFieldSchema,
  ServerEntitySchemaData,
  ExtFieldDef,
  CategoryDef,
  FormTab,
} from "./types/server-table-types";
export type { ColumnType } from "./lib/build-columns";
