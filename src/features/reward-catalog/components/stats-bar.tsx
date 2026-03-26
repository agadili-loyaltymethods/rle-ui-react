import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format-utils";

const ENDPOINT = "rewardpolicies";
const BASE_QUERY = { "ext._meta.subType": "RewardsCatalog" };

function useRewardCount(label: string, extra?: Record<string, unknown>) {
  const query = useMemo(
    () => (extra ? { ...BASE_QUERY, ...extra } : BASE_QUERY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(extra)],
  );
  return useQuery({
    queryKey: [ENDPOINT, "stat", label, JSON.stringify(query)],
    queryFn: async () => {
      const resp = await apiClient.get<{ count: number }>(
        `${ENDPOINT}/count`,
        { params: { query: JSON.stringify(query) } },
      );
      return resp.data.count ?? 0;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1">
      <span
        className={cn(
          "text-sm font-semibold tabular-nums text-foreground",
          loading && "opacity-40",
        )}
      >
        {formatNumber(value)}
      </span>
      <span className="text-[11px] font-medium text-foreground-muted">
        {label}
      </span>
    </div>
  );
}

interface StatsBarProps {
  className?: string;
}

export function StatsBar({ className }: StatsBarProps) {
  const now = useMemo(() => new Date().toISOString(), []);

  const total = useRewardCount("total");
  const active = useRewardCount("active", {
    effectiveDate: { $lte: now },
    expirationDate: { $gte: now },
  });
  const redeemed = useRewardCount("redeemed", {
    redemptions: { $gt: 0 },
  });

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Stat label="Total" value={total.data ?? 0} loading={total.isLoading} />
      <Stat
        label="Active"
        value={active.data ?? 0}
        loading={active.isLoading}
      />
      <Stat
        label="Redeemed"
        value={redeemed.data ?? 0}
        loading={redeemed.isLoading}
      />
    </div>
  );
}
