import type { TFunction } from "i18next";
import type { ColumnDescriptor } from
  "@/features/reference-data/shared/lib/build-columns";
import { buildAuditLogConfig, auditLogConfig } from "./audit-log-config";

/** Build column descriptors from audit log config with i18n labels. */
export function buildAuditLogColumns(t?: TFunction): ColumnDescriptor[] {
  const config = t ? buildAuditLogConfig(t) : auditLogConfig;
  return config.coreColumns.map((col) => ({
    key: col.field,
    label: col.label,
    source: "core" as const,
    corePath: col.field,
    type: col.type,
    sortable: true,
    defaultVisible: col.defaultVisible !== false,
    cellRenderer: col.cellRenderer,
    filterable: col.filterable !== false,
  }));
}
