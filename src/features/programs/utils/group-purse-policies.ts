import type { PursePolicy } from "@/shared/types/policy";
import { toDateOnly, todayDateOnly } from "@/shared/lib/date-utils";

export interface PurseGroupEntry {
  type: "group";
  groupName: string;
  policies: PursePolicy[];
}

export interface PurseStandaloneEntry {
  type: "standalone";
  policy: PursePolicy;
}

export type PurseDisplayEntry = PurseGroupEntry | PurseStandaloneEntry;

/**
 * A policy is "qualifying" if it has both `group` AND `periodStartDate` set.
 * Otherwise it's treated as redeemable/standalone.
 */
function isQualifying(p: PursePolicy): boolean {
  return !!p.group && !!p.periodStartDate;
}

/**
 * Groups qualifying purse policies by their `group` name and returns
 * a mixed list of group entries and standalone entries.
 *
 * - Qualifying policies (group + periodStartDate) are grouped by group name,
 *   with periods sorted by periodStartDate descending (most recent first).
 * - All others appear as standalone entries.
 * - Result order: groups first (alphabetical), then standalone (alphabetical by name).
 */
export function groupPursePolicies(policies: PursePolicy[]): PurseDisplayEntry[] {
  const groupMap = new Map<string, PursePolicy[]>();
  const standalone: PursePolicy[] = [];

  for (const p of policies) {
    if (isQualifying(p)) {
      const existing = groupMap.get(p.group!);
      if (existing) {
        existing.push(p);
      } else {
        groupMap.set(p.group!, [p]);
      }
    } else {
      standalone.push(p);
    }
  }

  // Sort periods within each group: open periods first, then closed,
  // with periodStartDate descending (most recent first) within each category.
  const today = todayDateOnly();
  const isPast = (p: PursePolicy) => !!p.periodEndDate && toDateOnly(p.periodEndDate) < today;

  for (const periods of groupMap.values()) {
    periods.sort((a, b) => {
      const aPast = isPast(a) ? 1 : 0;
      const bPast = isPast(b) ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast; // open (0) before closed (1)
      const da = a.periodStartDate ?? "";
      const db = b.periodStartDate ?? "";
      return db.localeCompare(da);
    });
  }

  // Build result: groups first (alphabetical), then standalone (alphabetical)
  const groupEntries: PurseGroupEntry[] = [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, groupPolicies]) => ({
      type: "group" as const,
      groupName,
      policies: groupPolicies,
    }));

  const standaloneEntries: PurseStandaloneEntry[] = standalone
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((policy) => ({
      type: "standalone" as const,
      policy,
    }));

  return [...groupEntries, ...standaloneEntries];
}
