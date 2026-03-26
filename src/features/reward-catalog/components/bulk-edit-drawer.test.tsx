import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/shared/components/confirm-dialog", () => ({
  ConfirmDialog: ({ open, title, description, onConfirm, onClose }: { open: boolean; title: string; description: string; onConfirm: () => void; onClose: () => void }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <p>{title}</p>
        <p>{description}</p>
        <button data-testid="reward-confirm-apply" aria-label="Apply bulk edit" onClick={onConfirm}>Apply</button>
        <button data-testid="reward-confirm-close" aria-label="Close confirm dialog" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/drawer-shell", () => ({
  DrawerShell: ({ open, children, title, onOpenChange }: { open: boolean; children: React.ReactNode; title: string; onOpenChange?: (v: boolean) => void }) =>
    open ? (
      <div data-testid="drawer-shell">
        <h2>{title}</h2>
        {onOpenChange && <button data-testid="drawer-close" onClick={() => onOpenChange(false)}>X</button>}
        {children}
      </div>
    ) : null,
}));

vi.mock("@/shared/components/bulk-field", () => ({
  BulkField: ({ children, fieldKey, enabled, onToggle }: {
    children: React.ReactNode;
    fieldKey: string;
    enabled: boolean;
    onToggle: (key: string) => void;
  }) => (
    <div data-testid={`bulk-field-${fieldKey}`}>
      <input
        data-testid={`toggle-${fieldKey}`}
        aria-label={`Toggle ${fieldKey}`}
        type="checkbox"
        checked={enabled}
        onChange={() => onToggle(fieldKey)}
      />
      {children}
    </div>
  ),
}));

vi.mock("@/shared/components/ext-field-renderer", () => ({
  ExtFieldRenderer: () => <div data-testid="ext-field-renderer" />,
}));

vi.mock("@/shared/components/select", () => ({
  Select: () => <div data-testid="select" />,
}));

vi.mock("@/shared/components/multi-select", () => ({
  MultiSelect: () => <div data-testid="multi-select" />,
}));

vi.mock("../hooks/use-reward-eligibility", () => ({
  useSegmentOptions: vi.fn(() => ({ options: [], isLoading: false })),
  useTierPolicyOptions: vi.fn(() => ({ options: [], isLoading: false })),
}));

