import { AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/shared/types/api";
import { useAuthStore } from "@/shared/stores/auth-store";
import { apiClient } from "./api-client";

function make401Error(url: string, data?: Record<string, unknown>) {
  const error = new Error("Request failed with status code 401") as any;
  error.isAxiosError = true;
  error.config = { url, headers: new AxiosHeaders() };
  error.response = {
    status: 401,
    data: data ?? { message: "Unauthorized" },
  };
  return error;
}

const originalLocation = window.location;
const mockLocation = { href: "" } as Location;

let mockAdapter: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: mockLocation,
  });
  mockLocation.href = "";

  useAuthStore.setState({
    token: "test-token",
    user: { id: "u1", login: "gap/tester", email: "t@t.com", org: "gap", division: "us" },
    isAuthenticated: true,
  });

  mockAdapter = vi.fn();
  apiClient.defaults.adapter = mockAdapter;
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe("api-client 401 response interceptor", () => {
  it("does NOT logout or redirect when /login returns 401", async () => {
    mockAdapter.mockRejectedValueOnce(
      make401Error("/login", { name: "AuthError", message: "Invalid credentials" }),
    );

    const rejected = await apiClient.post("/login").catch((e: unknown) => e);

    const apiError = rejected as ApiError;
    expect(apiError.message).toBe("Invalid credentials");
    expect(apiError.statusCode).toBe(401);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockLocation.href).toBe("");
  });

  it("does NOT logout or redirect when /oidc/sync returns 401", async () => {
    mockAdapter.mockRejectedValueOnce(
      make401Error("/oidc/sync", { name: "AuthError", message: "OIDC sync failed" }),
    );

    const rejected = await apiClient.post("/oidc/sync").catch((e: unknown) => e);

    const apiError = rejected as ApiError;
    expect(apiError.message).toBe("OIDC sync failed");
    expect(apiError.statusCode).toBe(401);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockLocation.href).toBe("");
  });

  it("logs out and redirects to /login for 401 on other endpoints", async () => {
    mockAdapter.mockRejectedValueOnce(make401Error("/members"));

    await apiClient.get("/members").catch(() => {});

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(mockLocation.href).toBe("/login");
  });

  it("does NOT redirect for 401 with ACL permission denial code (1104)", async () => {
    mockAdapter.mockRejectedValueOnce(
      make401Error("/divisions/abc123", {
        message: "Division : No DELETE permission",
        status: 401,
        code: 1104,
      }),
    );

    const rejected = await apiClient
      .delete("/divisions/abc123")
      .catch((e: unknown) => e);

    const apiError = rejected as ApiError;
    expect(apiError.message).toBe("Division : No DELETE permission");
    expect(apiError.code).toBe(1104);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockLocation.href).toBe("");
  });

  it("redirects for 401 with auth failure code (1005 expired token)", async () => {
    mockAdapter.mockRejectedValueOnce(
      make401Error("/members", {
        message: "Token expired",
        status: 401,
        code: 1005,
      }),
    );

    await apiClient.get("/members").catch(() => {});

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockLocation.href).toBe("/login");
  });
});
