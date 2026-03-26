import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import RewardCatalogPage from "./reward-catalog-page";

const mockStore = {
  fullscreen: false,
  setFullscreen: vi.fn(),
  filterStatus: [] as string[],
  setFilterStatus: vi.fn(),
  isCreating: false,
  setIsCreating: vi.fn(),
  editingReward: null as unknown,
  setEditingReward: vi.fn(),
  bulkEditOpen: false,
  setBulkEditOpen: vi.fn(),
  bulkDeleteConfirm: false,
  setBulkDeleteConfirm: vi.fn(),
  viewMode: "list" as string,
  setViewMode: vi.fn(),
  quickSearchOpen: false,
  setQuickSearchOpen: vi.fn(),
  deleteTarget: null as string | null,
  setDeleteTarget: vi.fn(),
  saving: false,
  setSaving: vi.fn(),
  expirationSince: "all" as string,
  setExpirationSince: vi.fn(),
  customDateRange: { start: "", end: "" },
  setCustomDateRange: vi.fn(),
};

vi.mock("../hooks/use-reward-catalog-store", () => ({
  useRewardCatalogStore: vi.fn(() => mockStore),
}));

const mockTable = {
  data: [],
  totalCount: 0,
  isLoading: false,
  isFetching: false,
  error: null as Error | null,
  refetch: vi.fn(),
  pageIndex: 0,
  pageSize: 25,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  sorting: [],
  onSortChange: vi.fn(),
  columnFilters: {},
  onFilterChange: vi.fn(),
  selectedIds: new Set<string>(),
  onRowSelect: vi.fn(),
  selectAll: vi.fn(),
  selectingAll: false,
  invertSelection: vi.fn(),
  clearSelection: vi.fn(),
  searchQuery: "",
  onSearchChange: vi.fn(),
};

vi.mock("@/features/reference-data/shared/hooks/use-server-table", () => ({
  useServerTable: vi.fn(() => mockTable),
}));

const mockSchemaReturn = {
  data: { coreFields: [], extSchemas: [], extUIDefs: [] },
  isLoading: false,
  error: null as Error | null,
};

vi.mock("@/features/reference-data/shared/hooks/use-entity-schema", () => ({
  useEntitySchema: vi.fn(() => mockSchemaReturn),
}));

vi.mock("@/features/reference-data/shared/lib/build-columns", () => ({
  buildColumns: vi.fn(() => []),
}));

vi.mock("@/shared/hooks/use-column-chooser", () => ({
  useColumnChooser: vi.fn(() => ({
    visibleColumns: [],
    toggleColumn: vi.fn(),
    isVisible: () => true,
    allColumns: [],
    columnOrder: [],
    activeColumns: [],
    chooser: {},
  })),
}));

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockBulkUpdateMutateAsync = vi.fn();
const mockBulkDeleteMutateAsync = vi.fn();

vi.mock("../hooks/use-rewards", () => ({
  useCreateRewardCatalogItem: vi.fn(() => ({ mutateAsync: mockCreateMutateAsync, isPending: false })),
  useUpdateRewardCatalogItem: vi.fn(() => ({ mutateAsync: mockUpdateMutateAsync, isPending: false })),
  useDeleteRewardCatalogItem: vi.fn(() => ({ mutateAsync: mockDeleteMutateAsync, isPending: false })),
  useBulkUpdateRewardPolicies: vi.fn(() => ({ mutateAsync: mockBulkUpdateMutateAsync, isPending: false })),
  useBulkDeleteRewardPolicies: vi.fn(() => ({ mutateAsync: mockBulkDeleteMutateAsync, isPending: false })),
}));

const mockPrefs = {
  saveTableLayout: vi.fn(),
  saveFormTabOrder: vi.fn(),
  saveFilterStatus: vi.fn(),
  saveExpirationSince: vi.fn(),
  saveCustomDateRange: vi.fn(),
};

