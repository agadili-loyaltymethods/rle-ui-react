import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { LoginRequest, LoginResponse, MyAccountResponse, OidcSyncRequest } from "@/shared/types/auth";

/**
 * Login mutation — POSTs JSON credentials to /api/login,
 * then fetches user info from /api/myaccount.
 */
export function useLogin() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const loginRes = await apiClient.post<LoginResponse>("/login", {
        username: credentials.username,
        password: credentials.password,
        locale: credentials.locale ?? "en",
      });

      const token = loginRes.data.token;

      // Fetch user info with the new token
      const accountRes = await apiClient.get<MyAccountResponse>("/myaccount", {
        headers: { Authorization: `Bearer ${token}` },
      });

      return { token, account: accountRes.data, username: credentials.username };
    },
    onSuccess: ({ token, account, username }) => {
      // Parse org from username (e.g. "mgm/admin" → org "mgm")
      const parts = username.split("/");
      const org = parts.length > 1 ? parts[0]! : "";

      authLogin(token, {
        id: account.id,
        login: account.login,
        email: account.email,
        empName: account.empName,
        org,
        division: account.division?._id,
        possibleDivisions: account.possibleDivisions?.map((d) => d._id),
        uberFlag: account.uberFlag,
      });
    },
  });
}

/**
 * Logout — clears auth store. If OIDC is enabled, redirects to Okta
 * logout URL; otherwise redirects to /login.
 */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return {
    logout: async () => {
      logout();
      try {
        const res = await apiClient.get<{ logoutUrl: string | null }>("/oidc/logout");
        if (res.data.logoutUrl) {
          window.location.href = res.data.logoutUrl;
          return;
        }
      } catch {
        // If the endpoint fails, fall through to normal redirect
      }
      window.location.href = "/login";
    },
  };
}

/**
 * Current authenticated user from the auth store.
 */
export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return { user, isAuthenticated };
}

/**
 * OIDC token exchange mutation.
 */
export function useOidcSync() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (request: OidcSyncRequest) => {
      const response = await apiClient.post<LoginResponse>("/oidc/sync", request);
      return response.data;
    },
    onSuccess: (data) => {
      // OIDC flow — token only, user info fetched separately
      authLogin(data.token, {
        id: "",
        login: "",
        email: "",
      });
    },
  });
}
