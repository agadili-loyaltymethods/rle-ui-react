/**
 * Hook to fetch reference options for ref-select / ref-multiselect core fields.
 *
 * Collects all unique refEndpoint values from the config's coreFormFields,
 * fetches each one, and returns a map from field name to SelectOption[].
 * Handles `filterByField` for dependent filtering (e.g. division filtered by possibleDivisions).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { SelectOption } from "@/shared/components/select";
import type { CoreFieldDef } from "@/shared/types/core-field";

interface RefRecord {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Fetches reference data for all ref-select/ref-multiselect fields in the config.
 *
 * @returns A function `getRefOptions(def, formValues)` that returns SelectOption[]
 * for a given field definition, taking into account `filterByField`.
 */
export function useRefFieldOptions(coreFormFields: CoreFieldDef[]) {
  // Collect unique endpoints
  const endpoints = useMemo(() => {
    const set = new Set<string>();
    for (const def of coreFormFields) {
      if (def.refEndpoint && (def.type === "ref-select" || def.type === "ref-multiselect")) {
        set.add(def.refEndpoint);
      }
    }
    return Array.from(set);
  }, [coreFormFields]);

  // Fetch all reference data (one query per endpoint)
  const refQueries = useQuery({
    queryKey: ["ref-field-options", endpoints],
    queryFn: async () => {
      const results: Record<string, RefRecord[]> = {};
      const settled = await Promise.allSettled(
        endpoints.map(async (ep) => {
          const res = await apiClient.get<RefRecord[]>(ep, {
            params: { select: "_id,name", sort: "name", limit: "1000" },
          });
          return { ep, data: res.data };
        }),
      );
      for (const result of settled) {
        if (result.status === "fulfilled") {
          results[result.value.ep] = result.value.data;
        }
        // Rejected endpoints silently return empty — the field will show no options
      }
      return results;
    },
    enabled: endpoints.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const refData = refQueries.data ?? {};

  // Build a lookup: endpoint → SelectOption[]
  const allOptionsByEndpoint = useMemo(() => {
    const map: Record<string, SelectOption[]> = {};
    for (const ep of endpoints) {
      const records = refData[ep] ?? [];
      map[ep] = records.map((r) => ({
        value: r._id,
        label: r.name ?? r._id,
      }));
    }
    return map;
  }, [refData, endpoints]);

  /**
   * Get options for a specific field, respecting filterByField.
   */
  function getRefOptions(
    def: CoreFieldDef,
    formValues: Record<string, unknown>,
  ): SelectOption[] | undefined {
    if (!def.refEndpoint) return undefined;
    const allOpts = allOptionsByEndpoint[def.refEndpoint] ?? [];

    if (def.filterByField) {
      const filterValue = formValues[def.filterByField];
      if (Array.isArray(filterValue) && filterValue.length > 0) {
        const allowedSet = new Set(filterValue as string[]);
        return allOpts.filter((o) => allowedSet.has(o.value));
      }
      // If filterByField is empty, return empty options
      return [];
    }

    return allOpts;
  }

  return { getRefOptions, isLoading: refQueries.isLoading };
}
