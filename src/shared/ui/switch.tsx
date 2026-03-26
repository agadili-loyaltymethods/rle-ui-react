import { cn } from "@/shared/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
}

export function Switch({ checked, onChange, disabled, className, "data-testid": testId, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId ?? "switch"}
      aria-label={ariaLabel ?? "Toggle"}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-brand" : "bg-border-strong",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
