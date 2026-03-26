import { Inbox } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface DataTableEmptyProps {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testIdPrefix?: string;
}

function DataTableEmpty({
  message = "No data found",
  actionLabel,
  onAction,
  testIdPrefix = "table",
}: DataTableEmptyProps) {
  return (
    <div
      data-testid={`${testIdPrefix}-empty`}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-subtle">
        <Inbox className="h-8 w-8 text-foreground-muted" />
      </div>
      <p className="mb-1 text-body-sm font-medium text-foreground">
        {message}
      </p>
      <p className="text-caption text-foreground-muted">
        Try adjusting your filters or search criteria
      </p>
      {actionLabel && onAction && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onAction}
          data-testid={`${testIdPrefix}-empty-action`}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export { DataTableEmpty };
export type { DataTableEmptyProps };
