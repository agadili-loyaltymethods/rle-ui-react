import { FileText } from "lucide-react";
import type { TFunction } from "i18next";
import type { ServerTableConfig } from
  "@/features/reference-data/shared/types/server-table-types";

export function buildAuditLogConfig(t: TFunction): ServerTableConfig {
  return {
    modelName: "AuditLog",
    endpoint: "auditlogs",
    pageTitle: t("auditLogs.title"),
    singularTitle: t("auditLogs.title"),
    pageIcon: FileText,
    testIdPrefix: "audit-logs",
    defaultSort: "-timestamp",
    searchFields: ["entityName", "entityType"],
    populate: ["userId"],
    select: "userId.login",

    coreColumns: [
      {
        field: "timestamp",
        label: t("auditLogs.columns.timestamp"),
        type: "text",
        cellRenderer: "date-time",
      },
      {
        field: "entityType",
        label: t("auditLogs.columns.entityType"),
        type: "text",
      },
      {
        field: "entityName",
        label: t("auditLogs.columns.entityName"),
        type: "text",
      },
      {
        field: "action",
        label: t("auditLogs.columns.action"),
        type: "text",
        cellRenderer: "action-badge",
      },
      {
        field: "userId",
        label: t("auditLogs.columns.userName"),
        type: "text",
        cellRenderer: "user",
      },
      {
        field: "source",
        label: t("auditLogs.columns.source"),
        type: "text",
        cellRenderer: "source-badge",
        defaultVisible: false,
      },
      {
        field: "changeReason",
        label: t("auditLogs.columns.changeReason"),
        type: "text",
        defaultVisible: false,
      },
      {
        field: "ticketReference",
        label: t("auditLogs.columns.ticketReference"),
        type: "text",
        defaultVisible: false,
      },
      {
        field: "changes",
        label: t("auditLogs.columns.fieldsChanged"),
        type: "text",
        cellRenderer: "change-count",
        filterable: false,
      },
    ],

    coreFormFields: [],
  };
}

/** @deprecated Use buildAuditLogConfig(t) instead */
export const auditLogConfig: ServerTableConfig = {
  modelName: "AuditLog",
  endpoint: "auditlogs",
  pageTitle: "Audit Trail",
  singularTitle: "Audit Trail Entry",
  pageIcon: FileText,
  testIdPrefix: "audit-logs",
  defaultSort: "-timestamp",
  searchFields: ["entityName", "entityType"],
  populate: ["userId"],
  select: "userId.login",

  coreColumns: [
    { field: "timestamp", label: "Date/Time", type: "text", cellRenderer: "date-time" },
    { field: "entityType", label: "Entity Type", type: "text" },
    { field: "entityName", label: "Entity Name", type: "text" },
    { field: "action", label: "Action", type: "text", cellRenderer: "action-badge" },
    { field: "userId", label: "User", type: "text", cellRenderer: "user" },
    { field: "source", label: "Source", type: "text", cellRenderer: "source-badge", defaultVisible: false },
    { field: "changeReason", label: "Change Reason", type: "text", defaultVisible: false },
    { field: "ticketReference", label: "Ticket", type: "text", defaultVisible: false },
    { field: "changes", label: "Fields Changed", type: "text", cellRenderer: "change-count", filterable: false },
  ],

  coreFormFields: [],
};
