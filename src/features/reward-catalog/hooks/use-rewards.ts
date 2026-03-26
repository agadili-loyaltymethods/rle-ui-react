/**
 * TanStack Query mutation hooks for the RewardCatalogItem entity.
 */

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import {
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "@/shared/hooks/use-api";
import type { RewardCatalogItem } from "../types/reward-policy";

const ENDPOINT = "rewardpolicies";

export function useCreateRewardCatalogItem() {
  return useCreateEntity<RewardCatalogItem>(ENDPOINT);
}

export function useUpdateRewardCatalogItem() {
  return useUpdateEntity<RewardCatalogItem>(ENDPOINT);
}

export function useDeleteRewardCatalogItem() {
  return useDeleteEntity(ENDPOINT);
}

export function useBulkUpdateRewardPolicies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      update,
    }: {
      ids: string[];
      update: Record<string, unknown>;
    }) => {
      const resp = await apiClient.patch("multiedit", {
        model: "RewardPolicy",
        ids,
        update,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENDPOINT] });
    },
  });
}

export function useBulkDeleteRewardPolicies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const resp = await apiClient.post("multidelete", {
        model: "RewardPolicy",
        ids,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENDPOINT] });
    },
  });
}
