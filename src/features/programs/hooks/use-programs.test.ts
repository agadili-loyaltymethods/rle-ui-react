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
import { apiClient } from "@/shared/lib/api-client";
import {
  usePrograms,
  useProgram,
  useCreateProgram,
  useUpdateProgram,
} from "./use-programs";

const wrapper = createWrapper();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-programs", () => {
  it("exports usePrograms hook", () => {
    expect(usePrograms).toBeTypeOf("function");
  });

  it("exports useProgram hook", () => {
    expect(useProgram).toBeTypeOf("function");
  });

  it("exports useCreateProgram hook", () => {
    expect(useCreateProgram).toBeTypeOf("function");
  });

  it("exports useUpdateProgram hook", () => {
    expect(useUpdateProgram).toBeTypeOf("function");
  });

  it("usePrograms returns query result shape", () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      headers: { "x-total-count": "0" },
    });

    const { result } = renderHook(() => usePrograms(), { wrapper });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
  });

  it("useProgram is disabled when id is undefined", () => {
    const { result } = renderHook(() => useProgram(undefined), { wrapper });

    expect(result.current).toHaveProperty("data");
    expect(result.current.isLoading).toBe(false);
  });

  it("useCreateProgram returns mutation shape", () => {
    const { result } = renderHook(() => useCreateProgram(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });

  it("useUpdateProgram returns mutation shape", () => {
    const { result } = renderHook(() => useUpdateProgram(), { wrapper });

    expect(result.current).toHaveProperty("mutateAsync");
    expect(result.current).toHaveProperty("isPending");
  });
});
