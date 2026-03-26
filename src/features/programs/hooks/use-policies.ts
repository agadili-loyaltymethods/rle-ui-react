import {
  useEntityList,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  type ListQueryParams,
} from "@/shared/hooks/use-api";
import type { PursePolicy, TierPolicy, RewardPolicy } from "@/shared/types/policy";
import type { EntityBase } from "@/shared/types/api";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { groupPursePolicies } from "../utils/group-purse-policies";

interface StreakPolicy extends EntityBase {
  name: string;
  program: string;
  description?: string;
  goalPolicies?: unknown[];
}

const REWARD_POLICY_ENDPOINT = "rewardpolicies";
const PURSE_POLICY_ENDPOINT = "pursepolicies";
const TIER_POLICY_ENDPOINT = "tierpolicies";
const STREAK_POLICY_ENDPOINT = "streakpolicies";

/**
 * Reward policies for a program, optionally filtered by intendedUse.
 */
export function useRewardPolicies(
  programId: string | undefined,
  intendedUse?: string,
  params?: ListQueryParams,
) {
  const filter: Record<string, unknown> = {};
  if (programId) filter.program = programId;
  if (intendedUse) filter.intendedUse = intendedUse;

  const hasProgram = !!programId;

  return useEntityList<RewardPolicy>(REWARD_POLICY_ENDPOINT, {
    ...params,
    query: Object.keys(filter).length > 0 ? JSON.stringify(filter) : undefined,
    enabled: hasProgram,
  });
}

/**
 * Purse policies for a program.
 */
export function usePursePolicies(programId: string | undefined, params?: ListQueryParams) {
  const filter = programId ? JSON.stringify({ program: programId }) : undefined;

  return useEntityList<PursePolicy>(PURSE_POLICY_ENDPOINT, {
    ...params,
    query: filter,
    enabled: !!programId,
  });
}

export function useCreatePursePolicy() {
  return useCreateEntity<PursePolicy>(PURSE_POLICY_ENDPOINT);
}

export function useUpdatePursePolicy() {
  return useUpdateEntity<PursePolicy>(PURSE_POLICY_ENDPOINT);
}

export function useDeletePursePolicy() {
  return useDeleteEntity(PURSE_POLICY_ENDPOINT);
}

/**
 * Fetch ALL purse policies for a program (no pagination).
 * Used for the grouped purse policies view where we need the full dataset
 * to group qualifying policies by their `group` field.
 * Sorted by group,periodStartDate server-side.
 */
export function useAllPursePolicies(programId: string | undefined) {
  return useQuery({
    queryKey: [PURSE_POLICY_ENDPOINT, "all", programId],
    queryFn: async () => {
      const response = await apiClient.get<PursePolicy[]>(PURSE_POLICY_ENDPOINT, {
        params: {
          query: JSON.stringify({ program: programId }),
          sort: "group,periodStartDate",
          limit: "0",
        },
      });
      return response.data;
    },
    enabled: !!programId,
  });
}

/**
 * Tier policies for a program.
 */
export function useTierPolicies(programId: string | undefined, params?: ListQueryParams) {
  const filter = programId ? JSON.stringify({ program: programId }) : undefined;

  return useEntityList<TierPolicy>(TIER_POLICY_ENDPOINT, {
    ...params,
    query: filter,
    enabled: !!programId,
  });
}

export function useCreateTierPolicy() {
  return useCreateEntity<TierPolicy>(TIER_POLICY_ENDPOINT);
}

export function useUpdateTierPolicy() {
  return useUpdateEntity<TierPolicy>(TIER_POLICY_ENDPOINT);
}

export function useDeleteTierPolicy() {
  return useDeleteEntity(TIER_POLICY_ENDPOINT);
}

/**
 * Streak policies for a program.
 */
export function useStreakPolicies(programId: string | undefined, params?: ListQueryParams) {
  const filter = programId ? JSON.stringify({ program: programId }) : undefined;

  return useEntityList<StreakPolicy>(STREAK_POLICY_ENDPOINT, {
    ...params,
    query: filter,
    enabled: !!programId,
  });
}

/**
 * Fetch counts for each policy type (for the hub page cards).
 * Purse policies are counted by unique purses (groups count as 1, not per-period).
 * Tier policies use the /count endpoint directly.
 */
export function usePolicyCounts(programId: string | undefined) {
  const enabled = !!programId;
  const filter = programId ? JSON.stringify({ program: programId }) : undefined;

  const allPurses = useAllPursePolicies(programId);

  const tierCount = useQuery({
    queryKey: [TIER_POLICY_ENDPOINT, "count", programId],
    queryFn: async () => {
      const response = await apiClient.get<{ count: number }>(`${TIER_POLICY_ENDPOINT}/count`, {
        params: { query: filter },
      });
      return response.data.count;
    },
    enabled,
  });

  const pursePolicyCount = allPurses.data
    ? groupPursePolicies(allPurses.data).length
    : 0;

  return {
    pursePolicyCount,
    tierPolicyCount: tierCount.data ?? 0,
    isLoading: allPurses.isLoading || tierCount.isLoading,
  };
}
