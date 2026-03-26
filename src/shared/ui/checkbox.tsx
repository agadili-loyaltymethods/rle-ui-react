import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  disabled?: boolean;
  className?: string;
  readOnly?: boolean;
  "aria-label"?: string;
  "data-testid"?: string;
}

export type { CheckboxProps };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, disabled, className, readOnly, "aria-label": ariaLabel, "data-testid": testId, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        data-testid={testId ?? "checkbox"}
        aria-label={ariaLabel ?? "checkbox"}
        checked={checked ?? false}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          "h-4 w-4 cursor-pointer",
          "disabled:cursor-not-allowed disabled:opacity-50",
          readOnly && "pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";
