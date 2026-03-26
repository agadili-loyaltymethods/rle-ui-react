import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor, createWrapper } from "@/test-utils";
import { useServerTable } from "../use-server-table";
import type { ServerTableConfig } from "../../types/server-table-types";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "@/shared/lib/api-client";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

const testConfig: ServerTableConfig = {
  modelName: "Location",
  endpoint: "locations",
  pageTitle: "Locations",
  testIdPrefix: "locations",
  defaultSort: "name",
  searchFields: ["name", "city"],
  coreColumns: [],
  coreFormFields: [],
};

const wrapper = createWrapper();

describe("useServerTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/count")) {
        return Promise.resolve({ data: { count: 42 } });
      }
      return Promise.resolve({
        data: [{ _id: "1", name: "Test" }],
        headers: { "x-total-count": "42" },
      });
    });
  });

  it("fetches data with default pagination and sort", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.totalCount).toBe(42);
    expect(result.current.pageIndex).toBe(0);
    expect(result.current.pageSize).toBe(25);
  });

  it("changes page when onPageChange is called", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(2));
    expect(result.current.pageIndex).toBe(2);
  });

  it("resets page to 0 when search changes", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(3));
    expect(result.current.pageIndex).toBe(3);

    act(() => result.current.onSearchChange("park"));
    expect(result.current.pageIndex).toBe(0);
  });

  it("passes additionalQuery to the API call", async () => {
    const additional = { "ext._meta.subType": "RewardsCatalog" };
    const { result } = renderHook(
      () => useServerTable(testConfig, additional),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify the query param includes our additional filter
    const call = mockGet.mock.calls.find(
      (c: unknown[]) => !(c[0] as string).includes("/count"),
    );
    expect(call).toBeDefined();
    const params = (call![1] as { params: Record<string, string> })?.params;
    const parsedQuery = JSON.parse(params.query!);
    expect(parsedQuery).toEqual({ "ext._meta.subType": "RewardsCatalog" });
  });

  it("tracks row selection by ID", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onRowSelect({ "1": true }));
    expect(result.current.selectedIds.has("1")).toBe(true);

    act(() => result.current.clearSelection());
    expect(result.current.selectedIds.size).toBe(0);
  });
});
