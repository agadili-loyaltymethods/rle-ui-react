import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  testIdPrefix?: string;
  className?: string;
}

function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  testIdPrefix = "search",
  className,
}: SearchBarProps) {
  const [internal, setInternal] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  React.useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInternal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  const handleClear = () => {
    setInternal("");
    clearTimeout(timerRef.current);
    onChange("");
  };

  React.useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
        aria-hidden="true"
      />
      <input
        data-testid={`${testIdPrefix}-search-input`}
        aria-label={placeholder}
        type="text"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "flex w-full bg-[var(--input-bg)] text-foreground text-body-sm",
          "h-[var(--input-height)] rounded-[var(--input-radius)] pl-9 pr-9",
          "border border-[var(--input-border)]",
          "transition-colors duration-[var(--duration-fast)]",
          "placeholder:text-foreground-muted",
          "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
        )}
      />
      {internal.length > 0 && (
        <button
          data-testid={`${testIdPrefix}-search-clear`}
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { SearchBar };
export type { SearchBarProps };
