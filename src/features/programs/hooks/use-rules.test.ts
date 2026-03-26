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
import { useRules, useRule, useRuleFolders } from "./use-rules";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-rules", () => {
  it("exports useRules hook", () => {
    expect(useRules).toBeTypeOf("function");
  });

  it("exports useRule hook", () => {
    expect(useRule).toBeTypeOf("function");
  });

  it("exports useRuleFolders hook", () => {
    expect(useRuleFolders).toBeTypeOf("function");
  });

  it("useRules is disabled without programId", () => {
    const { result } = renderHook(() => useRules(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
  });

  it("useRule is disabled without id", () => {
    const { result } = renderHook(() => useRule(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
  });

  it("useRuleFolders is disabled without programId", () => {
    const { result } = renderHook(() => useRuleFolders(undefined), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
  });
});