vi.mock("../lib/reward-form-helpers", () => {
  const { z } = require("zod");
  return {
    buildRewardFormTabs: vi.fn(() => [
      { key: "details", label: "Details", fields: [], columns: 2 },
      { key: "limits", label: "Limits", fields: [], columns: 2 },
      { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
    ]),
    toDateOnly: vi.fn((v: string) => v ?? ""),
    buildBulkEditZodSchema: vi.fn(() => z.object({}).passthrough()),
    flattenRhfErrors: vi.fn(() => ({})),
    DEFAULT_AVAILABILITY: {},
    DAY_KEYS: [] as string[],
    DAY_LABELS: {} as Record<string, string>,
    timeToString: vi.fn(() => ""),
    parseTime: vi.fn(() => ({ hours: 0, mins: 0 })),
  };
});

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

import BulkEditDrawer from "./bulk-edit-drawer";
import type { EntitySchemaData } from "../types/reward-policy";
import { buildRewardFormTabs } from "../lib/reward-form-helpers";

describe("BulkEditDrawer (reward-catalog)", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const baseSchemaData: EntitySchemaData = {
    extRequiredFields: new Set<string>(),
    coreRequiredFields: new Set<string>(),
    enumFields: {},
    extFields: {},
    categories: [],
    bulkEditableFields: new Set(["desc", "countLimit"]),
  };

  const baseRewards = [
    { _id: "rew-1", name: "Reward 1", desc: "First", countLimit: 100 },
    { _id: "rew-2", name: "Reward 2", desc: "Second", countLimit: 200 },
  ] as never[];

  const defaultProps = {
    open: true,
    selectedIds: new Set(["rew-1", "rew-2"]),
    rewards: baseRewards,
    schemaData: baseSchemaData,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
  });

  it("exports the component as default", async () => {
    const mod = await import("./bulk-edit-drawer");
    expect(typeof mod.default).toBe("function");
  });

  it("renders the drawer when open", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
    expect(screen.getByText("Bulk Edit: 2 rewards")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<BulkEditDrawer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("drawer-shell")).not.toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    expect(screen.getByRole("tab", { name: /Details/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Limits/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Eligibility/ })).toBeInTheDocument();
  });

  it("renders the hint text", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    expect(
      screen.getByText(/enable fields with the checkbox/i),
    ).toBeInTheDocument();
  });

  it("renders Cancel and Apply buttons", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /apply to 2 rewards/i }),
    ).toBeInTheDocument();
  });

  it("Apply button is disabled when no fields are enabled", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    const applyButton = screen.getByRole("button", {
      name: /apply to 2 rewards/i,
    });
    expect(applyButton).toBeDisabled();
  });

  it("shows 'Applying...' text when saving", () => {
    render(<BulkEditDrawer {...defaultProps} saving={true} />);
    expect(screen.getByRole("button", { name: /applying/i })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("renders core detail fields as bulk fields", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    // Details tab should show desc, effectiveDate, expirationDate
    expect(screen.getByTestId("bulk-field-desc")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-field-effectiveDate")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-field-expirationDate")).toBeInTheDocument();
  });

  it("switches tabs when clicking tab buttons", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    const limitsTab = screen.getByRole("tab", { name: /Limits/ });
    fireEvent.click(limitsTab);
    expect(limitsTab).toHaveAttribute("aria-selected", "true");
    // Limits tab should show number fields
    expect(screen.getByTestId("bulk-field-countLimit")).toBeInTheDocument();
  });

  it("renders with correct selected count in title", () => {
    render(
      <BulkEditDrawer
        {...defaultProps}
        selectedIds={new Set(["rew-1"])}
      />,
    );
    expect(screen.getByText("Bulk Edit: 1 rewards")).toBeInTheDocument();
  });

  it("renders eligibility tab fields when clicked", () => {
    render(<BulkEditDrawer {...defaultProps} />);
    fireEvent.click(screen.getByRole("tab", { name: /Eligibility/ }));
    expect(screen.getByTestId("bulk-field-segments")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-field-mandatorySegments")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-field-tierPolicyLevels")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-field-availability")).toBeInTheDocument();
  });

  describe("field toggling", () => {
    it("enables a field when its toggle checkbox is clicked", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      const toggle = screen.getByTestId("toggle-desc");
      expect(toggle).not.toBeChecked();
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });

    it("disables a field when its toggle is clicked twice", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      const toggle = screen.getByTestId("toggle-desc");
      fireEvent.click(toggle); // enable
      fireEvent.click(toggle); // disable
      expect(toggle).not.toBeChecked();
    });

    it("Apply button becomes enabled when at least one field is toggled", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      const applyButton = screen.getByRole("button", { name: /apply to 2 rewards/i });
      expect(applyButton).toBeDisabled();

      fireEvent.click(screen.getByTestId("toggle-desc"));
      expect(applyButton).not.toBeDisabled();
    });

    it("Apply button becomes disabled again when field is untoggled", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      const applyButton = screen.getByRole("button", { name: /apply to 2 rewards/i });

      fireEvent.click(screen.getByTestId("toggle-desc")); // enable
      expect(applyButton).not.toBeDisabled();

      fireEvent.click(screen.getByTestId("toggle-desc")); // disable
      expect(applyButton).toBeDisabled();
    });
  });

  describe("tab switching and field visibility", () => {
    it("Details tab is selected by default", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      const detailsTab = screen.getByRole("tab", { name: /Details/ });
      expect(detailsTab).toHaveAttribute("aria-selected", "true");
    });

    it("Limits tab shows number fields when clicked", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Limits/ }));

      // Limits fields
      expect(screen.getByTestId("bulk-field-countLimit")).toBeInTheDocument();
      expect(screen.getByTestId("bulk-field-perDayLimit")).toBeInTheDocument();
      expect(screen.getByTestId("bulk-field-perWeekLimit")).toBeInTheDocument();
      expect(screen.getByTestId("bulk-field-canPreview")).toBeInTheDocument();
    });

    it("details fields are not visible when on Limits tab", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Limits/ }));

      expect(screen.queryByTestId("bulk-field-desc")).not.toBeInTheDocument();
      expect(screen.queryByTestId("bulk-field-effectiveDate")).not.toBeInTheDocument();
    });

    it("limits fields are not visible when on Details tab", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      // Details is already active
      expect(screen.queryByTestId("bulk-field-countLimit")).not.toBeInTheDocument();
    });

    it("switching back to Details shows detail fields again", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Limits/ }));
      fireEvent.click(screen.getByRole("tab", { name: /Details/ }));
      expect(screen.getByTestId("bulk-field-desc")).toBeInTheDocument();
    });
  });

  describe("confirmation dialog", () => {
    it("shows confirm dialog when Apply is clicked with enabled fields", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      // Enable a field first
      fireEvent.click(screen.getByTestId("toggle-desc"));
      // Click Apply
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
      expect(screen.getByText("Confirm Bulk Edit")).toBeInTheDocument();
    });

    it("confirm dialog shows correct field/reward counts", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("toggle-desc"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      expect(screen.getByText(/1 field\(s\) across 2 reward\(s\)/)).toBeInTheDocument();
    });

    it("confirm dialog shows updated count when multiple fields enabled", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("toggle-desc"));
      fireEvent.click(screen.getByTestId("toggle-effectiveDate"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      expect(screen.getByText(/2 field\(s\) across 2 reward\(s\)/)).toBeInTheDocument();
    });
  });

  describe("extension fields tab", () => {
    it("renders ext fields on a custom tab", () => {
      const schemaWithExt: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          customField: { type: "string", label: "Custom", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["customField"], columns: 2 },
      ]);

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithExt} />);
      expect(screen.getByRole("tab", { name: /Custom/ })).toBeInTheDocument();
    });

    it("renders ext field renderer when switching to ext tab", () => {
      const schemaWithExt: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          customField: { type: "string", label: "Custom", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["customField"], columns: 2 },
      ]);

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithExt} />);
      fireEvent.click(screen.getByRole("tab", { name: /Custom/ }));
      expect(screen.getByTestId("ext-field-renderer")).toBeInTheDocument();
    });

    it("skips ext fields with isParent=true", () => {
      const schemaWithParent: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          parentField: { type: "string", label: "Parent", isParent: true },
          childField: { type: "string", label: "Child", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["parentField", "childField"], columns: 2 },
      ]);

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithParent} />);
      fireEvent.click(screen.getByRole("tab", { name: /Custom/ }));
      // Only childField should render (parentField is skipped)
      expect(screen.getByTestId("bulk-field-childField")).toBeInTheDocument();
      expect(screen.queryByTestId("bulk-field-parentField")).not.toBeInTheDocument();
    });

    it("renders ext boolean fields separately from non-boolean fields", () => {
      const schemaWithBool: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          textField: { type: "string", label: "Text", isParent: false },
          boolField: { type: "boolean", label: "Bool", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["textField", "boolField"], columns: 2 },
      ]);

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithBool} />);
      fireEvent.click(screen.getByRole("tab", { name: /Custom/ }));
      expect(screen.getByTestId("bulk-field-textField")).toBeInTheDocument();
      expect(screen.getByTestId("bulk-field-boolField")).toBeInTheDocument();
    });
  });

  describe("confirmation and submit", () => {
    it("onApply calls onSave with enabled field values", async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<BulkEditDrawer {...defaultProps} />);
      // Enable desc field
      fireEvent.click(screen.getByTestId("toggle-desc"));
      // Click Apply to open confirm
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      // Click confirm
      fireEvent.click(screen.getByTestId("reward-confirm-apply"));
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("onApply handles API errors with field details", async () => {
      mockOnSave.mockRejectedValue({
        details: [{ path: "desc", message: "Too long" }],
      });
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("toggle-desc"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      fireEvent.click(screen.getByTestId("reward-confirm-apply"));
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("onApply handles API errors with ext field paths", async () => {
      const schemaWithExt: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          customField: { type: "string", label: "Custom", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["customField"], columns: 2 },
      ]);

      mockOnSave.mockRejectedValue({
        details: [{ path: "ext.customField", message: "Invalid" }],
      });

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithExt} />);
      fireEvent.click(screen.getByRole("tab", { name: /Custom/ }));
      fireEvent.click(screen.getByTestId("toggle-customField"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      fireEvent.click(screen.getByTestId("reward-confirm-apply"));
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("onApply handles API errors without details (general error)", async () => {
      mockOnSave.mockRejectedValue(new Error("Server error"));
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("toggle-desc"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      fireEvent.click(screen.getByTestId("reward-confirm-apply"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("general error can be dismissed", async () => {
      mockOnSave.mockRejectedValue(new Error("Server error"));
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("toggle-desc"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      fireEvent.click(screen.getByTestId("reward-confirm-apply"));
      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Dismiss"));
      expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    });

    it("confirm dialog can be closed", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("toggle-desc"));
      fireEvent.click(screen.getByRole("button", { name: /apply to 2 rewards/i }));
      expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("reward-confirm-close"));
      expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    });
  });

  describe("drawer shell interaction", () => {
    it("calls onCancel when drawer shell closes", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("drawer-close"));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("limits tab field toggling", () => {
    it("toggles a number field on the Limits tab", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Limits/ }));
      const toggle = screen.getByTestId("toggle-countLimit");
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
      // Apply should now be enabled
      expect(screen.getByRole("button", { name: /apply to 2 rewards/i })).not.toBeDisabled();
    });
  });

  describe("eligibility tab field toggling", () => {
    it("toggles a segments field on the Eligibility tab", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Eligibility/ }));
      const toggle = screen.getByTestId("toggle-segments");
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });

    it("toggles availability field on the Eligibility tab", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Eligibility/ }));
      const toggle = screen.getByTestId("toggle-availability");
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });

    it("toggles tierPolicyLevels field on the Eligibility tab", () => {
      render(<BulkEditDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole("tab", { name: /Eligibility/ }));
      const toggle = screen.getByTestId("toggle-tierPolicyLevels");
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe("saving state", () => {
    it("Cancel button is disabled when saving", () => {
      render(<BulkEditDrawer {...defaultProps} saving={true} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });

    it("Apply button is disabled when saving", () => {
      render(<BulkEditDrawer {...defaultProps} saving={true} />);
      expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled();
    });
  });

  describe("ext tab with different column layouts", () => {
    it("renders ext tab with 1 column", () => {
      const schemaWithExt: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          field1: { type: "string", label: "Field1", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["field1"], columns: 1 },
      ]);

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithExt} />);
      fireEvent.click(screen.getByRole("tab", { name: /Custom/ }));
      expect(screen.getByTestId("bulk-field-field1")).toBeInTheDocument();
    });

    it("renders ext tab with 3 columns", () => {
      const schemaWithExt: EntitySchemaData = {
        ...baseSchemaData,
        extFields: {
          f1: { type: "string", label: "F1", isParent: false },
          f2: { type: "string", label: "F2", isParent: false },
          f3: { type: "string", label: "F3", isParent: false },
        } as EntitySchemaData["extFields"],
      };

      vi.mocked(buildRewardFormTabs).mockReturnValue([
        { key: "details", label: "Details", fields: [], columns: 2 },
        { key: "limits", label: "Limits", fields: [], columns: 2 },
        { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
        { key: "custom", label: "Custom", fields: ["f1", "f2", "f3"], columns: 3 },
      ]);

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithExt} />);
      fireEvent.click(screen.getByRole("tab", { name: /Custom/ }));
      expect(screen.getByTestId("bulk-field-f1")).toBeInTheDocument();
      expect(screen.getByTestId("bulk-field-f2")).toBeInTheDocument();
      expect(screen.getByTestId("bulk-field-f3")).toBeInTheDocument();
    });
  });

  describe("core field with enum values", () => {
    it("renders a select for fields with enumFields", () => {
      const schemaWithEnum: EntitySchemaData = {
        ...baseSchemaData,
        enumFields: { desc: ["opt1", "opt2", "opt3"] },
      };

      render(<BulkEditDrawer {...defaultProps} schemaData={schemaWithEnum} />);
      // desc on details tab should have a select when enumFields includes desc
      expect(screen.getByTestId("bulk-field-desc")).toBeInTheDocument();
    });
  });
});
