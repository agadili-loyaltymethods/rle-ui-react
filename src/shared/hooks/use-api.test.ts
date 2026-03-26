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
import {
  useEntityList,
  useEntity,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "./use-api";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.delete as ReturnType<typeof vi.fn>;

describe("use-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useEntityList", () => {
    it("fetches a list and returns data with meta", async () => {
      mockGet.mockResolvedValueOnce({
        data: [{ _id: "1", name: "Alpha" }],
        headers: { "x-total-count": "10" },
      });

      const { result } = renderHook(() => useEntityList("members"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.meta.totalCount).toBe(10);
    });

    it("does not fetch when enabled is false", () => {
      renderHook(() => useEntityList("members", { enabled: false }), {
        wrapper: createWrapper(),
      });
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("passes query params to the API call", async () => {
      mockGet.mockResolvedValueOnce({
        data: [{ _id: "1", name: "Alpha" }],
        headers: { "x-total-count": "1" },
      });

      const { result } = renderHook(
        () =>
          useEntityList("members", {
            query: JSON.stringify({ status: "active" }),
            sort: "name",
            skip: 10,
            limit: 5,
            select: "name,email",
            populate: "org",
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith("members", {
        params: {
          query: JSON.stringify({ status: "active" }),
          sort: "name",
          skip: "10",
          limit: "5",
          select: "name,email",
          populate: "org",
        },
      });
    });

    it("falls back to data length when x-total-count header is missing", async () => {
      mockGet.mockResolvedValueOnce({
        data: [{ _id: "1" }, { _id: "2" }],
        headers: {},
      });

      const { result } = renderHook(() => useEntityList("members"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.meta.totalCount).toBe(2);
    });

    it("passes distinct param when provided", async () => {
      mockGet.mockResolvedValueOnce({
        data: ["val1", "val2"],
        headers: { "x-total-count": "2" },
      });

      const { result } = renderHook(
        () => useEntityList("members", { distinct: "status" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith("members", {
        params: { distinct: "status" },
      });
    });
  });

  describe("useEntity", () => {
    it("fetches a single entity by id", async () => {
      mockGet.mockResolvedValueOnce({
        data: { _id: "abc", name: "Test" },
      });

      const { result } = renderHook(() => useEntity("members", "abc"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({ _id: "abc", name: "Test" });
    });

    it("does not fetch when id is undefined", () => {
      renderHook(() => useEntity("members", undefined), { wrapper: createWrapper() });
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("useCreateEntity", () => {
    it("returns a mutation object", () => {
      const { result } = renderHook(() => useCreateEntity("members"), {
        wrapper: createWrapper(),
      });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });

    it("posts data to the endpoint", async () => {
      mockPost.mockResolvedValueOnce({
        data: { _id: "new1", name: "New" },
      });

      const { result } = renderHook(() => useCreateEntity("members"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockPost).toHaveBeenCalledWith("members", { name: "New" });
    });
  });

  describe("useUpdateEntity", () => {
    it("returns a mutation object", () => {
      const { result } = renderHook(
        () => useUpdateEntity<{ _id: string; name: string }>("members"),
        { wrapper: createWrapper() },
      );

      expect(result.current.mutate).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });

    it("patches data to the endpoint with id", async () => {
      mockPatch.mockResolvedValueOnce({
        data: { _id: "abc", name: "Updated" },
      });

      const { result } = renderHook(
        () => useUpdateEntity<{ _id: string; name: string }>("members"),
        { wrapper: createWrapper() },
      );

      result.current.mutate({ id: "abc", data: { name: "Updated" } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockPatch).toHaveBeenCalledWith("members/abc", {
        name: "Updated",
      });
    });
  });

  describe("useDeleteEntity", () => {
    it("returns a mutation object", () => {
      const { result } = renderHook(() => useDeleteEntity("members"), {
        wrapper: createWrapper(),
      });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.isIdle).toBe(true);
    });

    it("deletes entity by id", async () => {
      mockDelete.mockResolvedValueOnce({});

      const { result } = renderHook(() => useDeleteEntity("members"), {
        wrapper: createWrapper(),
      });

      result.current.mutate("abc");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDelete).toHaveBeenCalledWith("members/abc");
    });
  });
});
