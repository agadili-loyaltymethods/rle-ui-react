import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, createWrapper, mockUnauthenticatedUser, mockAuthenticatedUser } from "@/test-utils";
import { usePermissions, clearPermissionCache, fetchAllPermissions } from "./use-permissions";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "@/shared/lib/api-client";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

function mockAclResponse(perms: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>) {
  mockGet.mockResolvedValue({ data: { user: "admin", permissions: perms } });
}

describe("usePermissions", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearPermissionCache();
    mockUnauthenticatedUser();
    vi.clearAllMocks();
  });

  it("returns all false when user is not authenticated", () => {
    const { result } = renderHook(() => usePermissions("members"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("returns isLoading true while fetch is in-flight", () => {
    mockAuthenticatedUser();
    // Never-resolving promise to keep fetch in loading state
    mockGet.mockReturnValue(new Promise(() => {}));

    fetchAllPermissions();

    const { result } = renderHook(() => usePermissions("members"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("returns full CRUD when model has all permissions", async () => {
    mockAuthenticatedUser();
    mockAclResponse({
      Member: { create: true, read: true, update: true, delete: true },
    });

    await fetchAllPermissions();

    const { result } = renderHook(() => usePermissions("members"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      isLoading: false,
    });
  });

  it("returns all false when model has no permissions", async () => {
    mockAuthenticatedUser();
    mockAclResponse({
      PursePolicy: { create: false, read: false, update: false, delete: false },
    });

    await fetchAllPermissions();

    const { result } = renderHook(() => usePermissions("pursepolicies"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("returns mixed permissions correctly", async () => {
    mockAuthenticatedUser();
    mockAclResponse({
      Segment: { create: false, read: true, update: true, delete: false },
    });

    await fetchAllPermissions();

    const { result } = renderHook(() => usePermissions("segments"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      canRead: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
    });
  });

  it("maps PascalCase model names to lowercase plural endpoints", async () => {
    mockAuthenticatedUser();
    mockAclResponse({
      TierPolicy: { create: true, read: true, update: false, delete: false },
      RewardPolicy: { create: false, read: true, update: false, delete: false },
      Location: { create: true, read: true, update: true, delete: true },
    });

    await fetchAllPermissions();

    const { result: tierResult } = renderHook(() => usePermissions("tierpolicies"), {
      wrapper: createWrapper(),
    });
    expect(tierResult.current).toMatchObject({ canRead: true, canCreate: true, canUpdate: false, canDelete: false });

    const { result: rewardResult } = renderHook(() => usePermissions("rewardpolicies"), {
      wrapper: createWrapper(),
    });
    expect(rewardResult.current).toMatchObject({ canRead: true, canCreate: false, canUpdate: false, canDelete: false });

    const { result: locResult } = renderHook(() => usePermissions("locations"), {
      wrapper: createWrapper(),
    });
    expect(locResult.current).toMatchObject({ canRead: true, canCreate: true, canUpdate: true, canDelete: true });
  });

  it("returns all denied for unknown endpoints", async () => {
    mockAuthenticatedUser();
    mockAclResponse({
      Member: { create: true, read: true, update: true, delete: true },
    });

    await fetchAllPermissions();

    const { result } = renderHook(() => usePermissions("unknownmodel"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("fails closed on network errors (denies access)", async () => {
    mockAuthenticatedUser();
    mockGet.mockRejectedValue(new Error("Network Error"));

    await fetchAllPermissions();

    const { result } = renderHook(() => usePermissions("members"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toMatchObject({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("clears cache on clearPermissionCache", async () => {
    mockAuthenticatedUser();
    mockAclResponse({
      Member: { create: true, read: true, update: true, delete: true },
    });

    await fetchAllPermissions();

    // Verify cached
    const { result: before } = renderHook(() => usePermissions("members"), {
      wrapper: createWrapper(),
    });
    expect(before.current.canRead).toBe(true);

    // Clear and verify denied
    clearPermissionCache();

    const { result: after } = renderHook(() => usePermissions("members"), {
      wrapper: createWrapper(),
    });
    expect(after.current.canRead).toBe(false);
  });
});
