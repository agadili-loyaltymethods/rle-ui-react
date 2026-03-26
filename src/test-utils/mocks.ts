import { vi } from "vitest";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useUIStore } from "@/shared/stores/ui-store";

/**
 * Reset auth store to a known authenticated state.
 * Call in beforeEach for tests that need an authenticated user.
 */
export function mockAuthenticatedUser(overrides?: Record<string, unknown>) {
  useAuthStore.setState({
    token: "test-token",
    user: {
      id: "user-1",
      login: "testorg/testuser",
      email: "test@test.com",
      org: "testorg",
      division: "us",
    },
    isAuthenticated: true,
    ...overrides,
  });
}

/**
 * Reset auth store to unauthenticated state.
 */
export function mockUnauthenticatedUser() {
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
  });
}

/**
 * Reset UI store to a known state with a selected program.
 * Call in beforeEach for tests that need org/program context.
 */
export function mockUIState(overrides?: Record<string, unknown>) {
  useUIStore.setState({
    sidebarCollapsed: false,
    sidebarMobileOpen: false,
    theme: "light" as const,
    currentOrg: "testorg",
    currentProgram: "prog-1",
    currentProgramName: "Test Program",
    ...overrides,
  });
}

/**
 * Standard vi.mock factory for usePermissions that grants full CRUD access.
 * Use in vi.mock calls: vi.mock("@/shared/hooks/use-permissions", mockFullPermissions)
 *
 * Or inline: vi.mock("@/shared/hooks/use-permissions", () => ({
 *   usePermissions: () => FULL_PERMISSIONS,
 * }));
 */
export const FULL_PERMISSIONS = {
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  isLoading: false,
};

export function mockFullPermissions() {
  return { usePermissions: () => FULL_PERMISSIONS };
}

/**
 * Create a mock apiClient.get that handles list + count endpoints.
 */
export function mockApiListResponse(
  mockGet: ReturnType<typeof vi.fn>,
  data: unknown[],
  count?: number,
) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/count")) {
      return Promise.resolve({ data: { count: count ?? data.length } });
    }
    return Promise.resolve({ data });
  });
}
