import {
  useEntityList,
  useEntity,
  useCreateEntity,
  useUpdateEntity,
  type ListQueryParams,
} from "@/shared/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { EntityBase } from "@/shared/types/api";

/**
 * Minimal Member type stub. The full type is created by types-engineer
 * in @/shared/types/member.ts — this is enough for hook signatures.
 */
interface Member extends EntityBase {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone?: string;
  loyaltyId?: string;
  status?: string;
  program?: string;
  enrollDate?: string;
  enrollSource?: string;
  enrollChannel?: string;
}

interface MemberSearchQuery {
  firstName?: string;
  lastName?: string;
  email?: string;
  cellPhone?: string;
  loyaltyId?: string;
}

const ENDPOINT = "Member";

/**
 * Paginated member list with query/sort/filter support.
 */
export function useMembers(params?: ListQueryParams) {
  return useEntityList<Member>(ENDPOINT, params);
}

/**
 * Single member by ID.
 */
export function useMember(id: string | undefined) {
  return useEntity<Member>(ENDPOINT, id);
}

/**
 * Create a new member.
 */
export function useCreateMember() {
  return useCreateEntity<Member>(ENDPOINT);
}

/**
 * Update an existing member.
 */
export function useUpdateMember() {
  return useUpdateEntity<Member>(ENDPOINT);
}

/**
 * Search members by multiple fields.
 * Builds an express-restify-mongoose query filter from the search fields.
 */
export function useMemberSearch(query: MemberSearchQuery) {
  const filter: Record<string, unknown> = {};

  if (query.firstName) filter.firstName = { $regex: query.firstName, $options: "i" };
  if (query.lastName) filter.lastName = { $regex: query.lastName, $options: "i" };
  if (query.email) filter.email = { $regex: query.email, $options: "i" };
  if (query.cellPhone) filter.cellPhone = { $regex: query.cellPhone, $options: "i" };
  if (query.loyaltyId) filter.loyaltyId = query.loyaltyId;

  const hasFilters = Object.keys(filter).length > 0;

  return useEntityList<Member>(ENDPOINT, {
    query: hasFilters ? JSON.stringify(filter) : undefined,
    limit: 25,
    enabled: hasFilters,
  });
}

/**
 * Member activities — sub-collection for a specific member.
 */
export function useMemberActivities(memberId: string | undefined, params?: ListQueryParams) {
  return useQuery({
    queryKey: ["Activity", "byMember", memberId, params],
    queryFn: async () => {
      const searchParams: Record<string, string> = {};
      if (params?.sort) searchParams.sort = params.sort;
      if (params?.skip != null) searchParams.skip = String(params.skip);
      if (params?.limit != null) searchParams.limit = String(params.limit);

      searchParams.query = JSON.stringify({ member: memberId });

      const response = await apiClient.get("Activity", { params: searchParams });
      const totalCount = Number(response.headers["x-total-count"] ?? response.data.length);
      return { data: response.data as unknown[], meta: { totalCount } };
    },
    enabled: !!memberId,
  });
}

/**
 * Member rewards — sub-collection for a specific member.
 */
export function useMemberRewards(memberId: string | undefined, params?: ListQueryParams) {
  return useQuery({
    queryKey: ["Reward", "byMember", memberId, params],
    queryFn: async () => {
      const searchParams: Record<string, string> = {};
      if (params?.sort) searchParams.sort = params.sort;
      if (params?.skip != null) searchParams.skip = String(params.skip);
      if (params?.limit != null) searchParams.limit = String(params.limit);

      searchParams.query = JSON.stringify({ member: memberId });

      const response = await apiClient.get("Reward", { params: searchParams });
      const totalCount = Number(response.headers["x-total-count"] ?? response.data.length);
      return { data: response.data as unknown[], meta: { totalCount } };
    },
    enabled: !!memberId,
  });
}

/**
 * Member purses (point balances) — sub-collection for a specific member.
 */
export function useMemberPurses(memberId: string | undefined, params?: ListQueryParams) {
  return useQuery({
    queryKey: ["Purse", "byMember", memberId, params],
    queryFn: async () => {
      const searchParams: Record<string, string> = {};
      if (params?.sort) searchParams.sort = params.sort;
      if (params?.skip != null) searchParams.skip = String(params.skip);
      if (params?.limit != null) searchParams.limit = String(params.limit);

      searchParams.query = JSON.stringify({ member: memberId });

      const response = await apiClient.get("Purse", { params: searchParams });
      const totalCount = Number(response.headers["x-total-count"] ?? response.data.length);
      return { data: response.data as unknown[], meta: { totalCount } };
    },
    enabled: !!memberId,
  });
}

/**
 * Member tiers — sub-collection for a specific member.
 */
export function useMemberTiers(memberId: string | undefined, params?: ListQueryParams) {
  return useQuery({
    queryKey: ["Tier", "byMember", memberId, params],
    queryFn: async () => {
      const searchParams: Record<string, string> = {};
      if (params?.sort) searchParams.sort = params.sort;
      if (params?.skip != null) searchParams.skip = String(params.skip);
      if (params?.limit != null) searchParams.limit = String(params.limit);

      searchParams.query = JSON.stringify({ member: memberId });

      const response = await apiClient.get("Tier", { params: searchParams });
      const totalCount = Number(response.headers["x-total-count"] ?? response.data.length);
      return { data: response.data as unknown[], meta: { totalCount } };
    },
    enabled: !!memberId,
  });
}
