import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatNumber } from "@/shared/lib/format-utils";

interface ElementCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  /** CSS color for the icon (e.g. "var(--color-accent-teal)") */
  iconColor?: string;
  /** CSS bg color for the icon container */
  iconBg?: string;
}

export function ElementCard({
  icon: Icon,
  title,
  description,
  count,
  onClick,
  disabled = false,
  testId,
  iconColor = "var(--color-brand-primary)",
  iconBg = "var(--color-brand-primary-light)",
}: ElementCardProps) {
  return (
    <Card
      hover={!disabled}
      data-testid={testId}
      className={disabled ? "opacity-50" : "cursor-pointer"}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="flex items-center gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-body font-medium text-foreground">{title}</span>
            {count != null && (
              <Badge variant="secondary">{formatNumber(count)}</Badge>
            )}
            {disabled && (
              <Badge variant="outline">Coming soon</Badge>
            )}
          </div>
          <p className="mt-0.5 text-body-sm text-foreground-muted truncate" title={description}>{description}</p>
        </div>
        {!disabled && (
          <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
        )}
      </CardContent>
    </Card>
  );
}
