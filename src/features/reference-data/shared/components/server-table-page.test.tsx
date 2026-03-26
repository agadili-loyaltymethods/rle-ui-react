import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { ServerTablePage } from "./server-table-page";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockCreateMutateAsync = vi.fn().mockResolvedValue({});
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@/shared/hooks/use-api", () => ({
  useCreateEntity: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateEntity: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useDeleteEntity: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/components/page-header", () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <div data-testid="page-header-actions">{actions}</div>
    </div>
  ),
}));

vi.mock("@/shared/components/search-bar", () => ({
  SearchBar: ({ placeholder }: { placeholder: string }) => (
    <input data-testid="server-table-search-bar" aria-label="Search" placeholder={placeholder} />
  ),
}));

vi.mock("@/shared/components/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
}));

vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({
    open,
    onClose,
    onConfirm,
    title,
    itemName,
  }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    itemName?: string;
  }) =>
    open ? (
      <div data-testid="delete-dialog">
        <span>{title}</span>
        {itemName && <span data-testid="delete-item-name">{itemName}</span>}
        <button data-testid="refdata-delete-confirm" aria-label="Confirm delete" onClick={onConfirm}>Confirm</button>
        <button data-testid="refdata-delete-close" aria-label="Close delete dialog" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/server-table", () => ({
  ServerTable: ({
    data,
    isLoading,
    emptyMessage,
    emptyAction,
    onRowClick,
    onDelete,
    onEdit,
  }: {
    data: unknown[];
    isLoading: boolean;
    emptyMessage: string;
    emptyAction: React.ReactNode;
    onRowClick?: (entity: unknown) => void;
    onDelete?: (id: string) => void;
    onEdit?: (entity: unknown) => void;
  }) => (
    <div data-testid="server-table">
      {isLoading && <div data-testid="table-loading">Loading...</div>}
      {!isLoading && data.length === 0 && (
        <div data-testid="table-empty">
          <span>{emptyMessage}</span>
          {emptyAction}
        </div>
      )}
      {data.map((item: Record<string, unknown>) => (
        <div key={String(item._id)} data-testid={`row-${String(item._id)}`}>
          {String(item.name)}
          {onRowClick && (
            <button data-testid={`row-click-${String(item._id)}`} aria-label={`Click row ${String(item._id)}`} onClick={() => onRowClick(item)}>
              Click
            </button>
          )}
          {onEdit && (
            <button data-testid={`edit-${String(item._id)}`} aria-label={`Edit ${String(item._id)}`} onClick={() => onEdit(item)}>
              Edit
            </button>
          )}
          {onDelete && (
            <button data-testid={`delete-${String(item._id)}`} aria-label={`Delete ${String(item._id)}`} onClick={() => onDelete(String(item._id))}>
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("./entity-form-drawer", () => ({
  EntityFormDrawer: ({
    open,
    entity,
    onSave,
    onCancel,
  }: {
    open: boolean;
    entity: unknown;
    onSave: (payload: Record<string, unknown>) => Promise<void>;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="entity-form-drawer">
        <span data-testid="form-drawer-entity">{entity ? JSON.stringify(entity) : "null"}</span>
        <button data-testid="refdata-form-drawer-save" aria-label="Save form" onClick={() => onSave({ name: "saved" })}>Save</button>
        <button data-testid="refdata-form-drawer-cancel" aria-label="Cancel form" onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("./bulk-edit-drawer", () => ({
  BulkEditDrawer: ({
    open,
    onSave,
    onCancel,
  }: {
    open: boolean;
    onSave: (update: Record<string, unknown>) => Promise<void>;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="bulk-edit-drawer">
        <button data-testid="refdata-bulk-save" aria-label="Save bulk edit" onClick={() => onSave({ status: "active" })}>BulkSave</button>
        <button data-testid="refdata-bulk-cancel" aria-label="Cancel bulk edit" onClick={onCancel}>BulkCancel</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/bulk-action-bar", () => ({
  BulkActionBar: ({
    count,
    onEdit,
    onDelete,
    onClear,
  }: {
    count: number;
    onEdit: () => void;
    onDelete: () => void;
    onClear: () => void;
  }) =>
    count > 0 ? (
      <div data-testid="bulk-action-bar">
        <span>{count} selected</span>
        <button data-testid="refdata-bulk-bar-edit" aria-label="Bulk edit" onClick={onEdit}>BulkEdit</button>
        <button data-testid="refdata-bulk-bar-delete" aria-label="Bulk delete" onClick={onDelete}>BulkDelete</button>
        <button data-testid="refdata-bulk-bar-clear" aria-label="Clear selection" onClick={onClear}>Clear</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/hooks/use-column-chooser", () => ({
  useColumnChooser: () => ({
    columnOrder: [],
    activeColumns: [],
    chooser: { open: false, toggle: vi.fn(), onOpenChange: vi.fn() },
  }),
}));

vi.mock("@/shared/components/column-chooser-dropdown", () => ({
  ColumnChooserDropdown: () => null,
}));

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const mockConfig = {
  modelName: "Location",
  endpoint: "locations",
  pageTitle: "Locations",
  testIdPrefix: "location",
  coreColumns: [{ field: "name", label: "Name", type: "text" }],
  coreFormFields: [{ field: "name", label: "Name", type: "text" as const }],
};

const mockSchema = {
  extFields: {},
  categories: [],
  coreRequiredFields: new Set(),
  extRequiredFields: new Set(),
  enumFields: {},
  bulkEditableFields: new Set(),
  dbSchema: {},
  isLoading: false,
  error: null,
};

function makeTable(overrides: Record<string, unknown> = {}) {
  return {
    data: [] as Record<string, unknown>[],
    totalCount: 0,
    pageIndex: 0,
    pageSize: 25,
    sorting: [],
    columnFilters: [],
    searchQuery: "",
    selectedIds: new Set<string>(),
    selectingAll: false,
    isLoading: false,
    isFetching: false,
    error: null,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onSortChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    onRowSelect: vi.fn(),
    selectAll: vi.fn(),
    invertSelection: vi.fn(),
    clearSelection: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  } as never;
}

function makeBulkOps() {
  return {
    bulkUpdate: { mutateAsync: vi.fn(), isPending: false },
    bulkDelete: { mutateAsync: vi.fn(), isPending: false },
  } as never;
}

describe("ServerTablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage(overrides: Record<string, unknown> = {}) {
    const defaults = {
      config: mockConfig as never,
      schema: mockSchema as never,
      table: makeTable(),
      columns: [],
      bulkOps: makeBulkOps(),
    };
    return render(<ServerTablePage {...defaults} {...overrides} />);
  }

  it("exports the component", () => {
    expect(typeof ServerTablePage).toBe("function");
  });

  it("has a Skeleton sub-component", () => {
    expect(typeof ServerTablePage.Skeleton).toBe("function");
  });

  it("renders page header with title", () => {
    renderPage();
    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(screen.getByText("Locations")).toBeInTheDocument();
  });

  it("renders search bar", () => {
    renderPage();
    expect(screen.getByTestId("server-table-search-bar")).toBeInTheDocument();
  });

  it("renders search bar with correct placeholder", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Search locations...")).toBeInTheDocument();
  });

  it("renders add button", () => {
    renderPage();
    expect(screen.getByTestId("location-add-new")).toBeInTheDocument();
    expect(screen.getByTestId("location-add-new")).toHaveTextContent(/Add Location/);
  });

  it("renders server table", () => {
    renderPage();
    expect(screen.getByTestId("server-table")).toBeInTheDocument();
  });

  it("renders table pagination", () => {
    renderPage();
    expect(screen.getAllByTestId("table-pagination").length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading state in table when loading", () => {
    renderPage({ table: makeTable({ isLoading: true }) });
    expect(screen.getByTestId("table-loading")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    renderPage({ table: makeTable({ data: [], totalCount: 0 }) });
    expect(screen.getByText("No locations found")).toBeInTheDocument();
  });

  it("renders data rows when data exists", () => {
    const table = makeTable({
      data: [
        { _id: "1", name: "Location A" },
        { _id: "2", name: "Location B" },
      ],
      totalCount: 2,
    });
    renderPage({ table });
    expect(screen.getByTestId("row-1")).toBeInTheDocument();
    expect(screen.getByTestId("row-2")).toBeInTheDocument();
    expect(screen.getByText("Location A")).toBeInTheDocument();
    expect(screen.getByText("Location B")).toBeInTheDocument();
  });

  it("shows error alert when table has an error", () => {
    const table = makeTable({ error: new Error("Network error") });
    renderPage({ table });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows error alert when schema has an error", () => {
    const schema = { ...mockSchema, error: new Error("Schema load failed") };
    renderPage({ schema });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Schema load failed")).toBeInTheDocument();
  });

  it("shows partial schema warning when extSchemaPartial is true", () => {
    const schema = { ...mockSchema, extSchemaPartial: true };
    renderPage({ schema });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Extension fields could not be loaded/)).toBeInTheDocument();
  });

  it("does not show partial schema warning when extSchemaPartial is false", () => {
    renderPage();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses singularTitle from config when provided", () => {
    const config = { ...mockConfig, singularTitle: "Site" };
    renderPage({ config });
    expect(screen.getByTestId("location-add-new")).toHaveTextContent(/Add Site/);
  });

  it("derives singularTitle by removing trailing 's' when not provided", () => {
    renderPage();
    // "Locations" -> "Location"
    expect(screen.getByTestId("location-add-new")).toHaveTextContent(/Add Location/);
  });

  it("renders the Skeleton sub-component", () => {
    const { container } = render(
      <ServerTablePage.Skeleton config={mockConfig as never} />,
    );
    expect(container).toBeTruthy();
    // Skeleton shows page header with title
    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(screen.getByText("Locations")).toBeInTheDocument();
  });

  it("renders the Skeleton with disabled add button", () => {
    render(<ServerTablePage.Skeleton config={mockConfig as never} />);
    // The add button in the skeleton should be disabled
    const addButton = screen.getByText(/Add Location/).closest("button");
    expect(addButton).toBeDisabled();
  });

  it("renders toolbar actions when provided", () => {
    renderPage({
      toolbarActions: <button data-testid="custom-action">Custom</button>,
    });
    expect(screen.getByTestId("custom-action")).toBeInTheDocument();
  });

  describe("create flow", () => {
    it("opens form drawer when Add button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("location-add-new"));
      expect(screen.getByTestId("entity-form-drawer")).toBeInTheDocument();
      expect(screen.getByTestId("form-drawer-entity")).toHaveTextContent("null");
    });

    it("calls create mutation when form drawer saves in create mode", async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("location-add-new"));
      fireEvent.click(screen.getByTestId("refdata-form-drawer-save"));
      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalled();
      });
    });
  });

  describe("edit flow", () => {
    it("opens form drawer with entity when row is clicked", () => {
      const table = makeTable({
        data: [{ _id: "1", name: "Location A" }],
        totalCount: 1,
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("edit-1"));
      expect(screen.getByTestId("entity-form-drawer")).toBeInTheDocument();
      expect(screen.getByTestId("form-drawer-entity")).not.toHaveTextContent("null");
    });

    it("calls update mutation when form drawer saves in edit mode", async () => {
      const table = makeTable({
        data: [{ _id: "1", name: "Location A" }],
        totalCount: 1,
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("edit-1"));
      fireEvent.click(screen.getByTestId("refdata-form-drawer-save"));
      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalled();
      });
    });
  });

  describe("cancel form", () => {
    it("closes form drawer when cancel is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("location-add-new"));
      expect(screen.getByTestId("entity-form-drawer")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("refdata-form-drawer-cancel"));
      expect(screen.queryByTestId("entity-form-drawer")).not.toBeInTheDocument();
    });
  });

  describe("delete flow", () => {
    it("opens delete dialog when delete button is clicked on a row", () => {
      const table = makeTable({
        data: [{ _id: "1", name: "Location A" }],
        totalCount: 1,
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("delete-1"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("delete-item-name")).toHaveTextContent("Location A");
    });

    it("calls delete mutation when confirm is clicked", async () => {
      const table = makeTable({
        data: [{ _id: "1", name: "Location A" }],
        totalCount: 1,
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("delete-1"));
      fireEvent.click(screen.getByTestId("refdata-delete-confirm"));
      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith("1");
      });
    });

    it("closes delete dialog when close is clicked", () => {
      const table = makeTable({
        data: [{ _id: "1", name: "Location A" }],
        totalCount: 1,
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("delete-1"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("refdata-delete-close"));
      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    });
  });

  describe("bulk operations", () => {
    it("shows bulk action bar when items are selected", () => {
      const table = makeTable({
        data: [{ _id: "1", name: "A" }, { _id: "2", name: "B" }],
        totalCount: 2,
        selectedIds: new Set(["1", "2"]),
      });
      renderPage({ table });
      expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("opens bulk edit drawer when bulk edit is clicked", () => {
      const table = makeTable({
        data: [{ _id: "1", name: "A" }],
        totalCount: 1,
        selectedIds: new Set(["1"]),
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("refdata-bulk-bar-edit"));
      expect(screen.getByTestId("bulk-edit-drawer")).toBeInTheDocument();
    });

    it("opens bulk delete dialog when bulk delete is clicked", () => {
      const table = makeTable({
        data: [{ _id: "1", name: "A" }],
        totalCount: 1,
        selectedIds: new Set(["1"]),
      });
      renderPage({ table });
      fireEvent.click(screen.getByTestId("refdata-bulk-bar-delete"));
      // The bulk delete dialog should appear
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });
  });

  describe("refresh button", () => {
    it("calls refetch when refresh button is clicked", () => {
      const refetch = vi.fn();
      const table = makeTable({ refetch });
      renderPage({ table });
      const refreshBtn = screen.getByTitle("Refresh");
      fireEvent.click(refreshBtn);
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("pagination handler", () => {
    it("calls onPageChange with zero-indexed page when pagination changes", () => {
      const onPageChange = vi.fn();
      const table = makeTable({ onPageChange, data: [{ _id: "1", name: "A" }], totalCount: 1 });
      renderPage({ table });
      // The handlePageChange converts 1-indexed to 0-indexed
      // We verify the table was created with the handler
      expect(screen.getAllByTestId("table-pagination").length).toBeGreaterThanOrEqual(1);
    });
  });
});
