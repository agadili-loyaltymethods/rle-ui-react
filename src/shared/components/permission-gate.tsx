import type { ReactNode } from "react";
import { usePermissions } from "@/shared/hooks/use-permissions";

type Action = "read" | "create" | "update" | "delete";

interface PermissionGateProps {
  entity: string;
  action: Action;
  fallback?: ReactNode;
  children: ReactNode;
}

const actionMap: Record<Action, keyof ReturnType<typeof usePermissions>> = {
  read: "canRead",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
};

export function PermissionGate({ entity, action, fallback = null, children }: PermissionGateProps) {
  const permissions = usePermissions(entity);
  const allowed = permissions[actionMap[action]];

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
