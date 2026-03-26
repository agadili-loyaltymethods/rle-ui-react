import { useMemo } from "react";
import { useUserExtLoader } from "@/shared/hooks/use-user-meta";
import { useEntitySchema } from "@/features/reference-data/shared/hooks/use-entity-schema";
import { useServerTable } from "@/features/reference-data/shared/hooks/use-server-table";
import { useBulkOperations } from "@/features/reference-data/shared/hooks/use-bulk-operations";
import { buildColumns } from "@/features/reference-data/shared/lib/build-columns";
import { ServerTablePage } from "@/features/reference-data/shared/components/server-table-page";
import {
  useEntityPreferences,
  getSavedEntityTableLayout,
  getSavedEntityFormTabOrder,
} from "@/features/reference-data/shared/hooks/use-entity-preferences";
import { userConfig } from "../config/user-config";
import type { User } from "@/shared/types/settings";

type UserRecord = User & Record<string, unknown>;

export default function UsersPage() {
  const extLoaded = useUserExtLoader();
  const schema = useEntitySchema("User", userConfig);
  const table = useServerTable<UserRecord>(userConfig);
  const bulkOps = useBulkOperations(userConfig);
  const columns = useMemo(
    () => buildColumns(userConfig, schema),
    [schema],
  );

  const { saveTableLayout, saveFormTabOrder } = useEntityPreferences("user");

  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedEntityTableLayout("user") : null),
    [extLoaded],
  );

  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedEntityFormTabOrder("user") : undefined),
    [extLoaded],
  );

  if (!extLoaded) {
    return <ServerTablePage.Skeleton config={userConfig} />;
  }

  return (
    <ServerTablePage
      config={userConfig}
      schema={schema}
      table={table}
      columns={columns}
      bulkOps={bulkOps}
      savedLayout={savedTableLayout}
      onLayoutChange={saveTableLayout}
      savedTabOrder={savedFormTabOrder ?? undefined}
      onTabOrderChange={saveFormTabOrder}
    />
  );
}
