import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { useCreateEntity } from "@/shared/hooks/use-api";
import type { Enum } from "@/shared/types/reference-data";

const ENDPOINT = "enums";

/**
 * Fetch enum entries by type, returning { value, label } options
 * suitable for select/combobox fields.
 *
 * Queries: GET /api/enums?query={"type":"<enumType>","lang":"en"}&sort=label&limit=0
 */
export function useEnumOptions(enumType: string, enabled = true) {
  return useQuery({
    queryKey: [ENDPOINT, "options", enumType],
    queryFn: async () => {
      const response = await apiClient.get<Enum[]>(ENDPOINT, {
        params: {
          query: JSON.stringify({ type: enumType, lang: "en" }),
          sort: "label",
          select: "value,label",
          limit: "0",
        },
      });
      return response.data.map((e) => ({
        value: String(e.value),
        label: e.label,
      }));
    },
    enabled,
  });
}

/**
 * Create a new enum entry. Used when a user enters a new value
 * (e.g., a new PurseGroup) that doesn't exist yet.
 */
export function useCreateEnum() {
  return useCreateEntity<Enum>(ENDPOINT);
}
