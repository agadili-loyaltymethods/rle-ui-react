import { MapPin } from "lucide-react";
import type { ServerTableConfig } from "../../shared/types/server-table-types";

export const locationConfig: ServerTableConfig = {
  modelName: "Location",
  endpoint: "locations",
  pageTitle: "Locations",
  pageIcon: MapPin,
  testIdPrefix: "locations",
  defaultSort: "name",
  populate: ["createdBy", "updatedBy"],
  searchFields: ["name", "city", "state", "country", "number"],

  coreColumns: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "number", label: "Number", type: "text" },
    { field: "city", label: "City", type: "text" },
    { field: "state", label: "State", type: "text" },
    { field: "country", label: "Country", type: "text" },
    { field: "zipCode", label: "Zip Code", type: "text", defaultVisible: false },
    { field: "timeZone", label: "Time Zone", type: "enum", enumType: "timeZone", defaultVisible: false },
    { field: "status", label: "Status", type: "enum", enumType: "LocationStatusType", cellRenderer: "status-badge" },
    { field: "createdAt", label: "Created At", type: "date", defaultVisible: false },
    { field: "updatedAt", label: "Updated At", type: "date", defaultVisible: false },
    { field: "createdBy", label: "Created By", type: "text", cellRenderer: "user", defaultVisible: false },
    { field: "updatedBy", label: "Updated By", type: "text", cellRenderer: "user", defaultVisible: false },
  ],

  coreFormFields: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "number", label: "Number", type: "text" },
    { field: "desc", label: "Description", type: "textarea" },
    { field: "city", label: "City", type: "text" },
    { field: "state", label: "State", type: "text" },
    { field: "country", label: "Country", type: "text" },
    { field: "zipCode", label: "Zip Code", type: "text" },
    { field: "timeZone", label: "Time Zone", type: "enum", enumType: "timeZone" },
    { field: "status", label: "Status", type: "enum", enumType: "LocationStatusType", defaultValue: "Active" },
  ],
};