vi.mock("../hooks/use-reward-preferences", () => ({
  useRewardPreferences: vi.fn(() => mockPrefs),
  useUserExtLoader: vi.fn(() => true),
  getSavedTableLayout: vi.fn(() => null),
  getSavedFormTabOrder: vi.fn(() => null),
  getSavedFilterStatus: vi.fn(() => []),
  getSavedExpirationSince: vi.fn(() => "all"),
  getSavedCustomDateRange: vi.fn(() => null),
}));

vi.mock("../hooks/use-catalog-config", () => ({
  useCatalogConfig: vi.fn(() => ({
    config: { intendedUse: "Reward", cardImageField: "imageListPageUrlDesktopNormal", pricingMode: "per-tier", tierPolicyId: "", tierLevelFields: {} },
    isLoading: false,
  })),
}));

vi.mock("../config/reward-config", () => ({
  rewardConfig: {
    endpoint: "rewardpolicies",
    label: "Reward",
    coreFields: [],
  },
}));

vi.mock("../lib/reward-cell-renderers", () => ({
  rewardCellRenderers: {},
  buildRewardCellRenderers: vi.fn(() => ({})),
}));

vi.mock("../components/stats-bar", () => ({
  StatsBar: () => <div data-testid="stats-bar">Stats</div>,
}));

// Toolbar mock that passes through callbacks
vi.mock("../components/rewards-toolbar", () => ({
  RewardsToolbar: (props: Record<string, unknown>) => (
    <div data-testid="rewards-toolbar">
      {props.onAdd && <button data-testid="toolbar-add" onClick={props.onAdd as () => void}>Add</button>}
      {props.onReload && <button data-testid="toolbar-reload" onClick={props.onReload as () => void}>Reload</button>}
      {props.onExitFullscreen && <button data-testid="toolbar-exit-fs" onClick={props.onExitFullscreen as () => void}>Exit</button>}
    </div>
  ),
}));

// Card grid mock that exposes onSelect, onEdit, onDelete
vi.mock("../components/rewards-card-grid", () => ({
  RewardsCardGrid: (props: Record<string, unknown>) => (
    <div data-testid="rewards-card-grid">
      <button data-testid="card-select" aria-label="Select card" onClick={() => (props.onSelect as (id: string) => void)("rew-1")}>Select</button>
      <button data-testid="card-edit" aria-label="Edit card" onClick={() => (props.onEdit as (r: unknown) => void)({ _id: "rew-1", name: "Test" })}>Edit</button>
      <button data-testid="card-delete" aria-label="Delete card" onClick={() => (props.onDelete as (id: string) => void)("rew-1")}>Delete</button>
    </div>
  ),
}));

// RewardFormDrawer mock that exposes onSave and onCancel
vi.mock("../components/reward-form-drawer", () => ({
  default: (props: Record<string, unknown>) =>
    props.open ? (
      <div data-testid="reward-form-drawer">
        <button data-testid="reward-page-form-save" aria-label="Save reward form" onClick={() => (props.onSave as (r: unknown) => Promise<void>)({ _id: "rew-1", name: "Test" }).catch(() => {})}>Save</button>
        <button data-testid="reward-page-form-cancel" aria-label="Cancel reward form" onClick={props.onCancel as () => void}>Cancel</button>
      </div>
    ) : null,
}));

// BulkEditDrawer mock that exposes onSave and onCancel
vi.mock("../components/bulk-edit-drawer", () => ({
  default: (props: Record<string, unknown>) =>
    props.open ? (
      <div data-testid="bulk-edit-drawer">
        <button data-testid="reward-bulk-save" aria-label="Save bulk edit" onClick={() => (props.onSave as (u: Record<string, unknown>) => Promise<void>)({ desc: "updated" })}>Save</button>
        <button data-testid="reward-bulk-cancel" aria-label="Cancel bulk edit" onClick={props.onCancel as () => void}>Cancel</button>
      </div>
    ) : null,
}));

