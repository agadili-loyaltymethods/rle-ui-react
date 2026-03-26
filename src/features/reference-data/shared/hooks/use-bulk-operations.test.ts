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

import { renderHook, createWrapper } from "@/test-utils";
import { useBulkOperations } from "./use-bulk-operations";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

const mockConfig = {
  modelName: "Product",
  endpoint: "products",
  pageTitle: "Products",
  testIdPrefix: "products",
  defaultSort: "name",
  searchFields: ["name"],
  coreColumns: [],
  coreFormFields: [],
};

import { apiClient } from "@/shared/lib/api-client";
import { waitFor } from "@/test-utils";

const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

describe("use-bulk-operations", () => {
  it("exports useBulkOperations hook", () => {
    expect(useBulkOperations).toBeTypeOf("function");
  });

  it("returns bulkUpdate and bulkDelete mutations", () => {
    const { result } = renderHook(
      () => useBulkOperations(mockConfig),
      { wrapper },
    );

    expect(result.current.bulkUpdate).toHaveProperty("mutateAsync");
    expect(result.current.bulkUpdate).toHaveProperty("isPending");
    expect(result.current.bulkDelete).toHaveProperty("mutateAsync");
    expect(result.current.bulkDelete).toHaveProperty("isPending");
  });

  it("bulkUpdate calls apiClient.patch with correct params", async () => {
    mockPatch.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(
      () => useBulkOperations(mockConfig),
      { wrapper },
    );

    result.current.bulkUpdate.mutate({
      ids: ["id1", "id2"],
      update: { status: "active" },
    });

    await waitFor(() => expect(result.current.bulkUpdate.isSuccess).toBe(true));

    expect(mockPatch).toHaveBeenCalledWith("multiedit", {
      model: "Product",
      ids: ["id1", "id2"],
      update: { status: "active" },
    });
  });

  it("bulkDelete calls apiClient.post with correct params", async () => {
    mockPost.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(
      () => useBulkOperations(mockConfig),
      { wrapper },
    );

    result.current.bulkDelete.mutate({ ids: ["id1", "id3"] });

    await waitFor(() => expect(result.current.bulkDelete.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith("multidelete", {
      model: "Product",
      ids: ["id1", "id3"],
    });
  });
});
