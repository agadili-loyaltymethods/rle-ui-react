import { useMemo } from "react";
import { useUserExtLoader } from "@/shared/hooks/use-user-meta";
import { useEntitySchema } from "../../shared/hooks/use-entity-schema";
import { useServerTable } from "../../shared/hooks/use-server-table";
import { useBulkOperations } from "../../shared/hooks/use-bulk-operations";
import { buildColumns } from "../../shared/lib/build-columns";
import { ServerTablePage } from "../../shared/components/server-table-page";
import {
  useEntityPreferences,
  getSavedEntityTableLayout,
  getSavedEntityFormTabOrder,
} from "../../shared/hooks/use-entity-preferences";
import { locationConfig } from "../config/location-config";
import type { Location } from "@/shared/types/reference-data";

type LocationRecord = Location & Record<string, unknown>;

export default function LocationsPage() {
  const extLoaded = useUserExtLoader();
  const schema = useEntitySchema("Location", locationConfig);
  const table = useServerTable<LocationRecord>(locationConfig);
  const bulkOps = useBulkOperations(locationConfig);
  const columns = useMemo(
    () => buildColumns(locationConfig, schema),
    [schema],
  );

  const { saveTableLayout, saveFormTabOrder } = useEntityPreferences("location");

  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedEntityTableLayout("location") : null),
    [extLoaded],
  );

  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedEntityFormTabOrder("location") : undefined),
    [extLoaded],
  );

  // Don't render the table until user preferences are loaded so column
  // layout is correct from the first frame (avoids a visible flash).
  if (!extLoaded) {
    return <ServerTablePage.Skeleton config={locationConfig} />;
  }

  return (
    <ServerTablePage
      config={locationConfig}
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
