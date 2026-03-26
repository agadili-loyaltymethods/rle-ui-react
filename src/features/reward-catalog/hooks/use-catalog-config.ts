import { useProgramMeta } from "@/features/programs/hooks/use-program-meta";
import { useUIStore } from "@/shared/stores/ui-store";

/** Maps tier level names to numeric ext field names. */
export interface TierLevelFieldMap {
  [levelName: string]: string;
}

export interface RewardsCatalogConfig {
  intendedUse: "Reward" | "Offer";
  cardImageField: string;
  pricingMode: "single" | "per-tier";
  tierPolicyId: string;
  tierLevelFields: TierLevelFieldMap;
}

const DEFAULTS: RewardsCatalogConfig = {
  intendedUse: "Reward",
  cardImageField: "imageListPageUrlDesktopNormal",
  pricingMode: "per-tier",
  tierPolicyId: "",
  tierLevelFields: {},
};

export function useCatalogConfig() {
  const currentProgram = useUIStore((s) => s.currentProgram);
  const { data, isLoading } = useProgramMeta<RewardsCatalogConfig>(
    currentProgram ?? undefined,
    "Rewards Catalog",
  );

  return {
    config: data ?? DEFAULTS,
    isLoading,
  };
}
