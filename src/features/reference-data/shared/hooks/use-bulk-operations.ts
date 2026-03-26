/**
 * Bulk update and delete operations for reference data entities.
 * Uses the /multiedit and /multidelete endpoints.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { ServerTableConfig } from "../types/server-table-types";

export function useBulkOperations(config: ServerTableConfig) {
  const queryClient = useQueryClient();

  const bulkUpdate = useMutation({
    mutationFn: async ({
      ids,
      update,
    }: {
      ids: string[];
      update: Record<string, unknown>;
    }) => {
      await apiClient.patch("multiedit", {
        model: config.modelName,
        ids,
        update,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      await apiClient.post("multidelete", {
        model: config.modelName,
        ids,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
    },
  });

  return { bulkUpdate, bulkDelete };
}
