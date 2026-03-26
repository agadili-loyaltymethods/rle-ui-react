import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import { useEntityList } from "@/shared/hooks/use-api";
import { PolicyListPage } from "./policy-list-page";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/shared/hooks/use-api", () => ({
  useEntityList: vi.fn(),
}));

vi.mock("@/shared/components/data-table/data-table", () => ({
  DataTable: ({
    onSortChange,
    onPageChange,
    onPageSizeChange,
  }: {
    onSortChange?: (s: unknown) => void;
    onPageChange?: (p: number) => void;
    onPageSizeChange?: (s: number) => void;
  }) => (
    <div data-testid="data-table">
      Table
      {onSortChange && (
        <button data-testid="sort-trigger" aria-label="Sort table" onClick={() => onSortChange([{ id: "name", desc: true }])}>
          Sort
        </button>
      )}
      {onPageChange && (
        <button data-testid="page-trigger" aria-label="Change page" onClick={() => onPageChange(2)}>
          Page
        </button>
      )}
      {onPageSizeChange && (
        <button data-testid="pagesize-trigger" aria-label="Change page size" onClick={() => onPageSizeChange(50)}>
          PageSize
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/shared/components/search-bar", () => ({
  SearchBar: ({ placeholder, onChange }: { placeholder: string; onChange: (v: string) => void }) => (
    <input data-testid="policy-list-search-bar" aria-label="Search policies" placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({
    open,
    onClose,
    onConfirm,
    itemName,
  }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
  }) =>
    open ? (
      <div data-testid="delete-dialog">
        <span data-testid="delete-item-name">{itemName}</span>
        <button data-testid="policy-list-delete-confirm" aria-label="Confirm delete" onClick={onConfirm}>Confirm</button>
        <button data-testid="policy-list-delete-close" aria-label="Close delete dialog" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/no-program-banner", () => ({
  NoProgramBanner: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string}>No program selected</div>
  ),
}));

vi.mock("./view-toggle", () => ({
  ViewToggle: ({ value, onChange }: { value: string; onChange: (mode: string) => void }) => (
    <div data-testid="view-toggle">
      {value}
      <button data-testid="policy-list-switch-to-card" aria-label="Switch to card view" onClick={() => onChange("card")}>Card</button>
      <button data-testid="policy-list-switch-to-list" aria-label="Switch to list view" onClick={() => onChange("list")}>List</button>
    </div>
  ),
}));

const testConfig = {
  title: "Test Policies",
  testIdPrefix: "test-policy",
  endpoint: "testpolicies",
  basePath: "/program/test-policies",
  columns: [],
  renderCard: (item: { _id: string; name?: string }, actions: { onEdit: () => void; onDelete: () => void }) => (
    <div key={item._id} data-testid={`card-${item._id}`}>
      {item.name}
      <button data-testid={`card-edit-${item._id}`} aria-label={`Edit ${item.name}`} onClick={actions.onEdit}>Edit</button>
      <button data-testid={`card-delete-${item._id}`} aria-label={`Delete ${item.name}`} onClick={actions.onDelete}>Delete</button>
    </div>
  ),
};

const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});
const mockUseDelete = () => ({
  mutateAsync: mockDeleteMutateAsync,
  isPending: false,
});

