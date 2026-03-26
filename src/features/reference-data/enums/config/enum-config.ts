import { ListOrdered } from "lucide-react";
import i18n from "@/shared/lib/i18n";
import type { ServerTableConfig } from "../../shared/types/server-table-types";

export const enumConfig: ServerTableConfig = {
  modelName: "Enum",
  endpoint: "enums",
  pageTitle: "Enumerations",
  pageIcon: ListOrdered,
  testIdPrefix: "enums",
  defaultSort: "type",
  populate: ["createdBy", "updatedBy"],
  searchFields: ["type", "label", "value", "desc"],

  coreColumns: [
    { field: "type", label: "Type", type: "text", required: true },
    { field: "label", label: "Label", type: "text", required: true },
    { field: "value", label: "Value", type: "text", required: true },
    { field: "valueType", label: "Value Type", type: "text" },
    { field: "status", label: "Status", type: "text", cellRenderer: "status-badge" },
    { field: "displayType", label: "Display Type", type: "text", defaultVisible: false },
    { field: "context", label: "Context", type: "text", defaultVisible: false },
    { field: "createdAt", label: "Created At", type: "date", defaultVisible: false },
    { field: "updatedAt", label: "Updated At", type: "date", defaultVisible: false },
    { field: "createdBy", label: "Created By", type: "text", cellRenderer: "user", defaultVisible: false },
    { field: "updatedBy", label: "Updated By", type: "text", cellRenderer: "user", defaultVisible: false },
  ],

  coreFormFields: [
    { field: "type", label: "Type", type: "enum", enumType: "EnumType", required: true, fullWidth: true, excludeOptions: ["Action"] },
    { field: "label", label: "Label", type: "text", required: true },
    { field: "value", label: "Value", type: "text", required: true },
    { field: "valueType", label: "Value Type", type: "enum", staticOptions: ["String", "Number", "Boolean", "Date", "Object", "Enum"], required: true, defaultValue: "String" },
    { field: "enumType", label: "Enum Type", type: "enum", enumType: "EnumType", visibleWhen: { field: "valueType", value: "Enum" } },
    { field: "desc", label: "Description", type: "text" },
    { field: "status", label: "Status", type: "enum", staticOptions: ["Active", "Inactive"], defaultValue: "Active" },
    { field: "parType", label: "Parent Type", type: "enum", enumType: "EnumType" },
    { field: "parVal", label: "Parent Value", type: "enum", enumFromField: "parType" },
    { field: "context", label: "Context", type: "text" },
    { field: "data", label: "Initial Value", type: "text", createOnly: true },
  ],

  hiddenDefaults: {
    lang: () => i18n.language,
    displayType: "user",
  },
};
