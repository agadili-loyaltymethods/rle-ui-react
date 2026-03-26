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
import { segmentConfig } from "../config/segment-config";
import type { Segment } from "@/shared/types/reference-data";

type SegmentRecord = Segment & Record<string, unknown>;

export default function SegmentsPage() {
  const extLoaded = useUserExtLoader();
  const schema = useEntitySchema("Segment", segmentConfig);
  const table = useServerTable<SegmentRecord>(segmentConfig);
  const bulkOps = useBulkOperations(segmentConfig);
  const columns = useMemo(
    () => buildColumns(segmentConfig, schema),
    [schema],
  );

  const { saveTableLayout, saveFormTabOrder } = useEntityPreferences("segment");

  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedEntityTableLayout("segment") : null),
    [extLoaded],
  );

  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedEntityFormTabOrder("segment") : undefined),
    [extLoaded],
  );

  if (!extLoaded) {
    return <ServerTablePage.Skeleton config={segmentConfig} />;
  }

  return (
    <ServerTablePage
      config={segmentConfig}
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
