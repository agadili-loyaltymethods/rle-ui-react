import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format-utils";
import type { SelectOption } from "@/shared/components/select";

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Fixed max chips to display. When omitted, auto-fits as many chips as the container width allows. */
  maxDisplayChips?: number;
  disabled?: boolean;
  error?: boolean;
  testIdPrefix?: string;
  className?: string;
  /** Show All / None / Invert quick-action buttons below the search input */
  showBulkActions?: boolean;
}

function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  maxDisplayChips,
  disabled = false,
  error = false,
  testIdPrefix = "multiselect",
  className,
  showBulkActions = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const chipsRef = React.useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = React.useState<number | null>(null);

  const selectedOptions = options.filter((o) => value.includes(o.value));
  const autoFit = maxDisplayChips == null;

  // Track container width so auto-fit re-measures when the parent resizes
  // (e.g., drawer open animation, window resize)
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    if (!autoFit) return;
    const el = chipsRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit]);

  // Hidden measurement row: render all chips off-screen to measure widths
  // Then calculate how many fit in the visible chips container
  React.useLayoutEffect(() => {
    if (!autoFit || selectedOptions.length === 0) {
      setVisibleCount(null);
      return;
    }
    const container = measureRef.current;
    if (!container) return;
    const chipsEl = chipsRef.current;
    if (!chipsEl) return;

    const chips = container.querySelectorAll<HTMLElement>("[data-measure-chip]");
    if (chips.length === 0) return;

    // Use the chips container width directly — it already accounts for
    // chevron, clear button, and padding via flex-1 layout
    const availableWidth = chipsEl.offsetWidth;
    const gap = 4;
    const moreBadgeWidth = 70;
    let usedWidth = 0;
    let fits = 0;

    for (let i = 0; i < chips.length; i++) {
      const chipWidth = chips[i]!.offsetWidth;
      const isLast = i === chips.length - 1;
      const needed = isLast ? chipWidth : chipWidth + gap + moreBadgeWidth;

      if (usedWidth + needed <= availableWidth) {
        usedWidth += chipWidth + gap;
        fits++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(1, fits));
  }, [selectedOptions.length, autoFit, value, options, containerWidth]);

  const effectiveMax = autoFit ? (visibleCount ?? selectedOptions.length) : maxDisplayChips!;
  const displayedChips = selectedOptions.slice(0, effectiveMax);
  const remainingCount = Math.max(0, selectedOptions.length - effectiveMax);
  const remainingOptions = selectedOptions.slice(effectiveMax);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeOption = (val: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(value.filter((v) => v !== val));
  };

  const clearAll = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange([]);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          data-testid={`${testIdPrefix}-multiselect-trigger`}
          aria-label={placeholder}
          type="button"
          className={cn(
            "relative flex w-full items-center gap-1.5 bg-[var(--input-bg)] text-body-sm",
            "min-h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)] pr-[36px]",
            "border border-[var(--input-border)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-error focus-visible:border-error focus-visible:ring-error",
            className,
          )}
          aria-invalid={error || undefined}
        >
          {/* Hidden measurement row for auto-fit */}
          {autoFit && selectedOptions.length > 0 && (
            <span ref={measureRef} className="absolute left-0 top-0 flex items-center gap-1 invisible pointer-events-none" aria-hidden>
              {selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  data-measure-chip
                  className="inline-flex items-center gap-1 rounded-[var(--badge-radius)] bg-info-light px-2 py-0.5 text-caption font-medium text-on-info whitespace-nowrap"
                >
                  {opt.label}
                  <span className="p-0.5"><X className="h-3 w-3" /></span>
                </span>
              ))}
            </span>
          )}
          {selectedOptions.length === 0 ? (
            <span className="truncate text-foreground-muted">
              {placeholder}
            </span>
          ) : (
            <span ref={chipsRef} className="flex flex-1 items-center gap-1 overflow-hidden">
              {displayedChips.map((opt) => (
                <span
                  key={opt.value}
                  data-chip
                  data-testid={`${testIdPrefix}-multiselect-chip-${opt.value}`}
                  className="inline-flex items-center gap-1 rounded-[var(--badge-radius)] bg-info-light px-2 py-0.5 text-caption font-medium text-on-info shrink-0"
                >
                  {opt.label}
                  <span
                    role="button"
                    tabIndex={0}
                    data-testid={`${testIdPrefix}-multiselect-chip-remove-${opt.value}`}
                    aria-label={`Remove ${opt.label}`}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={(e) => removeOption(opt.value, e)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") removeOption(opt.value, e); }}
                    className="rounded-[var(--radius-sm)] p-0.5 hover:bg-info-light/70 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
              {remainingCount > 0 && (
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        data-more
                        data-testid={`${testIdPrefix}-multiselect-more`}
                        className="inline-flex items-center rounded-pill bg-subtle px-2 py-0.5 text-caption font-medium text-foreground-secondary shrink-0"
                      >
                        +{formatNumber(remainingCount)} more
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-[var(--z-toast)] rounded-md bg-foreground px-3 py-2 text-caption text-foreground-inverse shadow-dropdown"
                        sideOffset={4}
                      >
                        {remainingOptions.map((o) => o.label).join(", ")}
                        <Tooltip.Arrow className="fill-foreground" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
            </span>
          )}

          {value.length > 1 && (
            <span
              role="button"
              tabIndex={0}
              onPointerDown={(e) => e.preventDefault()}
              onClick={clearAll}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") clearAll(e); }}
              data-testid={`${testIdPrefix}-multiselect-clear`}
              className="absolute right-8 p-0.5 text-foreground-muted hover:text-foreground cursor-pointer"
              aria-label="Clear all"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="absolute right-3 h-4 w-4 shrink-0 text-foreground-muted" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[calc(var(--z-modal)+10)] w-[var(--radix-popover-trigger-width)] rounded-md border border-border bg-card shadow-dropdown"
          sideOffset={4}
          align="start"
        >
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
              <input
                ref={searchInputRef}
                type="text"
                data-testid={`${testIdPrefix}-multiselect-search`}
                aria-label="Search options"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-sm bg-subtle py-2 pl-7 pr-2 text-label text-foreground placeholder:text-foreground-muted focus:outline-none"
              />
            </div>
          </div>

          {showBulkActions && options.length > 0 && (
            <div className="flex items-center gap-0.5 px-2 pb-1.5 mb-1 border-b border-border">
              <button
                type="button"
                data-testid={`${testIdPrefix}-multiselect-select-all`}
                aria-label="Select all"
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground-muted bg-transparent hover:bg-subtle hover:text-foreground transition-all duration-100"
                onClick={() => onChange(options.map((o) => o.value))}
              >
                All
              </button>
              <button
                type="button"
                data-testid={`${testIdPrefix}-multiselect-select-none`}
                aria-label="Select none"
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground-muted bg-transparent hover:bg-subtle hover:text-foreground transition-all duration-100"
                onClick={() => onChange([])}
              >
                None
              </button>
              <button
                type="button"
                data-testid={`${testIdPrefix}-multiselect-invert`}
                aria-label="Invert selection"
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground-muted bg-transparent hover:bg-subtle hover:text-foreground transition-all duration-100"
                onClick={() => {
                  const set = new Set(value);
                  onChange(options.filter((o) => !set.has(o.value)).map((o) => o.value));
                }}
              >
                Invert
              </button>
              <span className="ml-auto text-[11px] text-foreground-tertiary">
                {value.length}/{options.length}
              </span>
            </div>
          )}

          <ScrollArea.Root className="max-h-[var(--height-dropdown-max)]">
            <ScrollArea.Viewport className="max-h-[var(--height-dropdown-max)] px-2 pb-2">
              {filtered.map((option) => (
                <button
                  key={option.value}
                  data-testid={`${testIdPrefix}-multiselect-option-${option.value}`}
                  aria-label={option.label}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-body-sm",
                    "hover:bg-subtle transition-colors cursor-pointer",
                    value.includes(option.value) && "bg-brand-light",
                  )}
                  onClick={() => toggleOption(option.value)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      value.includes(option.value)
                        ? "border-brand bg-brand text-foreground-inverse"
                        : "border-border-strong",
                    )}
                  >
                    {value.includes(option.value) && (
                      <Check className="h-3 w-3" />
                    )}
                  </span>
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-4 text-center text-label text-foreground-muted">
                  No results found
                </div>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="w-1.5 p-px"
            >
              <ScrollArea.Thumb className="rounded-full bg-border-strong" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ── Searchable Single Select ──

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  testIdPrefix?: string;
  className?: string;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  error = false,
  testIdPrefix = "searchable-select",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          data-testid={`${testIdPrefix}-trigger`}
          aria-label={placeholder}
          type="button"
          className={cn(
            "flex w-full items-center justify-between bg-[var(--input-bg)] text-body-sm",
            "h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)]",
            "border border-[var(--input-border)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus-visible:border-error focus-visible:ring-error",
            className,
          )}
          aria-invalid={error || undefined}
        >
          <span className={cn("truncate", selectedOption ? "text-foreground" : "text-foreground-muted")}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-foreground-muted" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[calc(var(--z-modal)+10)] w-[var(--radix-popover-trigger-width)] rounded-md border border-border bg-card shadow-dropdown"
          sideOffset={4}
          align="start"
        >
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
              <input
                ref={searchInputRef}
                type="text"
                data-testid={`${testIdPrefix}-search`}
                aria-label="Search options"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-sm bg-subtle py-2 pl-7 pr-2 text-label text-foreground placeholder:text-foreground-muted focus:outline-none"
              />
            </div>
          </div>

          <ScrollArea.Root className="max-h-[var(--height-dropdown-max)]">
            <ScrollArea.Viewport className="max-h-[var(--height-dropdown-max)] px-2 pb-2">
              {filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    data-testid={`${testIdPrefix}-option-${option.value}`}
                    aria-label={option.label}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-body-sm",
                      "hover:bg-subtle transition-colors cursor-pointer",
                      isSelected && "bg-brand-light",
                    )}
                    onClick={() => { onChange(option.value); setOpen(false); }}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "text-brand" : "text-transparent")} />
                    <span className={cn("truncate", isSelected && "font-medium text-brand")}>{option.label}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-4 text-center text-label text-foreground-muted">
                  No results found
                </div>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 p-px">
              <ScrollArea.Thumb className="rounded-full bg-border-strong" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { MultiSelect, SearchableSelect };
export type { MultiSelectProps, SearchableSelectProps };
