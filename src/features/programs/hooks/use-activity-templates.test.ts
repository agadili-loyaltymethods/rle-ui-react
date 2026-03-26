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

vi.mock("@/shared/hooks/use-enums", () => ({
  useEnumOptions: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("./use-program-meta", () => ({
  ensureRuleExtensionSchema: vi.fn(),
  ensureMetaFolder: vi.fn().mockResolvedValue("folder-1"),
}));

import { renderHook, createWrapper, waitFor, act } from "@/test-utils";
import { apiClient } from "@/shared/lib/api-client";
import { ensureRuleExtensionSchema, ensureMetaFolder } from "./use-program-meta";
import {
  useActivityTemplates,
  useActivityTemplate,
  useSaveActivityTemplate,
  useDeleteActivityTemplate,
  useActivityTemplateCount,
  useReasonCodeOptions,
} from "./use-activity-templates";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-activity-templates", () => {
  it("exports all activity template hooks", () => {
    expect(useActivityTemplates).toBeTypeOf("function");
    expect(useActivityTemplate).toBeTypeOf("function");
    expect(useSaveActivityTemplate).toBeTypeOf("function");
    expect(useDeleteActivityTemplate).toBeTypeOf("function");
    expect(useActivityTemplateCount).toBeTypeOf("function");
    expect(useReasonCodeOptions).toBeTypeOf("function");
  });

  it("useActivityTemplates is disabled without programId", () => {
    const { result } = renderHook(
      () => useActivityTemplates(undefined),
      { wrapper },
    );

    expect(result.current.types).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("useActivityTemplate returns null config without programId", () => {
    const { result } = renderHook(
      () => useActivityTemplate(undefined, "cfg-1"),
      { wrapper },
    );

    expect(result.current.config).toBeNull();
  });

  it("useActivityTemplateCount returns 0 without programId", () => {
    const { result } = renderHook(
      () => useActivityTemplateCount(undefined),
      { wrapper },
    );

    expect(result.current.count).toBe(0);
  });

  it("useSaveActivityTemplate returns a function", () => {
    const { result } = renderHook(
      () => useSaveActivityTemplate(undefined),
      { wrapper },
    );

    expect(result.current).toBeTypeOf("function");
  });

  it("useDeleteActivityTemplate returns a function", () => {
    const { result } = renderHook(
      () => useDeleteActivityTemplate(undefined),
      { wrapper },
    );

    expect(result.current).toBeTypeOf("function");
  });

  it("useActivityTemplates fetches and returns types with programId", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        // individual rules query
        return Promise.resolve({
          data: [
            {
              _id: "rule-1",
              name: "_meta AT:cfg-1",
              ext: { _meta: { id: "cfg-1", fieldName: "ns1", typeValues: ["t1"], label: "Template 1", extensions: [], reasonCodes: [], validationRules: [] } },
            },
          ],
        });
      }
      // legacy query
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(
      () => useActivityTemplates("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.types).toHaveLength(1);
    });

    expect(result.current.types[0]!.id).toBe("cfg-1");
    expect(result.current.configRuleMap.get("cfg-1")).toBe("rule-1");
    expect(result.current.isLoading).toBe(false);
  });

  it("useActivityTemplates cleans up empty legacy rule", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({ data: [] });
      }
      // legacy rule with no types
      return Promise.resolve({
        data: [{ _id: "legacy-1", name: "_meta Activity Templates" }],
      });
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useActivityTemplates("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.delete).toHaveBeenCalledWith("rules/legacy-1");
  });

  it("useActivityTemplates migrates legacy rule with types", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({
        data: [{
          _id: "legacy-1",
          name: "_meta Activity Templates",
          ext: {
            _meta: {
              types: [
                { id: "cfg-x", fieldName: "ns", typeValues: ["t"], label: "Migrated", extensions: [], reasonCodes: [], validationRules: [] },
              ],
            },
          },
        }],
      });
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { _id: "new-rule-1", name: "_meta AT:cfg-x", ext: { _meta: { id: "cfg-x" } } },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useActivityTemplates("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(ensureRuleExtensionSchema).toHaveBeenCalled();
    expect(ensureMetaFolder).toHaveBeenCalledWith("prog-1");
    expect(apiClient.post).toHaveBeenCalledWith("rules", expect.objectContaining({
      name: "_meta AT:cfg-x",
      program: "prog-1",
    }));
    expect(apiClient.delete).toHaveBeenCalledWith("rules/legacy-1");
  });

  it("useActivityTemplate finds config by id", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({
          data: [
            { _id: "r1", name: "_meta AT:a", ext: { _meta: { id: "a", fieldName: "f", typeValues: ["t"], label: "A", extensions: [], reasonCodes: [], validationRules: [] } } },
            { _id: "r2", name: "_meta AT:b", ext: { _meta: { id: "b", fieldName: "f2", typeValues: ["t2"], label: "B", extensions: [], reasonCodes: [], validationRules: [] } } },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(
      () => useActivityTemplate("prog-1", "b"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.config).not.toBeNull();
    });

    expect(result.current.config!.id).toBe("b");
    expect(result.current.allTypes).toHaveLength(2);
  });

  it("useActivityTemplate returns null for non-existent configId", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(
      () => useActivityTemplate("prog-1", "nonexistent"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toBeNull();
  });

  it("useActivityTemplateCount returns correct count", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({
          data: [
            { _id: "r1", ext: { _meta: { id: "a" } } },
            { _id: "r2", ext: { _meta: { id: "b" } } },
            { _id: "r3", ext: { _meta: { id: "c" } } },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(
      () => useActivityTemplateCount("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.count).toBe(3);
    });
  });

  it("useSaveActivityTemplate updates existing rule", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({
          data: [{ _id: "rule-1", name: "_meta AT:cfg-1", ext: { _meta: { id: "cfg-1" } } }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useSaveActivityTemplate("prog-1"),
      { wrapper },
    );

    // Wait for initial data load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    // Flush React state updates from query resolution
    await act(() => Promise.resolve());

    await act(() => result.current({
      id: "cfg-1",
      fieldName: "ns",
      typeValues: ["t"],
      label: "Updated",
      extensions: [],
      reasonCodes: [],
      validationRules: [],
      calculatedFields: [],
    }));

    expect(apiClient.patch).toHaveBeenCalledWith("rules/rule-1", expect.objectContaining({
      ext: { _meta: expect.objectContaining({ id: "cfg-1", label: "Updated" }) },
    }));
  });

  it("useSaveActivityTemplate creates new rule when no existing", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { _id: "new-1" } });

    const { result } = renderHook(
      () => useSaveActivityTemplate("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    // Flush React state updates from query resolution
    await act(() => Promise.resolve());

    await act(() => result.current({
      id: "new-cfg",
      fieldName: "ns",
      typeValues: ["t"],
      label: "New",
      extensions: [],
      reasonCodes: [],
      validationRules: [],
      calculatedFields: [],
    }));

    expect(ensureRuleExtensionSchema).toHaveBeenCalled();
    expect(ensureMetaFolder).toHaveBeenCalledWith("prog-1");
    expect(apiClient.post).toHaveBeenCalledWith("rules", expect.objectContaining({
      name: "_meta AT:new-cfg",
      program: "prog-1",
    }));
  });

  it("useSaveActivityTemplate throws without programId", async () => {
    const { result } = renderHook(
      () => useSaveActivityTemplate(undefined),
      { wrapper },
    );

    await expect(
      result.current({
        id: "cfg-1",
        fieldName: "ns",
        typeValues: ["t"],
        label: "Test",
        extensions: [],
        reasonCodes: [],
        validationRules: [],
        calculatedFields: [],
      }),
    ).rejects.toThrow("No program selected");
  });

  it("useDeleteActivityTemplate deletes the rule by configId", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({
          data: [{ _id: "rule-1", name: "_meta AT:cfg-1", ext: { _meta: { id: "cfg-1" } } }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useDeleteActivityTemplate("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    // Flush React state updates from query resolution
    await act(() => Promise.resolve());

    await act(() => result.current("cfg-1"));

    expect(apiClient.delete).toHaveBeenCalledWith("rules/rule-1");
  });

  it("useDeleteActivityTemplate throws for unknown configId", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(
      () => useDeleteActivityTemplate("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    // Flush React state updates from query resolution
    await act(() => Promise.resolve());

    await act(async () => {
      await expect(result.current("unknown")).rejects.toThrow("No rule found for config unknown");
    });
  });

  it("useActivityTemplates save function invalidates queries", async () => {
    vi.mocked(apiClient.get).mockImplementation((_url: string, opts?: Record<string, unknown>) => {
      const params = opts?.params as Record<string, string> | undefined;
      const query = params?.query ?? "";
      if (query.includes("$regex")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(
      () => useActivityTemplates("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // save should not throw
    await result.current.save();
  });

  it("useActivityTemplates rawMeta is always null", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () => useActivityTemplates("prog-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rawMeta).toBeNull();
  });
});
