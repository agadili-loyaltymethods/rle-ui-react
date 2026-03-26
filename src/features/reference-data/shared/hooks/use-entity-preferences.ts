/**
 * Model-parameterized user preference hooks for server-side table editors.
 *
 * Saves/loads table column layout and form tab order per model name
 * (e.g. "locationTableLayout", "locationFormTabOrder") in user.ext._meta.
 */

import { useCallback, useEffect, useRef } from "react";
import { getUserMeta, patchUserMeta } from "@/shared/hooks/use-user-meta";
import type { TableLayout } from "../types/server-table-types";

// ── Sync getters (read from auth store) ─────────────────────────────────────

export function getSavedEntityTableLayout(modelName: string): TableLayout | null {
  const meta = getUserMeta();
  return (meta?.[`${modelName}TableLayout`] as TableLayout) ?? null;
}

export function getSavedEntityFormTabOrder(modelName: string): string[] | null {
  const meta = getUserMeta();
  const val = meta?.[`${modelName}FormTabOrder`];
  return Array.isArray(val) ? (val as string[]) : null;
}

// ── Hook with debounced save functions ──────────────────────────────────────

export function useEntityPreferences(modelName: string) {
  const layoutTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const tabOrderTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
      if (tabOrderTimer.current) clearTimeout(tabOrderTimer.current);
    };
  }, []);

  const saveTableLayout = useCallback(
    (layout: TableLayout) => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
      layoutTimer.current = setTimeout(() => {
        patchUserMeta({ [`${modelName}TableLayout`]: layout });
      }, 500);
    },
    [modelName],
  );

  const saveFormTabOrder = useCallback(
    (order: string[]) => {
      if (tabOrderTimer.current) clearTimeout(tabOrderTimer.current);
      tabOrderTimer.current = setTimeout(() => {
        patchUserMeta({ [`${modelName}FormTabOrder`]: order });
      }, 500);
    },
    [modelName],
  );

  return { saveTableLayout, saveFormTabOrder };
}
