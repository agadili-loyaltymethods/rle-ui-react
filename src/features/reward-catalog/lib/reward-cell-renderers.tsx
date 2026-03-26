import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { getRewardStatus, getUserDisplayName } from "../types/reward-policy";
import type { RewardCatalogItem, RewardStatus, PopulatedUser } from "../types/reward-policy";

const STATUS_VARIANT: Record<RewardStatus, "success" | "error" | "info"> = {
  active: "success",
  expired: "error",
  future: "info",
};

type RewardRow = RewardCatalogItem & Record<string, unknown>;

function renderImageCell(row: RewardRow, cardImageField?: string): ReactNode {
  const url = cardImageField
    ? cardImageField === "url"
      ? (row as Record<string, unknown>).url as string | undefined
      : row.ext?.[cardImageField] as string | undefined
    : row.ext?.imageListPageUrlDesktopNormal;

  if (url && typeof url === "string") {
    return (
      <img alt={typeof row.name === "string" ? row.name : "Reward image"}
        src={url}
        className="h-8 w-11 rounded object-cover block"
      />
    );
  }
  return (
    <div className="flex h-8 w-11 items-center justify-center rounded bg-subtle">
      <Gift className="h-4 w-4 text-foreground-muted" />
    </div>
  );
}

export const rewardCellRenderers: Record<
  string,
  (value: unknown, row: RewardRow) => ReactNode
> = {
  image: (_value, row) => renderImageCell(row),

  "reward-name": (_value, row) => (
    <div className="flex flex-col gap-px whitespace-normal min-w-[180px] max-w-[320px]">
      <span className="font-semibold text-foreground leading-tight">{row.name}</span>
      {row.desc && (
        <span className="text-xs text-foreground-muted truncate">
          {row.desc}
        </span>
      )}
    </div>
  ),

  "reward-status": (_value, row) => {
    const status = getRewardStatus(row);
    return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
  },

  user: (value) => {
    const display = getUserDisplayName(value as string | PopulatedUser | undefined);
    return <span>{display}</span>;
  },

  "reward-channels": (_value, row) => {
    const meta = (row.ext as Record<string, unknown>)?._meta as Record<string, unknown> | undefined;
    const channels = (meta?.eligibleChannels as string[] | undefined) ?? [];
    if (channels.length === 0) {
      return <span className="text-foreground-muted">All</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {channels.map((ch) => (
          <Badge key={ch} variant="info">{ch}</Badge>
        ))}
      </div>
    );
  },
};

/** Build cell renderers with a configurable card image field. */
export function buildRewardCellRenderers(
  cardImageField: string,
): Record<string, (value: unknown, row: RewardRow) => ReactNode> {
  return {
    ...rewardCellRenderers,
    image: (_value, row) => renderImageCell(row, cardImageField),
  };
}
