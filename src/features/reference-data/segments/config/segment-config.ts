import { Layers } from "lucide-react";
import type { ServerTableConfig } from "../../shared/types/server-table-types";

export const segmentConfig: ServerTableConfig = {
  modelName: "Segment",
  endpoint: "segments",
  pageTitle: "Segments",
  pageIcon: Layers,
  testIdPrefix: "segments",
  defaultSort: "name",
  populate: ["createdBy", "updatedBy"],
  searchFields: ["name", "description", "type"],

  coreColumns: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "description", label: "Description", type: "text" },
    { field: "type", label: "Type", type: "text" },
    { field: "createdAt", label: "Created At", type: "date", defaultVisible: false },
    { field: "updatedAt", label: "Updated At", type: "date", defaultVisible: false },
    { field: "createdBy", label: "Created By", type: "text", cellRenderer: "user", defaultVisible: false },
    { field: "updatedBy", label: "Updated By", type: "text", cellRenderer: "user", defaultVisible: false },
  ],

  coreFormFields: [
    { field: "name", label: "Name", type: "text", required: true, fullWidth: true },
    { field: "description", label: "Description", type: "textarea", fullWidth: true },
    { field: "type", label: "Type", type: "text", fullWidth: true },
  ],
};