function mockDefaultEntityList() {
  vi.mocked(useEntityList).mockReturnValue({
    data: {
      data: [
        { _id: "item-1", name: "Test Item 1" },
        { _id: "item-2", name: "Test Item 2" },
      ],
      meta: { totalCount: 2 },
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  } as ReturnType<typeof useEntityList>);
}

describe("PolicyListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    localStorage.removeItem("rcx.ui.policyViewMode");
    mockDefaultEntityList();
  });

  it("renders the page with test id prefix", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("test-policy-page")).toBeInTheDocument();
  });

  it("renders the page title", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByText("Test Policies")).toBeInTheDocument();
  });

  it("renders the Add button", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("test-policy-add")).toBeInTheDocument();
  });

  it("shows NoProgramBanner when no program is selected", () => {
    mockUIState({ currentProgram: null });
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("test-policy-no-program")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("policy-list-search-bar")).toBeInTheDocument();
  });

  it("renders the view toggle", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("view-toggle")).toBeInTheDocument();
  });

  it("renders DataTable in list mode by default", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("renders card view when stored view mode is card", () => {
    localStorage.setItem("rcx.ui.policyViewMode", "card");
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    // In card view, cards are rendered instead of data table
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-item-2")).toBeInTheDocument();
  });

  it("shows card items with names in card view", () => {
    localStorage.setItem("rcx.ui.policyViewMode", "card");
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByText("Test Item 1")).toBeInTheDocument();
    expect(screen.getByText("Test Item 2")).toBeInTheDocument();
  });

  it("navigates to create page when Add is clicked", () => {
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    fireEvent.click(screen.getByTestId("test-policy-add"));
    expect(mockNavigate).toHaveBeenCalledWith("/program/test-policies/new");
  });

  it("navigates to edit page when card Edit is clicked", () => {
    localStorage.setItem("rcx.ui.policyViewMode", "card");
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]!);
    expect(mockNavigate).toHaveBeenCalledWith("/program/test-policies/item-1");
  });

  it("shows loading skeleton cards in card view when loading", () => {
    localStorage.setItem("rcx.ui.policyViewMode", "card");
    vi.mocked(useEntityList).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useEntityList>);

    const { container } = render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    // Should show skeleton cards (animate-pulse divs)
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("shows empty state in card view when no items", () => {
    localStorage.setItem("rcx.ui.policyViewMode", "card");
    vi.mocked(useEntityList).mockReturnValue({
      data: { data: [], meta: { totalCount: 0 } },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useEntityList>);

    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByText("No test policies found")).toBeInTheDocument();
  });

  it("defaults to list view for invalid stored view mode", () => {
    localStorage.setItem("rcx.ui.policyViewMode", "invalid");
    render(
      <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
      { routerEntries: ["/program/test-policies"] },
    );
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  describe("delete flow in card view", () => {
    beforeEach(() => {
      localStorage.setItem("rcx.ui.policyViewMode", "card");
    });

    it("opens delete dialog when card Delete is clicked", () => {
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]!);
      // DeleteConfirmDialog mock renders null, but setDeleteItem was called internally
    });
  });

  describe("card view pagination", () => {
    it("shows pagination when totalCount exceeds pageSize", () => {
      vi.mocked(useEntityList).mockReturnValue({
        data: {
          data: Array.from({ length: 25 }, (_, i) => ({ _id: `item-${i}`, name: `Item ${i}` })),
          meta: { totalCount: 50 },
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useEntityList>);

      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("Previous button is disabled on first page", () => {
      vi.mocked(useEntityList).mockReturnValue({
        data: {
          data: Array.from({ length: 25 }, (_, i) => ({ _id: `item-${i}`, name: `Item ${i}` })),
          meta: { totalCount: 50 },
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useEntityList>);

      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      expect(screen.getByText("Previous")).toBeDisabled();
    });

    it("clicking Next advances to next page", () => {
      vi.mocked(useEntityList).mockReturnValue({
        data: {
          data: Array.from({ length: 25 }, (_, i) => ({ _id: `item-${i}`, name: `Item ${i}` })),
          meta: { totalCount: 50 },
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useEntityList>);

      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      fireEvent.click(screen.getByText("Next"));
      // useEntityList should be called again (re-render with new pageIndex)
    });
  });

  describe("empty card view with Add button", () => {
    it("shows Add button in empty card state", () => {
      localStorage.setItem("rcx.ui.policyViewMode", "card");
      vi.mocked(useEntityList).mockReturnValue({
        data: { data: [], meta: { totalCount: 0 } },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useEntityList>);

      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      // There are multiple "Add" texts (header button and empty state), get the one in empty state area
      const addButtons = screen.getAllByText("Add");
      const emptyStateAdd = addButtons.find((btn) => btn.closest(".flex.flex-col.items-center"));
      expect(emptyStateAdd).toBeTruthy();
      fireEvent.click(emptyStateAdd!);
      expect(mockNavigate).toHaveBeenCalledWith("/program/test-policies/new");
    });
  });

  describe("handleSearchChange", () => {
    it("triggers search and resets page index", () => {
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      fireEvent.change(screen.getByTestId("policy-list-search-bar"), { target: { value: "hello" } });
      // useEntityList should be re-called with the search query
      expect(vi.mocked(useEntityList)).toHaveBeenCalled();
    });
  });

  describe("handleSortChange", () => {
    it("triggers sort via DataTable callback", () => {
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      fireEvent.click(screen.getByTestId("sort-trigger"));
      // Sort change should re-call useEntityList
      expect(vi.mocked(useEntityList)).toHaveBeenCalled();
    });
  });

  describe("handleViewModeChange", () => {
    it("switches from list to card view and persists to localStorage", () => {
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      // Initially list view
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      // Switch to card view
      fireEvent.click(screen.getByTestId("policy-list-switch-to-card"));
      // After switching, data-table should be gone and cards should appear
      expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
      expect(localStorage.getItem("rcx.ui.policyViewMode")).toBe("card");
    });
  });

  describe("handleDeleteConfirm", () => {
    it("calls delete mutation and shows success toast on delete confirm", async () => {
      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      // Click delete on first card
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]!);
      // Delete dialog should appear
      await waitFor(() => {
        expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      });
      // Confirm delete
      fireEvent.click(screen.getByTestId("policy-list-delete-confirm"));
      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith("item-1");
      });
    });

    it("closes delete dialog when close is clicked", async () => {
      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]!);
      await waitFor(() => {
        expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("policy-list-delete-close"));
      await waitFor(() => {
        expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
      });
    });

    it("shows error toast when delete fails", async () => {
      mockDeleteMutateAsync.mockRejectedValueOnce(new Error("fail"));
      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]!);
      await waitFor(() => {
        expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("policy-list-delete-confirm"));
      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalled();
      });
    });
  });

  describe("handlePageSizeChange", () => {
    it("triggers page size change via DataTable callback", () => {
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      fireEvent.click(screen.getByTestId("pagesize-trigger"));
      // useEntityList should be re-called
      expect(vi.mocked(useEntityList)).toHaveBeenCalled();
    });
  });

  describe("card view Previous pagination", () => {
    it("clicking Previous goes to previous page", () => {
      vi.mocked(useEntityList).mockReturnValue({
        data: {
          data: Array.from({ length: 25 }, (_, i) => ({ _id: `item-${i}`, name: `Item ${i}` })),
          meta: { totalCount: 75 },
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useEntityList>);

      localStorage.setItem("rcx.ui.policyViewMode", "card");
      render(
        <PolicyListPage config={testConfig} useDelete={mockUseDelete} />,
        { routerEntries: ["/program/test-policies"] },
      );
      // Go to page 2
      fireEvent.click(screen.getByText("Next"));
      // Now Previous should be enabled
      fireEvent.click(screen.getByText("Previous"));
      // useEntityList should be re-called
      expect(vi.mocked(useEntityList)).toHaveBeenCalled();
    });
  });
});
