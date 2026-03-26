import * as React from "react";
import { cn } from "@/shared/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  "data-testid"?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, "data-testid": testId, ...props }, ref) => {
    return (
      <input
        type={type}
        data-testid={testId ?? props.id ?? "input"}
        className={cn(
          "flex w-full bg-[var(--input-bg)] text-foreground text-[14px]",
          "h-[var(--input-height)] rounded-[var(--input-radius)] px-[var(--input-padding-x)]",
          "border border-[var(--input-border)]",
          "transition-colors duration-[var(--duration-fast)]",
          "placeholder:text-foreground-muted",
          "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-error focus-visible:border-error focus-visible:ring-error",
          className,
        )}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
