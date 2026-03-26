/**
 * Hooks for persisting reward catalog user preferences via ext._meta on the user record.
 */

import { useCallback, useEffect, useRef } from "react";
import type { TableLayout, RewardStatus, CustomDateRange } from "../types/reward-policy";
import { useUserExtLoader, getUserMeta, patchUserMeta } from "@/shared/hooks/use-user-meta";

// Re-export for existing import sites
export { useUserExtLoader };

// ── Read helpers (sync, from auth store) ────────────────────────────────────

export function getSavedTableLayout(): TableLayout | null {
  const meta = getUserMeta();
  return (meta?.rewardsTableLayout as TableLayout) ?? null;
}

export function getSavedFormTabOrder(): string[] | null {
  const meta = getUserMeta();
  const val = meta?.rewardFormTabOrder;
  return Array.isArray(val) ? (val as string[]) : null;
}

export function getSavedFilterStatus(): RewardStatus[] {
  const meta = getUserMeta();
  const saved = meta?.rewardsFilterStatus;
  if (!saved) return [];
  if (saved === "all") return [];
  if (typeof saved === "string") {
    if (["active", "expired", "future"].includes(saved))
      return [saved as RewardStatus];
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr))
        return arr.filter((s: string) =>
          ["active", "expired", "future"].includes(s),
        );
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function getSavedExpirationSince(): string | null {
  const meta = getUserMeta();
  return (meta?.rewardsExpirationSince as string) ?? null;
}

export function getSavedCustomDateRange(): CustomDateRange | null {
  const meta = getUserMeta();
  const val = meta?.rewardsCustomDateRange;
  if (val && typeof val === "object" && "start" in (val as object) && "end" in (val as object)) {
    return val as CustomDateRange;
  }
  return null;
}

// ── Save helpers (async, debounced) ─────────────────────────────────────────

/**
 * Hook returning debounced save functions for reward catalog preferences.
 */
export function useRewardPreferences() {
  const layoutTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const tabOrderTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const filterStatusTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const expirationTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const customRangeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Clear all pending timers on unmount to prevent stale API calls
  useEffect(() => {
    return () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
      if (tabOrderTimer.current) clearTimeout(tabOrderTimer.current);
      if (filterStatusTimer.current) clearTimeout(filterStatusTimer.current);
      if (expirationTimer.current) clearTimeout(expirationTimer.current);
      if (customRangeTimer.current) clearTimeout(customRangeTimer.current);
    };
  }, []);

  const saveTableLayout = useCallback((layout: TableLayout) => {
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    layoutTimer.current = setTimeout(() => {
      patchUserMeta({ rewardsTableLayout: layout });
    }, 500);
  }, []);

  const saveFormTabOrder = useCallback((order: string[]) => {
    if (tabOrderTimer.current) clearTimeout(tabOrderTimer.current);
    tabOrderTimer.current = setTimeout(() => {
      patchUserMeta({ rewardFormTabOrder: order });
    }, 500);
  }, []);

  const saveFilterStatus = useCallback((status: RewardStatus[]) => {
    if (filterStatusTimer.current) clearTimeout(filterStatusTimer.current);
    filterStatusTimer.current = setTimeout(() => {
      patchUserMeta({
        rewardsFilterStatus:
          status.length === 0 ? "all" : JSON.stringify(status),
      });
    }, 500);
  }, []);

  const saveExpirationSince = useCallback((value: string) => {
    if (expirationTimer.current) clearTimeout(expirationTimer.current);
    expirationTimer.current = setTimeout(() => {
      patchUserMeta({ rewardsExpirationSince: value });
    }, 500);
  }, []);

  const saveCustomDateRange = useCallback((range: CustomDateRange) => {
    if (customRangeTimer.current) clearTimeout(customRangeTimer.current);
    customRangeTimer.current = setTimeout(() => {
      patchUserMeta({ rewardsCustomDateRange: range });
    }, 500);
  }, []);

  return {
    saveTableLayout,
    saveFormTabOrder,
    saveFilterStatus,
    saveExpirationSince,
    saveCustomDateRange,
  };
}
