import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, createWrapper } from "@/test-utils";

vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      get: vi.fn(),
      create: vi.fn(() => mockInstance),
    },
  };
});

import axios from "axios";
import { useAppConfig } from "./use-app-config";

const mockAxiosGet = axios.get as ReturnType<typeof vi.fn>;

describe("useAppConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches config from /api/config and returns data", async () => {
    const mockConfig = {
      flags: {
        disableMemberUnMerge: false,
        disableSearchFLName: false,
        disableSearchPhone: false,
        disableSearchEmail: false,
        disablePointsDivider: false,
        mode: "standard",
        decimalPrecision: 2,
        enableAutoExpiration: false,
      },
      env: { name: "dev", color: "#00ff00" },
      oidcEnabled: false,
    };

    mockAxiosGet.mockResolvedValueOnce({ data: mockConfig });

    const { result } = renderHook(() => useAppConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConfig);
    expect(mockAxiosGet).toHaveBeenCalledWith("/api/config");
  });

  it("returns isLoading true initially", () => {
    mockAxiosGet.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useAppConfig(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });
});
