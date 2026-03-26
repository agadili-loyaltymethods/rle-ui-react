import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[] | SelectOptionGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  grouped?: boolean;
  renderOption?: (option: SelectOption) => React.ReactNode;
  testIdPrefix?: string;
  className?: string;
}

function isGrouped(
  _options: SelectOption[] | SelectOptionGroup[],
  grouped?: boolean,
): _options is SelectOptionGroup[] {
  return !!grouped;
}

function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  error = false,
  grouped = false,
  renderOption,
  testIdPrefix = "select",
  className,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Radix Dialog's react-remove-scroll adds a capture-phase wheel listener on
  // the document that preventDefault()s + stopImmediatePropagation()s wheel
  // events targeting elements outside the dialog content. Since our Popover
  // portal renders outside the dialog DOM, we register our own document-level
  // capture handler to intercept wheel events and manually scroll the list.
  // A callback ref ensures the handler is registered after the portal mounts.
  const wheelCleanup = React.useRef<(() => void) | null>(null);
  const listRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      // Clean up previous handler
      wheelCleanup.current?.();
      wheelCleanup.current = null;

      if (!node) return;

      const handler = (e: WheelEvent) => {
        if (node.contains(e.target as Node)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          node.scrollTop += e.deltaY;
        }
      };
      document.addEventListener("wheel", handler, { passive: false, capture: true });
      wheelCleanup.current = () =>
        document.removeEventListener("wheel", handler, { capture: true });
    },
    [],
  );

  const flatOptions: SelectOption[] = React.useMemo(() => {
    if (isGrouped(options, grouped)) {
      return options.flatMap((g) => g.options);
    }
    return options as SelectOption[];
  }, [options, grouped]);

  const selectedOption = flatOptions.find((o) => o.value === value);

  // Type-ahead: when trigger is focused and dropdown is closed, typing
  // characters matches options by label prefix and selects the first match.
  const typeaheadBuffer = React.useRef("");
  const typeaheadTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const handleTriggerKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (open || disabled) return;
      // Only handle printable single characters
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      e.preventDefault();
      typeaheadBuffer.current += e.key;
      clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = setTimeout(() => {
        typeaheadBuffer.current = "";
      }, 500);

      const query = typeaheadBuffer.current.toLowerCase();
      const match = flatOptions.find((o) =>
        o.label.toLowerCase().startsWith(query),
      );
      if (match) onChange(match.value);
    },
    [open, disabled, flatOptions, onChange],
  );

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options;
    if (isGrouped(options, grouped)) {
      return (options as SelectOptionGroup[])
        .map((g) => ({
          ...g,
          options: g.options.filter((o) => o.label.toLowerCase().includes(q)),
        }))
        .filter((g) => g.options.length > 0);
    }
    return (options as SelectOption[]).filter((o) =>
      o.label.toLowerCase().includes(q),
    );
  }, [options, search, grouped]);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const renderOptionContent = (option: SelectOption) => {
    if (renderOption) return renderOption(option);
    return (
      <>
        {option.icon && <span className="mr-2 shrink-0">{option.icon}</span>}
        <span className="truncate">{option.label}</span>
      </>
    );
  };

  const renderOptionItem = (option: SelectOption) => (
    <button
      key={option.value}
      data-testid={`${testIdPrefix}-select-option-${option.value}`}
      aria-label={option.label}
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[14px]",
        "hover:bg-subtle transition-colors cursor-pointer",
        option.value === value && "bg-brand-light text-foreground",
      )}
      onClick={() => handleSelect(option.value)}
    >
      <span className="flex flex-1 items-center truncate">
        {renderOptionContent(option)}
      </span>
      {option.value === value && (
        <Check className="h-4 w-4 shrink-0 text-brand" />
      )}
    </button>
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          data-testid={`${testIdPrefix}-select-trigger`}
          aria-label={placeholder}
          type="button"
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            "relative flex w-full items-center justify-between bg-[var(--input-bg)] text-[14px]",
            "h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)] pr-[36px]",
            "border border-[var(--input-border)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-error focus-visible:border-error focus-visible:ring-error",
            !selectedOption && "text-foreground-muted",
            className,
          )}
          aria-invalid={error || undefined}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center text-foreground">
                {renderOptionContent(selectedOption)}
              </span>
            ) : (
              placeholder
            )}
          </span>
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
                data-testid={`${testIdPrefix}-select-search`}
                aria-label={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-sm bg-subtle py-2 pl-7 pr-2 text-[13px] text-foreground placeholder:text-foreground-muted focus:outline-none"
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-[var(--height-dropdown-max)] overflow-y-auto px-2 pb-2">
              {isGrouped(filtered, grouped) ? (
                (filtered as SelectOptionGroup[]).map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-caption font-semibold text-foreground-muted uppercase tracking-wide">
                      {group.label}
                    </div>
                    {group.options.map(renderOptionItem)}
                  </div>
                ))
              ) : (
                (filtered as SelectOption[]).map(renderOptionItem)
              )}
              {((isGrouped(filtered, grouped) &&
                (filtered as SelectOptionGroup[]).length === 0) ||
                (!isGrouped(filtered, grouped) &&
                  (filtered as SelectOption[]).length === 0)) && (
                <div className="py-4 text-center text-[13px] text-foreground-muted">
                  No results found
                </div>
              )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { Select };
export type { SelectProps, SelectOption, SelectOptionGroup };
