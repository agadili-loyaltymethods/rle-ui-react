import { useState, useMemo, useCallback } from "react";
import { useServerTable } from
  "@/features/reference-data/shared/hooks/use-server-table";
import { auditLogConfig } from "../config/audit-log-config";
import type { AuditLogRecord } from "../types/audit-log";

export type DatePreset = "1m" | "3m" | "6m" | "1y" | "all" | "custom";

export interface AuditLogFilters {
  entityType: string;
  action: string;
  source: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  batchId: string;
}

const EMPTY_FILTERS: AuditLogFilters = {
  entityType: "",
  action: "",
  source: "",
  datePreset: "all",
  dateFrom: "",
  dateTo: "",
  batchId: "",
};

export function useAuditLogTable() {
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_FILTERS);

  const setFilter = useCallback(
    (key: keyof AuditLogFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearAllFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const additionalQuery = useMemo(() => {
    const q: Record<string, unknown> = {};
    if (filters.entityType) q.entityType = filters.entityType;
    if (filters.action) q.action = filters.action;
    if (filters.source) q.source = filters.source;
    if (filters.batchId) q.batchId = filters.batchId;
    if (filters.dateFrom || filters.dateTo) {
      const ts: Record<string, string> = {};
      if (filters.dateFrom) ts.$gte = filters.dateFrom + "T00:00:00.000Z";
      if (filters.dateTo) ts.$lte = filters.dateTo + "T23:59:59.999Z";
      q.timestamp = ts;
    }
    return Object.keys(q).length > 0 ? q : undefined;
  }, [filters]);

  const table = useServerTable<AuditLogRecord>(auditLogConfig, additionalQuery);

  const { onSearchChange } = table;

  const filterByBatch = useCallback(
    (batchId: string) => {
      setFilters({ ...EMPTY_FILTERS, batchId });
      onSearchChange("");
    },
    [onSearchChange],
  );

  return { ...table, filters, setFilter, clearAllFilters, filterByBatch };
}