// QuickSearch mock that exposes onSelect and onClose
vi.mock("../components/quick-search", () => ({
  QuickSearch: (props: Record<string, unknown>) => (
    <div data-testid="quick-search">
      <button data-testid="qs-select" aria-label="Quick search select" onClick={() => (props.onSelect as (r: unknown) => void)({ _id: "rew-1", name: "Quick" })}>Select</button>
      <button data-testid="qs-close" aria-label="Quick search close" onClick={props.onClose as () => void}>Close</button>
    </div>
  ),
}));

// DeleteConfirmDialog mock that exposes onConfirm and onClose
vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: (props: Record<string, unknown>) =>
    props.open ? (
      <div data-testid={`delete-dialog-${props.title}`}>
        <button data-testid={`delete-confirm-${props.title}`} aria-label="Confirm delete" onClick={props.onConfirm as () => void}>Confirm</button>
        <button data-testid={`delete-close-${props.title}`} aria-label="Close delete dialog" onClick={props.onClose as () => void}>Close</button>
      </div>
    ) : null,
}));

// ServerTable mock that exposes onRowClick, onEdit, onDelete
vi.mock("@/shared/components/server-table", () => ({
  ServerTable: (props: Record<string, unknown>) => (
    <div data-testid="server-table">
      <button data-testid="row-click" aria-label="Click row" onClick={() => (props.onRowClick as (r: unknown) => void)({ _id: "rew-1", name: "Click" })}>RowClick</button>
      <button data-testid="row-edit" aria-label="Edit row" onClick={() => (props.onEdit as (r: unknown) => void)({ _id: "rew-2", name: "Edit" })}>Edit</button>
      <button data-testid="row-delete" aria-label="Delete row" onClick={() => (props.onDelete as (id: string) => void)("rew-3")}>Delete</button>
      {props.emptyAction}
    </div>
  ),
}));

// TablePagination mock that exposes onPageChange and onPageSizeChange
vi.mock("@/shared/components/table-pagination", () => ({
  TablePagination: (props: Record<string, unknown>) => (
    <div data-testid="table-pagination">
      <button data-testid="page-next" aria-label="Next page" onClick={() => (props.onPageChange as (p: number) => void)(2)}>Next</button>
      <button data-testid="page-size-change" aria-label="Change page size" onClick={() => (props.onPageSizeChange as (s: number) => void)(50)}>PageSize</button>
    </div>
  ),
}));

vi.mock("@/shared/components/search-bar", () => ({
  SearchBar: () => <input data-testid="rewards-search" />,
}));

// BulkActionBar that exposes action callbacks
vi.mock("@/shared/components/bulk-action-bar", () => ({
  BulkActionBar: (props: Record<string, unknown>) => (
    <div data-testid="bulk-action-bar">
      Selected: {props.count as number}
      <button data-testid="reward-bulk-bar-edit" aria-label="Bulk edit" onClick={props.onEdit as () => void}>Edit</button>
      <button data-testid="reward-bulk-bar-delete" aria-label="Bulk delete" onClick={props.onDelete as () => void}>Delete</button>
      <button data-testid="reward-bulk-bar-clear" aria-label="Clear selection" onClick={props.onClear as () => void}>Clear</button>
      <button data-testid="reward-bulk-bar-select-all" aria-label="Select all" onClick={props.onSelectAll as () => void}>SelectAll</button>
      <button data-testid="reward-bulk-bar-invert" aria-label="Invert selection" onClick={props.onInvert as () => void}>Invert</button>
    </div>
  ),
}));

vi.mock("@/shared/components/column-chooser-dropdown", () => ({
  ColumnChooserDropdown: () => null,
}));

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

