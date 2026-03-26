import { useTranslation } from "react-i18next";
import { DrawerShell } from "@/shared/components/drawer-shell";
import { Badge } from "@/shared/ui/badge";
import { ActionBadge } from "./action-badge";
import { AuditChangeList } from "./audit-change-list";
import { AuditSnapshotViewer } from "./audit-snapshot-viewer";
import type { AuditLog } from "../types/audit-log";

/** Resolve display name from populated userId object, falling back to userName string. */
function resolveUserName(auditLog: AuditLog): string {
  const u = auditLog.userId;
  if (u && typeof u === "object") {
    return u.empName || u.login || u._id;
  }
  return auditLog.userName || "\u2014";
}

interface AuditLogDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditLog: AuditLog | null;
  onFilterByBatch?: (batchId: string) => void;
}

const ACTION_BG: Record<string, string> = {
  CREATE: "bg-success-light/50",
  UPDATE: "bg-info-light/50",
  DELETE: "bg-error-light/50",
};

function MetadataRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="text-caption text-foreground-muted">{label}</dt>
      <dd className="mt-0.5 text-body-sm text-foreground">{value}</dd>
    </div>
  );
}

export function AuditLogDetailDrawer({
  open,
  onOpenChange,
  auditLog,
  onFilterByBatch,
}: AuditLogDetailDrawerProps) {
  const { t } = useTranslation("programs");

  if (!auditLog) {
    return null;
  }

  const timestamp = new Date(auditLog.timestamp);
  const formattedTime = isNaN(timestamp.getTime())
    ? auditLog.timestamp
    : timestamp.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("auditLogs.detail.title")}
      widthClass="w-2/3 min-w-[640px]"
      testId="audit-log-detail"
    >
      <div className="flex-1 overflow-y-auto">
        {/* Summary banner */}
        <div className={`px-6 py-4 ${ACTION_BG[auditLog.action] ?? "bg-subtle"}`}>
          <div className="flex items-center gap-3">
            <ActionBadge action={auditLog.action} />
            <span className="text-body font-medium text-foreground">
              {auditLog.entityType}
            </span>
            {auditLog.entityName && (
              <span className="text-body text-foreground-secondary">
                &mdash; {auditLog.entityName}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-4 text-body-sm text-foreground-secondary">
            <span>{t("auditLogs.detail.by")} <strong>{resolveUserName(auditLog)}</strong></span>
            {auditLog.userRole && (
              <span className="text-foreground-muted">({auditLog.userRole})</span>
            )}
            <span>{formattedTime}</span>
            <Badge variant="outline">{auditLog.source}</Badge>
          </div>
        </div>

        {/* Metadata */}
        <div className="border-b border-border px-6 py-4">
          <h3 className="mb-3 text-label font-semibold text-foreground">{t("auditLogs.detail.metadata")}</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <MetadataRow label={t("auditLogs.detail.entityId")} value={auditLog.entityId} />
            <MetadataRow label={t("auditLogs.detail.version")} value={String(auditLog.version)} />
            <MetadataRow label={t("auditLogs.detail.changeReason")} value={auditLog.changeReason} />
            <MetadataRow label={t("auditLogs.detail.ticketReference")} value={auditLog.ticketReference} />
            <MetadataRow label={t("auditLogs.detail.batchId")} value={auditLog.batchId} />
            <MetadataRow label={t("auditLogs.detail.parentAuditId")} value={auditLog.parentAuditId} />
          </dl>
        </div>

        {/* Changes */}
        {auditLog.action === "UPDATE" && auditLog.changes?.length > 0 && (
          <div className="border-b border-border px-6 py-4">
            <h3 className="mb-3 text-label font-semibold text-foreground">
              {t("auditLogs.detail.changesCount", { count: auditLog.changes.length })}
            </h3>
            <AuditChangeList changes={auditLog.changes} action={auditLog.action} />
          </div>
        )}

        {/* Snapshots */}
        <div className="px-6 py-4">
          <h3 className="mb-3 text-label font-semibold text-foreground">{t("auditLogs.detail.snapshots")}</h3>
          <AuditSnapshotViewer
            before={auditLog.before}
            after={auditLog.after}
            action={auditLog.action}
          />
        </div>

        {/* Related entries link */}
        {auditLog.batchId && onFilterByBatch && (
          <div className="border-t border-border px-6 py-3">
            <button
              type="button"
              data-testid="audit-detail-view-related-entries-btn"
              aria-label="View related audit log entries"
              className="text-body-sm text-brand hover:underline cursor-pointer"
              onClick={() => {
                onFilterByBatch(auditLog.batchId!);
                onOpenChange(false);
              }}
            >
              {t("auditLogs.detail.viewRelatedEntries")}
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
