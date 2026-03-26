import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, createWrapper } from "@/test-utils";

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
import { useEnumOptions, useCreateEnum } from "./use-enums";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

describe("use-enums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useEnumOptions", () => {
    it("fetches enum options and maps to value/label pairs", async () => {
      mockGet.mockResolvedValueOnce({
        data: [
          { value: "gold", label: "Gold" },
          { value: "silver", label: "Silver" },
        ],
      });

      const { result } = renderHook(() => useEnumOptions("tier"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([
        { value: "gold", label: "Gold" },
        { value: "silver", label: "Silver" },
      ]);
    });

    it("does not fetch when enabled is false", () => {
      renderHook(() => useEnumOptions("tier", false), { wrapper: createWrapper() });
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("passes correct query params to API", async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useEnumOptions("ActivityType"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith("enums", {
        params: {
          query: JSON.stringify({ type: "ActivityType", lang: "en" }),
          sort: "label",
          select: "value,label",
          limit: "0",
        },
      });
    });

    it("converts numeric enum values to strings", async () => {
      mockGet.mockResolvedValueOnce({
        data: [
          { value: 1, label: "Level 1" },
          { value: 2, label: "Level 2" },
        ],
      });

      const { result } = renderHook(() => useEnumOptions("Level"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([
        { value: "1", label: "Level 1" },
        { value: "2", label: "Level 2" },
      ]);
    });

    it("returns empty data initially while loading", () => {
      mockGet.mockReturnValue(new Promise(() => {})); // Never resolves
      const { result } = renderHook(() => useEnumOptions("tier"), {
        wrapper: createWrapper(),
      });
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useCreateEnum", () => {
    it("returns a mutation with mutate and mutateAsync", () => {
      const { result } = renderHook(() => useCreateEnum(), { wrapper: createWrapper() });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });
  });
});
