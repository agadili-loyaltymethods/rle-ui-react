import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, createWrapper } from "@/test-utils";
import { useEntitySchema } from "../use-entity-schema";

// Mock apiClient
vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock ui-store
vi.mock("@/shared/stores/ui-store", () => ({
  useUIStore: (selector: (s: Record<string, string>) => string) =>
    selector({ currentOrg: "test-org", currentProgram: "test-program" }),
}));

import { apiClient } from "@/shared/lib/api-client";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

let wrapper: ReturnType<typeof createWrapper>;

describe("useEntitySchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  it("returns extension fields and categories for a model", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve({
          data: {
            Location: {
              dbSchema: {
                name: { type: "string", required: true },
                city: { type: "string" },
              },
              extSchema: {
                type: "object",
                properties: {
                  siteId: { type: "string" },
                },
                required: ["siteId"],
              },
              extUISchema: {
                siteId: {
                  type: "string",
                  title: "Site ID",
                  category: "General",
                  displayOrder: 1,
                  showInList: true,
                  searchable: true,
                  sortable: true,
                },
              },
            },
          },
        });
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve({
          data: {
            Location: {
              categories: [{ name: "General", columns: 2 }],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useEntitySchema("Location"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.extFields).toHaveProperty("siteId");
    expect(result.current.extFields.siteId?.title).toBe("Site ID");
    expect(result.current.extFields.siteId?.required).toBe(true);
    expect(result.current.categories).toEqual([
      { name: "General", columns: 2 },
    ]);
    expect(result.current.coreRequiredFields.has("name")).toBe(true);
    expect(result.current.extRequiredFields.has("siteId")).toBe(true);
  });

  it("fetches dynamic enum values when enumType is specified", async () => {
    mockGet.mockImplementation(
      (url: string, opts?: { params?: Record<string, string> }) => {
        if (url === "schema/validation") {
          return Promise.resolve({
            data: {
              Location: {
                dbSchema: { name: { type: "string", required: true } },
                extSchema: {
                  type: "object",
                  properties: {
                    region: { type: "string", enumType: "RegionType" },
                  },
                },
                extUISchema: {
                  region: {
                    type: "string",
                    title: "Region",
                    category: "General",
                    displayOrder: 1,
                    enumType: "RegionType",
                  },
                },
              },
            },
          });
        }
        if (url === "schema/extensionschema") {
          return Promise.resolve({
            data: { Location: { categories: [] } },
          });
        }
        if (url === "enums") {
          return Promise.resolve({
            data: [
              { value: "EAST", label: "East" },
              { value: "WEST", label: "West" },
            ],
          });
        }
        void opts;
        return Promise.resolve({ data: [] });
      },
    );

    const { result } = renderHook(() => useEntitySchema("Location"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.enumFields).toHaveProperty("region");
    expect(result.current.enumFields.region).toEqual(["EAST", "WEST"]);
  });
});
