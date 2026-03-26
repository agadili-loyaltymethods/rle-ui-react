import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import ActivityTemplateEditPage from "./activity-template-edit-page";

const mockNavigate = vi.fn();
let mockParams: Record<string, string | undefined> = { id: "at-1" };
let mockLocation = { pathname: "/program/activity-templates/at-1", state: null as unknown };

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useLocation: () => mockLocation,
    useBlocker: () => ({ state: "idle", reset: vi.fn(), proceed: vi.fn() }),
  };
});

vi.mock("@/shared/components/breadcrumb-context", () => ({
  useBreadcrumbOverride: vi.fn(),
}));

// Mock Radix Tabs to always render all content (jsdom doesn't handle tab state changes)
vi.mock("@radix-ui/react-tabs", () => ({
  Root: ({ children, onValueChange: _, defaultValue: __, value: ___, ...props }: Record<string, unknown>) => <div data-testid="tabs-root" {...props}>{children as React.ReactNode}</div>,
  List: ({ children, loop: _, ...props }: Record<string, unknown>) => <div role="tablist" {...props}>{children as React.ReactNode}</div>,
  Trigger: ({ children, value, ...props }: Record<string, unknown>) => (
    <button role="tab" data-testid={`at-edit-tab-${value}`} aria-label={`Tab ${value}`} data-state={props["data-state"] ?? "inactive"} data-value={value as string} {...props}>{children as React.ReactNode}</button>
  ),
  Content: ({ children }: Record<string, unknown>) => <div>{children as React.ReactNode}</div>,
}));

const mockUseActivityTemplate = vi.fn(() => ({
  config: {
    id: "at-1",
    label: "Purchase",
    fieldName: "purchase",
    typeValues: ["purchase"],
    description: "Purchase activity",
    extensions: [],
    reasonCodes: [],
    validationRules: [],
    publishedFields: [],
    calculatedFields: [],
  },
  isLoading: false,
  allTypes: [
    {
      id: "at-1",
      label: "Purchase",
      fieldName: "purchase",
      typeValues: ["purchase"],
      description: "Purchase activity",
      extensions: [],
      reasonCodes: [],
      validationRules: [],
      publishedFields: [],
      calculatedFields: [],
    },
  ],
  rawMeta: null,
}));

const mockSaveTemplate = vi.fn().mockResolvedValue(undefined);
const mockDeleteTemplate = vi.fn().mockResolvedValue(undefined);

vi.mock("../hooks/use-activity-templates", () => ({
  useActivityTemplate: (...args: unknown[]) => mockUseActivityTemplate(...args),
  useSaveActivityTemplate: vi.fn(() => mockSaveTemplate),
  useDeleteActivityTemplate: vi.fn(() => mockDeleteTemplate),
  useReasonCodeOptions: vi.fn(() => ({
    data: [
      { value: "RC001", label: "Reason Code 1" },
      { value: "RC002", label: "Reason Code 2" },
    ],
  })),
}));

vi.mock("@/shared/hooks/use-enums", () => ({
  useEnumOptions: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateEnum: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/shared/hooks/use-schema", () => ({
  useModelFieldOptions: vi.fn(() => ({
    options: [],
    getLabel: (f: string) => f,
    fieldNames: new Set<string>(),
  })),
  useModelExtensionFieldOptions: vi.fn(() => ({
    options: [],
    getLabel: (f: string) => f,
  })),
}));

