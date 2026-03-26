import axios from "axios";
import type { ApiError } from "@/shared/types/api";
import { useAuthStore } from "@/shared/stores/auth-store";

const apiClient = axios.create({
  baseURL: "/api/",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const { token, user } = useAuthStore.getState();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (user?.org) {
    config.headers["x-org"] = user.org;
  }

  if (user?.division) {
    config.headers["x-division"] = user.division;
  }

  return config;
});

// Codes that mean the session/token is genuinely invalid — redirect to login.
// 1003=invalid credentials, 1005=expired token, 1006=expired reset,
// 1008=account blocked, 1009=logged out, 1010=unauthorized/bad JWT,
// 1116=account deactivated
const AUTH_FAILURE_CODES = new Set([1003, 1005, 1006, 1008, 1009, 1010, 1116]);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const requestUrl = error.config?.url ?? "";
      const isAuthRequest = requestUrl === "/login" || requestUrl === "/oidc/sync";

      const status = error.response?.status;
      const errorCode: number | undefined = error.response?.data?.code;

      // Check both 401 and 403 — some auth failures (blocked, deactivated, logged out)
      // return 403. ACL permission denials (e.g. code 1104) also return 401 but should
      // NOT redirect to login — those fall through to the normal error handler.
      if ((status === 401 || status === 403) && !isAuthRequest) {
        if (errorCode != null && AUTH_FAILURE_CODES.has(errorCode)) {
          useAuthStore.getState().logout();
          window.location.href = "/login";
          return Promise.reject(error);
        }
        // No recognized auth code — could be a 401 without a code body
        // (e.g. proxy/gateway timeout). Redirect only if there's no code at all
        // on a 401, since that likely means the token was rejected before
        // reaching the app layer.
        if (status === 401 && errorCode == null) {
          useAuthStore.getState().logout();
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      const data = error.response?.data;
      const apiError: ApiError = {
        name: data?.name ?? "ApiError",
        message:
          data?.message ??
          error.message ??
          "An unexpected error occurred",
        statusCode: error.response?.status ?? 500,
        code: typeof data?.code === "number" ? data.code : undefined,
        details: Array.isArray(data?.details)
          ? (data.details as { path?: string; message?: string }[]).map(
              (d) => ({
                path: d.path ?? "",
                message: d.message ?? "",
              }),
            )
          : undefined,
      };

      return Promise.reject(apiError);
    }

    return Promise.reject(error);
  },
);

export { apiClient };
