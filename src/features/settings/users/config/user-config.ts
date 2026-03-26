import { Users } from "lucide-react";
import type { ServerTableConfig } from "@/features/reference-data/shared/types/server-table-types";

export const userConfig: ServerTableConfig = {
  modelName: "User",
  endpoint: "users",
  pageTitle: "Users",
  singularTitle: "User",
  pageIcon: Users,
  testIdPrefix: "users",
  defaultSort: "login",
  populate: ["org"],
  searchFields: ["login", "email"],

  coreColumns: [
    { field: "login", label: "Login", type: "text", required: true },
    { field: "email", label: "Email", type: "text" },
    { field: "org", label: "Org", type: "text", cellRenderer: "named-ref" },
    { field: "active", label: "Active", type: "boolean" },
    { field: "blocked", label: "Blocked", type: "boolean" },
    { field: "tokenExpirationTime", label: "Token Expiration", type: "number", defaultVisible: false },
    { field: "sessMultiFlag", label: "Multi Session", type: "boolean", defaultVisible: false },
    { field: "sessMgmtFlag", label: "Session Mgmt", type: "boolean", defaultVisible: false },
    { field: "limitsEnabled", label: "Limits Enabled", type: "boolean", defaultVisible: false },
    { field: "divisionCheckEnabled", label: "Division Check", type: "boolean", defaultVisible: false },
    { field: "empNumber", label: "Emp Number", type: "text", defaultVisible: false },
    { field: "division", label: "Division", type: "text", defaultVisible: false },
    { field: "uberFlag", label: "Super Admin", type: "boolean", defaultVisible: false },
    { field: "oidcUser", label: "OIDC User", type: "boolean", defaultVisible: false },
    { field: "lastAccess", label: "Last Access", type: "date", defaultVisible: false },
    { field: "createdAt", label: "Created At", type: "date", defaultVisible: false },
    { field: "updatedAt", label: "Updated At", type: "date", defaultVisible: false },
  ],

  coreFormFields: [
    // ── Row 1: identity fields ──
    { field: "login", label: "Login", type: "text", required: true },
    { field: "email", label: "Email", type: "text" },

    // ── Row 2-3: text / number fields ──
    { field: "empNumber", label: "Employee Number", type: "text" },
    { field: "tokenExpirationTime", label: "Token Expiration (minutes)", type: "number" },

    // ── Row 4+: boolean pairs (switches align with each other) ──
    { field: "active", label: "Active", type: "boolean", defaultValue: true },
    { field: "blocked", label: "Blocked", type: "boolean" },
    { field: "uberFlag", label: "Super Admin", type: "boolean", readOnly: true },
    { field: "oidcUser", label: "OIDC User", type: "boolean" },
    { field: "sessMgmtFlag", label: "Session Management", type: "boolean" },
    { field: "sessMultiFlag", label: "Multi Session", type: "boolean" },
    { field: "limitsEnabled", label: "Limits Enabled", type: "boolean" },
    { field: "divisionCheckEnabled", label: "Division Check Enabled", type: "boolean" },

    // ── Division fields ──
    {
      field: "possibleDivisions",
      label: "Possible Divisions",
      type: "ref-multiselect",
      refEndpoint: "divisions",
    },
    {
      field: "division",
      label: "Division",
      type: "ref-select",
      refEndpoint: "divisions",
      filterByField: "possibleDivisions",
    },
  ],
};
