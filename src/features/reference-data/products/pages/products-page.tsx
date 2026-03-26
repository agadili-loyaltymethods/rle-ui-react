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
import { productConfig } from "../config/product-config";
import type { Product } from "@/shared/types/reference-data";

type ProductRecord = Product & Record<string, unknown>;

export default function ProductsPage() {
  const extLoaded = useUserExtLoader();
  const schema = useEntitySchema("Product", productConfig);
  const table = useServerTable<ProductRecord>(productConfig);
  const bulkOps = useBulkOperations(productConfig);
  const columns = useMemo(
    () => buildColumns(productConfig, schema),
    [schema],
  );

  const { saveTableLayout, saveFormTabOrder } = useEntityPreferences("product");

  const savedTableLayout = useMemo(
    () => (extLoaded ? getSavedEntityTableLayout("product") : null),
    [extLoaded],
  );

  const savedFormTabOrder = useMemo(
    () => (extLoaded ? getSavedEntityFormTabOrder("product") : undefined),
    [extLoaded],
  );

  if (!extLoaded) {
    return <ServerTablePage.Skeleton config={productConfig} />;
  }

  return (
    <ServerTablePage
      config={productConfig}
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
