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

vi.mock("@/shared/stores/ui-store", () => ({
  useUIStore: vi.fn((selector: (s: Record<string, string>) => string) =>
    selector({ currentOrg: "org1", currentProgram: "prog1" }),
  ),
}));

import { renderHook, waitFor, createWrapper } from "@/test-utils";
import { apiClient } from "@/shared/lib/api-client";
import { useRewardSchema } from "./use-reward-schema";

const mockGet = vi.mocked(apiClient.get);

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to build a minimal validation response
function makeValidationResponse(rpOverrides: Record<string, unknown> = {}) {
  return {
    data: {
      RewardPolicy: {
        dbSchema: {},
        extSchema: {},
        extUISchema: {},
        ...rpOverrides,
      },
    },
  };
}

function makeExtensionSchemaResponse(
  rpOverrides: Record<string, unknown> = {},
) {
  return { data: { RewardPolicy: { categories: [], ...rpOverrides } } };
}

describe("use-reward-schema", () => {
  it("exports useRewardSchema hook", () => {
    expect(useRewardSchema).toBeTypeOf("function");
  });

  it("useRewardSchema returns query result shape", () => {
    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });
    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isError");
  });

  it("fetches schema and returns parsed data", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            dbSchema: {
              name: { type: "String", required: true },
              desc: { type: "String" },
              status: { enum: ["active", "inactive"] },
            },
            extSchema: {
              required: ["brandCode"],
              properties: {
                brandCode: { type: "string", enum: ["A", "B", "C"] },
                channel: { type: "string" },
              },
            },
            extUISchema: {
              brandCode: {
                type: "string",
                title: "Brand Code",
                category: "General",
                displayOrder: 1,
                showInList: true,
                searchable: true,
                sortable: false,
              },
              channel: {
                type: "string",
                title: "Channel",
                category: "General",
                displayOrder: 2,
              },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(
          makeExtensionSchemaResponse({
            categories: [{ name: "General", columns: 2 }],
          }),
        );
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.categories).toEqual([{ name: "General", columns: 2 }]);
    expect(data.enumFields.status).toEqual(["active", "inactive"]);
    expect(data.enumFields.brandCode).toEqual(["A", "B", "C"]);
    expect(data.extRequiredFields.has("brandCode")).toBe(true);
    expect(data.coreRequiredFields.has("name")).toBe(true);
    expect(data.coreRequiredFields.has("desc")).toBe(false);
    expect(data.extFields.brandCode).toBeDefined();
    expect(data.extFields.brandCode.title).toBe("Brand Code");
    expect(data.extFields.brandCode.required).toBe(true);
    expect(data.extFields.brandCode.showInList).toBe(true);
    expect(data.extFields.channel).toBeDefined();
    expect(data.extFields.channel.required).toBe(false);
  });

  it("handles extension schema fetch failure gracefully", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            dbSchema: { name: { type: "String" } },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    // Categories come from extensionschema which failed — should be empty
    expect(data.categories).toEqual([]);
    expect(data.warnings).toBeDefined();
    expect(data.warnings![0]).toContain("Extension schema");
  });

  it("resolves enumType references by fetching from /enums", async () => {
    mockGet.mockImplementation((url: string, params?: unknown) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            dbSchema: {
              discountType: { enum: "DiscountTypes" },
            },
            extSchema: {
              properties: {
                rewardType: { type: "string", enumType: "RewardTypes" },
              },
            },
            extUISchema: {
              rewardType: {
                type: "string",
                title: "Reward Type",
                category: "General",
              },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      if (url === "enums") {
        const p = params as { params: { query: string } };
        const query = JSON.parse(p.params.query);
        if (query.type === "RewardTypes") {
          return Promise.resolve({
            data: [
              { value: "coupon", label: "Coupon" },
              { value: "gift", label: "Gift" },
            ],
          });
        }
        if (query.type === "DiscountTypes") {
          return Promise.resolve({
            data: [
              { value: "percent", label: "Percent" },
              { value: "fixed", label: "Fixed" },
            ],
          });
        }
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.enumFields.rewardType).toEqual(["coupon", "gift"]);
    expect(data.enumFields.discountType).toEqual(["percent", "fixed"]);
  });

  it("handles enum fetch failure with warning", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            extSchema: {
              properties: {
                badEnum: { type: "string", enumType: "MissingEnum" },
              },
            },
            extUISchema: {
              badEnum: { type: "string", title: "Bad Enum" },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      if (url === "enums") {
        return Promise.reject(new Error("Enum not found"));
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.warnings).toBeDefined();
    expect(data.warnings!.some((w) => w.includes("MissingEnum"))).toBe(true);
  });

  it("detects bulk-editable fields from rcxOpts", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            dbSchema: {
              desc: { type: "String", rcxOpts: {} },
              name: { type: "String", rcxOpts: { disallowBulkUpdate: true } },
              customField: { type: "String", rcxOpts: {} },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    // desc is in BULK_EDITABLE_FALLBACK and has rcxOpts without disallowBulkUpdate => kept
    expect(data.bulkEditableFields.has("desc")).toBe(true);
    // name has rcxOpts with disallowBulkUpdate => removed
    expect(data.bulkEditableFields.has("name")).toBe(false);
    // customField has rcxOpts without disallowBulkUpdate => added
    expect(data.bulkEditableFields.has("customField")).toBe(true);
  });

  it("uses fallback bulk-editable list when no rcxOpts defined", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            dbSchema: {
              desc: { type: "String" },
              countLimit: { type: "Number" },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.bulkEditableFields.has("desc")).toBe(true);
    expect(data.bulkEditableFields.has("countLimit")).toBe(true);
    expect(data.bulkEditableFields.has("segments")).toBe(true);
  });

  it("falls back to extSchema properties for fields not in extUISchema", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            extSchema: {
              properties: {
                hiddenField: {
                  type: "number",
                  title: "Hidden Field",
                  default: 42,
                },
              },
            },
            extUISchema: {},
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.extFields.hiddenField).toBeDefined();
    expect(data.extFields.hiddenField.type).toBe("number");
    expect(data.extFields.hiddenField.title).toBe("Hidden Field");
    expect(data.extFields.hiddenField.defaultValue).toBe(42);
    expect(data.extFields.hiddenField.displayOrder).toBe(999);
    expect(data.extFields.hiddenField.showInList).toBe(false);
  });

  it("marks parent fields and dot-path children", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            extSchema: {
              properties: {
                config: { type: "object" },
                "config.subField": { type: "string" },
              },
            },
            extUISchema: {
              config: { type: "object", title: "Config" },
              "config.subField": { type: "string", title: "Sub Field" },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.extFields.config.isParent).toBe(true);
    expect(data.extFields["config.subField"].parentField).toBe("config");
  });

  it("resolves enumType from extUISchema when not in extSchema", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            extSchema: {
              properties: {
                myField: { type: "string" },
              },
            },
            extUISchema: {
              myField: {
                type: "string",
                title: "My Field",
                enumType: "CustomEnumType",
              },
            },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      if (url === "enums") {
        return Promise.resolve({
          data: [
            { value: "opt1", label: "Option 1" },
            { value: "opt2", label: "Option 2" },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.enumFields.myField).toEqual(["opt1", "opt2"]);
  });

  it("returns error when RewardPolicy not found in schema", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve({ data: {} });
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.current.error).toBeDefined();
  });

  it("returns no warnings when everything succeeds", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(
          makeValidationResponse({
            dbSchema: { name: { type: "String" } },
          }),
        );
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(makeExtensionSchemaResponse());
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.warnings).toBeUndefined();
  });

  it("defaults category columns to 2 when not specified", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve(makeValidationResponse());
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve(
          makeExtensionSchemaResponse({
            categories: [{ name: "NoColumns" }],
          }),
        );
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRewardSchema(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.categories[0]).toEqual({
      name: "NoColumns",
      columns: 2,
    });
  });
});
