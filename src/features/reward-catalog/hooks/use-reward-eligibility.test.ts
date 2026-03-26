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

import { renderHook, waitFor, createWrapper } from "@/test-utils";
import { apiClient } from "@/shared/lib/api-client";
import { useSegmentOptions, useTierPolicyOptions } from "./use-reward-eligibility";

const mockGet = vi.mocked(apiClient.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-reward-eligibility", () => {
  describe("useSegmentOptions", () => {
    it("returns empty options initially", () => {
      mockGet.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });

      const { result } = renderHook(() => useSegmentOptions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.options).toEqual([]);
      expect(result.current).toHaveProperty("isLoading");
    });

    it("maps API segments to SegmentOption format", async () => {
      mockGet.mockResolvedValue({
        data: [
          { _id: "seg-1", name: "Gold Members" },
          { _id: "seg-2", name: "Silver Members" },
        ],
        headers: { "x-total-count": "2" },
      });

      const { result } = renderHook(() => useSegmentOptions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([
        { id: "seg-1", name: "Gold Members" },
        { id: "seg-2", name: "Silver Members" },
      ]);
    });

    it("returns empty options when API returns empty array", async () => {
      mockGet.mockResolvedValue({
        data: [],
        headers: { "x-total-count": "0" },
      });

      const { result } = renderHook(() => useSegmentOptions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([]);
    });

    it("calls segments endpoint with correct params", async () => {
      mockGet.mockResolvedValue({
        data: [],
        headers: { "x-total-count": "0" },
      });

      renderHook(() => useSegmentOptions(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());

      expect(mockGet).toHaveBeenCalledWith("segments", {
        params: expect.objectContaining({
          select: "_id,name",
          limit: "200",
          sort: "name",
        }),
      });
    });
  });

  describe("useTierPolicyOptions", () => {
    it("returns empty options initially", () => {
      mockGet.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });

      const { result } = renderHook(() => useTierPolicyOptions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.options).toEqual([]);
      expect(result.current).toHaveProperty("isLoading");
    });

    it("maps API tier policies to TierPolicyOption format", async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            _id: "tp-1",
            name: "Standard Tiers",
            primary: true,
            levels: [{ name: "Bronze" }, { name: "Silver" }, { name: "Gold" }],
          },
          {
            _id: "tp-2",
            name: "VIP Tiers",
            levels: [{ name: "VIP" }],
          },
        ],
        headers: { "x-total-count": "2" },
      });

      const { result } = renderHook(() => useTierPolicyOptions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([
        {
          id: "tp-1",
          name: "Standard Tiers",
          primary: true,
          levels: [{ name: "Bronze" }, { name: "Silver" }, { name: "Gold" }],
        },
        {
          id: "tp-2",
          name: "VIP Tiers",
          primary: undefined,
          levels: [{ name: "VIP" }],
        },
      ]);
    });

    it("handles tier policy with empty levels array", async () => {
      mockGet.mockResolvedValue({
        data: [
          { _id: "tp-1", name: "Empty Policy", levels: [] },
        ],
        headers: { "x-total-count": "1" },
      });

      const { result } = renderHook(() => useTierPolicyOptions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([
        { id: "tp-1", name: "Empty Policy", primary: undefined, levels: [] },
      ]);
    });

    it("calls tierpolicies endpoint with correct params", async () => {
      mockGet.mockResolvedValue({
        data: [],
        headers: { "x-total-count": "0" },
      });

      renderHook(() => useTierPolicyOptions(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());

      expect(mockGet).toHaveBeenCalledWith("tierpolicies", {
        params: expect.objectContaining({
          select: "_id,name,levels,primary",
          limit: "50",
        }),
      });
    });
  });
});
