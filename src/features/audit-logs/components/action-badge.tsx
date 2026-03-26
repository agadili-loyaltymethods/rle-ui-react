import { Badge } from "@/shared/ui/badge";

const ACTION_VARIANT: Record<string, "success" | "info" | "error" | "secondary"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
};

interface ActionBadgeProps {
  action: string;
}

export function ActionBadge({ action }: ActionBadgeProps) {
  const variant = ACTION_VARIANT[action] ?? "secondary";

  return <Badge variant={variant} className="px-2 py-0.5">{action}</Badge>;
}
