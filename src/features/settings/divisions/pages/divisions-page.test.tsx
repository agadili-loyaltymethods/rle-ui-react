import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import { mockAuthenticatedUser } from "@/test-utils";
import Component from "./divisions-page";

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: vi.fn(() => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    isLoading: false,
  })),
}));

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: [
        {
          _id: "div-1",
          name: "US Division",
          isActive: true,
          org: "test-org",
          description: "US ops",
          permissions: {
            read: true,
            update: false,
            create: false,
            delete: false,
          },
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          _id: "div-2",
          name: "EU Division",
          isActive: true,
          org: "test-org",
          parent: "div-1",
          permissions: {
            read: true,
            update: true,
            create: false,
            delete: false,
          },
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      headers: { "x-total-count": "2" },
    }),
    post: vi.fn().mockResolvedValue({ data: { _id: "new-1", name: "New" } }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe("DivisionsPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
  });

  it("renders the page heading", async () => {
    render(<Component />);
    expect(screen.getByText("divisions.title")).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<Component />);
    expect(screen.getByTestId("page-divisions")).toBeInTheDocument();
  });

  it("renders the tree with division data", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByText("US Division")).toBeInTheDocument();
    });
  });

  it("shows the empty detail panel initially", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByText("divisions.selectOrCreate")).toBeInTheDocument();
    });
  });

  it("renders the new division button", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByTestId("division-create-button")).toBeInTheDocument();
    });
  });

  it("renders the search input", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByTestId("division-search-input")).toBeInTheDocument();
    });
  });

  it("hides create button when canCreate is false", async () => {
    const mod = await import("@/shared/hooks/use-permissions");
    vi.mocked(mod.usePermissions).mockReturnValue({
      canRead: true,
      canCreate: false,
      canUpdate: true,
      canDelete: true,
      isLoading: false,
    });
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByText("US Division")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("division-create-button")).not.toBeInTheDocument();
  });

  it("shows no-access message when canRead is false", async () => {
    const mod = await import("@/shared/hooks/use-permissions");
    vi.mocked(mod.usePermissions).mockReturnValue({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      isLoading: false,
    });
    render(<Component />);
    expect(screen.getByText("divisions.noAccess")).toBeInTheDocument();
  });
});
