import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor, mockUIState, mockAuthenticatedUser } from "@/test-utils";
import { z } from "zod";
import { toast } from "sonner";
import { EntityEditPage, type EntityEditConfig } from "./entity-edit-page";

// Mock react-router hooks
const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ id: "new" }));
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
    useBlocker: vi.fn(() => ({ state: "unblocked", reset: vi.fn() })),
  };
});

// Mock useEntity from use-api
const mockUseEntity = vi.fn(() => ({
  data: null,
  isLoading: false,
}));
vi.mock("@/shared/hooks/use-api", () => ({
  useEntity: (...args: unknown[]) => mockUseEntity(...args),
}));

// Mock breadcrumb context
vi.mock("@/shared/components/breadcrumb-context", () => ({
  useBreadcrumbOverride: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock usePermissions to return full access by default
vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

function makeConfig(overrides?: Partial<EntityEditConfig>): EntityEditConfig {
  return {
    entityName: "Widget",
    endpoint: "widgets",
    testIdPrefix: "widget",
    listPath: "/widgets",
    schema: testSchema,
    defaultValues: { name: "", description: "" },
    tabs: [
      {
        id: "general",
        label: "General",
        fields: [
          { name: "name", label: "Name", type: "text" as const, required: true },
          { name: "description", label: "Description", type: "textarea" as const },
        ],
      },
    ],
    ...overrides,
  };
}

function makeHooks() {
  return {
    useCreate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useUpdate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  };
}

describe("EntityEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    mockUseParams.mockReturnValue({ id: "new" });
    mockUseEntity.mockReturnValue({ data: null, isLoading: false });
  });

  describe("create mode", () => {
    it("renders the edit page with Add title in create mode", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByText("Add Widget")).toBeInTheDocument();
    });

    it("renders tab labels", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("widget-tab-general")).toBeInTheDocument();
      expect(screen.getByTestId("widget-tab-general")).toHaveTextContent("General");
    });

    it("renders form fields from tab config", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders Create button in create mode", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("widget-save")).toHaveTextContent("Create");
    });

    it("renders Cancel button", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("widget-cancel")).toHaveTextContent("Cancel");
    });

    it("renders Back arrow button", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByLabelText("Back")).toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("renders Edit title in edit mode with entity data", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "My Widget", description: "desc" },
        isLoading: false,
      });
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByText("Edit Widget")).toBeInTheDocument();
    });

    it("renders Save button in edit mode", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "My Widget", description: "desc" },
        isLoading: false,
      });
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByTestId("widget-save")).toHaveTextContent("Save");
    });

    it("shows entity display name subtitle", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "My Widget", description: "desc" },
        isLoading: false,
      });
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByText("My Widget")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when entity is loading in edit mode", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({ data: null, isLoading: true });
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByTestId("widget-loading")).toBeInTheDocument();
    });

    it("does not show loading in create mode", () => {
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.queryByTestId("widget-loading")).not.toBeInTheDocument();
    });
  });

  describe("multiple tabs", () => {
    it("renders multiple tabs", () => {
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [{ name: "name", label: "Name", type: "text" as const }],
          },
          {
            id: "settings",
            label: "Settings",
            fields: [{ name: "description", label: "Description", type: "textarea" as const }],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("widget-tab-general")).toBeInTheDocument();
      expect(screen.getByTestId("widget-tab-settings")).toBeInTheDocument();
    });

    it("shows custom renderContent tab", () => {
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            renderContent: () => <div data-testid="custom-content">Custom Tab Content</div>,
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });
  });

  describe("read-only / locked state", () => {
    it("shows lock banner when entity is read-only", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "Locked Widget", description: "" },
        isLoading: false,
      });
      const config = makeConfig({
        isReadOnly: () => ({ locked: true, message: "This widget is locked for editing." }),
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByText("This widget is locked for editing.")).toBeInTheDocument();
    });

    it("hides Save button when locked", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "Locked Widget", description: "" },
        isLoading: false,
      });
      const config = makeConfig({
        isReadOnly: () => ({ locked: true, message: "Locked" }),
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.queryByTestId("widget-save")).not.toBeInTheDocument();
    });

    it("shows Back instead of Cancel when locked", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "Locked Widget", description: "" },
        isLoading: false,
      });
      const config = makeConfig({
        isReadOnly: () => ({ locked: true, message: "Locked" }),
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByTestId("widget-cancel")).toHaveTextContent("Back");
    });
  });

  describe("tab visibility", () => {
    it("hides tab when visible predicate returns false", () => {
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [{ name: "name", label: "Name", type: "text" as const }],
          },
          {
            id: "advanced",
            label: "Advanced",
            visible: () => false,
            fields: [{ name: "description", label: "Description", type: "textarea" as const }],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("widget-tab-general")).toBeInTheDocument();
      expect(screen.queryByTestId("widget-tab-advanced")).not.toBeInTheDocument();
    });
  });

  describe("cancel navigation", () => {
    it("navigates to listPath when cancel is clicked on clean form", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      await user.click(screen.getByTestId("widget-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/widgets");
    });
  });

  describe("form submission", () => {
    it("calls create mutation on save in create mode", async () => {
      const user = userEvent.setup();
      const createMutate = vi.fn().mockResolvedValue({ _id: "new-1" });
      const config = makeConfig();
      const hooks = {
        useCreate: () => ({ mutateAsync: createMutate, isPending: false }),
        useUpdate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      // Fill in the name field (required)
      const nameInput = screen.getByTestId("widget-field-name");
      await user.clear(nameInput);
      await user.type(nameInput, "New Widget");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(createMutate).toHaveBeenCalled();
      });
    });

    it("calls update mutation on save in edit mode", async () => {
      const user = userEvent.setup();
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "My Widget", description: "" },
        isLoading: false,
      });

      const updateMutate = vi.fn().mockResolvedValue({});
      const config = makeConfig();
      const hooks = {
        useCreate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
        useUpdate: () => ({ mutateAsync: updateMutate, isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );

      // Modify the name field to make form dirty
      const nameInput = screen.getByTestId("widget-field-name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Widget");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(updateMutate).toHaveBeenCalled();
      });
    });

    it("shows validation errors when required field is empty", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      // Clear the name field and try to save
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });
    });
  });

  describe("tab switching", () => {
    it("switches between tabs when clicked", async () => {
      const user = userEvent.setup();
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [{ name: "name", label: "Name", type: "text" as const }],
          },
          {
            id: "settings",
            label: "Settings",
            fields: [{ name: "description", label: "Description", type: "textarea" as const }],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      // Both tabs should be present
      expect(screen.getByTestId("widget-tab-general")).toBeInTheDocument();
      expect(screen.getByTestId("widget-tab-settings")).toBeInTheDocument();

      // Click Settings tab
      await user.click(screen.getByTestId("widget-tab-settings"));
      // Description should now be visible
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  describe("prepareCreate", () => {
    it("uses prepareCreate to transform data before creating", async () => {
      const user = userEvent.setup();
      const createMutate = vi.fn().mockResolvedValue({ _id: "new-1" });
      const config = makeConfig({
        prepareCreate: (data, programId) => ({
          ...data,
          program: programId,
          status: "active",
        }),
      });
      const hooks = {
        useCreate: () => ({ mutateAsync: createMutate, isPending: false }),
        useUpdate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "Test");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(createMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            program: "prog-1",
            status: "active",
          }),
        );
      });
    });
  });

  describe("Save button disabled state", () => {
    it("Save button is disabled when form is not dirty in edit mode", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "My Widget", description: "" },
        isLoading: false,
      });
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByTestId("widget-save")).toBeDisabled();
    });
  });

  describe("save success", () => {
    it("shows success toast and navigates after successful create", async () => {
      const user = userEvent.setup();
      const createMutate = vi.fn().mockResolvedValue({ _id: "new-1" });
      const config = makeConfig();
      const hooks = {
        useCreate: () => ({ mutateAsync: createMutate, isPending: false }),
        useUpdate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "Test Widget");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Widget created");
      });
      expect(mockNavigate).toHaveBeenCalledWith("/widgets");
    });

    it("shows success toast and navigates after successful update", async () => {
      const user = userEvent.setup();
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "My Widget", description: "" },
        isLoading: false,
      });
      const updateMutate = vi.fn().mockResolvedValue({});
      const config = makeConfig();
      const hooks = {
        useCreate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
        useUpdate: () => ({ mutateAsync: updateMutate, isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );

      const nameInput = screen.getByTestId("widget-field-name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Widget");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Widget updated");
      });
      expect(mockNavigate).toHaveBeenCalledWith("/widgets");
    });
  });

  describe("save error", () => {
    it("shows error toast when create mutation fails", async () => {
      const user = userEvent.setup();
      const createMutate = vi.fn().mockRejectedValue({
        response: { data: { message: "Duplicate name" } },
      });
      const config = makeConfig();
      const hooks = {
        useCreate: () => ({ mutateAsync: createMutate, isPending: false }),
        useUpdate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "Test Widget");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save widget: Duplicate name");
      });
    });

    it("shows generic error toast when mutation fails without API message", async () => {
      const user = userEvent.setup();
      const createMutate = vi.fn().mockRejectedValue(new Error("Network error"));
      const config = makeConfig();
      const hooks = {
        useCreate: () => ({ mutateAsync: createMutate, isPending: false }),
        useUpdate: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
      };
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "Test Widget");
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save widget");
      });
    });
  });

  describe("validation error toast", () => {
    it("shows validation error toast when submitting with errors", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      // Submit without filling required name
      await user.click(screen.getByTestId("widget-save"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("field visibility within tab", () => {
    it("hides field when field visible predicate returns false", () => {
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [
              { name: "name", label: "Name", type: "text" as const, required: true },
              { name: "description", label: "Description", type: "textarea" as const, visible: () => false },
            ],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.queryByText("Description")).not.toBeInTheDocument();
    });
  });

  describe("field disabled predicate", () => {
    it("disables field when disabled function returns true", () => {
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [
              { name: "name", label: "Name", type: "text" as const, required: true, disabled: () => true },
              { name: "description", label: "Description", type: "textarea" as const },
            ],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByTestId("widget-field-name")).toBeDisabled();
    });
  });

  describe("two-column layout", () => {
    it("renders fields in a grid when columns is 2", () => {
      const config = makeConfig({
        tabs: [
          {
            id: "general",
            label: "General",
            columns: 2,
            fields: [
              { name: "name", label: "Name", type: "text" as const, required: true },
              { name: "description", label: "Description", type: "textarea" as const },
            ],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  describe("date field transform", () => {
    it("transforms ISO date strings when loading entity data", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "Widget", startDate: "2025-01-15T00:00:00.000Z" },
        isLoading: false,
      });
      const config = makeConfig({
        schema: z.object({
          name: z.string().min(1),
          startDate: z.string().optional(),
        }),
        defaultValues: { name: "", startDate: "" },
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [
              { name: "name", label: "Name", type: "text" as const, required: true },
              { name: "startDate", label: "Start Date", type: "date" as const },
            ],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      // The date field should have the truncated value
      expect(screen.getByTestId("widget-field-startDate")).toHaveValue("2025-01-15");
    });
  });

  describe("back arrow navigation", () => {
    it("clicking Back arrow on clean form navigates to list", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );
      await user.click(screen.getByLabelText("Back"));
      expect(mockNavigate).toHaveBeenCalledWith("/widgets");
    });
  });

  describe("unsaved changes guard", () => {
    it("shows unsaved changes dialog when cancel is clicked on dirty form", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      // Dirty the form
      await user.type(screen.getByTestId("widget-field-name"), "dirty");
      // Click cancel
      await user.click(screen.getByTestId("widget-cancel"));

      await waitFor(() => {
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
      });
      // Navigate should NOT have been called yet
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("discards changes and navigates when Discard Changes is clicked", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "dirty");
      await user.click(screen.getByTestId("widget-cancel"));

      await waitFor(() => {
        expect(screen.getByText("Discard Changes")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Discard Changes"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/widgets");
      });
    });

    it("keeps editing when Keep Editing is clicked in unsaved dialog", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "dirty");
      await user.click(screen.getByTestId("widget-cancel"));

      await waitFor(() => {
        expect(screen.getByText("Keep Editing")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Keep Editing"));

      await waitFor(() => {
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows unsaved changes dialog when Back arrow is clicked on dirty form", async () => {
      const user = userEvent.setup();
      const config = makeConfig();
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/new"] },
      );

      await user.type(screen.getByTestId("widget-field-name"), "dirty");
      await user.click(screen.getByLabelText("Back"));

      await waitFor(() => {
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
      });
    });
  });

  describe("data transforms on entity load", () => {
    it("transforms array values to comma-separated strings for schema string fields", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "Widget", tags: [30, 60] },
        isLoading: false,
      });
      const config = makeConfig({
        schema: z.object({
          name: z.string().min(1),
          tags: z.string().optional(),
        }),
        defaultValues: { name: "", tags: "" },
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [
              { name: "name", label: "Name", type: "text" as const, required: true },
              { name: "tags", label: "Tags", type: "text" as const },
            ],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      // The array [30, 60] should be converted to "30,60" for a string schema field
      expect(screen.getByTestId("widget-field-tags")).toHaveValue("30,60");
    });
  });

  describe("editSchema", () => {
    it("uses editSchema when in edit mode", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", name: "Widget", description: "" },
        isLoading: false,
      });
      const editSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      });
      const config = makeConfig({ editSchema });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      // Should render without errors - editSchema is used
      expect(screen.getByText("Edit Widget")).toBeInTheDocument();
    });
  });

  describe("custom nameField", () => {
    it("uses custom nameField for display name", () => {
      mockUseParams.mockReturnValue({ id: "abc123" });
      mockUseEntity.mockReturnValue({
        data: { _id: "abc123", title: "Custom Title" },
        isLoading: false,
      });
      const config = makeConfig({
        nameField: "title",
        schema: z.object({ title: z.string().min(1) }),
        defaultValues: { title: "" },
        tabs: [
          {
            id: "general",
            label: "General",
            fields: [{ name: "title", label: "Title", type: "text" as const, required: true }],
          },
        ],
      });
      const hooks = makeHooks();
      render(
        <EntityEditPage config={config} useCreate={hooks.useCreate} useUpdate={hooks.useUpdate} />,
        { routerEntries: ["/widgets/abc123"] },
      );
      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });
  });
});
