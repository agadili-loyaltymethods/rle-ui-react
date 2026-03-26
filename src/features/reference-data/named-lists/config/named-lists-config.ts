import { List } from "lucide-react";
import type { ServerTableConfig } from "../../shared/types/server-table-types";

export const namedListsConfig: ServerTableConfig = {
  modelName: "NamedList",
  endpoint: "namedlists",
  pageTitle: "Named Lists",
  singularTitle: "Named List",
  pageIcon: List,
  testIdPrefix: "namedlist",
  defaultSort: "name",
  searchFields: ["name", "modelType", "type"],

  coreColumns: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "modelType", label: "Model Type", type: "text" },
    { field: "type", label: "Type", type: "text" },
    { field: "count", label: "Count", type: "number" },
    {
      field: "refreshDate",
      label: "Refresh Date",
      type: "date",
    },
    {
      field: "createdAt",
      label: "Created At",
      type: "date",
      defaultVisible: false,
    },
    {
      field: "updatedAt",
      label: "Updated At",
      type: "date",
      defaultVisible: false,
    },
  ],

  coreFormFields: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "type", label: "Type", type: "enum", enumType: "NamedListType", required: true },
  ],
};
