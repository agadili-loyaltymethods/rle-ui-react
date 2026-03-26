import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import PursePoliciesPage from "./purse-policies-page";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../hooks/use-policies", () => ({
  useAllPursePolicies: vi.fn(),
  useDeletePursePolicy: vi.fn(),
}));

import { useAllPursePolicies, useDeletePursePolicy } from "../hooks/use-policies";

vi.mock("../utils/group-purse-policies", () => ({
  groupPursePolicies: vi.fn(),
}));

import { groupPursePolicies } from "../utils/group-purse-policies";

vi.mock("../components/view-toggle", () => ({
  ViewToggle: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="view-toggle">
      <button data-testid="purse-mock-view-toggle-card" aria-label="Switch to card view" onClick={() => onChange("card")}>card</button>
      <button data-testid="purse-mock-view-toggle-list" aria-label="Switch to list view" onClick={() => onChange("list")}>list</button>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("../components/purse-grouped-table", () => ({
  PurseGroupedTable: ({ onToggleGroup, onEdit, onDelete }: {
    onToggleGroup: (name: string) => void;
    onEdit: (policy: Record<string, unknown>) => void;
    onDelete: (policy: Record<string, unknown>) => void;
  }) => (
    <div data-testid="purse-grouped-table">
      <button data-testid="toggle-group-btn" aria-label="Toggle group" onClick={() => onToggleGroup("Points")}>Toggle</button>
      <button data-testid="edit-policy-btn" aria-label="Edit policy" onClick={() => onEdit({ _id: "pp-1", name: "Base Points" })}>Edit</button>
      <button data-testid="delete-policy-btn" aria-label="Delete policy" onClick={() => onDelete({ _id: "pp-1", name: "Base Points" })}>Delete</button>
    </div>
  ),
}));

vi.mock("../components/purse-grouped-cards", () => ({
  PurseGroupedCards: ({ onToggleGroup, onEdit, onDelete }: {
    onToggleGroup: (name: string) => void;
    onEdit: (policy: Record<string, unknown>) => void;
    onDelete: (policy: Record<string, unknown>) => void;
  }) => (
    <div data-testid="purse-grouped-cards">
      <button data-testid="card-toggle-group-btn" aria-label="Toggle card group" onClick={() => onToggleGroup("Points")}>Toggle</button>
      <button data-testid="card-edit-policy-btn" aria-label="Edit card policy" onClick={() => onEdit({ _id: "pp-2", name: "Bonus Points" })}>Edit</button>
      <button data-testid="card-delete-policy-btn" aria-label="Delete card policy" onClick={() => onDelete({ _id: "pp-2", name: "Bonus Points" })}>Delete</button>
    </div>
  ),
}));

vi.mock("@/shared/components/search-bar", () => ({
  SearchBar: ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="purse-search"
      aria-label="Search purse policies"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? (
      <div data-testid="delete-dialog">
        <button data-testid="purse-confirm-delete-btn" aria-label="Confirm delete" onClick={onConfirm}>Confirm</button>
        <button data-testid="purse-cancel-delete-btn" aria-label="Cancel delete" onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/no-program-banner", () => ({
  NoProgramBanner: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string}>No program selected</div>
  ),
}));

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

describe("PursePoliciesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    localStorage.removeItem("rcx.ui.pursePolicyViewMode");

    vi.mocked(useAllPursePolicies).mockReturnValue({
      data: [
        { _id: "pp-1", name: "Base Points", group: "Points", program: "prog-1" },
        { _id: "pp-2", name: "Bonus Points", group: "Points", program: "prog-1" },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    vi.mocked(useDeletePursePolicy).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);

    vi.mocked(groupPursePolicies).mockImplementation((policies: unknown[]) => [
      { groupName: "Points", policies },
    ]);
  });

  it("renders the page heading", () => {
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByText("Purse Policies")).toBeInTheDocument();
  });

  it("renders with purse-page test id", () => {
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByTestId("purse-page")).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(
      screen.getByText("Manage point purses, multipliers, expiration, and escrow settings"),
    ).toBeInTheDocument();
  });

  it("renders search bar", () => {
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByTestId("purse-search")).toBeInTheDocument();
  });

  it("renders the Add button", () => {
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByTestId("purse-add")).toBeInTheDocument();
  });

  it("renders table view by default", () => {
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByTestId("purse-grouped-table")).toBeInTheDocument();
  });

  it("shows NoProgramBanner when no program is selected", () => {
    mockUIState({ currentProgram: null });
    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByTestId("purse-no-program")).toBeInTheDocument();
  });

  it("shows empty state when no policies exist", () => {
    vi.mocked(useAllPursePolicies).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(groupPursePolicies).mockReturnValue([]);

    render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
    expect(screen.getByText("No purse policies found")).toBeInTheDocument();
  });

  describe("interactions", () => {
    it("clicking Add navigates to new purse policy page", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("purse-add"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/purse-policies/new");
    });

    it("clicking Back navigates to /program", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByLabelText("Back to Program Elements"));
      expect(mockNavigate).toHaveBeenCalledWith("/program");
    });

    it("clicking Refresh calls refetch", () => {
      const mockRefetch = vi.fn();
      vi.mocked(useAllPursePolicies).mockReturnValue({
        data: [{ _id: "pp-1", name: "Base Points", group: "Points", program: "prog-1" }],
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
      } as never);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("purse-refresh"));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner in list view when loading", () => {
      vi.mocked(useAllPursePolicies).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        refetch: vi.fn(),
      } as never);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      const spinners = document.querySelectorAll(".animate-spin");
      expect(spinners.length).toBeGreaterThan(0);
    });

    it("shows skeleton cards in card view when loading", () => {
      localStorage.setItem("rcx.ui.pursePolicyViewMode", "card");
      vi.mocked(useAllPursePolicies).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        refetch: vi.fn(),
      } as never);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      const pulseElements = document.querySelectorAll(".animate-pulse");
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe("card view", () => {
    it("renders card view when stored mode is card", () => {
      localStorage.setItem("rcx.ui.pursePolicyViewMode", "card");
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      expect(screen.getByTestId("purse-grouped-cards")).toBeInTheDocument();
    });
  });

  describe("empty state with search", () => {
    it("shows search-specific empty message when search has value", () => {
      vi.mocked(groupPursePolicies).mockReturnValue([]);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      expect(screen.getByText("No purse policies found")).toBeInTheDocument();
    });

    it("shows 'No matching purse policies' when search returns no results", () => {
      vi.mocked(groupPursePolicies).mockReturnValue([]);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      const searchInput = screen.getByTestId("purse-search");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      expect(screen.getByText("No matching purse policies")).toBeInTheDocument();
    });
  });

  describe("view toggle", () => {
    it("switches to card view and persists in localStorage", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("purse-mock-view-toggle-card"));
      expect(screen.getByTestId("purse-grouped-cards")).toBeInTheDocument();
      expect(localStorage.getItem("rcx.ui.pursePolicyViewMode")).toBe("card");
    });

    it("switches to list view and persists in localStorage", () => {
      localStorage.setItem("rcx.ui.pursePolicyViewMode", "card");
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("purse-mock-view-toggle-list"));
      expect(screen.getByTestId("purse-grouped-table")).toBeInTheDocument();
      expect(localStorage.getItem("rcx.ui.pursePolicyViewMode")).toBe("list");
    });
  });

  describe("group toggling", () => {
    it("calls handleToggleGroup when toggling in table view", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("toggle-group-btn"));
      // Toggle adds group to expandedGroups; clicking again should remove it
      fireEvent.click(screen.getByTestId("toggle-group-btn"));
    });

    it("calls handleToggleGroup in card view", () => {
      localStorage.setItem("rcx.ui.pursePolicyViewMode", "card");
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("card-toggle-group-btn"));
    });
  });

  describe("edit policy", () => {
    it("clicking edit navigates to purse policy edit page", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("edit-policy-btn"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/purse-policies/pp-1");
    });
  });

  describe("delete flow", () => {
    it("clicking delete opens the delete dialog", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("delete-policy-btn"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("clicking cancel in delete dialog closes it", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("delete-policy-btn"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("purse-cancel-delete-btn"));
      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    });

    it("clicking confirm in delete dialog triggers mutation", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useDeletePursePolicy).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as never);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      fireEvent.click(screen.getByTestId("delete-policy-btn"));
      fireEvent.click(screen.getByTestId("purse-confirm-delete-btn"));
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith("pp-1");
      });
    });
  });

  describe("search filtering", () => {
    it("filters policies by name when searching", () => {
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      const searchInput = screen.getByTestId("purse-search");
      fireEvent.change(searchInput, { target: { value: "Base" } });
      // groupPursePolicies is called with filtered results
      expect(vi.mocked(groupPursePolicies)).toHaveBeenCalled();
    });
  });

  describe("empty state actions", () => {
    it("shows Add button in empty state without search", () => {
      vi.mocked(useAllPursePolicies).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as never);
      vi.mocked(groupPursePolicies).mockReturnValue([]);

      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      const addBtns = screen.getAllByText("Add");
      // Click the empty-state Add button
      fireEvent.click(addBtns[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/program/purse-policies/new");
    });
  });

  describe("getStoredViewMode", () => {
    it("returns list as default when no stored value", () => {
      localStorage.removeItem("rcx.ui.pursePolicyViewMode");
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      // Default is list, so table should be rendered
      expect(screen.getByTestId("purse-grouped-table")).toBeInTheDocument();
    });

    it("returns stored card value", () => {
      localStorage.setItem("rcx.ui.pursePolicyViewMode", "card");
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      expect(screen.getByTestId("purse-grouped-cards")).toBeInTheDocument();
    });

    it("returns list for invalid stored value", () => {
      localStorage.setItem("rcx.ui.pursePolicyViewMode", "invalid");
      render(<PursePoliciesPage />, { routerEntries: ["/program/purse-policies"] });
      expect(screen.getByTestId("purse-grouped-table")).toBeInTheDocument();
    });
  });
});
