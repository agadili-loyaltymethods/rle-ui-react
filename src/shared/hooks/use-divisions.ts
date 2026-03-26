import React from "react";
import { useEntityList } from "./use-api";
import type { Division } from "@/shared/types/settings";

interface DivisionOptionsParams {
  /** When provided, only divisions in this list are shown. */
  programDivisionIds?: string[];
}

/**
 * Fetches active divisions and returns them as select options.
 *
 * - Only active divisions are fetched from the API.
 * - If `programDivisionIds` is provided, options are filtered to that set.
 */
export function useDivisionOptions(params?: DivisionOptionsParams) {
  const { programDivisionIds } = params ?? {};

  const { data: activeDivisionsData, isLoading } = useEntityList<Division>(
    "divisions",
    { query: JSON.stringify({ isActive: true }), select: "name", sort: "name", limit: 0 },
  );

  const options = React.useMemo(() => {
    const activeList = activeDivisionsData?.data ?? [];
    let result = activeList.map((d) => ({ value: d._id, label: d.name }));

    if (programDivisionIds) {
      const programSet = new Set(programDivisionIds);
      result = result.filter((d) => programSet.has(d.value));
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [activeDivisionsData, programDivisionIds]);

  return { options, isLoading };
}
