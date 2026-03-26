import {
  ChevronRight,
  ChevronDown,
  Filter,
  Pencil,
  Trash2,
  Check,
  Minus,
  Calendar,
  Globe,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { formatDate, toDateOnly, todayDateOnly } from "@/shared/lib/date-utils";
import { formatNumber } from "@/shared/lib/format-utils";
import { TablePagination } from "@/shared/components/table-pagination";
import { useClientTable, renderSortIcon } from "@/shared/hooks/use-client-table";
import type { PursePolicy } from "@/shared/types/policy";
import type { PurseDisplayEntry } from "../utils/group-purse-policies";

function isPeriodPast(p: PursePolicy): boolean {
  return !!p.periodEndDate && toDateOnly(p.periodEndDate) < todayDateOnly();
}

function ActionButtons({
  onEdit,
  onDelete,
  testId,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  testId: string;
}) {
  if (!onEdit && !onDelete) return null;
  return (
    <div className="flex items-center gap-1" data-testid={testId}>
      {onEdit && (
        <button
          data-testid={`${testId}-edit`}
          aria-label="Edit"
          title="Edit"
          className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          data-testid={`${testId}-delete`}
          aria-label="Delete"
          title="Delete"
          className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-error/5 hover:text-error transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column definitions for sort / filter
// ---------------------------------------------------------------------------

const COLUMN_DEFS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "primary", label: "Primary" },
  { key: "ptMultiplier", label: "Pt Multiplier" },
  { key: "effectiveDate", label: "Effective Date" },
  { key: "expirationDate", label: "Expiration Date" },
  { key: "overdraft", label: "Overdraft" },
];

/** Get the representative policy for an entry (first policy of group, or standalone). */
function getRepPolicy(entry: PurseDisplayEntry): PursePolicy {
  return entry.type === "group" ? entry.policies[0]! : entry.policy;
}

function getEntryName(entry: PurseDisplayEntry): string {
  return entry.type === "group" ? entry.groupName : entry.policy.name;
}

function getDisplayValue(entry: PurseDisplayEntry, key: string): string {
  const rep = getRepPolicy(entry);
  switch (key) {
    case "name": return getEntryName(entry);
    case "type": return entry.type === "group" ? "Qualifying" : "Non-qualifying";
    case "primary": return rep.primary ? "Yes" : "No";
    case "ptMultiplier": return formatNumber(rep.ptMultiplier, 1);
    case "effectiveDate": return formatDate(rep.effectiveDate);
    case "expirationDate": return formatDate(rep.expirationDate);
    case "overdraft": return formatNumber(rep.overdraftLimit);
    default: return "";
  }
}

function getSortValue(entry: PurseDisplayEntry, key: string): string | number {
  const rep = getRepPolicy(entry);
  switch (key) {
    case "name": return getEntryName(entry).toLowerCase();
    case "type": return entry.type === "group" ? 0 : 1;
    case "primary": return rep.primary ? 1 : 0;
    case "ptMultiplier": return rep.ptMultiplier ?? 0;
    case "effectiveDate": return rep.effectiveDate ?? "";
    case "expirationDate": return rep.expirationDate ?? "";
    case "overdraft": return rep.overdraftLimit ?? 0;
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PurseGroupedTableProps {
  entries: PurseDisplayEntry[];
  expandedGroups: Set<string>;
  onToggleGroup: (groupName: string) => void;
  onEdit?: (policy: PursePolicy) => void;
  onDelete?: (policy: PursePolicy) => void;
}

export function PurseGroupedTable({
  entries,
  expandedGroups,
  onToggleGroup,
  onEdit,
  onDelete,
}: PurseGroupedTableProps) {
  const {
    sort,
    columnFilters,
    setColumnFilter,
    filtersVisible,
    setFiltersVisible,
    hasActiveFilters,
    clearAllFilters,
    processedItems: processedEntries,
    paginatedItems: paginatedEntries,
    page,
    pageSize,
    setPage,
    setPageSize,
    toggleSort,
  } = useClientTable({
    items: entries,
    getDisplayValue,
    getSortValue,
    pageResetDeps: [entries],
  });

  return (
    <div className="rounded-lg border border-border bg-card shadow-card flex flex-col overflow-hidden">
      <TablePagination
        page={page}
        totalItems={processedEntries.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-page border-b border-border">
            <th className="w-10 px-3.5 h-12" />
            {COLUMN_DEFS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3.5 h-12 text-left text-[11px] font-semibold uppercase tracking-[0.5px] whitespace-nowrap select-none cursor-pointer",
                  sort?.key === col.key ? "text-foreground" : "text-foreground-muted",
                )}
                onClick={() => toggleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  <span>{col.label}</span>
                  {renderSortIcon(col.key, sort)}
                </span>
              </th>
            ))}
            <th className="w-12 px-3.5 h-12">
              <button
                className={cn(
                  "inline-flex items-center justify-center h-7 w-7 rounded cursor-pointer transition-colors",
                  "hover:bg-subtle",
                  hasActiveFilters && "text-brand",
                )}
                title={filtersVisible ? "Hide filters" : "Show filters"}
                aria-label={filtersVisible ? "Hide filters" : "Show filters"}
                data-testid="purse-table-filter-toggle"
                onClick={() => {
                  if (filtersVisible && hasActiveFilters) {
                    clearAllFilters();
                  } else {
                    setFiltersVisible((v) => !v);
                  }
                }}
              >
                <Filter className="h-4 w-4" />
              </button>
            </th>
          </tr>
          {filtersVisible && (
            <tr>
              <th className="h-10 bg-card border-b border-border" />
              {COLUMN_DEFS.map((col) => (
                <th key={col.key} className="h-10 px-1.5 bg-card border-b border-border">
                  <input
                    type="text"
                    data-testid={`purse-table-filter-${col.key}`}
                    aria-label={`Filter ${col.label}`}
                    className="w-full h-7 px-2 border border-border rounded-[6px] bg-page text-xs text-foreground font-normal placeholder:text-foreground-tertiary placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-brand"
                    placeholder={`Filter ${col.label.toLowerCase()}...`}
                    value={columnFilters[col.key] ?? ""}
                    onChange={(e) => setColumnFilter(col.key, e.target.value)}
                  />
                </th>
              ))}
              <th className="h-10 px-2 bg-card border-b border-border text-right">
                {hasActiveFilters && (
                  <button
                    className="inline-flex items-center justify-center h-6 w-6 rounded cursor-pointer hover:bg-subtle"
                    title="Clear all filters"
                    aria-label="Clear all filters"
                    data-testid="purse-table-clear-filters"
                    onClick={clearAllFilters}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </th>
            </tr>
          )}
        </thead>
        <tbody>
          {paginatedEntries.map((entry) => {
            if (entry.type === "group") {
              const isExpanded = expandedGroups.has(entry.groupName);
              const rep = entry.policies[0]!;
              return (
                <GroupRows
                  key={`group-${entry.groupName}`}
                  groupName={entry.groupName}
                  policies={entry.policies}
                  representative={rep}
                  isExpanded={isExpanded}
                  onToggle={() => onToggleGroup(entry.groupName)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            }
            return (
              <StandaloneRow
                key={entry.policy._id}
                policy={entry.policy}
                onEdit={onEdit ? () => onEdit(entry.policy) : undefined}
                onDelete={onDelete ? () => onDelete(entry.policy) : undefined}
              />
            );
          })}
          {processedEntries.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-body-sm text-foreground-secondary">
                {hasActiveFilters ? "No purse policies match the current filters." : "No purse policies found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <TablePagination
        page={page}
        totalItems={processedEntries.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

function GroupRows({
  groupName,
  policies,
  representative,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  groupName: string;
  policies: PursePolicy[];
  representative: PursePolicy;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (p: PursePolicy) => void;
  onDelete?: (p: PursePolicy) => void;
}) {
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <>
      {/* Group header row */}
      <tr
        className="border-b border-subtle hover:bg-subtle cursor-pointer transition-colors duration-150"
        onClick={onToggle}
        data-testid={`purse-group-${groupName}`}
      >
        <td className="px-3.5 h-14 py-2">
          <Chevron className="h-4 w-4 text-foreground-muted" />
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px]">
          <span className="font-semibold text-foreground">{groupName}</span>
          <span className="ml-2 text-foreground-muted text-caption">
            {policies.length} period{policies.length !== 1 ? "s" : ""}
          </span>
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px]">
          <Badge variant="info">Qualifying</Badge>
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px]">
          {representative.primary
            ? <Check className="h-4 w-4 text-success" />
            : <Minus className="h-4 w-4 text-foreground-muted" />}
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
          {formatNumber(representative.ptMultiplier, 1)}
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
          {formatDate(representative.effectiveDate)}
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
          {formatDate(representative.expirationDate)}
        </td>
        <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
          {formatNumber(representative.overdraftLimit)}
        </td>
        <td className="px-3.5 h-14 py-2" />
      </tr>

      {/* Expanded period sub-rows */}
      {isExpanded &&
        policies.map((p) => {
          const past = isPeriodPast(p);
          return (
          <tr
            key={p._id}
            className="border-b border-subtle bg-subtle/50 hover:bg-subtle transition-colors duration-150"
            data-testid={`purse-period-${p._id}`}
          >
            <td className="px-3.5 h-14 py-2" />
            <td className="px-3.5 h-14 py-2 text-[13px] pl-8">
              <div className="flex items-center gap-2">
                <span className={past ? "text-foreground-muted" : "text-foreground"}>{p.name}</span>
                <Badge variant={past ? "secondary" : "success"} className="w-12 justify-center text-caption-xs">
                  {past ? "Closed" : "Open"}
                </Badge>
              </div>
            </td>
            <td className="px-3.5 h-14 py-2 text-[13px]">
              <div className="flex items-center gap-1.5 text-foreground-muted">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDate(p.periodStartDate)} &rarr; {formatDate(p.periodEndDate)}</span>
              </div>
            </td>
            <td className="px-3.5 h-14 py-2 text-[13px] text-foreground-muted" colSpan={2}>
              {p.periodCloseDate && (
                <span>Close: {formatDate(p.periodCloseDate)}</span>
              )}
            </td>
            <td className="px-3.5 h-14 py-2 text-[13px]" colSpan={2}>
              {p.periodTimezone && (
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span>{p.periodTimezone}</span>
                </div>
              )}
            </td>
            <td />
            <td className="px-3.5 h-14 py-2">
              <ActionButtons
                onEdit={onEdit ? () => onEdit(p) : undefined}
                onDelete={onDelete ? () => onDelete(p) : undefined}
                testId={`purse-actions-${p._id}`}
              />
            </td>
          </tr>
          );
        })}
    </>
  );
}

function StandaloneRow({
  policy,
  onEdit,
  onDelete,
}: {
  policy: PursePolicy;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <tr
      className="border-b border-subtle hover:bg-subtle transition-colors duration-150"
      data-testid={`purse-row-${policy._id}`}
    >
      <td className="px-3.5 h-14 py-2" />
      <td className="px-3.5 h-14 py-2 text-[13px] font-medium text-foreground">
        {policy.name}
      </td>
      <td className="px-3.5 h-14 py-2 text-[13px]">
        <Badge variant="secondary">Non-qualifying</Badge>
      </td>
      <td className="px-3.5 h-14 py-2 text-[13px]">
        {policy.primary
          ? <Check className="h-4 w-4 text-success" />
          : <Minus className="h-4 w-4 text-foreground-muted" />}
      </td>
      <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
        {formatNumber(policy.ptMultiplier, 1)}
      </td>
      <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
        {formatDate(policy.effectiveDate)}
      </td>
      <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
        {formatDate(policy.expirationDate)}
      </td>
      <td className="px-3.5 h-14 py-2 text-[13px] text-foreground">
        {formatNumber(policy.overdraftLimit)}
      </td>
      <td className="px-3.5 h-14 py-2">
        <ActionButtons
          onEdit={onEdit}
          onDelete={onDelete}
          testId={`purse-actions-${policy._id}`}
        />
      </td>
    </tr>
  );
}
