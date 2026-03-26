/**
 * Hooks for fetching segment and tier policy options used by the reward form.
 */

import { useEntityList } from "@/shared/hooks/use-api";

export interface SegmentOption {
  id: string;
  name: string;
}

export interface TierPolicyOption {
  id: string;
  name: string;
  primary?: boolean;
  levels: { name: string }[];
}

interface RawSegment {
  _id: string;
  name: string;
}

interface RawTierPolicy {
  _id: string;
  name: string;
  primary?: boolean;
  levels: { name: string }[];
}

export function useSegmentOptions() {
  const query = useEntityList<RawSegment>("segments", {
    select: "_id,name",
    limit: 200,
    sort: "name",
  });

  const options: SegmentOption[] =
    query.data?.data.map((s) => ({
      id: s._id,
      name: s.name,
    })) ?? [];

  return { options, isLoading: query.isLoading };
}

export function useTierPolicyOptions() {
  const query = useEntityList<RawTierPolicy>("tierpolicies", {
    select: "_id,name,levels,primary",
    limit: 50,
  });

  const options: TierPolicyOption[] =
    query.data?.data.map((tp) => ({
      id: tp._id,
      name: tp.name,
      primary: tp.primary,
      levels: tp.levels.map((l) => ({ name: l.name })),
    })) ?? [];

  return { options, isLoading: query.isLoading };
}
