import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test-utils";
import { FULL_PERMISSIONS } from "@/test-utils/mocks";
import { PermissionGate } from "./permission-gate";

const ALL_DENIED = { canRead: false, canCreate: false, canUpdate: false, canDelete: false, isLoading: false };

const mockUsePermissions = vi.fn(() => FULL_PERMISSIONS);

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: (...args: unknown[]) => mockUsePermissions(...args),
}));

describe("PermissionGate", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue(FULL_PERMISSIONS);
  });

  it("renders children when user has permission", () => {
    render(
      <PermissionGate entity="members" action="read">
        <span data-testid="protected">Protected content</span>
      </PermissionGate>,
    );
    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("renders fallback when user has no permission", () => {
    mockUsePermissions.mockReturnValue(ALL_DENIED);
    render(
      <PermissionGate
        entity="members"
        action="read"
        fallback={<span data-testid="fallback">No access</span>}
      >
        <span data-testid="protected">Protected content</span>
      </PermissionGate>,
    );
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("renders nothing (no fallback) when user has no permission and no fallback provided", () => {
    mockUsePermissions.mockReturnValue(ALL_DENIED);
    const { container } = render(
      <PermissionGate entity="members" action="read">
        <span data-testid="protected">Protected content</span>
      </PermissionGate>,
    );
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(container.innerHTML).toBe("");
  });

  it("works with all action types when authenticated", () => {
    for (const action of ["read", "create", "update", "delete"] as const) {
      const { unmount } = render(
        <PermissionGate entity="members" action={action}>
          <span data-testid={`perm-${action}`}>{action}</span>
        </PermissionGate>,
      );
      expect(screen.getByTestId(`perm-${action}`)).toBeInTheDocument();
      unmount();
    }
  });

  it("blocks all action types when denied", () => {
    mockUsePermissions.mockReturnValue(ALL_DENIED);
    for (const action of ["read", "create", "update", "delete"] as const) {
      const { unmount } = render(
        <PermissionGate entity="members" action={action}>
          <span data-testid={`perm-${action}`}>{action}</span>
        </PermissionGate>,
      );
      expect(screen.queryByTestId(`perm-${action}`)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("works with different entity names", () => {
    render(
      <PermissionGate entity="programs" action="update">
        <span data-testid="programs-update">Can update programs</span>
      </PermissionGate>,
    );
    expect(screen.getByTestId("programs-update")).toBeInTheDocument();
  });
});
