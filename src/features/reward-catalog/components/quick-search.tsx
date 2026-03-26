import { useState, useEffect, useRef, useMemo } from "react";
import { Gift, Search } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import type { RewardCatalogItem, RewardStatus } from "@/features/reward-catalog/types/reward-policy";
import { getRewardStatus } from "@/features/reward-catalog/types/reward-policy";

const STATUS_VARIANT: Record<RewardStatus, "success" | "error" | "info"> = {
  active: "success",
  expired: "error",
  future: "info",
};

interface QuickSearchProps {
  rewards: RewardCatalogItem[];
  onSelect: (reward: RewardCatalogItem) => void;
  onClose: () => void;
}

export function QuickSearch({
  rewards,
  onSelect,
  onClose,
}: QuickSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rewards;
    const q = query.toLowerCase();
    return rewards.filter((r) => {
      const name = (r.name ?? "").toLowerCase();
      const desc = (r.desc ?? "").toLowerCase();
      const type = (r.ext?.rewardType ?? "").toLowerCase();
      const program = (r.ext?.programCode ?? "").toLowerCase();
      return (
        name.includes(q) ||
        desc.includes(q) ||
        type.includes(q) ||
        program.includes(q)
      );
    });
  }, [rewards, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      onSelect(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-foreground-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            data-testid="quick-search-input"
            name="quick-search"
            className="flex-1 bg-transparent text-body-sm text-foreground placeholder:text-foreground-muted outline-none"
            placeholder="Search rewards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-caption text-foreground-muted bg-subtle border border-border rounded-sm px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {filtered.length > 0 ? (
          <div ref={listRef} className="max-h-[360px] overflow-y-auto">
            {filtered.map((reward, i) => {
              const status = getRewardStatus(reward);
              return (
                <div
                  key={reward._id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer",
                    i === selectedIndex
                      ? "bg-subtle"
                      : "hover:bg-subtle/50",
                  )}
                  onClick={() => onSelect(reward)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {reward.ext?.imageListPageUrlDesktopNormal ? (
                    <img alt={reward.name ?? "Reward image"}
                      src={reward.ext.imageListPageUrlDesktopNormal}
                      className="h-8 w-8 rounded-sm object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-sm bg-subtle flex items-center justify-center shrink-0">
                      <Gift className="h-4 w-4 text-foreground-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-body-sm text-foreground truncate block">
                      {reward.name}
                    </span>
                    <span className="text-caption text-foreground-muted">
                      {reward.ext?.rewardType ?? ""}
                      {reward.ext?.rewardCostCore != null && (
                        <> &middot; {(reward.ext.rewardCostCore as number).toLocaleString()} pts</>
                      )}
                    </span>
                  </div>
                  <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-body-sm text-foreground-muted">
            No rewards found
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-caption text-foreground-muted">
          <span>
            <kbd className="bg-subtle border border-border rounded-sm px-1 py-0.5">
              &uarr;
            </kbd>{" "}
            <kbd className="bg-subtle border border-border rounded-sm px-1 py-0.5">
              &darr;
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="bg-subtle border border-border rounded-sm px-1 py-0.5">
              Enter
            </kbd>{" "}
            edit
          </span>
          <span>
            <kbd className="bg-subtle border border-border rounded-sm px-1 py-0.5">
              Esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
