import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import type { AuditChange } from "../types/audit-log";

interface AuditChangeListProps {
  changes: AuditChange[];
  action: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "\u2014";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function isComplexValue(value: unknown): boolean {
  return value !== null && value !== undefined && typeof value === "object";
}

export function AuditChangeList({ changes, action }: AuditChangeListProps) {
  const { t } = useTranslation("programs");

  if (!changes || changes.length === 0) {
    return (
      <p className="text-body-sm text-foreground-muted">
        {t("auditLogs.snapshot.noFieldChanges")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border bg-subtle">
            <th className="px-3 py-2 text-left font-medium text-foreground-muted">
              {t("auditLogs.snapshot.field")}
            </th>
            {action !== "CREATE" && (
              <th className="px-3 py-2 text-left font-medium text-foreground-muted">
                {t("auditLogs.snapshot.oldValue")}
              </th>
            )}
            {action !== "CREATE" && action !== "DELETE" && (
              <th className="w-8 px-1 py-2" />
            )}
            {action !== "DELETE" && (
              <th className="px-3 py-2 text-left font-medium text-foreground-muted">
                {t("auditLogs.snapshot.newValue")}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {changes.map((change, i) => (
            <tr
              key={change.field}
              className={i % 2 === 0 ? "bg-card" : "bg-subtle/50"}
            >
              <td className="px-3 py-2 font-mono text-xs text-foreground">
                {change.field}
              </td>
              {action !== "CREATE" && (
                <td className="px-3 py-2">
                  <span className={isComplexValue(change.oldValue) ? "" : "text-error"}>
                    {isComplexValue(change.oldValue) ? (
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-error">
                        {formatValue(change.oldValue)}
                      </pre>
                    ) : (
                      <span className="text-xs">{formatValue(change.oldValue)}</span>
                    )}
                  </span>
                </td>
              )}
              {action !== "CREATE" && action !== "DELETE" && (
                <td className="px-1 py-2 text-center text-foreground-muted">
                  <ArrowRight className="inline h-3.5 w-3.5" />
                </td>
              )}
              {action !== "DELETE" && (
                <td className="px-3 py-2">
                  <span className={isComplexValue(change.newValue) ? "" : "text-success"}>
                    {isComplexValue(change.newValue) ? (
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-success">
                        {formatValue(change.newValue)}
                      </pre>
                    ) : (
                      <span className="text-xs">{formatValue(change.newValue)}</span>
                    )}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
