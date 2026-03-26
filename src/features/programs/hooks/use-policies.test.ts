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
import {
  useRewardPolicies,
  usePursePolicies,
  useCreatePursePolicy,
  useUpdatePursePolicy,
  useDeletePursePolicy,
  useAllPursePolicies,
  useTierPolicies,
  useCreateTierPolicy,
  useUpdateTierPolicy,
  useDeleteTierPolicy,
  useStreakPolicies,
  usePolicyCounts,
} from "./use-policies";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-policies", () => {
  it("exports all policy hooks", () => {
    expect(useRewardPolicies).toBeTypeOf("function");
    expect(usePursePolicies).toBeTypeOf("function");
    expect(useCreatePursePolicy).toBeTypeOf("function");
    expect(useUpdatePursePolicy).toBeTypeOf("function");
    expect(useDeletePursePolicy).toBeTypeOf("function");
    expect(useAllPursePolicies).toBeTypeOf("function");
    expect(useTierPolicies).toBeTypeOf("function");
    expect(useCreateTierPolicy).toBeTypeOf("function");
    expect(useUpdateTierPolicy).toBeTypeOf("function");
    expect(useDeleteTierPolicy).toBeTypeOf("function");
    expect(useStreakPolicies).toBeTypeOf("function");
    expect(usePolicyCounts).toBeTypeOf("function");
  });

  it("useRewardPolicies is disabled without programId", () => {
    const { result } = renderHook(
      () => useRewardPolicies(undefined),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("useRewardPolicies fetches with programId", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ _id: "rp1", name: "Reward A" }],
      headers: { "x-total-count": "1" },
    });

    const { result } = renderHook(
      () => useRewardPolicies("prog-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useRewardPolicies includes intendedUse filter when provided", async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      headers: { "x-total-count": "0" },
    });

    const { result } = renderHook(
      () => useRewardPolicies("prog-1", "standard"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      "rewardpolicies",
      expect.objectContaining({
        params: expect.objectContaining({
          query: JSON.stringify({ program: "prog-1", intendedUse: "standard" }),
        }),
      }),
    );
  });

  it("usePursePolicies is disabled without programId", () => {
    const { result } = renderHook(
      () => usePursePolicies(undefined),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("usePursePolicies fetches with programId", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ _id: "pp1", name: "Points", group: "Points" }],
      headers: { "x-total-count": "1" },
    });

    const { result } = renderHook(
      () => usePursePolicies("prog-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useTierPolicies is disabled without programId", () => {
    const { result } = renderHook(
      () => useTierPolicies(undefined),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("useTierPolicies fetches with programId", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ _id: "tp1", name: "Gold" }],
      headers: { "x-total-count": "1" },
    });

    const { result } = renderHook(
      () => useTierPolicies("prog-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useStreakPolicies is disabled without programId", () => {
    const { result } = renderHook(
      () => useStreakPolicies(undefined),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("useStreakPolicies fetches with programId", async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ _id: "sp1", name: "Streak" }],
      headers: { "x-total-count": "1" },
    });

    const { result } = renderHook(
      () => useStreakPolicies("prog-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useAllPursePolicies is disabled without programId", () => {
    const { result } = renderHook(
      () => useAllPursePolicies(undefined),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("useAllPursePolicies fetches all policies with limit 0", async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { _id: "pp1", group: "Points", periodStartDate: "2026-01-01" },
        { _id: "pp2", group: "Miles", periodStartDate: "2026-01-01" },
      ],
    });

    const { result } = renderHook(
      () => useAllPursePolicies("prog-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      "pursepolicies",
      expect.objectContaining({
        params: expect.objectContaining({
          limit: "0",
          sort: "group,periodStartDate",
        }),
      }),
    );
  });

  it("usePolicyCounts returns zero counts without programId", () => {
    const { result } = renderHook(
      () => usePolicyCounts(undefined),
      { wrapper },
    );

    expect(result.current.pursePolicyCount).toBe(0);
    expect(result.current.tierPolicyCount).toBe(0);
  });

  it("usePolicyCounts counts unique purses (groups as 1) and tier count", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "pursepolicies") {
        // 1 qualifying group "Points" with 3 periods + 1 standalone = 2 unique purses
        return Promise.resolve({
          data: [
            { _id: "pp1", name: "Points Q1", group: "Points", periodStartDate: "2026-01-01" },
            { _id: "pp2", name: "Points Q2", group: "Points", periodStartDate: "2026-04-01" },
            { _id: "pp3", name: "Points Q3", group: "Points", periodStartDate: "2026-07-01" },
            { _id: "pp4", name: "Bonus", program: "prog-1" },
          ],
        });
      }
      if (url === "tierpolicies/count") {
        return Promise.resolve({ data: { count: 3 } });
      }
      return Promise.resolve({ data: { count: 0 } });
    });

    const { result } = renderHook(
      () => usePolicyCounts("prog-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pursePolicyCount).toBe(2); // 1 group + 1 standalone
    expect(result.current.tierPolicyCount).toBe(3);
  });

  it("useCreatePursePolicy returns mutation shape", () => {
    const { result } = renderHook(() => useCreatePursePolicy(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });

  it("useUpdatePursePolicy returns mutation shape", () => {
    const { result } = renderHook(() => useUpdatePursePolicy(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });

  it("useDeletePursePolicy returns mutation shape", () => {
    const { result } = renderHook(() => useDeletePursePolicy(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });

  it("useCreateTierPolicy returns mutation shape", () => {
    const { result } = renderHook(() => useCreateTierPolicy(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });

  it("useUpdateTierPolicy returns mutation shape", () => {
    const { result } = renderHook(() => useUpdateTierPolicy(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });

  it("useDeleteTierPolicy returns mutation shape", () => {
    const { result } = renderHook(() => useDeleteTierPolicy(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });
});
