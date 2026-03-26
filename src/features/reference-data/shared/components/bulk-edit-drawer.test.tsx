import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { BulkEditDrawer } from "./bulk-edit-drawer";
import { buildFormTabs } from "../lib/form-tab-helpers";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/shared/components/confirm-dialog", () => ({
  ConfirmDialog: ({ open, description }: { open: boolean; description: string }) =>
    open ? <div data-testid="confirm-dialog">{description}</div> : null,
}));

vi.mock("@/shared/components/drawer-shell", () => ({
  DrawerShell: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) =>
    open ? <div data-testid="drawer-shell"><h2>{title}</h2>{children}</div> : null,
}));

vi.mock("@/shared/components/core-field-renderer", () => ({
  CoreFieldRenderer: ({ def }: { def: { field: string; label: string } }) => (
    <div data-testid={`core-field-${def.field}`}>{def.label}</div>
  ),
}));

vi.mock("@/shared/components/bulk-field", () => ({
  BulkField: ({
    fieldKey,
    children,
    enabled,
    onToggle,
  }: {
    fieldKey: string;
    children: React.ReactNode;
    enabled: boolean;
    onToggle: (key: string) => void;
  }) => (
    <div data-testid={`bulk-field-${fieldKey}`} data-enabled={enabled}>
      <button data-testid={`toggle-${fieldKey}`} aria-label={`Toggle ${fieldKey}`} onClick={() => onToggle(fieldKey)}>
        Toggle
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/shared/components/ext-field-renderer", () => ({
  ExtFieldRenderer: ({ fieldName }: { fieldName: string }) => (
    <div data-testid={`ext-field-${fieldName}`}>{fieldName}</div>
  ),
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
  bulkEditableFields: new Set(["name", "status"]),
  enumFields: {},
  extFields: {},
};

describe("BulkEditDrawer (reference-data)", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDrawer(overrides: Record<string, unknown> = {}) {
    const defaults = {
      open: true,
      selectedIds: new Set(["item-1", "item-2"]),
      items: [
        { _id: "item-1", name: "Item 1" },
        { _id: "item-2", name: "Item 2" },
      ],
      config: mockConfig as never,
      schema: mockSchema as never,
      onSave: mockOnSave,
      onCancel: mockOnCancel,
    };
    return render(<BulkEditDrawer {...defaults} {...overrides} />);
  }

  it("renders the drawer when open", () => {
    renderDrawer();
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderDrawer({ open: false });
    expect(screen.queryByTestId("drawer-shell")).not.toBeInTheDocument();
  });

  it("displays the title with item count", () => {
    renderDrawer();
    expect(screen.getByText("Bulk Edit (2 items)")).toBeInTheDocument();
  });

  it("displays title with correct count for single item", () => {
    renderDrawer({ selectedIds: new Set(["item-1"]) });
    expect(screen.getByText("Bulk Edit (1 items)")).toBeInTheDocument();
  });

  it("renders bulk fields for each bulk-editable core form field", () => {
    renderDrawer();
    expect(screen.getByTestId("bulk-field-name")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-field-status")).toBeInTheDocument();
  });

  it("renders core field renderers inside bulk fields", () => {
    renderDrawer();
    expect(screen.getByTestId("core-field-name")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("shows Cancel button", () => {
    renderDrawer();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("shows Apply button with item count", () => {
    renderDrawer();
    expect(screen.getByRole("button", { name: "Apply to 2" })).toBeInTheDocument();
  });

  it("disables Apply button when no fields are enabled", () => {
    renderDrawer();
    const applyBtn = screen.getByRole("button", { name: "Apply to 2" });
    expect(applyBtn).toBeDisabled();
  });

  it("shows Applying... text when saving", () => {
    renderDrawer({ saving: true });
    expect(screen.getByRole("button", { name: "Applying..." })).toBeInTheDocument();
  });

  it("disables Cancel button when saving", () => {
    renderDrawer({ saving: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("enables Apply button after toggling a field on", () => {
    renderDrawer();
    // Initially disabled
    expect(screen.getByRole("button", { name: "Apply to 2" })).toBeDisabled();
    // Toggle the name field on
    fireEvent.click(screen.getByTestId("toggle-name"));
    // Now the Apply button should be enabled
    expect(screen.getByRole("button", { name: "Apply to 2" })).not.toBeDisabled();
  });

  it("re-disables Apply button after toggling a field off", () => {
    renderDrawer();
    // Toggle on then off
    fireEvent.click(screen.getByTestId("toggle-name"));
    expect(screen.getByRole("button", { name: "Apply to 2" })).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("toggle-name"));
    expect(screen.getByRole("button", { name: "Apply to 2" })).toBeDisabled();
  });

  it("shows confirm dialog when submit is attempted with enabled fields", () => {
    renderDrawer();
    // Toggle a field on
    fireEvent.click(screen.getByTestId("toggle-name"));
    // Click the Apply button (type=submit triggers form submit)
    fireEvent.click(screen.getByRole("button", { name: "Apply to 2" }));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("does not show confirm dialog when no fields are enabled", () => {
    renderDrawer();
    // Apply button is disabled when no fields are enabled, so confirm won't show
    expect(screen.getByRole("button", { name: "Apply to 2" })).toBeDisabled();
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  describe("tab navigation", () => {
    it("renders ext tab fields when multiple tabs exist and ext tab is selected", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension 1", fields: ["customField"], columns: 2 },
      ]);

      const schema = {
        ...mockSchema,
        extFields: {
          customField: { type: "string", title: "Custom", required: false },
        },
      };
      renderDrawer({ schema });

      // Should see both tabs
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(2);

      // Click the ext tab
      fireEvent.click(tabs[1]!);

      // Ext field renderer should be rendered
      expect(screen.getByTestId("ext-field-customField")).toBeInTheDocument();
    });

    it("navigates tabs with ArrowRight key", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);

      renderDrawer();
      const tablist = screen.getByRole("tablist");
      // ArrowRight should move to next tab
      fireEvent.keyDown(tablist, { key: "ArrowRight" });
      // The second tab should now be selected
      const tabs = screen.getAllByRole("tab");
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    });

    it("navigates tabs with ArrowLeft key", () => {
      vi.mocked(buildFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: ["name"], columns: 2 },
        { key: "ext1", label: "Extension", fields: ["cf"], columns: 2 },
      ]);

      renderDrawer();
      const tablist = screen.getByRole("tablist");
      // ArrowLeft from first tab should wrap to last tab
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });
      const tabs = screen.getAllByRole("tab");
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("error banner", () => {
    it("does not show error banner initially", () => {
      renderDrawer();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("form submit with no enabled fields", () => {
    it("does not show confirm dialog when submit has no enabled fields", () => {
      renderDrawer();
      // Simulate form submit via the submit button (disabled, so won't trigger)
      fireEvent.submit(screen.getByRole("button", { name: "Apply to 2" }).closest("form")!);
      // confirm should not appear because enabledFields.size === 0
      expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    });
  });
});
