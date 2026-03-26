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
  useMembers,
  useMember,
  useCreateMember,
  useUpdateMember,
  useMemberSearch,
  useMemberActivities,
  useMemberRewards,
  useMemberPurses,
  useMemberTiers,
} from "./use-members";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-members", () => {
  it("useMembers returns query result shape", () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      headers: { "x-total-count": "0" },
    });
    const { result } = renderHook(() => useMembers(), { wrapper });
    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
  });

  it("useMember is disabled when id is undefined", () => {
    const { result } = renderHook(() => useMember(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it("useMember fetches when id is provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { _id: "m1", firstName: "John" } });
    const { result } = renderHook(() => useMember("m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(expect.objectContaining({ _id: "m1" }));
  });

  it("useCreateMember returns mutate function", () => {
    const { result } = renderHook(() => useCreateMember(), { wrapper });
    expect(result.current).toHaveProperty("mutateAsync");
  });

  it("useUpdateMember returns mutate function", () => {
    const { result } = renderHook(() => useUpdateMember(), { wrapper });
    expect(result.current).toHaveProperty("mutateAsync");
  });

  // useMemberSearch
  it("useMemberSearch does not fetch without filters", () => {
    const { result } = renderHook(() => useMemberSearch({}), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it("useMemberSearch fetches with firstName filter", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "m1", firstName: "John" }],
      headers: { "x-total-count": "1" },
    });
    const { result } = renderHook(() => useMemberSearch({ firstName: "John" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith(
      "Member",
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.stringContaining("firstName"),
        }),
      }),
    );
  });

  it("useMemberSearch builds regex filter for email", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      headers: { "x-total-count": "0" },
    });
    const { result } = renderHook(() => useMemberSearch({ email: "test@example.com" }), { wrapper });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const query = JSON.parse(
      (vi.mocked(apiClient.get).mock.calls[0]?.[1] as { params: { query: string } })?.params?.query ?? "{}",
    );
    expect(query.email).toEqual({ $regex: "test@example.com", $options: "i" });
  });

  it("useMemberSearch uses exact match for loyaltyId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      headers: { "x-total-count": "0" },
    });
    const { result } = renderHook(() => useMemberSearch({ loyaltyId: "LID123" }), { wrapper });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const query = JSON.parse(
      (vi.mocked(apiClient.get).mock.calls[0]?.[1] as { params: { query: string } })?.params?.query ?? "{}",
    );
    expect(query.loyaltyId).toBe("LID123");
  });

  // Sub-collection hooks
  it("useMemberActivities is disabled when memberId is undefined", () => {
    const { result } = renderHook(() => useMemberActivities(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it("useMemberActivities fetches with memberId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "a1" }],
      headers: { "x-total-count": "1" },
    });
    const { result } = renderHook(() => useMemberActivities("m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.meta.totalCount).toBe(1);
  });

  it("useMemberActivities passes sort/skip/limit params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      headers: { "x-total-count": "0" },
    });
    renderHook(() => useMemberActivities("m1", { sort: "-date", skip: 10, limit: 5 }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(apiClient.get).toHaveBeenCalledWith("Activity", {
      params: expect.objectContaining({ sort: "-date", skip: "10", limit: "5" }),
    });
  });

  it("useMemberRewards fetches with memberId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "r1" }],
      headers: { "x-total-count": "1" },
    });
    const { result } = renderHook(() => useMemberRewards("m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("Reward", expect.anything());
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useMemberPurses fetches with memberId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "p1", balance: 100 }],
      headers: { "x-total-count": "1" },
    });
    const { result } = renderHook(() => useMemberPurses("m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("Purse", expect.anything());
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useMemberTiers fetches with memberId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "t1", level: "Gold" }],
      headers: { "x-total-count": "1" },
    });
    const { result } = renderHook(() => useMemberTiers("m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("Tier", expect.anything());
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("useMemberRewards is disabled when memberId is undefined", () => {
    const { result } = renderHook(() => useMemberRewards(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it("useMemberPurses is disabled when memberId is undefined", () => {
    const { result } = renderHook(() => useMemberPurses(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it("useMemberTiers is disabled when memberId is undefined", () => {
    const { result } = renderHook(() => useMemberTiers(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});
