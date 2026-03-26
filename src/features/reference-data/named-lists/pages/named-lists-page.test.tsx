import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import { userEvent } from "@testing-library/user-event";
import Component from "./named-lists-page";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRefetch = vi.fn();
const mockClearSelection = vi.fn();
const mockSelectAll = vi.fn();
const mockInvertSelection = vi.fn();
const mockOnRowSelect = vi.fn();
const mockOnSearchChange = vi.fn();
const mockOnPageChange = vi.fn();
const mockOnPageSizeChange = vi.fn();
const mockOnSortChange = vi.fn();
const mockOnFilterChange = vi.fn();

const defaultTableReturn = {
  data: [] as Record<string, unknown>[],
  totalCount: 0,
  isLoading: false,
  isFetching: false,
  error: null,
  pageIndex: 0,
  pageSize: 25,
  onPageChange: mockOnPageChange,
  onPageSizeChange: mockOnPageSizeChange,
  sorting: [],
  onSortChange: mockOnSortChange,
  searchQuery: "",
  onSearchChange: mockOnSearchChange,
  columnFilters: [] as { id: string; value: unknown }[],
  onFilterChange: mockOnFilterChange,
  selectedIds: new Set<string>(),
  onRowSelect: mockOnRowSelect,
  clearSelection: mockClearSelection,
  selectAll: mockSelectAll,
  selectingAll: false,
  invertSelection: mockInvertSelection,
  refetch: mockRefetch,
};

let tableOverrides: Partial<typeof defaultTableReturn> = {};

const mockPermissions = {
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  isLoading: false,
};

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => mockPermissions,
}));

vi.mock("@/shared/hooks/use-user-meta", () => ({
  useUserExtLoader: vi.fn(() => true),
  getUserMeta: vi.fn(() => ({})),
}));

vi.mock("../../shared/hooks/use-entity-schema", () => ({
  useEntitySchema: vi.fn(() => ({
    extFields: {},
    categories: [],
    enumFields: {},
    isLoading: false,
    error: null,
    dbSchema: {},
  })),
}));

vi.mock("../../shared/hooks/use-server-table", () => ({
  useServerTable: vi.fn(() => ({ ...defaultTableReturn, ...tableOverrides })),
}));

vi.mock("../../shared/lib/build-columns", () => ({
  buildColumns: vi.fn(() => []),
}));

vi.mock("../../shared/hooks/use-entity-preferences", () => ({
  useEntityPreferences: vi.fn(() => ({
    saveTableLayout: vi.fn(),
    saveFormTabOrder: vi.fn(),
  })),
  getSavedEntityTableLayout: vi.fn(() => null),
  getSavedEntityFormTabOrder: vi.fn(() => undefined),
}));

vi.mock("@/shared/hooks/use-column-chooser", () => ({
  useColumnChooser: vi.fn(() => ({
    columnOrder: [],
    activeColumns: [],
    chooser: { isOpen: false, open: vi.fn(), close: vi.fn(), toggle: vi.fn() },
  })),
}));

vi.mock("@/shared/components/column-chooser-dropdown", () => ({
  ColumnChooserDropdown: () => null,
}));

