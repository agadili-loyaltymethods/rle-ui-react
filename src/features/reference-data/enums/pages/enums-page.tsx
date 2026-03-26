import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { enumConfig } from "../config/enum-config";
import type { Enum } from "@/shared/types/reference-data";

type EnumRecord = Enum & Record<string, unknown>;

export default function EnumerationsPage() {
  const { i18n } = useTranslation();
  const langFilter = useMemo(() => ({ lang: i18n.language, displayType: "user" }), [i18n.language]);
  const extLoaded = useUserExtLoader();
  const schema = useEntitySchema("Enum", enumConfig);
  const table = useServerTable<EnumRecord>(enumConfig, langFilter);
  const bulkOps = useBulkOperations(enumConfig);
  const columns = useMemo(
    () => buildColumns(enumConfig, schema),
    [schema],
  );

  const { saveTableLayout, saveFormTabOrder } = useEntityPreferences("enum");

  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedEntityTableLayout("enum") : null),
    [extLoaded],
  );

  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedEntityFormTabOrder("enum") : undefined),
    [extLoaded],
  );

  if (!extLoaded) {
    return <ServerTablePage.Skeleton config={enumConfig} />;
  }

  return (
    <ServerTablePage
      config={enumConfig}
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
