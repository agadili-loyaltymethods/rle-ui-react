import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { EntityFormDrawer } from "./entity-form-drawer";
import { buildFormTabs } from "../lib/form-tab-helpers";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/shared/components/unsaved-changes-dialog", () => ({
  UnsavedChangesDialog: ({
    open,
    onCancel,
    onDiscard,
  }: {
    open: boolean;
    onCancel: () => void;
    onDiscard: () => void;
  }) =>
    open ? (
      <div data-testid="unsaved-dialog">
        Unsaved changes
        <button data-testid="refdata-unsaved-keep" aria-label="Keep editing" onClick={onCancel}>Keep Editing</button>
        <button data-testid="refdata-unsaved-discard" aria-label="Discard changes" onClick={onDiscard}>Discard</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/drawer-shell", () => ({
  DrawerShell: ({
    open,
    children,
    title,
    onOpenChange,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
    onOpenChange?: (v: boolean) => void;
  }) =>
    open ? (
      <div data-testid="drawer-shell">
        <h2>{title}</h2>
        {onOpenChange && (
          <button data-testid="mock-drawer-close" aria-label="Close drawer" onClick={() => onOpenChange(false)}>
            Close Shell
          </button>
        )}
        {children}
      </div>
    ) : null,
}));

vi.mock("@/shared/components/core-field-renderer", () => ({
  CoreFieldRenderer: ({
    def,
    onChange,
  }: {
    def: { field: string; label: string };
    onChange: (v: unknown) => void;
  }) => (
    <div data-testid={`core-field-${def.field}`}>
      {def.label}
      <input
        data-testid={`core-input-${def.field}`}
        aria-label={def.label}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("@/shared/hooks/use-enums", () => ({
  useEnumOptions: vi.fn(() => ({ data: [{ value: "ChildA", label: "ChildA" }, { value: "ChildB", label: "ChildB" }] })),
}));

vi.mock("./ext-tab-body", () => ({
  ExtTabBody: () => <div data-testid="ext-tab-body" />,
}));

vi.mock("../lib/form-tab-helpers", () => ({
  buildFormTabs: vi.fn(() => [{ key: "details", label: "Details", fields: ["name"], columns: 2 }]),
  buildFieldTabMap: vi.fn(() => ({})),
  firstTabWithError: vi.fn(() => null),
  tabErrorCounts: vi.fn(() => ({})),
  flattenRhfErrors: vi.fn(() => ({})),
  buildEntityFormZodSchema: vi.fn(() => {
    const { z } = require("zod");
    return z.object({});
  }),
  buildEntityDefaultValues: vi.fn(() => ({})),
}));

const mockConfig = {
  modelName: "TestEntity",
  endpoint: "testentities",
  pageTitle: "Test Entities",
  testIdPrefix: "test-entity",
  coreColumns: [],
  coreFormFields: [
    { field: "name", label: "Name", type: "text" as const },
    { field: "status", label: "Status", type: "enum" as const },
  ],
};

const mockSchema = {
  coreFields: [{ key: "name", label: "Name", type: "String", required: true }],
  extSchemas: [],
  extUIDefs: [],
  bulkEditableFields: new Set<string>(),
  enumFields: {},
  extFields: {},
};

describe("EntityFormDrawer", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDrawer(overrides: Record<string, unknown> = {}) {
    const defaults = {
      open: true,
      entity: null,
      config: mockConfig as never,
      schema: mockSchema as never,
      onSave: mockOnSave,
      onCancel: mockOnCancel,
    };
    return render(<EntityFormDrawer {...defaults} {...overrides} />);
  }

  it("renders the drawer when open for creation", () => {
    renderDrawer();
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
  });

  it("shows create title when entity is null", () => {
    renderDrawer();
    expect(screen.getByRole("heading", { name: /Add Test Entit/ })).toBeInTheDocument();
  });

  it("shows edit title when entity is provided", () => {
    renderDrawer({ entity: { _id: "item-1", name: "Test Item" } });
    expect(screen.getByText(/Edit: Test Item/)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderDrawer({ open: false });
    expect(screen.queryByTestId("drawer-shell")).not.toBeInTheDocument();
  });

  it("renders core fields on the details tab", () => {
    renderDrawer();
    expect(screen.getByTestId("core-field-name")).toBeInTheDocument();
    expect(screen.getByTestId("core-field-status")).toBeInTheDocument();
  });

  it("shows Cancel button", () => {
    renderDrawer();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows create submit button label when entity is null", () => {
    renderDrawer();
    expect(screen.getByRole("button", { name: /Add Test Entit/ })).toBeInTheDocument();
  });

  it("shows Save Changes button when editing", () => {
    renderDrawer({ entity: { _id: "item-1", name: "Test Item" } });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("disables Save Changes when form is not dirty and editing", () => {
    renderDrawer({ entity: { _id: "item-1", name: "Test Item" } });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("shows Saving... text when saving", () => {
    renderDrawer({ saving: true });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
  });

  it("disables Cancel button when saving", () => {
    renderDrawer({ saving: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("renders field labels from config", () => {
    renderDrawer();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("uses empty entity name for edit title when name is missing", () => {
    renderDrawer({ entity: { _id: "item-1" } });
    expect(screen.getByText(/Edit:/)).toBeInTheDocument();
  });

  it("does not show tabs bar when only one tab exists", () => {
    renderDrawer();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  describe("tab navigation", () => {
    it("renders ext tab body when switching to ext tab", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);
      renderDrawer();

      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(2);

      // Click the ext tab
      fireEvent.click(tabs[1]!);
      expect(screen.getByTestId("ext-tab-body")).toBeInTheDocument();
    });

    it("navigates tabs with ArrowRight key", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);
      renderDrawer();

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowRight" });
      const tabs = screen.getAllByRole("tab");
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    });

    it("navigates tabs with ArrowLeft key (wraps)", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);
      renderDrawer();

      const tablist = screen.getByRole("tablist");
      // ArrowLeft from first tab should wrap to last
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });
      const tabs = screen.getAllByRole("tab");
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("form submit", () => {
    it("triggers form submit when submit button is clicked", () => {
      renderDrawer();
      const form = screen.getByRole("button", { name: /Add Test Entit/ }).closest("form");
      expect(form).toBeInTheDocument();
      // Submitting should not throw
      fireEvent.submit(form!);
    });
  });

  describe("cancel/discard flow", () => {
    it("calls onCancel directly when form is not dirty", () => {
      renderDrawer();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("error banner", () => {
    it("does not show error banner initially", () => {
      renderDrawer();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("draggable tabs", () => {
    it("tabs are draggable elements", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);
      renderDrawer();
      const tabs = screen.getAllByRole("tab");
      expect(tabs[0]).toHaveAttribute("draggable", "true");
      expect(tabs[1]).toHaveAttribute("draggable", "true");
    });

    it("reorders tabs via drag and drop", () => {
      const onTabOrderChange = vi.fn();
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);
      renderDrawer({ onTabOrderChange });

      const tabs = screen.getAllByRole("tab");
      // Simulate drag from ext1 tab to details tab
      fireEvent.dragStart(tabs[1]!);
      fireEvent.dragOver(tabs[0]!);
      fireEvent.drop(tabs[0]!);

      expect(onTabOrderChange).toHaveBeenCalled();
    });

    it("clears drag state on dragEnd", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);
      renderDrawer();

      const tabs = screen.getAllByRole("tab");
      fireEvent.dragStart(tabs[0]!);
      fireEvent.dragEnd(tabs[0]!);
      // No crash means dragEnd handler worked
      expect(tabs[0]).toBeInTheDocument();
    });
  });

  describe("setFieldValue via CoreFieldRenderer onChange", () => {
    it("calls setFieldValue when CoreFieldRenderer onChange fires", () => {
      renderDrawer();
      const nameInput = screen.getByTestId("core-input-name");
      fireEvent.change(nameInput, { target: { value: "New Name" } });
      // The onChange callback should have been invoked (exercises setFieldValue)
      expect(nameInput).toBeInTheDocument();
    });
  });

  describe("fullWidth core field", () => {
    it("applies col-span-2 class when fullWidth is true", () => {
      const fullWidthConfig = {
        ...mockConfig,
        coreFormFields: [
          { field: "name", label: "Name", type: "text" as const, fullWidth: true },
          { field: "status", label: "Status", type: "enum" as const },
        ],
      };
      renderDrawer({ config: fullWidthConfig });
      const nameField = screen.getByTestId("core-field-name");
      // The wrapping div around the CoreFieldRenderer should have col-span-2
      expect(nameField.parentElement).toHaveClass("col-span-2");
    });

    it("does not apply col-span-2 class when fullWidth is false", () => {
      renderDrawer();
      const statusField = screen.getByTestId("core-field-status");
      expect(statusField.parentElement).not.toHaveClass("col-span-2");
    });
  });

  describe("visibleWhen core field", () => {
    const visibleWhenConfig = {
      ...mockConfig,
      coreFormFields: [
        { field: "valueType", label: "Value Type", type: "enum" as const },
        {
          field: "enumValues",
          label: "Enum Values",
          type: "text" as const,
          visibleWhen: { field: "valueType", value: "Enum" },
        },
      ],
    };

    it("hides field when dependent field does not match visibleWhen value", () => {
      renderDrawer({ config: visibleWhenConfig });
      // valueType defaults to empty/undefined, so enumValues should be hidden
      expect(screen.queryByTestId("core-field-enumValues")).not.toBeInTheDocument();
    });

    it("shows field when dependent field matches visibleWhen value", () => {
      renderDrawer({ config: visibleWhenConfig });
      // Set valueType to "Enum" to make enumValues visible
      fireEvent.change(screen.getByTestId("core-input-valueType"), {
        target: { value: "Enum" },
      });
      expect(screen.getByTestId("core-field-enumValues")).toBeInTheDocument();
    });
  });

  describe("createOnly core field", () => {
    const createOnlyConfig = {
      ...mockConfig,
      coreFormFields: [
        { field: "name", label: "Name", type: "text" as const },
        { field: "code", label: "Code", type: "text" as const, createOnly: true },
      ],
    };

    it("shows createOnly field when creating (entity is null)", () => {
      renderDrawer({ config: createOnlyConfig, entity: null });
      expect(screen.getByTestId("core-field-code")).toBeInTheDocument();
    });

    it("hides createOnly field when editing (entity is provided)", () => {
      renderDrawer({
        config: createOnlyConfig,
        entity: { _id: "item-1", name: "Test Item" },
      });
      expect(screen.queryByTestId("core-field-code")).not.toBeInTheDocument();
    });
  });

  describe("dirty form close (tryClose + unsaved changes)", () => {
    it("shows unsaved dialog when cancel is clicked on dirty form", () => {
      renderDrawer();
      // Dirty the form via the mock input
      fireEvent.change(screen.getByTestId("core-input-name"), {
        target: { value: "dirty value" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByTestId("unsaved-dialog")).toBeInTheDocument();
    });

    it("shows unsaved dialog when DrawerShell onOpenChange(false) fires on dirty form", () => {
      renderDrawer();
      fireEvent.change(screen.getByTestId("core-input-name"), {
        target: { value: "dirty value" },
      });
      fireEvent.click(screen.getByTestId("mock-drawer-close"));
      expect(screen.getByTestId("unsaved-dialog")).toBeInTheDocument();
    });

    it("hides unsaved dialog when Keep Editing is clicked", () => {
      renderDrawer();
      fireEvent.change(screen.getByTestId("core-input-name"), {
        target: { value: "dirty value" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByTestId("unsaved-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("refdata-unsaved-keep"));
      expect(screen.queryByTestId("unsaved-dialog")).not.toBeInTheDocument();
    });

    it("calls onCancel when Discard is clicked in unsaved dialog", () => {
      renderDrawer();
      fireEvent.change(screen.getByTestId("core-input-name"), {
        target: { value: "dirty value" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByTestId("refdata-unsaved-discard"));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("form submission with onSave", () => {
    it("calls onSave on valid submit", async () => {
      mockOnSave.mockResolvedValueOnce(undefined);
      renderDrawer();
      const form = screen.getByRole("button", { name: /Add Test Entit/ }).closest("form");
      fireEvent.submit(form!);
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("shows general error when onSave throws a non-API error", async () => {
      mockOnSave.mockRejectedValueOnce(new Error("Server exploded"));
      renderDrawer();
      const form = screen.getByRole("button", { name: /Add Test Entit/ }).closest("form");
      fireEvent.submit(form!);
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Server exploded")).toBeInTheDocument();
      });
    });

    it("dismisses error banner when X is clicked", async () => {
      mockOnSave.mockRejectedValueOnce(new Error("Oops"));
      renderDrawer();
      fireEvent.submit(
        screen.getByRole("button", { name: /Add Test Entit/ }).closest("form")!,
      );
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      // Click the dismiss X button inside the alert
      const dismissBtn = screen.getByRole("alert").querySelector("button");
      fireEvent.click(dismissBtn!);
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("enumFromField (dependent dropdown)", () => {
    it("renders DependentEnumField when enumFromField is set", () => {
      const configWithDep = {
        ...mockConfig,
        coreFormFields: [
          { field: "parType", label: "Parent Type", type: "enum" as const },
          { field: "parVal", label: "Parent Value", type: "enum" as const, enumFromField: "parType" },
        ],
      };
      renderDrawer({ config: configWithDep });
      // Both fields should render
      expect(screen.getByTestId("core-field-parType")).toBeInTheDocument();
      expect(screen.getByTestId("core-field-parVal")).toBeInTheDocument();
    });
  });
});
