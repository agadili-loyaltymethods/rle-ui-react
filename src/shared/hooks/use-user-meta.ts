/**
 * Shared utilities for persisting user preferences via ext._meta on the user record.
 *
 * Extracted from reward-catalog so any feature can read/write user._meta fields.
 */

import { useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";

// ── Load user ext on mount ──────────────────────────────────────────────────

/**
 * Fetches the current user's `ext` field from the API and merges it into the
 * auth store. The /myaccount endpoint does not return `ext`, so we fetch it
 * directly from the users endpoint.
 *
 * Returns `true` once the ext data has been loaded (or skipped if no user).
 */
export function useUserExtLoader(): boolean {
  const [loaded, setLoaded] = useState(() => {
    // If ext is already populated (e.g. from a previous load), skip fetch
    return !!useAuthStore.getState().user?.ext?._meta;
  });

  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (!user?.id || user.ext?._meta) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    apiClient
      .get<{ ext?: Record<string, unknown> }>(`users/${user.id}`, {
        params: { select: "ext" },
      })
      .then((resp) => {
        if (cancelled) return;
        const ext = resp.data?.ext;
        if (ext) {
          const current = useAuthStore.getState().user;
          if (current) {
            useAuthStore.getState().setUser({
              ...current,
              ext: { ...current.ext, ...ext },
            });
          }
        }
      })
      .catch(() => {
        // Non-critical — proceed without preferences
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, []);

  return loaded;
}

// ── Read helpers (sync, from auth store) ────────────────────────────────────

export function getUserMeta(): Record<string, unknown> | null {
  const user = useAuthStore.getState().user;
  if (!user?.ext) return null;
  return (user.ext._meta as Record<string, unknown>) ?? null;
}

// ── Write helpers (async) ───────────────────────────────────────────────────

export async function patchUserMeta(
  patch: Record<string, unknown>,
): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user?.id) return;

  // Eagerly update local store so reads are immediate
  const previousUser = { ...user, ext: user.ext ? { ...user.ext } : undefined };
  const currentMeta = (user.ext?._meta as Record<string, unknown>) ?? {};
  useAuthStore.getState().setUser({
    ...user,
    ext: {
      ...user.ext,
      _meta: { ...currentMeta, ...patch },
    },
  });

  try {
    // ERM uses moredots + $set, so { ext: { _meta: patch } } becomes
    // $set: { "ext._meta.key": value } — no risk of overwriting sibling keys.
    await apiClient.patch(`users/${user.id}`, {
      ext: { _meta: patch },
    });
  } catch {
    // Rollback optimistic update so local state doesn't diverge from server
    useAuthStore.getState().setUser(previousUser);
  }
}
