import { useState, useRef, useEffect } from "react";
import { List, LayoutGrid, ChevronDown, Check, Minimize2, Plus, RefreshCw } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import type {
  RewardStatus,
  ExpirationSince,
  CustomDateRange,
  ViewMode,
} from "@/features/reward-catalog/types/reward-policy";

const STATUS_OPTIONS: { value: RewardStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "future", label: "Future" },
];

const PRESET_OPTIONS: { value: ExpirationSince; label: string }[] = [
  { value: "1m", label: "Active in the last month" },
  { value: "3m", label: "Active in the last 3 months" },
  { value: "6m", label: "Active in the last 6 months" },
  { value: "1y", label: "Active in the last year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range..." },
];

interface RewardsToolbarProps {
  filterStatus: RewardStatus[];
  onFilterStatusChange: (status: RewardStatus[]) => void;
  expirationSince: ExpirationSince;
  onExpirationSinceChange: (value: ExpirationSince) => void;
  customDateRange: CustomDateRange;
  onCustomDateRangeChange: (range: CustomDateRange) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  fullscreen?: boolean;
  onExitFullscreen?: () => void;
  onAdd?: () => void;
  onReload?: () => void;
}

function formatDateLabel(range: CustomDateRange): string {
  if (!range.start && !range.end) return "Custom range";
  const fmt = (d: string) => {
    if (!d) return "...";
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y}`;
  };
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

export function RewardsToolbar({
  filterStatus,
  onFilterStatusChange,
  expirationSince,
  onExpirationSinceChange,
  customDateRange,
  onCustomDateRangeChange,
  viewMode,
  onViewModeChange,
  onExitFullscreen,
  onAdd,
  onReload,
}: RewardsToolbarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Custom date range popover
  const [customOpen, setCustomOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<CustomDateRange>(customDateRange);
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        statusRef.current &&
        !statusRef.current.contains(e.target as Node)
      ) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusOpen]);

  useEffect(() => {
    if (!customOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        customRef.current &&
        !customRef.current.contains(e.target as Node)
      ) {
        setCustomOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [customOpen]);

  const toggleStatus = (value: RewardStatus) => {
    const next = filterStatus.includes(value)
      ? filterStatus.filter((s) => s !== value)
      : [...filterStatus, value];
    onFilterStatusChange(next);
  };

  const statusLabel =
    filterStatus.length === 0
      ? "All Status"
      : filterStatus
          .map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1))
          .join(", ");

  const handleSelectChange = (value: string) => {
    if (value === "custom") {
      // Pre-fill draft with last saved range
      setDraftRange(customDateRange);
      setCustomOpen(true);
    } else {
      onExpirationSinceChange(value as ExpirationSince);
    }
  };

  const handleApplyCustom = () => {
    onCustomDateRangeChange(draftRange);
    onExpirationSinceChange("custom");
    setCustomOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Expiration filter */}
      <div className="relative" ref={customRef}>
        {expirationSince === "custom" ? (
          /* When custom is active, show a button that reopens the popover */
          <button
            type="button"
            data-testid="toolbar-custom-date-toggle"
            aria-label="Custom date range"
            className={cn(
              "flex items-center gap-1.5 h-[var(--input-height)] rounded-[var(--input-radius)] pl-3 pr-2.5",
              "border border-[var(--input-border)] bg-[var(--input-bg)]",
              "text-sm text-foreground cursor-pointer whitespace-nowrap",
              "hover:border-brand transition-all duration-150",
              customOpen && "border-brand ring-1 ring-brand",
            )}
            onClick={() => {
              setDraftRange(customDateRange);
              setCustomOpen((o) => !o);
            }}
          >
            <span>{formatDateLabel(customDateRange)}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-foreground-muted transition-transform",
                customOpen && "rotate-180",
              )}
            />
          </button>
        ) : (
          <select
            data-testid="toolbar-expiration-select"
            id="toolbar-expiration-select"
            className={cn(
              "h-[var(--input-height)] rounded-[var(--input-radius)] pl-3 pr-8",
              "border border-[var(--input-border)] bg-[var(--input-bg)]",
              "text-sm text-foreground appearance-none cursor-pointer",
              "bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2710%27%20height%3D%276%27%20viewBox%3D%270%200%2010%206%27%20fill%3D%27none%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201L5%205L9%201%27%20stroke%3D%27%236B7280%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center]",
              "focus-visible:outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand",
              "transition-all duration-150",
            )}
            value={expirationSince}
            onChange={(e) => handleSelectChange(e.target.value)}
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Custom date range popover */}
        {customOpen && (
          <div className="absolute top-[calc(100%+4px)] left-0 z-20 w-[280px] bg-card border border-border rounded-md shadow-dropdown p-4 space-y-3">
            <p className="text-[12px] font-semibold text-foreground-muted uppercase tracking-wider">
              Active During Range
            </p>
            <div className="space-y-2">
              <label className="block text-body-sm text-foreground">
                Start date
                <Input
                  type="date"
                  value={draftRange.start}
                  onChange={(e) =>
                    setDraftRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="mt-1"
                />
              </label>
              <label className="block text-body-sm text-foreground">
                End date
                <Input
                  type="date"
                  value={draftRange.end}
                  onChange={(e) =>
                    setDraftRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="mt-1"
                />
              </label>
            </div>
            <div className="flex items-center justify-between pt-1">
              {expirationSince === "custom" ? (
                <button
                  type="button"
                  data-testid="toolbar-custom-date-reset"
                  aria-label="Reset date range"
                  className="text-caption text-foreground-muted hover:text-foreground underline cursor-pointer"
                  onClick={() => {
                    onExpirationSinceChange("1m");
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
                  onClick={() => setCustomOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustom}
                  disabled={!draftRange.start && !draftRange.end}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status multi-select dropdown */}
      <div className="relative" ref={statusRef}>
        <button
          type="button"
          data-testid="toolbar-status-toggle"
          aria-label="Filter by status"
          className={cn(
            "flex items-center gap-1.5 h-[var(--input-height)] w-[140px] rounded-[var(--input-radius)] px-3 pr-2.5",
            "border border-[var(--input-border)] bg-[var(--input-bg)]",
            "text-sm text-foreground cursor-pointer whitespace-nowrap",
            "hover:border-brand transition-all duration-150",
            statusOpen && "border-brand ring-1 ring-brand",
          )}
          onClick={() => setStatusOpen((o) => !o)}
        >
          <span className="truncate">{statusLabel}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-foreground-muted transition-transform",
              statusOpen && "rotate-180",
            )}
          />
        </button>
        {statusOpen && (
          <div className="absolute top-[calc(100%+4px)] left-0 z-20 min-w-[160px] bg-card border border-border rounded-md shadow-dropdown py-1">
            {STATUS_OPTIONS.map((opt) => {
              const checked = filterStatus.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-subtle text-body-sm"
                  onClick={() => toggleStatus(opt.value)}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center h-4 w-4 rounded-sm border",
                      checked
                        ? "bg-brand border-brand text-foreground-inverse"
                        : "border-border-strong bg-transparent",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  {opt.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
        <button
          data-testid="toolbar-view-list"
          aria-label="List view"
          className={cn(
            "flex items-center justify-center w-10 h-[42px] border-none cursor-pointer transition-all duration-150",
            viewMode === "list"
              ? "bg-brand text-white"
              : "bg-transparent text-foreground-tertiary hover:text-foreground-secondary",
          )}
          onClick={() => onViewModeChange("list")}
          title="List view"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          data-testid="toolbar-view-grid"
          aria-label="Grid view"
          className={cn(
            "flex items-center justify-center w-10 h-[42px] border-none border-l border-border cursor-pointer transition-all duration-150",
            viewMode === "grid"
              ? "bg-brand text-white"
              : "bg-transparent text-foreground-tertiary hover:text-foreground-secondary",
          )}
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      {/* Fullscreen-only compact buttons */}
      {onReload && (
        <Button variant="ghost" size="icon" onClick={onReload} title="Reload">
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
      {onAdd && (
        <Button size="icon" onClick={onAdd} title="Add Reward">
          <Plus className="h-4 w-4" />
        </Button>
      )}
      {onExitFullscreen && (
        <Button variant="ghost" size="icon" onClick={onExitFullscreen} title="Exit fullscreen (Esc)">
          <Minimize2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
