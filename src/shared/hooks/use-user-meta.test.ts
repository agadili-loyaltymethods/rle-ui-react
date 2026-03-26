import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, mockUnauthenticatedUser, mockAuthenticatedUser } from "@/test-utils";

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
import { useUserExtLoader, getUserMeta, patchUserMeta } from "./use-user-meta";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>;

describe("use-user-meta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUnauthenticatedUser();
  });

  describe("useUserExtLoader", () => {
    it("returns true immediately when no user is logged in", () => {
      const { result } = renderHook(() => useUserExtLoader());
      expect(result.current).toBe(true);
    });

    it("returns true immediately when user already has ext._meta", () => {
      mockAuthenticatedUser({
        user: {
          id: "u1",
          login: "gap/test",
          email: "t@t.com",
          ext: { _meta: { pref: "value" } },
        },
      });

      const { result } = renderHook(() => useUserExtLoader());
      expect(result.current).toBe(true);
    });

    it("fetches ext from API when user has no ext._meta", async () => {
      mockAuthenticatedUser({
        user: { id: "u1", login: "gap/test", email: "t@t.com" },
      });

      mockGet.mockResolvedValueOnce({
        data: { ext: { _meta: { savedPref: true } } },
      });

      const { result } = renderHook(() => useUserExtLoader());

      await waitFor(() => expect(result.current).toBe(true));

      expect(mockGet).toHaveBeenCalledWith("users/u1", {
        params: { select: "ext" },
      });
    });
  });

  describe("getUserMeta", () => {
    it("returns null when no user is logged in", () => {
      expect(getUserMeta()).toBeNull();
    });

    it("returns null when user has no ext", () => {
      mockAuthenticatedUser({
        user: { id: "u1", login: "gap/test", email: "t@t.com" },
      });

      expect(getUserMeta()).toBeNull();
    });

    it("returns _meta when user has ext._meta", () => {
      mockAuthenticatedUser({
        user: {
          id: "u1",
          login: "gap/test",
          email: "t@t.com",
          ext: { _meta: { layout: "grid" } },
        },
      });

      expect(getUserMeta()).toEqual({ layout: "grid" });
    });
  });

  describe("patchUserMeta", () => {
    it("does nothing when no user is logged in", async () => {
      await patchUserMeta({ key: "value" });
      expect(mockPatch).not.toHaveBeenCalled();
    });

    it("optimistically updates local store and patches API", async () => {
      mockAuthenticatedUser({
        user: {
          id: "u1",
          login: "gap/test",
          email: "t@t.com",
          ext: { _meta: { existing: "val" } },
        },
      });

      mockPatch.mockResolvedValueOnce({});

      await patchUserMeta({ newPref: "hello" });

      // Should have updated the store optimistically
      const meta = getUserMeta();
      expect(meta).toEqual({ existing: "val", newPref: "hello" });

      // Should have called the API
      expect(mockPatch).toHaveBeenCalledWith("users/u1", {
        ext: { _meta: { newPref: "hello" } },
      });
    });

    it("rolls back optimistic update on API failure", async () => {
      mockAuthenticatedUser({
        user: {
          id: "u1",
          login: "gap/test",
          email: "t@t.com",
          ext: { _meta: { existing: "val" } },
        },
      });

      mockPatch.mockRejectedValueOnce(new Error("Network error"));

      await patchUserMeta({ badPref: "fail" });

      // Should rollback to original state
      const meta = getUserMeta();
      expect(meta).toEqual({ existing: "val" });
    });
  });
});
