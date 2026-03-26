import { create } from "zustand";
import { clearPermissionCache, fetchAllPermissions } from "@/shared/hooks/use-permissions";

export interface AuthUser {
  id: string;
  login: string;
  email: string;
  empName?: string;
  roles?: string[];
  permissions?: Record<string, string[]>;
  org?: string;
  division?: string;
  possibleDivisions?: string[];
  uberFlag?: boolean;
  ext?: Record<string, unknown>;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

function loadToken(): string | null {
  try {
    return sessionStorage.getItem("rcx.auth.token");
  } catch {
    return null;
  }
}

function loadUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem("rcx.auth.user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const token = loadToken();
  const user = loadUser();
  const isAuthenticated = !!token && !!user;

  // If already authenticated (page refresh), eagerly fetch permissions.
  // Deferred to a microtask so all modules finish initializing first.
  if (isAuthenticated) {
    queueMicrotask(() => fetchAllPermissions());
  }

  return {
    user,
    token,
    isAuthenticated,

    login: (token, user) => {
      sessionStorage.setItem("rcx.auth.token", token);
      sessionStorage.setItem("rcx.auth.user", JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
      fetchAllPermissions();
    },

    logout: () => {
      sessionStorage.removeItem("rcx.auth.token");
      sessionStorage.removeItem("rcx.auth.user");
      clearPermissionCache();
      set({ token: null, user: null, isAuthenticated: false });
    },

    setUser: (user) => {
      sessionStorage.setItem("rcx.auth.user", JSON.stringify(user));
      set({ user });
    },
  };
});
