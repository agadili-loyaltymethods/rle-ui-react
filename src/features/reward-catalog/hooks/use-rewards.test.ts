import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { renderHook, waitFor, createWrapper, act } from "@/test-utils";
import { apiClient } from "@/shared/lib/api-client";
import {
  useCreateRewardCatalogItem,
  useUpdateRewardCatalogItem,
  useDeleteRewardCatalogItem,
  useBulkUpdateRewardPolicies,
  useBulkDeleteRewardPolicies,
} from "./use-rewards";

const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-rewards", () => {
  // ── Export checks ──────────────────────────────────────────────────────────
  it("exports all reward mutation hooks", () => {
    expect(useCreateRewardCatalogItem).toBeTypeOf("function");
    expect(useUpdateRewardCatalogItem).toBeTypeOf("function");
    expect(useDeleteRewardCatalogItem).toBeTypeOf("function");
    expect(useBulkUpdateRewardPolicies).toBeTypeOf("function");
    expect(useBulkDeleteRewardPolicies).toBeTypeOf("function");
  });

  // ── useCreateRewardCatalogItem ─────────────────────────────────────────────
  describe("useCreateRewardCatalogItem", () => {
    it("returns mutation shape", () => {
      const { result } = renderHook(() => useCreateRewardCatalogItem(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toHaveProperty("mutateAsync");
      expect(result.current).toHaveProperty("isPending");
    });

    it("calls POST rewardpolicies endpoint", async () => {
      const newReward = { name: "New Reward", desc: "A test reward" };
      mockPost.mockResolvedValue({ data: { _id: "new-1", ...newReward } });

      const { result } = renderHook(() => useCreateRewardCatalogItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(newReward as never);
      });

      expect(mockPost).toHaveBeenCalledWith("rewardpolicies", newReward);
    });
  });

  // ── useUpdateRewardCatalogItem ─────────────────────────────────────────────
  describe("useUpdateRewardCatalogItem", () => {
    it("returns mutation shape", () => {
      const { result } = renderHook(() => useUpdateRewardCatalogItem(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toHaveProperty("mutateAsync");
      expect(result.current).toHaveProperty("isPending");
    });

    it("calls PATCH rewardpolicies/{id} endpoint", async () => {
      const updatedData = { name: "Updated Reward" };
      mockPatch.mockResolvedValue({ data: { _id: "rew-1", ...updatedData } });

      const { result } = renderHook(() => useUpdateRewardCatalogItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: "rew-1", data: updatedData as never });
      });

      expect(mockPatch).toHaveBeenCalledWith("rewardpolicies/rew-1", updatedData);
    });
  });

  // ── useDeleteRewardCatalogItem ─────────────────────────────────────────────
  describe("useDeleteRewardCatalogItem", () => {
    it("returns mutation shape", () => {
      const { result } = renderHook(() => useDeleteRewardCatalogItem(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toHaveProperty("mutateAsync");
      expect(result.current).toHaveProperty("isPending");
    });

    it("calls DELETE rewardpolicies/{id} endpoint", async () => {
      mockDelete.mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useDeleteRewardCatalogItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync("rew-1");
      });

      expect(mockDelete).toHaveBeenCalledWith("rewardpolicies/rew-1");
    });
  });

  // ── useBulkUpdateRewardPolicies ────────────────────────────────────────────
  describe("useBulkUpdateRewardPolicies", () => {
    it("returns mutation shape", () => {
      const { result } = renderHook(() => useBulkUpdateRewardPolicies(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toHaveProperty("mutateAsync");
      expect(result.current).toHaveProperty("isPending");
    });

    it("calls PATCH multiedit with model, ids, and update", async () => {
      mockPatch.mockResolvedValue({ data: { modified: 2 } });

      const { result } = renderHook(() => useBulkUpdateRewardPolicies(), {
        wrapper: createWrapper(),
      });

      const ids = ["rew-1", "rew-2"];
      const update = { desc: "Bulk updated" };

      await act(async () => {
        await result.current.mutateAsync({ ids, update });
      });

      expect(mockPatch).toHaveBeenCalledWith("multiedit", {
        model: "RewardPolicy",
        ids,
        update,
      });
    });
  });

  // ── useBulkDeleteRewardPolicies ────────────────────────────────────────────
  describe("useBulkDeleteRewardPolicies", () => {
    it("returns mutation shape", () => {
      const { result } = renderHook(() => useBulkDeleteRewardPolicies(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toHaveProperty("mutateAsync");
      expect(result.current).toHaveProperty("isPending");
    });

    it("calls POST multidelete with model and ids", async () => {
      mockPost.mockResolvedValue({ data: { deleted: 3 } });

      const { result } = renderHook(() => useBulkDeleteRewardPolicies(), {
        wrapper: createWrapper(),
      });

      const ids = ["rew-1", "rew-2", "rew-3"];

      await act(async () => {
        await result.current.mutateAsync(ids);
      });

      expect(mockPost).toHaveBeenCalledWith("multidelete", {
        model: "RewardPolicy",
        ids,
      });
    });
  });
});
