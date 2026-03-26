import { useSyncExternalStore, useCallback } from "react";
import { apiClient } from "@/shared/lib/api-client";

export interface Permissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** True while the permissions fetch is in-flight. */
  isLoading: boolean;
}

const ALL_DENIED: Permissions = { canRead: false, canCreate: false, canUpdate: false, canDelete: false, isLoading: false };
const ALL_DENIED_LOADING: Permissions = { canRead: false, canCreate: false, canUpdate: false, canDelete: false, isLoading: true };

// ── In-memory singleton cache ──────────────────────────────────────────
// Populated once from GET /acl/permissions after login.
// Cleared on logout. No localStorage/sessionStorage.

/** Map from lowercase plural endpoint (e.g. "pursepolicies") → CRUD flags. */
const cache = new Map<string, Permissions>();
const listeners = new Set<() => void>();

let fetchState: "idle" | "loading" | "done" = "idle";
let fetchPromise: Promise<void> | null = null;

function notify() {
  for (const fn of listeners) fn();
}

/** Clear the entire permission cache (e.g. on logout). */
export function clearPermissionCache() {
  cache.clear();
  fetchState = "idle";
  fetchPromise = null;
  notify();
}

// ── Model name → endpoint mapping ────────────────────────────────────────
// The backend returns PascalCase model names (e.g. "PursePolicy").
// express-restify-mongoose exposes them as lowercase plural endpoints
// (e.g. "pursepolicies"). We convert by lowercasing and appending "s"
// for models that don't already end in "s".

/**
 * Convert a PascalCase model name to the lowercase plural endpoint that
 * express-restify-mongoose generates. Covers the standard English
 * pluralization rules the backend uses (via mongoose-legacy-pluralize).
 *
 * Returns an array of possible keys so we can register all variants
 * and guarantee lookup hits regardless of which form callers use.
 */
function modelToEndpoints(model: string): string[] {
  const lower = model.toLowerCase();
  const keys = [lower]; // always store the raw lowercase form

  if (lower.endsWith("s") || lower.endsWith("data") || lower.endsWith("history")) {
    // Already looks plural or is a mass noun — no extra suffix
    return keys;
  }
  if (lower.endsWith("y") && !lower.endsWith("ey") && !lower.endsWith("oy")) {
    // consonant + y → ies (policy → policies, activity → activities)
    keys.push(lower.slice(0, -1) + "ies");
  } else {
    keys.push(lower + "s");
  }
  return keys;
}

// ── Fetch logic ──────────────────────────────────────────────────────────

interface AclResponse {
  permissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
}

/**
 * Fetch all permissions from GET /acl/permissions and populate the cache.
 * Called once after login; results are cached for the session.
 * Fail-closed: on error, cache stays empty (all endpoints denied).
 */
export function fetchAllPermissions(): Promise<void> {
  if (fetchState !== "idle") return fetchPromise ?? Promise.resolve();

  fetchState = "loading";
  notify();

  fetchPromise = apiClient
    .get<AclResponse>("/acl/permissions")
    .then((res) => {
      const perms = res.data.permissions;
      for (const [model, crud] of Object.entries(perms)) {
        const snapshot: Permissions = {
          canRead: crud.read,
          canCreate: crud.create,
          canUpdate: crud.update,
          canDelete: crud.delete,
          isLoading: false,
        };
        // Register under all possible endpoint variants
        for (const key of modelToEndpoints(model)) {
          cache.set(key, snapshot);
        }
      }
      fetchState = "done";
      notify();
    })
    .catch(() => {
      // Fail-closed: leave cache empty, all endpoints will return ALL_DENIED
      fetchState = "done";
      notify();
    });

  return fetchPromise;
}

// ── Hook ───────────────────────────────────────────────────────────────

/**
 * Hook that returns CRUD permissions for a given entity/endpoint.
 *
 * Permissions are fetched once from GET /acl/permissions after login and
 * stored in a module-level singleton Map (in-memory only, never persisted
 * to localStorage/sessionStorage). The cache is cleared on logout.
 *
 * Returns `isLoading: true` while the initial fetch is in-flight so pages
 * can show a skeleton instead of flashing restricted → full UI.
 */
export function usePermissions(entity: string): Permissions {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const getSnapshot = useCallback((): Permissions => {
    if (fetchState === "idle") return ALL_DENIED;
    if (fetchState === "loading") return ALL_DENIED_LOADING;
    return cache.get(entity) ?? ALL_DENIED;
  }, [entity]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
