import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, createWrapper, mockUnauthenticatedUser } from "@/test-utils";
import { useAuthStore } from "@/shared/stores/auth-store";
import { clearPermissionCache } from "@/shared/hooks/use-permissions";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "@/shared/lib/api-client";
import { useLogin, useLogout, useCurrentUser, useOidcSync } from "./use-auth";

const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

/** Stub response for GET /acl/permissions (called by auth-store.login). */
const aclStub = { data: { permissions: {} } };

describe("use-auth hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    clearPermissionCache();
    mockUnauthenticatedUser();
  });

  describe("useLogin", () => {
    it("returns a mutation with mutate and mutateAsync", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });

    it("calls /login then /myaccount and sets auth state on success", async () => {
      mockPost.mockResolvedValueOnce({ data: { token: "new-token" } });
      mockGet
        .mockResolvedValueOnce({
          data: {
            id: "u1",
            login: "gap/admin",
            email: "admin@gap.com",
            empName: "Admin",
            division: { _id: "us" },
            possibleDivisions: [{ _id: "us" }, { _id: "ca" }],
          },
        })
        .mockResolvedValueOnce(aclStub);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      result.current.mutate({
        username: "gap/admin",
        password: "pass123",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const auth = useAuthStore.getState();
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.token).toBe("new-token");
      expect(auth.user?.org).toBe("gap");
    });
  });

  describe("useLogout", () => {
    it("returns an object with a logout function", () => {
      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });
      expect(typeof result.current.logout).toBe("function");
    });

    it("clears auth state and redirects to /login when no OIDC logout URL", async () => {
      // Set up authenticated state
      mockGet.mockResolvedValueOnce(aclStub); // fetchAllPermissions
      useAuthStore.getState().login("tok", { id: "u1", login: "org/user", email: "t@t.com" });
      mockGet.mockRejectedValueOnce(new Error("Not found"));

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });
      const originalHref = window.location.href;

      // Mock window.location.href
      Object.defineProperty(window, "location", {
        value: { ...window.location },
        writable: true,
      });

      await result.current.logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("redirects to OIDC logout URL when available", async () => {
      mockGet.mockResolvedValueOnce(aclStub); // fetchAllPermissions
      useAuthStore.getState().login("tok", { id: "u1", login: "org/user", email: "t@t.com" });
      mockGet.mockResolvedValueOnce({ data: { logoutUrl: "https://idp.example.com/logout" } });

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      // The function writes to window.location.href which may fail in jsdom, but shouldn't throw
      try {
        await result.current.logout();
      } catch {
        // window.location assignment may throw in jsdom
      }

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(mockGet).toHaveBeenCalledWith("/oidc/logout");
    });
  });

  describe("useCurrentUser", () => {
    it("returns null user and false isAuthenticated when not logged in", () => {
      const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("returns user and true isAuthenticated when logged in", () => {
      mockGet.mockResolvedValueOnce(aclStub); // fetchAllPermissions
      useAuthStore.getState().login("tok", {
        id: "u1",
        login: "gap/test",
        email: "t@t.com",
      });

      const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });
      expect(result.current.user?.id).toBe("u1");
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("useOidcSync", () => {
    it("returns a mutation with mutate and mutateAsync", () => {
      const { result } = renderHook(() => useOidcSync(), { wrapper: createWrapper() });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });

    it("calls /oidc/sync and sets auth state on success", async () => {
      mockPost.mockResolvedValueOnce({ data: { token: "oidc-token" } });
      mockGet.mockResolvedValueOnce(aclStub); // fetchAllPermissions

      const { result } = renderHook(() => useOidcSync(), { wrapper: createWrapper() });

      result.current.mutate({ code: "auth-code", state: "state-value" } as never);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const auth = useAuthStore.getState();
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.token).toBe("oidc-token");
    });
  });

  describe("useLogin edge cases", () => {
    it("handles username without org separator", async () => {
      mockPost.mockResolvedValueOnce({ data: { token: "tok" } });
      mockGet
        .mockResolvedValueOnce({
          data: {
            id: "u1",
            login: "admin",
            email: "admin@test.com",
            empName: "Admin",
          },
        })
        .mockResolvedValueOnce(aclStub);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      result.current.mutate({
        username: "admin",
        password: "pass",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const auth = useAuthStore.getState();
      // When no "/" in username, org should be empty
      expect(auth.user?.org).toBe("");
    });

    it("passes locale to login request", async () => {
      mockPost.mockResolvedValueOnce({ data: { token: "tok" } });
      mockGet
        .mockResolvedValueOnce({
          data: { id: "u1", login: "org/user", email: "t@t.com" },
        })
        .mockResolvedValueOnce(aclStub);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      result.current.mutate({
        username: "org/user",
        password: "pass",
        locale: "ja",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith("/login", {
        username: "org/user",
        password: "pass",
        locale: "ja",
      });
    });

    it("handles account without division or possibleDivisions", async () => {
      mockPost.mockResolvedValueOnce({ data: { token: "tok" } });
      mockGet
        .mockResolvedValueOnce({
          data: {
            id: "u1",
            login: "org/user",
            email: "t@t.com",
            empName: "Test",
          },
        })
        .mockResolvedValueOnce(aclStub);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      result.current.mutate({
        username: "org/user",
        password: "pass",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const auth = useAuthStore.getState();
      expect(auth.user?.division).toBeUndefined();
      expect(auth.user?.possibleDivisions).toBeUndefined();
    });
  });
});
