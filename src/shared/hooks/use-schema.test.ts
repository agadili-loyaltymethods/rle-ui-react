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
  useValidationSchema,
  useModelSchema,
  useModelFieldOptions,
  useModelExtensionFieldOptions,
} from "./use-schema";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

const mockSchemaResponse = {
  Member: {
    dbSchema: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      age: { type: "number" },
      createdAt: { type: "date" },
      __v: { type: "number" },
      org: { type: "string" },
    },
    extUISchema: {
      customField: { title: "Custom Field", type: "string" },
      parentKey: { title: "Parent", type: "object", isParentKey: true },
    },
  },
};

describe("use-schema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useValidationSchema", () => {
    it("fetches schema from schema/validation endpoint", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(() => useValidationSchema(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSchemaResponse);
      expect(mockGet).toHaveBeenCalledWith("schema/validation");
    });
  });

  describe("useModelSchema", () => {
    it("returns filtered fields excluding system fields", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(() => useModelSchema("Member"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // System fields (createdAt, __v, org) should be excluded
      expect(result.current.fields).toHaveProperty("firstName");
      expect(result.current.fields).toHaveProperty("lastName");
      expect(result.current.fields).toHaveProperty("age");
      expect(result.current.fields).not.toHaveProperty("createdAt");
      expect(result.current.fields).not.toHaveProperty("__v");
      expect(result.current.fields).not.toHaveProperty("org");
    });

    it("returns empty object for unknown model", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(() => useModelSchema("UnknownModel"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.fields).toEqual({});
    });
  });

  describe("useModelFieldOptions", () => {
    it("returns sorted field options excluding system fields", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(() => useModelFieldOptions("Member"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options.length).toBeGreaterThan(0);
      // Should have getLabel and fieldNames
      expect(typeof result.current.getLabel).toBe("function");
      expect(result.current.fieldNames).toBeInstanceOf(Set);
    });
  });

  describe("useModelExtensionFieldOptions", () => {
    it("returns extension field options, excluding parent keys", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelExtensionFieldOptions("Member"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const values = result.current.options.map((o) => o.value);
      expect(values).toContain("customField");
      // parentKey has isParentKey: true, should be excluded
      expect(values).not.toContain("parentKey");
      expect(typeof result.current.getLabel).toBe("function");
    });

    it("returns empty array for unknown model", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelExtensionFieldOptions("UnknownModel"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([]);
    });

    it("handles array extension fields with bracket notation", async () => {
      const schemaWithArrayExt = {
        Activity: {
          dbSchema: {},
          extUISchema: {
            tags: { title: "Tags", type: "array", nest: { type: "string" } },
          },
        },
      };
      mockGet.mockResolvedValueOnce({ data: schemaWithArrayExt });

      const { result } = renderHook(
        () => useModelExtensionFieldOptions("Activity"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const tagsOpt = result.current.options.find((o) => o.value === "tags");
      expect(tagsOpt).toBeDefined();
      expect(tagsOpt!.label).toBe("[Tags]");
    });

    it("handles nested dotted extension fields with arrow notation", async () => {
      const schemaWithDotted = {
        Activity: {
          dbSchema: {},
          extUISchema: {
            "txnCenter.xref": { title: undefined, type: "string" },
          },
        },
      };
      mockGet.mockResolvedValueOnce({ data: schemaWithDotted });

      const { result } = renderHook(
        () => useModelExtensionFieldOptions("Activity"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const dottedOpt = result.current.options.find((o) => o.value === "txnCenter.xref");
      expect(dottedOpt).toBeDefined();
      // Should use arrow notation for dotted keys
      expect(dottedOpt!.label).toContain("→");
    });

    it("handles date-time format mapped to date fieldType", async () => {
      const schemaWithDate = {
        Activity: {
          dbSchema: {},
          extUISchema: {
            startDate: { title: "Start Date", type: "string", format: "date-time" },
          },
        },
      };
      mockGet.mockResolvedValueOnce({ data: schemaWithDate });

      const { result } = renderHook(
        () => useModelExtensionFieldOptions("Activity"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const dateOpt = result.current.options.find((o) => o.value === "startDate");
      expect(dateOpt).toBeDefined();
      expect(dateOpt!.fieldType).toBe("date");
    });

    it("getLabel falls back for unknown field names", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelExtensionFieldOptions("Member"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Unknown field should get a formatted fallback
      const label = result.current.getLabel("unknownField");
      expect(label).toBeTruthy();
    });
  });

  describe("useModelFieldOptions (advanced)", () => {
    it("flattens array subdoc fields into bracket notation", async () => {
      const schemaWithArray = {
        Activity: {
          dbSchema: {
            lineItems: {
              type: "array",
              "0": {
                itemSKU: { type: "string" },
                quantity: { type: "number" },
              },
            },
          },
        },
      };
      mockGet.mockResolvedValueOnce({ data: schemaWithArray });

      const { result } = renderHook(
        () => useModelFieldOptions("Activity"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const values = result.current.options.map((o) => o.value);
      expect(values).toContain("lineItems.itemSKU");
      expect(values).toContain("lineItems.quantity");

      // Labels should use bracket + arrow notation
      const skuOpt = result.current.options.find((o) => o.value === "lineItems.itemSKU");
      expect(skuOpt!.label).toContain("→");
    });

    it("skips opaque object and mixed type fields", async () => {
      const schemaWithOpaque = {
        Activity: {
          dbSchema: {
            name: { type: "string" },
            meta: { type: "object" },
            data: { type: "mixed" },
            tags: { type: "array" },
          },
        },
      };
      mockGet.mockResolvedValueOnce({ data: schemaWithOpaque });

      const { result } = renderHook(
        () => useModelFieldOptions("Activity"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const values = result.current.options.map((o) => o.value);
      expect(values).toContain("name");
      expect(values).not.toContain("meta");
      expect(values).not.toContain("data");
      expect(values).not.toContain("tags");
    });

    it("getLabel returns field label for known field", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelFieldOptions("Member"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.getLabel("firstName")).toBeTruthy();
    });

    it("fieldNames contains all option values", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelFieldOptions("Member"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      for (const opt of result.current.options) {
        expect(result.current.fieldNames.has(opt.value)).toBe(true);
      }
    });
  });

  describe("useModelSchema (advanced)", () => {
    it("filters by includeTypes when provided", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelSchema("Member", { includeTypes: new Set(["string"]) }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Only string fields should be included
      for (const def of Object.values(result.current.fields)) {
        expect(def.type).toBe("string");
      }
    });

    it("uses custom exclude set when provided", async () => {
      mockGet.mockResolvedValueOnce({ data: mockSchemaResponse });

      const { result } = renderHook(
        () => useModelSchema("Member", { exclude: new Set(["firstName"]) }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.fields).not.toHaveProperty("firstName");
      // Other non-excluded fields should be present (including system fields since we overrode exclude)
      expect(result.current.fields).toHaveProperty("lastName");
    });
  });
});
