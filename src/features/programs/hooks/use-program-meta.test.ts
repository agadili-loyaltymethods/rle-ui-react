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

import { renderHook, createWrapper, waitFor } from "@/test-utils";
import { apiClient } from "@/shared/lib/api-client";
import {
  ensureRuleExtensionSchema,
  ensureMetaFolder,
  useProgramMeta,
} from "./use-program-meta";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
  // Reset module-level caches by re-importing isn't feasible,
  // but we can test the first-call behavior in isolated tests
});

describe("use-program-meta", () => {
  it("exports ensureRuleExtensionSchema", () => {
    expect(ensureRuleExtensionSchema).toBeTypeOf("function");
  });

  it("exports ensureMetaFolder", () => {
    expect(ensureMetaFolder).toBeTypeOf("function");
  });

  it("exports useProgramMeta hook", () => {
    expect(useProgramMeta).toBeTypeOf("function");
  });

  it("useProgramMeta is disabled without programId", () => {
    const { result } = renderHook(
      () => useProgramMeta(undefined, "test-subject"),
      { wrapper },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.save).toBeTypeOf("function");
  });

  it("ensureRuleExtensionSchema skips creation when schema exists", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "schema-1" }],
    });

    await ensureRuleExtensionSchema();

    expect(apiClient.get).toHaveBeenCalledWith("extensionschemas", {
      params: {
        query: JSON.stringify({ model: "Rule" }),
        limit: "1",
      },
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("ensureRuleExtensionSchema uses cache on second call", async () => {
    // After the previous test, the schema should be cached
    vi.mocked(apiClient.get).mockClear();
    await ensureRuleExtensionSchema();

    // Should not call API again (cached)
    expect(apiClient.get).not.toHaveBeenCalledWith("extensionschemas", expect.anything());
  });

  it("ensureMetaFolder returns existing folder id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "folder-abc" }],
    });

    const folderId = await ensureMetaFolder("prog-new-1");

    expect(folderId).toBe("folder-abc");
    expect(apiClient.get).toHaveBeenCalledWith("rulefolders", {
      params: {
        query: JSON.stringify({ program: "prog-new-1", name: "_meta" }),
        limit: "1",
      },
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("ensureMetaFolder creates folder when none exists", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { _id: "new-folder-1" },
    });

    const folderId = await ensureMetaFolder("prog-new-2");

    expect(folderId).toBe("new-folder-1");
    expect(apiClient.post).toHaveBeenCalledWith("rulefolders", {
      name: "_meta",
      desc: "RCX UX Metadata",
      program: "prog-new-2",
    });
  });

  it("ensureMetaFolder uses cache on second call for same program", async () => {
    vi.mocked(apiClient.get).mockClear();
    vi.mocked(apiClient.post).mockClear();

    const folderId = await ensureMetaFolder("prog-new-1");

    // Should return cached value without API call
    expect(folderId).toBe("folder-abc");
    expect(apiClient.get).not.toHaveBeenCalledWith("rulefolders", expect.anything());
  });

  it("useProgramMeta fetches metadata for a program", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        {
          _id: "rule-meta-1",
          ext: { _meta: { foo: "bar", count: 42 } },
        },
      ],
    });

    const { result } = renderHook(
      () => useProgramMeta<{ foo: string; count: number }>("prog-fetch-1", "TestSubject"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data).toEqual({ foo: "bar", count: 42 });
    expect(result.current.isLoading).toBe(false);
  });

  it("useProgramMeta returns null when no rule exists", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () => useProgramMeta("prog-empty", "NoData"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it("useProgramMeta returns null when rule has no ext._meta", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "rule-no-meta", ext: {} }],
    });

    const { result } = renderHook(
      () => useProgramMeta("prog-no-meta", "Empty"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it("useProgramMeta save patches existing rule", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ _id: "rule-save-1", ext: { _meta: { value: "old" } } }],
    });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useProgramMeta<{ value: string }>("prog-save", "SaveTest"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    await result.current.save({ value: "new" });

    expect(apiClient.patch).toHaveBeenCalledWith("rules/rule-save-1", {
      ext: { _meta: { value: "new" } },
    });
  });

  it("useProgramMeta save creates new rule when none exists", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "rulefolders") {
        return Promise.resolve({ data: [{ _id: "folder-x" }] });
      }
      // Return empty for rules query
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { _id: "new-rule" } });

    const { result } = renderHook(
      () => useProgramMeta<{ value: string }>("prog-create-meta", "NewSubject"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.save({ value: "created" });

    expect(apiClient.post).toHaveBeenCalledWith("rules", expect.objectContaining({
      name: "_meta NewSubject",
      program: "prog-create-meta",
      ext: { _meta: { value: "created" } },
    }));
  });

  it("useProgramMeta save throws without programId when creating", async () => {
    const { result } = renderHook(
      () => useProgramMeta(undefined, "NoProgram"),
      { wrapper },
    );

    await expect(result.current.save({ test: true })).rejects.toThrow("No program");
  });
});
