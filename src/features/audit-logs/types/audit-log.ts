/** Single field-level change recorded in an audit entry. */
export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/** Audit log document returned by GET /api/auditlogs. */
export interface AuditLog {
  _id: string;
  org: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: AuditChange[];
  userId: string | { _id: string; login?: string; empName?: string } | null;
  userName: string;
  userRole: string;
  timestamp: string;
  source: "API" | "CASCADE" | "BATCH" | "BACKGROUND";
  changeReason?: string;
  ticketReference?: string;
  batchId?: string;
  parentAuditId?: string;
  version: number;
}

/** AuditLog extended with index signature for ServerTable compatibility. */
export type AuditLogRecord = AuditLog & Record<string, unknown>;
