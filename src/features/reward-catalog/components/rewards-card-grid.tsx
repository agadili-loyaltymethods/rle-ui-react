import { useMemo } from "react";
import { Gift, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  type RewardCatalogItem,
  type RewardStatus,
  type EntitySchemaData,
  getRewardStatus,
} from "@/features/reward-catalog/types/reward-policy";

const statusVariant: Record<RewardStatus, "success" | "error" | "info"> = {
  active: "success",
  expired: "error",
  future: "info",
};

interface RewardsCardGridProps {
  rewards: RewardCatalogItem[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onEdit?: (reward: RewardCatalogItem) => void;
  onDelete?: (id: string) => void;
  page: number;
  pageSize: number;
  schemaData?: EntitySchemaData | null;
  cardImageField?: string;
  pricingMode?: "single" | "per-tier";
  tierLevelFields?: Record<string, string>;
}

export function RewardsCardGrid({
  rewards,
  selectedIds,
  onSelect,
  onEdit,
  onDelete,
  page,
  pageSize,
  schemaData,
  cardImageField,
  pricingMode = "per-tier",
  tierLevelFields,
}: RewardsCardGridProps) {
  // Resolve tier fields: use level-to-field mapping if provided, otherwise auto-discover rewardCost* fields
  const tierFields = useMemo(() => {
    if (pricingMode === "single") return [];
    if (!schemaData?.extFields) return [];

    if (tierLevelFields && Object.keys(tierLevelFields).length > 0) {
      // Use level-to-field mapping: label is the tier level name, key is the ext field
      return Object.entries(tierLevelFields)
        .filter(([, fieldName]) => fieldName && schemaData.extFields[fieldName])
        .map(([levelName, fieldName]) => ({
          key: fieldName,
          label: levelName,
        }));
    }

    // Auto-discover: numeric ext fields starting with "rewardCost"
    return Object.entries(schemaData.extFields)
      .filter(([key, def]) => key.startsWith("rewardCost") && (def.type === "number" || def.type === "integer"))
      .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
      .map(([key, def]) => ({
        key,
        label: (def.title ?? key).replace(/^rewardCost/, "").replace(/([A-Z])/g, " $1").trim() || key,
      }));
  }, [schemaData, pricingMode, tierLevelFields]);
  const paginatedRewards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rewards.slice(start, start + pageSize);
  }, [rewards, page, pageSize]);

  if (rewards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground-secondary text-body-sm">
        No rewards found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {paginatedRewards.map((reward) => {
        const status = getRewardStatus(reward);
        const selected = selectedIds.has(reward._id);
        const imageUrl = cardImageField
          ? cardImageField === "url"
            ? (reward as Record<string, unknown>).url as string | undefined
            : reward.ext?.[cardImageField] as string | undefined
          : reward.ext.imageListPageUrlDesktopWide ||
            reward.ext.imageListPageUrlDesktopNormal;

        return (
          <div
            key={reward._id}
            className={cn(
              "flex flex-col bg-card border border-border rounded-lg overflow-hidden shadow-card transition-all duration-250 ease-in-out",
              "hover:shadow-card-hover hover:-translate-y-0.5",
              selected && "border-brand shadow-[0_0_0_2px_rgba(244,122,32,0.15)]",
            )}
          >
            {/* Image area */}
            <div
              className="relative aspect-[5/3] bg-subtle overflow-hidden cursor-pointer group"
              onClick={() => onSelect(reward._id)}
            >
              {imageUrl ? (
                <img alt={reward.name ?? "Reward image"}
                  src={imageUrl}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-subtle">
                  <Gift className="h-10 w-10 text-foreground-muted" />
                </div>
              )}
              {/* Selection checkbox overlay */}
              <span
                className={cn(
                  "absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-[6px] border-[1.5px] transition-all duration-150 pointer-events-none z-[2]",
                  selected
                    ? "opacity-100 bg-foreground-secondary border-foreground-secondary"
                    : "opacity-0 group-hover:opacity-100 bg-white/90 border-border-strong",
                )}
              >
                {selected && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.5 6l2.5 3 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {reward.ext.displayType === "Featured" && (
                <span className="absolute top-2.5 right-2.5 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Featured
                </span>
              )}
              {/* Status badge overlay */}
              <Badge variant={statusVariant[status]} className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0">
                {status}
              </Badge>
            </div>

            {/* Card body */}
            <div className="flex flex-col gap-2.5 p-4 flex-1">
              {/* Type row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground-tertiary">
                  {reward.ext.rewardType}
                </span>
              </div>

              {/* Channel badges */}
              {(() => {
                const meta = (reward.ext as Record<string, unknown>)?._meta as Record<string, unknown> | undefined;
                const channels = (meta?.eligibleChannels as string[] | undefined) ?? [];
                return channels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {channels.map((ch) => (
                      <Badge key={ch} variant="info" className="text-[10px] px-1.5 py-0">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                ) : null;
              })()}

              <h3 className="text-[15px] font-semibold text-foreground leading-tight">
                {reward.name}
              </h3>

              {reward.desc && (
                <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                  {reward.desc}
                </p>
              )}

              {/* Pricing — single or per-tier */}
              {pricingMode === "single" ? (
                <div className="mt-auto bg-page border border-border rounded-[6px] px-3 py-1.5 inline-flex items-center gap-1.5">
                  <span className="text-caption-xs font-semibold text-foreground-tertiary uppercase tracking-wide">
                    Cost
                  </span>
                  <span className="text-body-sm font-bold text-foreground tabular-nums">
                    {(reward.cost ?? 0).toLocaleString()}
                  </span>
                </div>
              ) : (
                tierFields.length > 0 && tierFields.some((t) => reward.ext[t.key] != null) && (
                  tierFields.length <= 3 ? (
                    <div className="flex gap-1.5 mt-auto">
                      {tierFields.map(({ key, label }) => (
                        <div
                          key={key}
                          className="flex-1 bg-page border border-border rounded-[6px] px-2 py-1.5 text-center"
                        >
                          <span className="block text-caption-xs font-semibold text-foreground-tertiary uppercase tracking-wide">
                            {label}
                          </span>
                          <span className="block text-body-sm font-bold text-foreground tabular-nums">
                            {((reward.ext[key] as number | undefined) ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-1 bg-page border border-border rounded-[6px] px-3 py-2">
                      {tierFields.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <span className="text-caption-xs font-semibold text-foreground-tertiary uppercase tracking-wide truncate">
                            {label}
                          </span>
                          <span className="text-body-sm font-bold text-foreground tabular-nums shrink-0">
                            {((reward.ext[key] as number | undefined) ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )
              )}

              {/* Footer: redemptions + actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground-tertiary">
                  {(reward.redemptions ?? 0).toLocaleString()} redemptions
                </span>
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-0.5">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => onEdit(reward)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-error hover:text-error"
                        title="Delete"
                        onClick={() => onDelete(reward._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
