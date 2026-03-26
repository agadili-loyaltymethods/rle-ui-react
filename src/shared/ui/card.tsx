import * as React from "react";
import { cn } from "@/shared/lib/cn";

/* ── Card ── */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  "data-testid"?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[var(--card-bg)] rounded-[var(--card-radius)] border border-[var(--card-border)] shadow-card",
        hover && "transition-shadow duration-[var(--duration-normal)] hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/* ── CardHeader ── */

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-spacing-sm p-[var(--card-padding)] pb-0",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/* ── CardTitle ── */

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-h4 text-foreground", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/* ── CardDescription ── */

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-body-sm text-foreground-muted", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/* ── CardContent ── */

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-[var(--card-padding)]", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

/* ── CardFooter ── */

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-[var(--card-padding)] pt-0",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps };
