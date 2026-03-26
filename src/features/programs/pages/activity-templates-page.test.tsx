import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import ActivityTemplatesPage from "./activity-templates-page";
import { useActivityTemplates, useDeleteActivityTemplate, useSaveActivityTemplate, useBulkDeleteActivityTemplates, useBulkEditActivityTemplates } from "../hooks/use-activity-templates";
import { useEnumOptions } from "@/shared/hooks/use-enums";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { defaultUseActivityTemplates } = vi.hoisted(() => ({
  defaultUseActivityTemplates: () => ({
    types: [
      {
        id: "at-1",
        label: "Purchase",
        fieldName: "purchase",
        typeValues: ["purchase"],
        description: "Purchase activity",
        extensions: [{ name: "amount" }],
        reasonCodes: ["RC1"],
        validationRules: ["V1", "V2"],
      },
      {
        id: "at-2",
        label: "Return",
        fieldName: "return",
        typeValues: ["return"],
        description: "Return activity",
        extensions: [],
        reasonCodes: [],
        validationRules: [],
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("../hooks/use-activity-templates", () => ({
  useActivityTemplates: vi.fn(defaultUseActivityTemplates),
  useDeleteActivityTemplate: vi.fn(() => vi.fn()),
  useSaveActivityTemplate: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
  useBulkDeleteActivityTemplates: vi.fn(() => vi.fn()),
  useBulkEditActivityTemplates: vi.fn(() => vi.fn()),
}));

vi.mock("@/shared/hooks/use-enums", () => ({
  useEnumOptions: vi.fn(() => ({
    data: [
      { value: "purchase", label: "Purchase" },
      { value: "return", label: "Return" },
      { value: "loyalty", label: "Loyalty" },
    ],
    isLoading: false,
  })),
  useCreateEnum: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/shared/components/search-bar", () => ({
  SearchBar: ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="activity-templates-search"
      aria-label="Search activity templates"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("../components/view-toggle", () => ({
  ViewToggle: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="view-toggle">
      <button data-testid="at-mock-view-toggle-card" aria-label="Switch to card view" onClick={() => onChange("card")}>{value}</button>
      <button data-testid="at-mock-view-toggle-list" aria-label="Switch to list view" onClick={() => onChange("list")}>list</button>
    </div>
  ),
}));

vi.mock("@/shared/components/no-program-banner", () => ({
  NoProgramBanner: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string}>No program selected</div>
  ),
}));

vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? (
      <div data-testid="delete-dialog">
        <button data-testid="at-confirm-delete-btn" aria-label="Confirm delete" onClick={onConfirm}>Confirm</button>
        <button data-testid="at-close-delete-btn" aria-label="Close delete dialog" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/confirm-dialog", () => ({
  ConfirmDialog: ({ open, title, description, onClose, onConfirm }: { open: boolean; title: string; description: string; onClose: () => void; onConfirm: () => void }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <span>{description}</span>
        <button data-testid="confirm-dialog-confirm" aria-label="Confirm" onClick={onConfirm}>Confirm</button>
        <button data-testid="mock-confirm-dialog-close" aria-label="Close" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../components/activity-template-bulk-edit-drawer", () => ({
  ActivityTemplateBulkEditDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="activity-template-bulk-edit-drawer">Bulk Edit Drawer</div> : null,
}));

vi.mock("@/shared/components/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
}));

vi.mock("@/shared/hooks/use-schema", () => ({
  useModelFieldOptions: vi.fn(() => ({
    options: [],
    getLabel: (f: string) => f,
    fieldNames: new Set<string>(),
    isLoading: false,
  })),
}));

vi.mock("@/shared/hooks/use-client-table", () => ({
  useClientTable: ({ items }: { items: unknown[] }) => ({
    sort: null,
    columnFilters: {},
    setColumnFilter: vi.fn(),
    filtersVisible: false,
    setFiltersVisible: vi.fn(),
    hasActiveFilters: false,
    clearAllFilters: vi.fn(),
    processedItems: items,
    paginatedItems: items,
    page: 0,
    pageSize: 25,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    toggleSort: vi.fn(),
  }),
  renderSortIcon: () => null,
}));

const routerOpts = { routerEntries: ["/program/activity-templates"] };

describe("ActivityTemplatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    localStorage.removeItem("rcx.ui.activityTemplateViewMode");
  });

  it("renders the page with test id", () => {
    render(<ActivityTemplatesPage />, routerOpts);
    expect(screen.getByTestId("activity-templates-page")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<ActivityTemplatesPage />, routerOpts);
    expect(screen.getByText("Activity Templates")).toBeInTheDocument();
  });

  it("renders the Add button", () => {
    render(<ActivityTemplatesPage />, routerOpts);
    expect(screen.getByTestId("activity-templates-add")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    render(<ActivityTemplatesPage />, routerOpts);
    expect(screen.getByTestId("activity-templates-search")).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<ActivityTemplatesPage />, routerOpts);
    expect(screen.getByTestId("activity-templates-refresh")).toBeInTheDocument();
  });

  it("shows NoProgramBanner when no program is selected", () => {
    mockUIState({ currentProgram: null });
    render(<ActivityTemplatesPage />, routerOpts);
    expect(screen.getByTestId("activity-templates-no-program")).toBeInTheDocument();
  });

  describe("list view", () => {
    it("renders table rows for each template in list view", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByTestId("activity-template-row-at-1")).toBeInTheDocument();
      expect(screen.getByTestId("activity-template-row-at-2")).toBeInTheDocument();
    });

    it("renders template label in table row", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("Purchase")).toBeInTheDocument();
      expect(screen.getByText("Return")).toBeInTheDocument();
    });

    it("renders field name in table row", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("ext.purchase")).toBeInTheDocument();
    });

    it("shows description in table row", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("Purchase activity")).toBeInTheDocument();
    });

    it("shows column headers", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Field")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Fields")).toBeInTheDocument();
      expect(screen.getByText("Reason Codes")).toBeInTheDocument();
      expect(screen.getByText("Rules")).toBeInTheDocument();
    });

    it("clicking a row navigates to the edit page", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-template-row-at-1"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates/at-1");
    });

    it("renders pagination component", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      const paginations = screen.getAllByTestId("table-pagination");
      expect(paginations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("card view", () => {
    it("renders card view when view mode is card", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByTestId("activity-template-card-at-1")).toBeInTheDocument();
      expect(screen.getByTestId("activity-template-card-at-2")).toBeInTheDocument();
    });

    it("card shows template label", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("Purchase")).toBeInTheDocument();
    });

    it("card shows field count", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      // Purchase has 1 extension field
      const fieldCounts = screen.getAllByText("1");
      expect(fieldCounts.length).toBeGreaterThan(0);
    });

    it("clicking a card navigates to edit page", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-template-card-at-1"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates/at-1");
    });
  });

  describe("loading state", () => {
    afterEach(() => {
      vi.mocked(useActivityTemplates).mockImplementation(defaultUseActivityTemplates);
    });

    it("shows loading spinner in list view", () => {
      vi.mocked(useActivityTemplates).mockReturnValue({
        types: [],
        isLoading: true,
      } as never);
      render(<ActivityTemplatesPage />, routerOpts);
      const spinners = document.querySelectorAll(".animate-spin");
      expect(spinners.length).toBeGreaterThan(0);
    });

    it("shows skeleton cards in card view when loading", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      vi.mocked(useActivityTemplates).mockReturnValue({
        types: [],
        isLoading: true,
      } as never);
      render(<ActivityTemplatesPage />, routerOpts);
      const pulseElements = document.querySelectorAll(".animate-pulse");
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    afterEach(() => {
      vi.mocked(useActivityTemplates).mockImplementation(defaultUseActivityTemplates);
    });

    it("shows empty state when no templates match", () => {
      vi.mocked(useActivityTemplates).mockReturnValue({
        types: [],
        isLoading: false,
      } as never);
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("No activity templates configured")).toBeInTheDocument();
    });

    it("shows Add Activity Template button in empty state", () => {
      vi.mocked(useActivityTemplates).mockReturnValue({
        types: [],
        isLoading: false,
      } as never);
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByText("Add Activity Template")).toBeInTheDocument();
    });
  });

  describe("back navigation", () => {
    it("clicking back arrow navigates to /program", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByLabelText("Back to Program Elements"));
      expect(mockNavigate).toHaveBeenCalledWith("/program");
    });
  });

  describe("view toggle", () => {
    it("renders the view toggle", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByTestId("view-toggle")).toBeInTheDocument();
    });

    it("switches to card view when card toggle is clicked", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("at-mock-view-toggle-card"));
      // After clicking, card view should be active, which shows cards
      expect(screen.getByTestId("activity-template-card-at-1")).toBeInTheDocument();
    });
  });

  describe("delete flow", () => {
    it("clicking delete on a card row opens the delete dialog", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      const card = screen.getByTestId("activity-template-card-at-1");
      const deleteBtn = card.querySelector('button[title="Delete"]');
      fireEvent.click(deleteBtn!);
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("clicking delete on a list row opens the delete dialog", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      const row = screen.getByTestId("activity-template-row-at-1");
      const deleteBtn = row.querySelector('button[aria-label="Delete"]');
      fireEvent.click(deleteBtn!);
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("clicking confirm in delete dialog triggers deletion", async () => {
      const mockDeleteFn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useDeleteActivityTemplate).mockReturnValue(mockDeleteFn as never);

      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      const card = screen.getByTestId("activity-template-card-at-1");
      const deleteBtn = card.querySelector('button[title="Delete"]');
      fireEvent.click(deleteBtn!);
      fireEvent.click(screen.getByTestId("at-confirm-delete-btn"));
      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith("at-1");
      });
    });

    it("clicking edit button on card edit icon navigates", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      const card = screen.getByTestId("activity-template-card-at-1");
      const editBtn = card.querySelector('button[title="Edit"]');
      fireEvent.click(editBtn!);
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates/at-1");
    });

    it("clicking edit button on list row edit icon navigates", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      const row = screen.getByTestId("activity-template-row-at-1");
      const editBtn = row.querySelector('button[aria-label="Edit"]');
      fireEvent.click(editBtn!);
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates/at-1");
    });
  });

  describe("create modal flow", () => {
    it("clicking Add opens the create modal", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      expect(screen.getByText("New Activity Template")).toBeInTheDocument();
    });

    it("create modal shows template name input", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      expect(screen.getByTestId("activity-templates-name-input")).toBeInTheDocument();
    });

    it("can type a template name", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      const nameInput = screen.getByTestId("activity-templates-name-input");
      fireEvent.change(nameInput, { target: { value: "My Template" } });
      expect(nameInput).toHaveValue("My Template");
    });

    it("shows available type options that are not already configured", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      // "purchase" and "return" are already used, only "loyalty" should be available
      expect(screen.getByTestId("activity-template-option-loyalty")).toBeInTheDocument();
      expect(screen.queryByTestId("activity-template-option-purchase")).not.toBeInTheDocument();
    });

    it("toggling a type selects/deselects it", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      fireEvent.click(screen.getByTestId("activity-template-option-loyalty"));
      expect(screen.getByText("1 selected")).toBeInTheDocument();
      // Click again to deselect
      fireEvent.click(screen.getByTestId("activity-template-option-loyalty"));
      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });

    it("search filters type options in create modal", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      const searchInput = screen.getByTestId("activity-templates-create-search");
      fireEvent.change(searchInput, { target: { value: "loyalty" } });
      expect(screen.getByTestId("activity-template-option-loyalty")).toBeInTheDocument();
    });

    it("search with no match shows empty message", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      const searchInput = screen.getByTestId("activity-templates-create-search");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      expect(screen.getByText("No matching activity types")).toBeInTheDocument();
    });

    it("can add a new type value", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      const newTypeInput = screen.getByTestId("activity-templates-new-type-input");
      fireEvent.change(newTypeInput, { target: { value: "CustomType" } });
      fireEvent.click(screen.getByTestId("activity-templates-add-new-type"));
      expect(screen.getByText("1 selected")).toBeInTheDocument();
      expect(screen.getByText("CustomType")).toBeInTheDocument();
    });

    it("pressing Enter in new type input adds the type", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      const newTypeInput = screen.getByTestId("activity-templates-new-type-input");
      fireEvent.change(newTypeInput, { target: { value: "EnterType" } });
      fireEvent.keyDown(newTypeInput, { key: "Enter" });
      expect(screen.getByText("EnterType")).toBeInTheDocument();
    });

    it("removing a selected type deselects it", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      // Add a new type
      const newTypeInput = screen.getByTestId("activity-templates-new-type-input");
      fireEvent.change(newTypeInput, { target: { value: "RemoveMe" } });
      fireEvent.click(screen.getByTestId("activity-templates-add-new-type"));
      expect(screen.getByText("1 selected")).toBeInTheDocument();
      // Remove it
      fireEvent.click(screen.getByLabelText("Remove RemoveMe"));
      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });

    it("create confirm navigates to new template page", async () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      // Select an existing type
      fireEvent.click(screen.getByTestId("activity-template-option-loyalty"));
      // Click create
      fireEvent.click(screen.getByTestId("activity-templates-create-confirm"));
      // Should navigate (async)
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/program/activity-templates/new",
          expect.objectContaining({
            state: expect.objectContaining({
              typeValues: ["loyalty"],
            }),
          }),
        );
      });
    });
  });

  describe("search", () => {
    it("filters templates by label when searching", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.change(screen.getByTestId("activity-templates-search"), { target: { value: "Purchase" } });
      expect(screen.getByTestId("activity-template-row-at-1")).toBeInTheDocument();
      expect(screen.queryByTestId("activity-template-row-at-2")).not.toBeInTheDocument();
    });

    it("filters templates by typeValues when searching", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.change(screen.getByTestId("activity-templates-search"), { target: { value: "return" } });
      expect(screen.getByTestId("activity-template-row-at-2")).toBeInTheDocument();
      expect(screen.queryByTestId("activity-template-row-at-1")).not.toBeInTheDocument();
    });

    it("shows no matching message when search has no results", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.change(screen.getByTestId("activity-templates-search"), { target: { value: "xyz123" } });
      expect(screen.getByText("No matching activity templates")).toBeInTheDocument();
    });
  });

  describe("refresh", () => {
    it("clicking refresh increments refresh key", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      const refreshBtn = screen.getByTestId("activity-templates-refresh");
      fireEvent.click(refreshBtn);
      // The page should still be rendered (refreshKey changed)
      expect(screen.getByTestId("activity-templates-page")).toBeInTheDocument();
    });
  });

  describe("bulk create (1 Per Type)", () => {
    beforeEach(() => {
      // Provide 3 available types (loyalty, social, referral) so we can select 2+
      vi.mocked(useEnumOptions).mockReturnValue({
        data: [
          { value: "purchase", label: "Purchase" },
          { value: "return", label: "Return" },
          { value: "loyalty", label: "Loyalty" },
          { value: "social", label: "Social" },
          { value: "referral", label: "Referral" },
        ],
        isLoading: false,
      } as never);
    });

    afterEach(() => {
      vi.mocked(useEnumOptions).mockRestore();
    });

    it("does not show '1 Per Type' button when fewer than 2 types are selected", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      // 0 selected
      expect(screen.queryByTestId("activity-templates-bulk-create")).not.toBeInTheDocument();
      // Select 1
      fireEvent.click(screen.getByTestId("activity-template-option-loyalty"));
      expect(screen.queryByTestId("activity-templates-bulk-create")).not.toBeInTheDocument();
    });

    it("shows '1 Per Type' button with count when 2+ types are selected", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      fireEvent.click(screen.getByTestId("activity-template-option-loyalty"));
      fireEvent.click(screen.getByTestId("activity-template-option-social"));
      const bulkBtn = screen.getByTestId("activity-templates-bulk-create");
      expect(bulkBtn).toBeInTheDocument();
      expect(bulkBtn).toHaveTextContent("1 Per Type (2)");
    });

    it("opens namespace confirmation dialog, then creates on confirm", async () => {
      const mockSaveFn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useSaveActivityTemplate).mockReturnValue(mockSaveFn as never);

      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("activity-templates-add"));
      fireEvent.click(screen.getByTestId("activity-template-option-loyalty"));
      fireEvent.click(screen.getByTestId("activity-template-option-social"));
      fireEvent.click(screen.getByTestId("activity-templates-bulk-create"));

      // Namespace confirmation dialog should appear with editable inputs
      expect(screen.getByTestId("namespace-confirm-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("namespace-input-loyalty")).toBeInTheDocument();
      expect(screen.getByTestId("namespace-input-social")).toBeInTheDocument();

      // Click "Create All" to confirm
      fireEvent.click(screen.getByTestId("namespace-confirm-create"));

      await waitFor(() => {
        expect(mockSaveFn).toHaveBeenCalledTimes(2);
      });

      // Verify each call has a single typeValue and an appropriate label
      const calls = mockSaveFn.mock.calls;
      const typeValuesUsed = calls.map((c: unknown[]) => (c[0] as { typeValues: string[] }).typeValues);
      expect(typeValuesUsed).toEqual(
        expect.arrayContaining([["loyalty"], ["social"]]),
      );

      // Each call should have a label matching the enum label
      const labelsUsed = calls.map((c: unknown[]) => (c[0] as { label: string }).label);
      expect(labelsUsed).toEqual(expect.arrayContaining(["Loyalty", "Social"]));
    });
  });

  describe("bulk operations", () => {
    it("selecting a row shows BulkActionBar", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      const checkbox = screen.getByLabelText("Select Purchase");
      fireEvent.click(checkbox);
      expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("clearing selection hides BulkActionBar", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByLabelText("Select Purchase"));
      expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText("Clear selection"));
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
    });

    it("bulk delete opens confirmation dialog", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByLabelText("Select Purchase"));
      const bulkBar = screen.getByTestId("bulk-action-bar");
      const deleteBtn = bulkBar.querySelector('button:has(svg.lucide-trash2)') as HTMLElement;
      fireEvent.click(deleteBtn);
      expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Activity Templates")).toBeInTheDocument();
    });

    it("bulk edit opens drawer", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByLabelText("Select Purchase"));
      fireEvent.click(screen.getByTestId("bulk-action-edit"));
      expect(screen.getByTestId("activity-template-bulk-edit-drawer")).toBeInTheDocument();
    });
  });

  describe("view mode persistence", () => {
    it("persists card view mode to localStorage", () => {
      render(<ActivityTemplatesPage />, routerOpts);
      fireEvent.click(screen.getByTestId("at-mock-view-toggle-card"));
      expect(localStorage.getItem("rcx.ui.activityTemplateViewMode")).toBe("card");
    });

    it("reads stored view mode on mount", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "card");
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByTestId("activity-template-card-at-1")).toBeInTheDocument();
    });

    it("defaults to list when stored value is invalid", () => {
      localStorage.setItem("rcx.ui.activityTemplateViewMode", "invalid");
      render(<ActivityTemplatesPage />, routerOpts);
      expect(screen.getByTestId("activity-template-row-at-1")).toBeInTheDocument();
    });
  });
});