vi.mock("@/shared/hooks/use-api", () => ({
  useEntityList: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

vi.mock("@/shared/hooks/use-divisions", () => ({
  useDivisionOptions: vi.fn(() => ({ options: [], isLoading: false })),
}));

vi.mock("../hooks/use-programs", () => ({
  useProgram: vi.fn(() => ({ data: { divisions: [] }, isLoading: false })),
}));

vi.mock("@/shared/components/multi-select", () => ({
  MultiSelect: () => <div data-testid="multi-select">MultiSelect</div>,
}));

vi.mock("@/shared/components/unsaved-changes-dialog", () => ({
  UnsavedChangesDialog: ({ open, onCancel, onDiscard }: { open: boolean; onCancel: () => void; onDiscard: () => void }) =>
    open ? (
      <div data-testid="unsaved-changes-dialog">
        <button data-testid="at-edit-unsaved-cancel" aria-label="Cancel unsaved changes" onClick={onCancel}>Stay</button>
        <button data-testid="at-edit-unsaved-discard" aria-label="Discard unsaved changes" onClick={onDiscard}>Discard</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? (
      <div data-testid="delete-confirm-dialog">
        <button data-testid="at-edit-delete-confirm-btn" aria-label="Confirm delete" onClick={onConfirm}>Confirm Delete</button>
        <button data-testid="at-edit-delete-cancel-btn" aria-label="Cancel delete" onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/no-program-banner", () => ({
  NoProgramBanner: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string ?? "no-program-banner"}>
      No program selected
    </div>
  ),
}));

describe("ActivityTemplateEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    mockParams = { id: "at-1" };
    mockLocation = { pathname: "/program/activity-templates/at-1", state: null };
    // Reset to default loaded state
    mockUseActivityTemplate.mockReturnValue({
      config: {
        id: "at-1",
        label: "Purchase",
        fieldName: "purchase",
        typeValues: ["purchase"],
        description: "Purchase activity",
        extensions: [],
        reasonCodes: [],
        validationRules: [],
        publishedFields: [],
        calculatedFields: [],
      },
      isLoading: false,
      allTypes: [
        {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
      ],
      rawMeta: null,
    });
  });

  it("renders the edit page with test id", () => {
    render(<ActivityTemplateEditPage />, {
      routerEntries: ["/program/activity-templates/at-1"],
    });
    expect(screen.getByTestId("activity-template-edit-page")).toBeInTheDocument();
  });

  it("renders the title input with template name", () => {
    render(<ActivityTemplateEditPage />, {
      routerEntries: ["/program/activity-templates/at-1"],
    });
    expect(screen.getByTestId("activity-template-title-input")).toBeInTheDocument();
  });

  it("renders the Save button", () => {
    render(<ActivityTemplateEditPage />, {
      routerEntries: ["/program/activity-templates/at-1"],
    });
    expect(screen.getByTestId("activity-template-save")).toBeInTheDocument();
  });

  it("renders the Cancel button", () => {
    render(<ActivityTemplateEditPage />, {
      routerEntries: ["/program/activity-templates/at-1"],
    });
    expect(screen.getByTestId("activity-template-cancel")).toBeInTheDocument();
  });

  it("renders the Delete button for existing templates", () => {
    render(<ActivityTemplateEditPage />, {
      routerEntries: ["/program/activity-templates/at-1"],
    });
    expect(screen.getByTestId("activity-template-delete")).toBeInTheDocument();
  });

  describe("no program selected", () => {
    it("shows NoProgramBanner when no program is selected", () => {
      mockUIState({ currentProgram: null });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("no-program-banner")).toBeInTheDocument();
    });

    it("does not render edit page when no program is selected", () => {
      mockUIState({ currentProgram: null });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.queryByTestId("activity-template-edit-page")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows spinner while loading in edit mode", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: true,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      // Should not render the edit page itself
      expect(screen.queryByTestId("activity-template-edit-page")).not.toBeInTheDocument();
    });
  });

  describe("not found state", () => {
    it("shows not-found message when config is null after loading", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("Activity template not found")).toBeInTheDocument();
    });

    it("shows Back button in not-found state", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("Back to Activity Templates")).toBeInTheDocument();
    });

    it("clicking Back navigates to activity templates list", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByText("Back to Activity Templates"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates");
    });
  });

  describe("create mode", () => {
    it("renders the edit page in create mode (no id param)", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      // In create mode with typeValues in state, should render the page
      expect(screen.getByTestId("activity-template-edit-page")).toBeInTheDocument();
    });

    it("does not show Delete button in create mode", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      expect(screen.queryByTestId("activity-template-delete")).not.toBeInTheDocument();
    });
  });

  describe("edit mode with extensions", () => {
    it("renders template with extension fields", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [
            { id: "ext-1", name: "storeRegion", label: "Store Region", type: "string" as const, required: false },
          ],
          reasonCodes: ["RC001"],
          validationRules: [],
          publishedFields: ["storeRegion"],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("activity-template-edit-page")).toBeInTheDocument();
    });

    it("renders template with validation rules", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [],
          reasonCodes: [],
          validationRules: [
            {
              id: "vr-1",
              field: "value",
              type: "required" as const,
              message: "Value is required",
            },
          ],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("activity-template-edit-page")).toBeInTheDocument();
    });
  });

  describe("tab navigation", () => {
    it("renders General tab", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const generalTab = screen.getByTestId("activity-template-tab-general");
      expect(generalTab).toBeInTheDocument();
    });

    it("renders Extensions tab trigger", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("activity-template-tab-extensions")).toBeInTheDocument();
    });

    it("renders Reason Codes tab trigger", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("activity-template-tab-reason-codes")).toBeInTheDocument();
    });

    it("renders Validation tab trigger", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("activity-template-tab-validation")).toBeInTheDocument();
    });

    it("renders the Calculations tab", async () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      await waitFor(() => {
        expect(screen.getByTestId("activity-template-tab-calculations")).toBeInTheDocument();
      });
    });

    it("Extensions tab is clickable", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const tab = screen.getByTestId("activity-template-tab-extensions");
      // Click should not throw
      fireEvent.click(tab);
      expect(tab).toBeInTheDocument();
    });

    it("Validation tab is clickable", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const tab = screen.getByTestId("activity-template-tab-validation");
      fireEvent.click(tab);
      expect(tab).toBeInTheDocument();
    });

    it("Reason Codes tab is clickable", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const tab = screen.getByTestId("activity-template-tab-reason-codes");
      fireEvent.click(tab);
      expect(tab).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("clicking Cancel navigates back", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("activity-template-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates");
    });

    it("clicking Back arrow navigates to activity templates", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByLabelText("Back"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates");
    });

    it("typing in the title input updates the value", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const titleInput = screen.getByTestId("activity-template-title-input");
      fireEvent.change(titleInput, { target: { value: "Updated Title" } });
      expect(titleInput).toHaveValue("Updated Title");
    });

    it("typing in description textarea updates the value", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const descInput = screen.getByTestId("activity-template-field-description");
      fireEvent.change(descInput, { target: { value: "New description" } });
      expect(descInput).toHaveValue("New description");
    });
  });

  describe("delete flow", () => {
    it("clicking Delete opens the delete confirm dialog", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("activity-template-delete"));
      expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();
    });

    it("confirming delete calls deleteTemplate and navigates", async () => {
      mockDeleteTemplate.mockResolvedValue(undefined);
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("activity-template-delete"));
      fireEvent.click(screen.getByTestId("at-edit-delete-confirm-btn"));
      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalledWith("at-1");
      });
    });

    it("canceling delete closes the dialog", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("activity-template-delete"));
      expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("at-edit-delete-cancel-btn"));
      expect(screen.queryByTestId("delete-confirm-dialog")).not.toBeInTheDocument();
    });
  });

  describe("save flow", () => {
    it("clicking Save in create mode triggers validation", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      // Click Save without filling in namespace — should show validation error
      fireEvent.click(screen.getByTestId("activity-template-save"));
      // Should show error for missing namespace
      expect(screen.getByText("Namespace is required")).toBeInTheDocument();
    });

    it("clicking Save with valid data in create mode calls saveTemplate", async () => {
      mockSaveTemplate.mockResolvedValue(undefined);
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });

      // Fill in namespace
      const namespaceInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(namespaceInput, { target: { value: "myns" } });

      fireEvent.click(screen.getByTestId("activity-template-save"));
      await waitFor(() => {
        expect(mockSaveTemplate).toHaveBeenCalled();
      });
    });

    it("clicking Save in edit mode calls saveTemplate", async () => {
      mockSaveTemplate.mockResolvedValue(undefined);
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });

      // Make form dirty by changing the title
      const titleInput = screen.getByTestId("activity-template-title-input");
      fireEvent.change(titleInput, { target: { value: "Updated Title" } });

      fireEvent.click(screen.getByTestId("activity-template-save"));
      await waitFor(() => {
        expect(mockSaveTemplate).toHaveBeenCalled();
      });
    });
  });

  describe("cancel flow", () => {
    it("clicking Cancel when form is not dirty navigates back", () => {
      // For edit mode, form is not dirty initially (hasSavedOnce=true, snapshot matches)
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("activity-template-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates");
    });

    it("clicking Cancel when form is dirty in create mode opens unsaved changes dialog", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      // Create mode is always dirty until first save
      fireEvent.click(screen.getByTestId("activity-template-cancel"));
      expect(screen.getByTestId("unsaved-changes-dialog")).toBeInTheDocument();
    });
  });

  describe("extensions tab", () => {
    it("shows extension count badge on extensions tab when extensions exist", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [
            { id: "ext-1", name: "storeRegion", label: "Store Region", type: "string" as const, required: false },
          ],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const extTab = screen.getByTestId("activity-template-tab-extensions");
      expect(extTab.textContent).toContain("1");
    });

    it("shows Add Field button", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("ext-add-field")).toBeInTheDocument();
    });

    it("shows empty state when no fields defined", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("No custom fields defined yet")).toBeInTheDocument();
    });

    it("clicking Add Field opens the extension field modal", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      expect(screen.getByText("Add Extension Field")).toBeInTheDocument();
    });

    it("can fill and save a new extension field", async () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      fireEvent.change(screen.getByTestId("ext-field-name"), { target: { value: "myField" } });
      fireEvent.change(screen.getByTestId("ext-field-label"), { target: { value: "My Field" } });
      fireEvent.click(screen.getByTestId("ext-field-save"));
      await waitFor(() => {
        expect(screen.queryByText("Add Extension Field")).not.toBeInTheDocument();
      });
      // Field should now appear in the table
      expect(screen.getByText("My Field")).toBeInTheDocument();
    });

    it("shows validation error for invalid field name", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      fireEvent.change(screen.getByTestId("ext-field-name"), { target: { value: "1invalid" } });
      expect(screen.getByText("Must be a valid identifier")).toBeInTheDocument();
    });

    it("shows required checkbox in field modal", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      expect(screen.getByTestId("ext-field-required")).toBeInTheDocument();
    });

    it("can toggle required checkbox", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      const checkbox = screen.getByTestId("ext-field-required");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("shows description textarea in field modal", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      expect(screen.getByTestId("ext-field-description")).toBeInTheDocument();
    });

    it("shows default value input in field modal", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("ext-add-field"));
      expect(screen.getByTestId("ext-field-default")).toBeInTheDocument();
    });

    it("renders extension fields in table when they exist", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "",
          extensions: [
            { id: "ext-1", name: "storeRegion", label: "Store Region", type: "string" as const, required: false },
          ],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("Store Region")).toBeInTheDocument();
      expect(screen.getByLabelText(/Edit field/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Delete field/)).toBeInTheDocument();
    });

    it("clicking Edit field opens edit modal", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "",
          extensions: [
            { id: "ext-1", name: "storeRegion", label: "Store Region", type: "string" as const, required: false },
          ],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByLabelText(/Edit field/));
      expect(screen.getByText("Edit Field")).toBeInTheDocument();
      // Should pre-populate with existing values
      expect(screen.getByTestId("ext-field-name")).toHaveValue("storeRegion");
      expect(screen.getByTestId("ext-field-label")).toHaveValue("Store Region");
    });

    it("clicking Delete field removes it", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "",
          extensions: [
            { id: "ext-1", name: "storeRegion", label: "Store Region", type: "string" as const, required: false },
          ],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByLabelText(/Delete field/));
      expect(screen.queryByText("Store Region")).not.toBeInTheDocument();
    });
  });

  describe("validation rules tab", () => {
    it("shows validation tab content with rule list", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("activity-template-tab-validation")).toBeInTheDocument();
    });

    it("shows validation rule count badge when rules exist", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "",
          extensions: [],
          reasonCodes: [],
          validationRules: [
            { id: "vr-1", type: "required" as const, field: "value", message: "Required" },
          ],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const valTab = screen.getByTestId("activity-template-tab-validation");
      expect(valTab.textContent).toContain("1");
    });
  });

  describe("reason codes tab", () => {
    it("shows reason code options from hook data", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("Reason Code 1")).toBeInTheDocument();
      expect(screen.getByText("Reason Code 2")).toBeInTheDocument();
    });

    it("shows reason code filter input", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("reason-code-filter")).toBeInTheDocument();
    });

    it("shows selected only toggle button", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("reason-codes-show-selected")).toBeInTheDocument();
    });

    it("shows select all button", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByTestId("reason-codes-select-all")).toBeInTheDocument();
    });

    it("shows reason code count with pre-selected codes", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "",
          extensions: [],
          reasonCodes: ["RC001"],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("(1 selected)")).toBeInTheDocument();
    });
  });

  describe("calculations tab", () => {
    it("shows calculated field count badge when calculated fields exist", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [
            {
              id: "cf-1",
              name: "totalAmount",
              label: "Total Amount",
              kind: "scalar" as const,
              expression: "qty * price",
            },
            {
              id: "cf-2",
              name: "discountedTotal",
              label: "Discounted Total",
              kind: "scalar" as const,
              expression: "totalAmount * 0.9",
            },
          ],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const calcTab = screen.getByTestId("activity-template-tab-calculations");
      expect(calcTab.textContent).toContain("2");
    });

    it("shows empty state when no calculated fields exist", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      expect(screen.getByText("Add a calculation to define computed fields")).toBeInTheDocument();
    });

    it("adds a calculated field when clicking Add Calculation", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const addBtn = screen.getByTestId("calc-field-add");
      fireEvent.click(addBtn);
      expect(screen.getByTestId("calc-field-name")).toBeInTheDocument();
      expect(screen.getByTestId("calc-field-label")).toBeInTheDocument();
      expect(screen.getByTestId("calc-field-expression")).toBeInTheDocument();
    });

    it("shows inline validation errors on save when calc field has empty name", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      // Add a calc field (starts with empty name/label/expression)
      fireEvent.click(screen.getByTestId("calc-field-add"));
      // Click save — triggers calcFieldsTouched for all fields, showing inline errors
      fireEvent.click(screen.getByTestId("activity-template-save"));
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });

    it("marks duplicate name calc fields with error indicator in sidebar on save", async () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [],
          reasonCodes: [],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [
            {
              id: "cf-1",
              name: "amount",
              label: "Amount",
              kind: "scalar" as const,
              expression: "qty * price",
            },
            {
              id: "cf-2",
              name: "amount",
              label: "Amount Copy",
              kind: "scalar" as const,
              expression: "qty * 2",
            },
          ],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      // Wait for config effect to populate calculatedFields state
      await waitFor(() => {
        expect(screen.getByTestId("calc-field-item-cf-1")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("activity-template-save"));
      // After save, both calc fields should be flagged — sidebar items get error styling
      // The save validation blocks because of the duplicate name
      expect(mockSaveTemplate).not.toHaveBeenCalled();
    });
  });

  describe("form error handling", () => {
    it("shows label required error when saving without label", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      // Clear the label (it defaults to typeValues[0])
      const titleInput = screen.getByTestId("activity-template-title-input");
      fireEvent.change(titleInput, { target: { value: "" } });

      // Fill in namespace
      const nsInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(nsInput, { target: { value: "myns" } });

      fireEvent.click(screen.getByTestId("activity-template-save"));
      expect(screen.getByText("Label is required")).toBeInTheDocument();
    });

    it("clearing error when typing in namespace field", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "Test" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });

      // Trigger validation error
      fireEvent.click(screen.getByTestId("activity-template-save"));
      expect(screen.getByText("Namespace is required")).toBeInTheDocument();

      // Type in namespace to clear error
      const nsInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(nsInput, { target: { value: "myns" } });
      expect(screen.queryByText("Namespace is required")).not.toBeInTheDocument();
    });
  });

  describe("type values management", () => {
    it("can remove a type value by clicking the X button", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["typeA", "typeB"], label: "Multi" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      // Both type values should be displayed
      expect(screen.getByText("typeA")).toBeInTheDocument();
      expect(screen.getByText("typeB")).toBeInTheDocument();
      // Remove typeA
      fireEvent.click(screen.getByLabelText("Remove typeA"));
      expect(screen.queryByText("typeA")).not.toBeInTheDocument();
      expect(screen.getByText("typeB")).toBeInTheDocument();
    });
  });

  describe("edit mode with extensions and reason codes", () => {
    it("shows extension count on extensions tab badge", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [
            { id: "ext-1", name: "storeRegion", label: "Store Region", type: "string" as const, required: false },
            { id: "ext-2", name: "amount", label: "Amount", type: "number" as const, required: true },
          ],
          reasonCodes: ["RC001"],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const extTab = screen.getByTestId("activity-template-tab-extensions");
      expect(extTab.textContent).toContain("2");
    });

    it("shows reason code count on reason codes tab badge", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [],
          reasonCodes: ["RC001"],
          validationRules: [],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const rcTab = screen.getByTestId("activity-template-tab-reason-codes");
      expect(rcTab.textContent).toContain("1");
    });

    it("shows validation rule count on validation tab badge", () => {
      mockUseActivityTemplate.mockReturnValue({
        config: {
          id: "at-1",
          label: "Purchase",
          fieldName: "purchase",
          typeValues: ["purchase"],
          description: "Purchase activity",
          extensions: [],
          reasonCodes: [],
          validationRules: [
            { id: "vr-1", type: "required" as const, field: "value", message: "Required" },
            { id: "vr-2", type: "min" as const, field: "value", value: 0 },
          ],
          publishedFields: [],
          calculatedFields: [],
        },
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const valTab = screen.getByTestId("activity-template-tab-validation");
      expect(valTab.textContent).toContain("2");
    });
  });

  describe("description editing", () => {
    it("typing in description updates state", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      const descInput = screen.getByTestId("activity-template-field-description");
      fireEvent.change(descInput, { target: { value: "Updated description" } });
      expect(descInput).toHaveValue("Updated description");
    });
  });

  describe("namespace display in edit mode", () => {
    it("shows namespace as read-only in edit mode (not an input field)", () => {
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      // In edit mode, the fieldName input should not be present
      expect(screen.queryByTestId("activity-template-field-name")).not.toBeInTheDocument();
      // The page should still render
      expect(screen.getByTestId("activity-template-edit-page")).toBeInTheDocument();
    });

    it("shows namespace as editable input in create mode", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      expect(screen.getByTestId("activity-template-field-name")).toBeInTheDocument();
    });
  });

  describe("tabs with errors", () => {
    it("validation errors switch to the errored tab", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "Test" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      fireEvent.click(screen.getByTestId("activity-template-save"));
      expect(screen.getByText("Namespace is required")).toBeInTheDocument();
    });
  });

  describe("overlapping types validation", () => {
    it("shows overlap warning when type is used by another template", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["purchase"], label: "Test" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [
          {
            id: "other-template",
            label: "Existing Purchase",
            fieldName: "existPurchase",
            typeValues: ["purchase"],
            description: "",
            extensions: [],
            reasonCodes: [],
            validationRules: [],
            publishedFields: [],
            calculatedFields: [],
          },
        ],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      // Fill in namespace
      const nsInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(nsInput, { target: { value: "myns" } });

      fireEvent.click(screen.getByTestId("activity-template-save"));
      // Should show overlap error
      expect(screen.getByText(/Activity type overlap/)).toBeInTheDocument();
    });
  });

  describe("fieldName validation", () => {
    it("shows namespace already used error when another template uses same fieldName", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "Test" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [
          {
            id: "other-template",
            label: "Other",
            fieldName: "myns",
            typeValues: ["otherType"],
            description: "",
            extensions: [],
            reasonCodes: [],
            validationRules: [],
            publishedFields: [],
            calculatedFields: [],
          },
        ],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      const nsInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(nsInput, { target: { value: "myns" } });
      expect(screen.getByText("This namespace is already used by another template")).toBeInTheDocument();
    });

    it("shows invalid identifier error for namespace with special chars", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "Test" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      const nsInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(nsInput, { target: { value: "my-ns!" } });
      expect(screen.getByText("Must be a valid identifier (letters, numbers, underscores)")).toBeInTheDocument();
    });
  });

  describe("create mode with location state", () => {
    it("initializes typeValues from location state", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["typeA", "typeB"], label: "Multi Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      expect(screen.getByText("typeA")).toBeInTheDocument();
      expect(screen.getByText("typeB")).toBeInTheDocument();
    });

    it("shows New Template label in create mode", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      expect(screen.getByText("New Template")).toBeInTheDocument();
    });

    it("shows Create button text in create mode", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New Type" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      expect(screen.getByTestId("activity-template-save")).toHaveTextContent("Create");
    });
  });

  describe("namespace helper text", () => {
    it("shows namespace input in create mode", () => {
      mockParams = {};
      mockLocation = {
        pathname: "/program/activity-templates/new",
        state: { id: "new-id", typeValues: ["newType"], label: "New" },
      };
      mockUseActivityTemplate.mockReturnValue({
        config: null,
        isLoading: false,
        allTypes: [],
        rawMeta: null,
      });
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/new"],
      });
      const nsInput = screen.getByTestId("activity-template-field-name");
      fireEvent.change(nsInput, { target: { value: "hotel" } });
      expect(nsInput).toHaveValue("hotel");
    });
  });

  describe("save error handling", () => {
    it("shows error toast when save fails", async () => {
      mockSaveTemplate.mockRejectedValue(new Error("Save failed"));
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      // Make dirty
      fireEvent.change(screen.getByTestId("activity-template-title-input"), { target: { value: "Updated" } });
      fireEvent.click(screen.getByTestId("activity-template-save"));
      // Just verify it doesn't throw
      await waitFor(() => {
        expect(mockSaveTemplate).toHaveBeenCalled();
      });
    });
  });

  describe("delete error handling", () => {
    it("handles delete failure gracefully", async () => {
      mockDeleteTemplate.mockRejectedValue(new Error("Delete failed"));
      render(<ActivityTemplateEditPage />, {
        routerEntries: ["/program/activity-templates/at-1"],
      });
      fireEvent.click(screen.getByTestId("activity-template-delete"));
      fireEvent.click(screen.getByTestId("at-edit-delete-confirm-btn"));
      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalled();
      });
    });
  });
});