vi.mock("../../shared/components/entity-form-drawer", () => ({
  EntityFormDrawer: ({ open, entity, onSave, onCancel }: {
    open: boolean;
    entity: Record<string, unknown> | null;
    onSave: (p: Record<string, unknown>) => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="entity-form-drawer">
        <span data-testid="drawer-entity-id">{entity?._id as string ?? "new"}</span>
        <button data-testid="drawer-save" aria-label="Save" onClick={() => onSave({ name: "Updated", type: "Location" })}>
          Save
        </button>
        <button data-testid="drawer-cancel" aria-label="Cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

const mockPatch = vi.fn().mockResolvedValue({});
vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { patch: (...args: unknown[]) => mockPatch(...args) },
}));

const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});
vi.mock("@/shared/hooks/use-api", () => ({
  useUpdateEntity: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useDeleteEntity: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

const mockOnConfirmDelete = vi.fn();
vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({ open, onClose, onConfirm, title, itemName }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    itemName?: string;
  }) =>
    open ? (
      <div data-testid="delete-confirm-dialog">
        <span data-testid="delete-dialog-title">{title}</span>
        {itemName && <span data-testid="delete-dialog-item">{itemName}</span>}
        <button data-testid="delete-dialog-confirm" aria-label="Confirm delete" onClick={() => { mockOnConfirmDelete(); onConfirm(); }}>
          Confirm
        </button>
        <button data-testid="delete-dialog-cancel" aria-label="Cancel delete" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/server-table", () => ({
  ServerTable: ({ renderRowActions, data, onRowClick }: {
    renderRowActions?: (entity: Record<string, unknown>) => React.ReactNode;
    data: Record<string, unknown>[];
    onRowClick?: (entity: Record<string, unknown>) => void;
  }) => (
    <div data-testid="server-table">
      {data.map((item) => (
        <div key={item._id as string} data-testid={`row-${item._id}`}>
          <span
            data-testid={`row-name-${item._id}`}
            onClick={() => onRowClick?.(item)}
            role="button"
            tabIndex={0}
            onKeyDown={() => {}}
          >
            {item.name as string}
          </span>
          {renderRowActions?.(item)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/shared/components/table-pagination", () => ({
  TablePagination: () => null,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const SAMPLE_DATA: Record<string, unknown>[] = [
  { _id: "abc123", name: "Gold Members", modelType: "Location", type: "Dynamic", count: 42, org: "org1" },
  { _id: "def456", name: "VIP Segments", modelType: "Member", type: "Static", count: 10, org: "org1" },
];

function renderPage(overrides: Partial<typeof defaultTableReturn> = {}) {
  tableOverrides = overrides;
  return render(<Component />, { routerEntries: ["/reference-data/named-lists"] });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("NamedListsPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockUIState();
    tableOverrides = {};
    vi.clearAllMocks();
  });

  // ── Basic rendering ─────────────────────────────────────────────────────

  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByText("Named Lists")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/search named lists/i)).toBeInTheDocument();
  });

  it("does not render an Add/Create button", () => {
    renderPage();
    expect(screen.queryByText(/add named list/i)).not.toBeInTheDocument();
  });

  it("renders the server table", () => {
    renderPage();
    expect(screen.getByTestId("server-table")).toBeInTheDocument();
  });

  it("shows skeleton when ext is not loaded", async () => {
    const { useUserExtLoader } = await import("@/shared/hooks/use-user-meta");
    vi.mocked(useUserExtLoader).mockReturnValue(false);

    renderPage();
    expect(screen.queryByTestId("server-table")).not.toBeInTheDocument();

    vi.mocked(useUserExtLoader).mockReturnValue(true);
  });

  // ── Row-level refresh ───────────────────────────────────────────────────

  it("renders a refresh button for each row", () => {
    renderPage({ data: SAMPLE_DATA });
    expect(screen.getByTestId("namedlist-refresh-abc123")).toBeInTheDocument();
    expect(screen.getByTestId("namedlist-refresh-def456")).toBeInTheDocument();
  });

  it("calls PATCH namedlist/refresh/:id on row refresh click", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-refresh-abc123"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refresh/abc123");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("shows spinning animation while refresh is in progress", async () => {
    const user = userEvent.setup();
    // Make the patch hang so we can check intermediate state
    let resolvePatch!: () => void;
    mockPatch.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolvePatch = resolve; }),
    );

    renderPage({ data: SAMPLE_DATA });
    await user.click(screen.getByTestId("namedlist-refresh-abc123"));

    // The button should be disabled while refreshing
    expect(screen.getByTestId("namedlist-refresh-abc123")).toBeDisabled();

    // Resolve the patch
    resolvePatch();
  });

  // ── Edit row actions ────────────────────────────────────────────────────

  it("renders an edit button for each row when canUpdate is true", () => {
    renderPage({ data: SAMPLE_DATA });
    expect(screen.getByTestId("namedlist-edit-abc123")).toBeInTheDocument();
    expect(screen.getByTestId("namedlist-edit-def456")).toBeInTheDocument();
  });

  it("hides edit buttons when canUpdate is false", () => {
    mockPermissions.canUpdate = false;

    renderPage({ data: SAMPLE_DATA });
    expect(screen.queryByTestId("namedlist-edit-abc123")).not.toBeInTheDocument();
    expect(screen.queryByTestId("namedlist-edit-def456")).not.toBeInTheDocument();

    // Restore
    mockPermissions.canUpdate = true;
  });

  it("opens the edit drawer when edit button is clicked", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-edit-abc123"));

    expect(screen.getByTestId("entity-form-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-entity-id")).toHaveTextContent("abc123");
  });

  it("opens the edit drawer on row click when canUpdate is true", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("row-name-abc123"));

    expect(screen.getByTestId("entity-form-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-entity-id")).toHaveTextContent("abc123");
  });

  it("closes the edit drawer on cancel", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-edit-abc123"));
    expect(screen.getByTestId("entity-form-drawer")).toBeInTheDocument();

    await user.click(screen.getByTestId("drawer-cancel"));
    expect(screen.queryByTestId("entity-form-drawer")).not.toBeInTheDocument();
  });

  it("calls updateMutation on save and refetches", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-edit-abc123"));
    await user.click(screen.getByTestId("drawer-save"));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "abc123",
      data: { name: "Updated", type: "Location" },
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  // ── Bulk action bar ─────────────────────────────────────────────────────

  it("shows bulk action bar when rows are selected", () => {
    renderPage({ data: SAMPLE_DATA, selectedIds: new Set(["abc123"]) });
    expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("hides bulk action bar when no rows are selected", () => {
    renderPage({ data: SAMPLE_DATA, selectedIds: new Set() });
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });

  it("shows Refresh and Delete buttons (not Edit) in bulk action bar", () => {
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
    });

    const bar = screen.getByTestId("bulk-action-bar");
    expect(within(bar).getByTestId("namedlist-bulk-refresh")).toBeInTheDocument();
    expect(within(bar).getByTestId("namedlist-bulk-delete")).toBeInTheDocument();
    expect(within(bar).queryByText(/edit/i)).not.toBeInTheDocument();
  });

  it("shows Select All button when not all rows are selected", () => {
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
    });

    expect(screen.getByTestId("namedlist-bulk-select-all")).toBeInTheDocument();
  });

  it("hides Select All button when all rows are selected", () => {
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123", "def456"]),
      totalCount: 2,
    });

    expect(screen.queryByTestId("namedlist-bulk-select-all")).not.toBeInTheDocument();
  });

  it("calls selectAll when Select All is clicked", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
    });

    await user.click(screen.getByTestId("namedlist-bulk-select-all"));
    expect(mockSelectAll).toHaveBeenCalled();
  });

  it("calls invertSelection when Invert is clicked", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
    });

    await user.click(screen.getByTestId("namedlist-bulk-invert"));
    expect(mockInvertSelection).toHaveBeenCalled();
  });

  it("clears selection when X button is clicked", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
    });

    await user.click(screen.getByTestId("namedlist-bulk-clear"));
    expect(mockClearSelection).toHaveBeenCalled();
  });

  // ── Bulk refresh ────────────────────────────────────────────────────────

  it("sends correct bulk refresh payload with ids and org", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123", "def456"]),
      totalCount: 2,
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", {
      ids: ["abc123", "def456"],
      org: "org1",
      queryParams: {},
      isORQuery: false,
      isWildCardSearch: false,
    });
    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("includes string filter in queryParams for bulk refresh", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
      columnFilters: [{ id: "modelType", value: "Location" }],
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", expect.objectContaining({
      queryParams: {
        modelType: { isIncluded: true, searchStr: "Location" },
      },
    }));
  });

  it("includes array filter in queryParams (uses first value)", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
      columnFilters: [{ id: "type", value: ["Dynamic", "Static"] }],
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", expect.objectContaining({
      queryParams: {
        type: { isIncluded: true, searchStr: "Dynamic" },
      },
    }));
  });

  it("sends isIncluded: false for negated filters", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
      columnFilters: [{
        id: "modelType",
        value: { __negated: true, __inner: "Location" },
      }],
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", expect.objectContaining({
      queryParams: {
        modelType: { isIncluded: false, searchStr: "Location" },
      },
    }));
  });

  it("sends isIncluded: false for negated array filters", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
      columnFilters: [{
        id: "type",
        value: { __negated: true, __inner: ["Dynamic"] },
      }],
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", expect.objectContaining({
      queryParams: {
        type: { isIncluded: false, searchStr: "Dynamic" },
      },
    }));
  });

  it("skips empty/null filter values in queryParams", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
      columnFilters: [
        { id: "modelType", value: "" },
        { id: "type", value: null },
        { id: "name", value: "Gold" },
      ],
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", expect.objectContaining({
      queryParams: {
        name: { isIncluded: true, searchStr: "Gold" },
      },
    }));
  });

  it("skips negated filter with empty inner value", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
      columnFilters: [{
        id: "modelType",
        value: { __negated: true, __inner: "" },
      }],
    });

    await user.click(screen.getByTestId("namedlist-bulk-refresh"));

    expect(mockPatch).toHaveBeenCalledWith("namedlist/refreshall", expect.objectContaining({
      queryParams: {},
    }));
  });

  // ── Row delete ─────────────────────────────────────────────────────────

  it("renders a delete button for each row when canDelete is true", () => {
    renderPage({ data: SAMPLE_DATA });
    expect(screen.getByTestId("namedlist-delete-abc123")).toBeInTheDocument();
    expect(screen.getByTestId("namedlist-delete-def456")).toBeInTheDocument();
  });

  it("hides delete buttons when canDelete is false", () => {
    mockPermissions.canDelete = false;

    renderPage({ data: SAMPLE_DATA });
    expect(screen.queryByTestId("namedlist-delete-abc123")).not.toBeInTheDocument();
    expect(screen.queryByTestId("namedlist-delete-def456")).not.toBeInTheDocument();

    mockPermissions.canDelete = true;
  });

  it("opens delete confirmation dialog when delete button is clicked", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-delete-abc123"));

    expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("delete-dialog-item")).toHaveTextContent("Gold Members");
  });

  it("calls deleteMutation on confirm and refetches", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-delete-abc123"));
    await user.click(screen.getByTestId("delete-dialog-confirm"));

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith("abc123");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("closes delete dialog on cancel without deleting", async () => {
    const user = userEvent.setup();
    renderPage({ data: SAMPLE_DATA });

    await user.click(screen.getByTestId("namedlist-delete-abc123"));
    expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();

    await user.click(screen.getByTestId("delete-dialog-cancel"));
    expect(screen.queryByTestId("delete-confirm-dialog")).not.toBeInTheDocument();
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  // ── Bulk delete ───────────────────────────────────────────────────────

  it("hides bulk delete button when canDelete is false", () => {
    mockPermissions.canDelete = false;

    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123"]),
      totalCount: 2,
    });

    expect(screen.queryByTestId("namedlist-bulk-delete")).not.toBeInTheDocument();

    mockPermissions.canDelete = true;
  });

  it("opens bulk delete confirmation dialog", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123", "def456"]),
      totalCount: 2,
    });

    await user.click(screen.getByTestId("namedlist-bulk-delete"));

    expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("delete-dialog-title")).toHaveTextContent("Delete 2 Named Lists");
  });

  it("calls deleteMutation for each selected id on bulk delete confirm", async () => {
    const user = userEvent.setup();
    renderPage({
      data: SAMPLE_DATA,
      selectedIds: new Set(["abc123", "def456"]),
      totalCount: 2,
    });

    await user.click(screen.getByTestId("namedlist-bulk-delete"));
    await user.click(screen.getByTestId("delete-dialog-confirm"));

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith("abc123");
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith("def456");
    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  // ── Error states ────────────────────────────────────────────────────────

  it("shows error banner when table.error is set", () => {
    renderPage({ error: new Error("Network failure") as Error & { message: string } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network failure")).toBeInTheDocument();
  });
});
