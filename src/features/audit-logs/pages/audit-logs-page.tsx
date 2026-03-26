import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FileText, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import { PageHeader } from "@/shared/components/page-header";
import { SearchBar } from "@/shared/components/search-bar";
import { ServerTable } from "@/shared/components/server-table";
import { TablePagination } from "@/shared/components/table-pagination";
import { ColumnChooserDropdown } from "@/shared/components/column-chooser-dropdown";
import { useColumnChooser } from "@/shared/hooks/use-column-chooser";
import { useAuditLogTable } from "../hooks/use-audit-logs";
import { buildAuditLogColumns } from "../config/audit-log-columns";
import { ActionBadge } from "../components/action-badge";
import { AuditLogToolbar } from "../components/audit-log-toolbar";
import { AuditLogDetailDrawer } from "../components/audit-log-detail-drawer";
import type { AuditLogRecord } from "../types/audit-log";

// ── Cell renderers ──────────────────────────────────────────────────────────

function renderDateTime(value: unknown): ReactNode {
  if (value == null) return "\u2014";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function renderActionBadge(value: unknown): ReactNode {
  return <ActionBadge action={String(value ?? "")} />;
}

const SOURCE_VARIANT: Record<string, "secondary" | "outline"> = {
  API: "secondary",
  CASCADE: "outline",
  BATCH: "outline",
  BACKGROUND: "outline",
};

function renderSourceBadge(value: unknown): ReactNode {
  const src = String(value ?? "");
  return <Badge variant={SOURCE_VARIANT[src] ?? "outline"}>{src}</Badge>;
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const { t } = useTranslation("programs");
  const table = useAuditLogTable();

  // ── Cell renderers (inside component for i18n access) ──────────────
  const cellRenderers = useMemo<Record<string, (value: unknown, row: AuditLogRecord) => ReactNode>>(() => ({
    "date-time": (v) => renderDateTime(v),
    "action-badge": (v) => renderActionBadge(v),
    "source-badge": (v) => renderSourceBadge(v),
    "change-count": (v) => {
      if (!Array.isArray(v)) return "\u2014";
      if (v.length === 0) return "\u2014";
      return (
        <Badge variant="secondary">
          {t("auditLogs.changeCount.fields", { count: v.length })}
        </Badge>
      );
    },
  }), [t]);

  // ── Columns + column chooser ────────────────────────────────────────
  const columns = useMemo(() => buildAuditLogColumns(t), [t]);

  const { columnOrder, activeColumns, chooser } = useColumnChooser({
    columns,
    schemaReady: true,
  });

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.key, c])),
    [columns],
  );

  // ── Detail drawer state ─────────────────────────────────────────────
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleRowClick = useCallback((entity: AuditLogRecord) => {
    setSelectedLog(entity);
    setDrawerOpen(true);
  }, []);

  const handleFilterByBatch = useCallback(
    (batchId: string) => table.filterByBatch(batchId),
    [table],
  );

  // ── Pagination (1-indexed for TablePagination) ──────────────────────
  const page = table.pageIndex + 1;
  const handlePageChange = useCallback(
    (p: number) => table.onPageChange(p - 1),
    [table],
  );

  // ── Row actions (view button) ───────────────────────────────────────
  const renderRowActions = useCallback(
    (entity: AuditLogRecord) => (
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-pointer"
          title={t("auditLogs.viewDetails")}
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(entity);
          }}
          data-testid={`audit-logs-view-${entity._id}`}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
    [handleRowClick],
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col gap-4 p-6"
      data-testid="page-audit-logs"
    >
      {/* Header */}
      <PageHeader
        title={t("auditLogs.title")}
        icon={FileText}
        actions={
          <>
            <SearchBar
              value={table.searchQuery}
              onChange={table.onSearchChange}
              placeholder={t("auditLogs.searchPlaceholder")}
              testIdPrefix="audit-logs"
              className="w-72"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.refetch()}
              disabled={table.isFetching}
              title={t("auditLogs.reload")}
              data-testid="audit-logs-refresh"
              className="cursor-pointer"
            >
              <RefreshCw
                className={cn(
                  "h-[18px] w-[18px]",
                  table.isFetching && "animate-spin",
                )}
              />
            </Button>
          </>
        }
      />

      {/* Filter toolbar */}
      <AuditLogToolbar
        filters={table.filters}
        onFilterChange={table.setFilter}
        onClearAll={table.clearAllFilters}
      />

      {/* Batch filter indicator */}
      {table.filters.batchId && (
        <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand/5 px-4 py-2">
          <span className="text-body-sm text-foreground">
            {t("auditLogs.detail.showingBatch")} <strong className="font-mono">{table.filters.batchId}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs cursor-pointer"
            onClick={() => table.setFilter("batchId", "")}
          >
            {t("auditLogs.detail.clear")}
          </Button>
        </div>
      )}

      {/* Error banner */}
      {table.error && (
        <div
          className="flex items-center justify-between rounded-md border border-error bg-error-light px-4 py-3"
          role="alert"
        >
          <span className="text-body-sm text-error">
            {table.error.message ?? t("auditLogs.errorLoading")}
          </span>
        </div>
      )}

      {/* Table card */}
      <div className="flex-1 min-h-0 rounded-lg border border-border bg-card shadow-card flex flex-col overflow-hidden">
        <TablePagination
          page={page}
          totalItems={table.totalCount}
          pageSize={table.pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={table.onPageSizeChange}
        />

        <ServerTable
          data={table.data}
          activeColumns={activeColumns}
          sorting={table.sorting}
          onSortChange={table.onSortChange}
          columnFilters={table.columnFilters}
          onFilterChange={table.onFilterChange}
          selectable={false}
          onRowClick={handleRowClick}
          renderRowActions={renderRowActions}
          cellRenderers={cellRenderers}
          chooser={chooser}
          isLoading={table.isLoading}
          isFetching={table.isFetching && !table.isLoading}
          emptyMessage={t("auditLogs.emptyMessage")}
          testIdPrefix="audit-logs"
        />

        <TablePagination
          page={page}
          totalItems={table.totalCount}
          pageSize={table.pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={table.onPageSizeChange}
        />
      </div>

      {/* Detail drawer */}
      <AuditLogDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        auditLog={selectedLog}
        onFilterByBatch={handleFilterByBatch}
      />

      {/* Column chooser dropdown */}
      <ColumnChooserDropdown
        chooser={chooser}
        columnOrder={columnOrder}
        columnMap={columnMap}
      />
    </div>
  );
}