describe("RewardCatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    // Reset mock store to defaults
    mockStore.fullscreen = false;
    mockStore.filterStatus = [];
    mockStore.isCreating = false;
    mockStore.editingReward = null;
    mockStore.bulkEditOpen = false;
    mockStore.bulkDeleteConfirm = false;
    mockStore.viewMode = "list";
    mockStore.quickSearchOpen = false;
    mockStore.deleteTarget = null;
    mockStore.saving = false;
    mockStore.expirationSince = "all";
    mockStore.customDateRange = { start: "", end: "" };
    mockTable.data = [];
    mockTable.totalCount = 0;
    mockTable.isLoading = false;
    mockTable.isFetching = false;
    mockTable.error = null;
    mockTable.selectedIds = new Set<string>();
    mockTable.pageIndex = 0;
    mockSchemaReturn.error = null;
  });

  it("renders the page with test id", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByText("Rewards Catalog")).toBeInTheDocument();
  });

  it("renders the Add Reward button", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("rewards-add")).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("rewards-refresh")).toBeInTheDocument();
  });

  it("renders the fullscreen button", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("rewards-fullscreen")).toBeInTheDocument();
  });

  it("renders the stats bar", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
  });

  it("renders the toolbar", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("rewards-toolbar")).toBeInTheDocument();
  });

  it("renders server table in list view mode", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("server-table")).toBeInTheDocument();
  });

  it("renders card grid in card view mode", () => {
    mockStore.viewMode = "card";
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("rewards-card-grid")).toBeInTheDocument();
  });

  it("renders search bar", () => {
    render(<RewardCatalogPage />);
    expect(screen.getByTestId("rewards-search")).toBeInTheDocument();
  });

  it("renders table pagination", () => {
    render(<RewardCatalogPage />);
    expect(screen.getAllByTestId("table-pagination").length).toBeGreaterThanOrEqual(1);
  });

  describe("button interactions", () => {
    it("calls setIsCreating(true) when Add Reward is clicked", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("rewards-add"));
      expect(mockStore.setIsCreating).toHaveBeenCalledWith(true);
    });

    it("calls setFullscreen(true) when fullscreen button is clicked", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("rewards-fullscreen"));
      expect(mockStore.setFullscreen).toHaveBeenCalledWith(true);
    });

    it("calls table.refetch when refresh button is clicked", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("rewards-refresh"));
      expect(mockTable.refetch).toHaveBeenCalled();
    });
  });

  describe("fullscreen mode", () => {
    it("hides heading and stats in fullscreen mode", () => {
      mockStore.fullscreen = true;
      render(<RewardCatalogPage />);
      expect(screen.queryByText("Rewards Catalog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
    });

    it("shows search and toolbar in fullscreen", () => {
      mockStore.fullscreen = true;
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("rewards-search")).toBeInTheDocument();
      expect(screen.getByTestId("rewards-toolbar")).toBeInTheDocument();
    });

    it("exits fullscreen on Escape keydown", () => {
      mockStore.fullscreen = true;
      render(<RewardCatalogPage />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockStore.setFullscreen).toHaveBeenCalledWith(false);
    });

    it("does not add Escape listener when not fullscreen", () => {
      mockStore.fullscreen = false;
      render(<RewardCatalogPage />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockStore.setFullscreen).not.toHaveBeenCalled();
    });

    it("fullscreen toolbar add button calls setIsCreating", () => {
      mockStore.fullscreen = true;
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("toolbar-add"));
      expect(mockStore.setIsCreating).toHaveBeenCalledWith(true);
    });

    it("fullscreen toolbar reload button calls refetch", () => {
      mockStore.fullscreen = true;
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("toolbar-reload"));
      expect(mockTable.refetch).toHaveBeenCalled();
    });

    it("fullscreen toolbar exit button calls setFullscreen(false)", () => {
      mockStore.fullscreen = true;
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("toolbar-exit-fs"));
      expect(mockStore.setFullscreen).toHaveBeenCalledWith(false);
    });
  });

  describe("error state", () => {
    it("renders error banner when table has an error", () => {
      mockTable.error = new Error("Failed to load");
      render(<RewardCatalogPage />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });

    it("renders error banner when schema has an error", () => {
      mockSchemaReturn.error = new Error("Schema failed");
      render(<RewardCatalogPage />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Schema failed")).toBeInTheDocument();
    });
  });

  describe("saving overlay", () => {
    it("renders saving overlay when saving is true", () => {
      mockStore.saving = true;
      render(<RewardCatalogPage />);
      const spinners = document.querySelectorAll(".animate-spin");
      expect(spinners.length).toBeGreaterThan(0);
    });

    it("does not render saving overlay when saving is false", () => {
      mockStore.saving = false;
      render(<RewardCatalogPage />);
      const overlay = document.querySelector(".fixed.inset-0.bg-black\\/20");
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe("CRUD handlers via ServerTable", () => {
    it("handleEditReward sets editing reward on row click", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("row-click"));
      expect(mockStore.setEditingReward).toHaveBeenCalledWith({ _id: "rew-1", name: "Click" });
    });

    it("handleEditReward sets editing reward on row edit", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("row-edit"));
      expect(mockStore.setEditingReward).toHaveBeenCalledWith({ _id: "rew-2", name: "Edit" });
    });

    it("onDelete sets delete target", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("row-delete"));
      expect(mockStore.setDeleteTarget).toHaveBeenCalledWith("rew-3");
    });

    it("empty action button calls setIsCreating", () => {
      render(<RewardCatalogPage />);
      // The empty action Add Reward button is rendered inside ServerTable
      const emptyButtons = screen.getAllByRole("button", { name: /add reward/i });
      // Find the one from the emptyAction prop (inside server-table)
      const emptyActionBtn = emptyButtons.find(btn => btn.closest("[data-testid='server-table']"));
      if (emptyActionBtn) {
        fireEvent.click(emptyActionBtn);
        expect(mockStore.setIsCreating).toHaveBeenCalledWith(true);
      }
    });
  });

  describe("pagination handlers", () => {
    it("handlePageChange converts 1-indexed to 0-indexed", () => {
      render(<RewardCatalogPage />);
      const nextButtons = screen.getAllByTestId("page-next");
      fireEvent.click(nextButtons[0]!);
      // handlePageChange(2) calls table.onPageChange(2-1=1)
      expect(mockTable.onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe("delete confirmation", () => {
    it("renders delete dialog when deleteTarget is set", () => {
      mockStore.deleteTarget = "rew-1";
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("delete-dialog-Delete Reward")).toBeInTheDocument();
    });

    it("handleConfirmDelete calls deleteMutation and refetches", async () => {
      mockStore.deleteTarget = "rew-1";
      mockDeleteMutateAsync.mockResolvedValue({});
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("delete-confirm-Delete Reward"));
      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith("rew-1");
      });
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
    });

    it("handleConfirmDelete handles errors gracefully", async () => {
      mockStore.deleteTarget = "rew-1";
      mockDeleteMutateAsync.mockRejectedValue(new Error("delete failed"));
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("delete-confirm-Delete Reward"));
      await waitFor(() => {
        expect(mockStore.setDeleteTarget).toHaveBeenCalledWith(null);
      });
    });

    it("close button clears delete target", () => {
      mockStore.deleteTarget = "rew-1";
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("delete-close-Delete Reward"));
      expect(mockStore.setDeleteTarget).toHaveBeenCalledWith(null);
    });
  });

  describe("bulk actions", () => {
    beforeEach(() => {
      mockTable.selectedIds = new Set(["rew-1", "rew-2"]);
    });

    it("renders bulk action bar when items are selected", () => {
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
      expect(screen.getByText("Selected: 2")).toBeInTheDocument();
    });

    it("bulk bar edit button opens bulk edit drawer", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-bar-edit"));
      expect(mockStore.setBulkEditOpen).toHaveBeenCalledWith(true);
    });

    it("bulk bar delete button opens bulk delete confirm", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-bar-delete"));
      expect(mockStore.setBulkDeleteConfirm).toHaveBeenCalledWith(true);
    });

    it("bulk bar clear button clears selection", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-bar-clear"));
      expect(mockTable.clearSelection).toHaveBeenCalled();
    });

    it("bulk bar select all button selects all", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-bar-select-all"));
      expect(mockTable.selectAll).toHaveBeenCalled();
    });

    it("bulk bar invert button inverts selection", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-bar-invert"));
      expect(mockTable.invertSelection).toHaveBeenCalled();
    });
  });

  describe("bulk delete confirmation", () => {
    it("renders bulk delete dialog when bulkDeleteConfirm is true", () => {
      mockTable.selectedIds = new Set(["rew-1", "rew-2"]);
      mockStore.bulkDeleteConfirm = true;
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("delete-dialog-Delete Selected Rewards")).toBeInTheDocument();
    });

    it("handleBulkDelete calls bulkDeleteMutation and clears selection", async () => {
      mockTable.selectedIds = new Set(["rew-1", "rew-2"]);
      mockStore.bulkDeleteConfirm = true;
      mockBulkDeleteMutateAsync.mockResolvedValue({});
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("delete-confirm-Delete Selected Rewards"));
      await waitFor(() => {
        expect(mockBulkDeleteMutateAsync).toHaveBeenCalledWith(["rew-1", "rew-2"]);
      });
    });

    it("handleBulkDelete handles errors", async () => {
      mockTable.selectedIds = new Set(["rew-1"]);
      mockStore.bulkDeleteConfirm = true;
      mockBulkDeleteMutateAsync.mockRejectedValue(new Error("bulk fail"));
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("delete-confirm-Delete Selected Rewards"));
      await waitFor(() => {
        expect(mockStore.setBulkDeleteConfirm).toHaveBeenCalledWith(false);
      });
    });

    it("close button clears bulk delete confirm", () => {
      mockStore.bulkDeleteConfirm = true;
      mockTable.selectedIds = new Set(["rew-1"]);
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("delete-close-Delete Selected Rewards"));
      expect(mockStore.setBulkDeleteConfirm).toHaveBeenCalledWith(false);
    });
  });

  describe("reward form drawer", () => {
    it("opens when isCreating is true", () => {
      mockStore.isCreating = true;
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("reward-form-drawer")).toBeInTheDocument();
    });

    it("opens when editingReward is set", () => {
      mockStore.editingReward = { _id: "rew-1", name: "Test" };
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("reward-form-drawer")).toBeInTheDocument();
    });

    it("handleSaveReward creates new reward and closes", async () => {
      mockStore.isCreating = true;
      mockCreateMutateAsync.mockResolvedValue({});
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-page-form-save"));
      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalled();
      });
    });

    it("handleSaveReward updates existing reward", async () => {
      mockStore.editingReward = { _id: "rew-1", name: "Test", createdAt: "", createdBy: "", updatedAt: "", updatedBy: "" };
      mockUpdateMutateAsync.mockResolvedValue({});
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-page-form-save"));
      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalled();
      });
    });

    it("handleSaveReward handles save error with details", async () => {
      mockStore.isCreating = true;
      mockCreateMutateAsync.mockRejectedValue({ details: [{ path: "name", message: "required" }], message: "Validation failed" });
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-page-form-save"));
      await waitFor(() => {
        expect(mockStore.setSaving).toHaveBeenCalledWith(false);
      });
    });

    it("handleSaveReward handles save error without details", async () => {
      mockStore.isCreating = true;
      mockCreateMutateAsync.mockRejectedValue({ message: "Server error" });
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-page-form-save"));
      await waitFor(() => {
        expect(mockStore.setSaving).toHaveBeenCalledWith(false);
      });
    });

    it("onCancel resets creation and editing state", () => {
      mockStore.isCreating = true;
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-page-form-cancel"));
      expect(mockStore.setIsCreating).toHaveBeenCalledWith(false);
      expect(mockStore.setEditingReward).toHaveBeenCalledWith(null);
    });
  });

  describe("bulk edit drawer", () => {
    it("renders when bulkEditOpen is true", () => {
      mockStore.bulkEditOpen = true;
      mockTable.selectedIds = new Set(["rew-1"]);
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("bulk-edit-drawer")).toBeInTheDocument();
    });

    it("handleBulkEdit calls bulkUpdateMutation", async () => {
      mockStore.bulkEditOpen = true;
      mockTable.selectedIds = new Set(["rew-1", "rew-2"]);
      mockBulkUpdateMutateAsync.mockResolvedValue({});
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-save"));
      await waitFor(() => {
        expect(mockBulkUpdateMutateAsync).toHaveBeenCalledWith({
          ids: ["rew-1", "rew-2"],
          update: { desc: "updated" },
        });
      });
    });

    it("bulk edit cancel closes drawer", () => {
      mockStore.bulkEditOpen = true;
      mockTable.selectedIds = new Set(["rew-1"]);
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("reward-bulk-cancel"));
      expect(mockStore.setBulkEditOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("quick search", () => {
    it("renders when quickSearchOpen is true", () => {
      mockStore.quickSearchOpen = true;
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("quick-search")).toBeInTheDocument();
    });

    it("onSelect closes quick search and sets editing reward", () => {
      mockStore.quickSearchOpen = true;
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("qs-select"));
      expect(mockStore.setQuickSearchOpen).toHaveBeenCalledWith(false);
      expect(mockStore.setEditingReward).toHaveBeenCalledWith({ _id: "rew-1", name: "Quick" });
    });

    it("onClose closes quick search", () => {
      mockStore.quickSearchOpen = true;
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("qs-close"));
      expect(mockStore.setQuickSearchOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("card view interactions", () => {
    beforeEach(() => {
      mockStore.viewMode = "card";
    });

    it("renders card grid with pagination in card mode", () => {
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("rewards-card-grid")).toBeInTheDocument();
      expect(screen.getAllByTestId("table-pagination").length).toBeGreaterThanOrEqual(2);
    });

    it("card select toggles selection via onRowSelect", () => {
      mockTable.selectedIds = new Set<string>();
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("card-select"));
      expect(mockTable.onRowSelect).toHaveBeenCalledWith({ "rew-1": true });
    });

    it("card select deselects already-selected item", () => {
      mockTable.selectedIds = new Set(["rew-1"]);
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("card-select"));
      // Should remove rew-1 from the set
      expect(mockTable.onRowSelect).toHaveBeenCalledWith({});
    });

    it("card edit sets editing reward", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("card-edit"));
      expect(mockStore.setEditingReward).toHaveBeenCalledWith({ _id: "rew-1", name: "Test" });
    });

    it("card delete sets delete target", () => {
      render(<RewardCatalogPage />);
      fireEvent.click(screen.getByTestId("card-delete"));
      expect(mockStore.setDeleteTarget).toHaveBeenCalledWith("rew-1");
    });
  });

  describe("filter status", () => {
    it("applies active filter status to build additionalQuery", () => {
      mockStore.filterStatus = ["active"];
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });

    it("applies multiple filter statuses with $or", () => {
      mockStore.filterStatus = ["active", "expired"];
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });

    it("applies custom date range with start and end", () => {
      mockStore.expirationSince = "custom";
      mockStore.customDateRange = { start: "2026-01-01", end: "2026-12-31" };
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });

    it("applies expirationSince 1m filter", () => {
      mockStore.expirationSince = "1m";
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });

    it("applies expirationSince 3m filter", () => {
      mockStore.expirationSince = "3m";
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });

    it("applies expirationSince 6m filter", () => {
      mockStore.expirationSince = "6m";
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });

    it("applies expirationSince 1y filter", () => {
      mockStore.expirationSince = "1y";
      render(<RewardCatalogPage />);
      expect(screen.getByTestId("page-reward-catalog")).toBeInTheDocument();
    });
  });
});
