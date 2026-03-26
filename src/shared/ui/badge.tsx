import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-[5px] font-medium capitalize whitespace-nowrap",
    "rounded-[var(--badge-radius)] px-[var(--badge-padding-x)] py-[var(--badge-padding-y)]",
    "text-[var(--badge-font-size)] leading-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-brand text-foreground-inverse",
        secondary: "bg-subtle text-foreground-secondary",
        success: "bg-success-light text-on-success",
        warning: "bg-warning-light text-on-warning",
        error: "bg-error-light text-on-error",
        info: "bg-info-light text-on-info",
        violet: "bg-accent-violet-light text-accent-violet",
        outline: "border border-border-strong text-foreground bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const dotColor: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
};

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  "data-testid"?: string;
}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const dot = variant ? dotColor[variant] : undefined;
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
