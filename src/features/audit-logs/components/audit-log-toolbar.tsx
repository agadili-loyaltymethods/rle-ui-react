import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SearchableSelect } from "@/shared/components/multi-select";
import type { SelectOption } from "@/shared/components/select";
import type { AuditLogFilters, DatePreset } from "../hooks/use-audit-logs";

const ENTITY_TYPE_KEYS = [
  "Program", "Rule", "PursePolicy", "TierPolicy", "RewardPolicy",
  "RuleFolder", "AggregatePolicy", "Flow", "StreakPolicy",
  "ExtensionSchema", "CustomExpression", "NamedList",
] as const;

interface AuditLogToolbarProps {
  filters: AuditLogFilters;
  onFilterChange: (key: keyof AuditLogFilters, value: string) => void;
  onClearAll: () => void;
}

/** Convert a preset to a dateFrom ISO date string (YYYY-MM-DD). */
function presetToDateFrom(preset: DatePreset): string {
  if (preset === "all" || preset === "custom") return "";
  const d = new Date();
  switch (preset) {
    case "1m": d.setMonth(d.getMonth() - 1); break;
    case "3m": d.setMonth(d.getMonth() - 3); break;
    case "6m": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
  }
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(from: string, to: string, fallbackLabel: string): string {
  const fmt = (d: string) => {
    if (!d) return "...";
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y}`;
  };
  if (!from && !to) return fallbackLabel;
  return `${fmt(from)} – ${fmt(to)}`;
}

export function AuditLogToolbar({
  filters,
  onFilterChange,
  onClearAll,
}: AuditLogToolbarProps) {
  const { t } = useTranslation("programs");

  const entityTypeOptions = useMemo<SelectOption[]>(() => [
    { value: "", label: t("auditLogs.filters.allEntityTypes") },
    ...ENTITY_TYPE_KEYS.map((key) => ({
      value: key,
      label: t(`auditLogs.entityTypes.${key}`),
    })),
  ], [t]);

  const actionOptions = useMemo<SelectOption[]>(() => [
    { value: "", label: t("auditLogs.filters.allActions") },
    { value: "CREATE", label: t("auditLogs.actions.create") },
    { value: "UPDATE", label: t("auditLogs.actions.update") },
    { value: "DELETE", label: t("auditLogs.actions.delete") },
  ], [t]);

  const sourceOptions = useMemo<SelectOption[]>(() => [
    { value: "", label: t("auditLogs.filters.allSources") },
    { value: "API", label: "API" },
    { value: "CASCADE", label: "CASCADE" },
    { value: "BATCH", label: "BATCH" },
    { value: "BACKGROUND", label: "BACKGROUND" },
  ], [t]);

  const presetOptions = useMemo<{ value: DatePreset; label: string }[]>(() => [
    { value: "1m", label: t("auditLogs.filters.lastMonth") },
    { value: "3m", label: t("auditLogs.filters.last3Months") },
    { value: "6m", label: t("auditLogs.filters.last6Months") },
    { value: "1y", label: t("auditLogs.filters.lastYear") },
    { value: "all", label: t("auditLogs.filters.allTime") },
    { value: "custom", label: t("auditLogs.filters.customRange") },
  ], [t]);

  const hasFilters =
    filters.entityType || filters.action || filters.source ||
    filters.datePreset !== "all";

  // Custom date range popover
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(filters.dateFrom);
  const [draftTo, setDraftTo] = useState(filters.dateTo);
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customOpen) return;
    function handleClick(e: MouseEvent) {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCustomOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [customOpen]);

  const handlePresetChange = (value: string) => {
    const preset = value as DatePreset;
    if (preset === "custom") {
      setDraftFrom(filters.dateFrom);
      setDraftTo(filters.dateTo);
      setCustomOpen(true);
      return;
    }
    onFilterChange("datePreset", preset);
    const from = presetToDateFrom(preset);
    onFilterChange("dateFrom", from);
    onFilterChange("dateTo", "");
  };

  const handleApplyCustom = () => {
    onFilterChange("datePreset", "custom");
    onFilterChange("dateFrom", draftFrom);
    onFilterChange("dateTo", draftTo);
    setCustomOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-48">
        <SearchableSelect
          value={filters.entityType}
          onChange={(v) => onFilterChange("entityType", v)}
          options={entityTypeOptions}
          placeholder={t("auditLogs.filters.allEntityTypes")}
          searchPlaceholder={t("auditLogs.filters.searchEntityTypes")}
          testIdPrefix="audit-filter-entity-type"
        />
      </div>

      <div className="w-40">
        <SearchableSelect
          value={filters.action}
          onChange={(v) => onFilterChange("action", v)}
          options={actionOptions}
          placeholder={t("auditLogs.filters.allActions")}
          searchPlaceholder={t("auditLogs.filters.searchActions")}
          testIdPrefix="audit-filter-action"
        />
      </div>

      <div className="w-40">
        <SearchableSelect
          value={filters.source}
          onChange={(v) => onFilterChange("source", v)}
          options={sourceOptions}
          placeholder={t("auditLogs.filters.allSources")}
          searchPlaceholder={t("auditLogs.filters.searchSources")}
          testIdPrefix="audit-filter-source"
        />
      </div>

      {/* Date range filter */}
      <div className="relative" ref={customRef}>
        {filters.datePreset === "custom" ? (
          <button
            type="button"
            data-testid="audit-filter-date-custom-trigger"
            aria-label="Custom date range filter"
            aria-expanded={customOpen}
            aria-haspopup="dialog"
            aria-controls={customOpen ? "audit-custom-date-popover" : undefined}
            className={cn(
              "flex items-center gap-1.5 h-[var(--input-height)] rounded-[var(--input-radius)] pl-3 pr-2.5",
              "border border-[var(--input-border)] bg-[var(--input-bg)]",
              "text-body-sm text-foreground cursor-pointer whitespace-nowrap",
              "hover:border-brand transition-all duration-150",
              customOpen && "border-brand ring-1 ring-brand",
            )}
            onClick={() => {
              setDraftFrom(filters.dateFrom);
              setDraftTo(filters.dateTo);
              setCustomOpen((o) => !o);
            }}
          >
            <span>{formatDateLabel(filters.dateFrom, filters.dateTo, t("auditLogs.filters.customRange"))}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-foreground-muted transition-transform",
                customOpen && "rotate-180",
              )}
            />
          </button>
        ) : (
          <select
            data-testid="audit-filter-date-preset"
            aria-label="Date range preset"
            className={cn(
              "h-[var(--input-height)] rounded-[var(--input-radius)] pl-3 pr-8",
              "border border-[var(--input-border)] bg-[var(--input-bg)]",
              "text-body-sm text-foreground appearance-none cursor-pointer",
              "bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2710%27%20height%3D%276%27%20viewBox%3D%270%200%2010%206%27%20fill%3D%27none%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201L5%205L9%201%27%20stroke%3D%27%236B7280%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center]",
              "focus-visible:outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand",
              "transition-all duration-150",
            )}
            value={filters.datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {presetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {/* Custom date range popover */}
        {customOpen && (
          <div
            id="audit-custom-date-popover"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-custom-date-label"
            className="absolute top-[calc(100%+4px)] left-0 z-20 w-[var(--width-popover-sm)] bg-card border border-border rounded-md shadow-dropdown p-4 space-y-3"
          >
            <p id="audit-custom-date-label" className="text-caption font-semibold text-foreground-muted uppercase tracking-wider">
              {t("auditLogs.filters.customDateRange")}
            </p>
            <div className="space-y-2">
              <label className="block text-body-sm text-foreground">
                {t("auditLogs.filters.startDate")}
                <Input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </label>
              <label className="block text-body-sm text-foreground">
                {t("auditLogs.filters.endDate")}
                <Input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="mt-1"
                />
              </label>
            </div>
            <div className="flex items-center justify-between pt-1">
              {filters.datePreset === "custom" ? (
                <button
                  type="button"
                  data-testid="audit-filter-date-reset-btn"
                  aria-label="Reset date filter"
                  className="text-caption text-foreground-muted hover:text-foreground underline cursor-pointer"
                  onClick={() => {
                    handlePresetChange("all");
                    setCustomOpen(false);
                  }}
                >
                  Reset
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setCustomOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleApplyCustom}
                  disabled={!draftFrom && !draftTo}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={onClearAll}
          data-testid="audit-filter-clear"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          {t("auditLogs.filters.clearFilters")}
        </Button>
      )}
    </div>
  );
}
