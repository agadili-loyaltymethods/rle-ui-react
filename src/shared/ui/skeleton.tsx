import { cn } from "@/shared/lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-subtle", className)}
      {...props}
    />
  );
}

export { Skeleton };
