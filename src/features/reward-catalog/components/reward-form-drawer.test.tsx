import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, userEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

// UnsavedChangesDialog mock that exposes onDiscard and onCancel
vi.mock("@/shared/components/unsaved-changes-dialog", () => ({
  UnsavedChangesDialog: ({ open, onDiscard, onCancel }: { open: boolean; onDiscard: () => void; onCancel: () => void }) =>
    open ? (
      <div data-testid="unsaved-dialog">
        <button data-testid="reward-form-unsaved-discard" aria-label="Discard changes" onClick={onDiscard}>Discard</button>
        <button data-testid="reward-form-unsaved-cancel" aria-label="Stay and keep editing" onClick={onCancel}>Stay</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/drawer-shell", () => ({
  DrawerShell: ({ open, children, title, onOpenChange }: { open: boolean; children: React.ReactNode; title: string; onOpenChange?: (v: boolean) => void }) =>
    open ? (
      <div data-testid="drawer-shell">
        <h2>{title}</h2>
        {onOpenChange && <button data-testid="drawer-close-btn" onClick={() => onOpenChange(false)}>X</button>}
        {children}
      </div>
    ) : null,
}));

vi.mock("@/shared/components/multi-select", () => ({
  MultiSelect: () => <div data-testid="multi-select" />,
}));

vi.mock("@/shared/components/select", () => ({
  Select: () => <div data-testid="select" />,
}));

vi.mock("@/shared/lib/focus-utils", () => ({
  handleAutoSelectOnFocus: vi.fn(),
}));

vi.mock("./reward-ext-fields", () => ({
  ExtTabBody: () => <div data-testid="ext-tab-body" />,
}));

// jsdom does not implement Element.prototype.scrollTo
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

const mockSchemaData = {
  extRequiredFields: new Set<string>(),
  coreRequiredFields: new Set(["name"]),
  enumFields: {} as Record<string, string[]>,
  extFields: {} as Record<string, unknown>,
  categories: [],
  bulkEditableFields: new Set<string>(),
  warnings: undefined as string[] | undefined,
};

vi.mock("../hooks/use-reward-schema", () => ({
  useRewardSchema: vi.fn(() => ({
    data: mockSchemaData,
    isLoading: false,
    isError: false,
    isSuccess: true,
  })),
}));

vi.mock("../hooks/use-reward-eligibility", () => ({
  useSegmentOptions: vi.fn(() => ({ options: [], isLoading: false })),
  useTierPolicyOptions: vi.fn(() => ({ options: [], isLoading: false })),
}));

vi.mock("../lib/reward-defaults", () => ({
  createDefaultRewardCatalogItem: vi.fn(() => ({
    _id: "",
    name: "",
    desc: "",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    expirationDate: "2027-01-01T00:00:00.000Z",
    segments: [],
    mandatorySegments: [],
    tierPolicyLevels: [],
    ext: { _meta: {} },
  })),
}));

vi.mock("../lib/reward-form-helpers", () => {
  const { z } = require("zod");
  return {
    CORE_TAB_KEYS: ["details", "limits", "eligibility"],
    buildRewardFormTabs: vi.fn(() => [
      { key: "details", label: "Details", fields: [], columns: 2 },
      { key: "limits", label: "Limits", fields: [], columns: 2 },
      { key: "eligibility", label: "Eligibility", fields: [], columns: 2 },
    ]),
    buildFieldTabMap: vi.fn(() => ({ name: "details", desc: "details" })),
    firstTabWithError: vi.fn(() => null),
    tabErrorCounts: vi.fn(() => ({})),
    buildRewardZodSchema: vi.fn(() => z.object({
      name: z.string().min(1, "Name is required"),
      desc: z.string().optional(),
      effectiveDate: z.string().optional(),
      expirationDate: z.string().optional(),
      countLimit: z.number().optional(),
      perDayLimit: z.number().optional(),
      perWeekLimit: z.number().optional(),
      perOfferLimit: z.number().optional(),
      transactionLimit: z.number().optional(),
      coolOffPeriod: z.number().optional(),
      numUses: z.number().optional(),
      canPreview: z.boolean().optional(),
      segments: z.array(z.string()).optional(),
      mandatorySegments: z.array(z.string()).optional(),
      tierPolicyLevels: z.array(z.unknown()).optional(),
      availability: z.unknown().optional(),
      ext: z.unknown().optional(),
    })),
    buildRewardDefaultValues: vi.fn(() => ({
      name: "",
      desc: "",
      effectiveDate: "2026-01-01",
      expirationDate: "2027-01-01",
      countLimit: 0,
      perDayLimit: 0,
      perWeekLimit: 0,
      perOfferLimit: 0,
      transactionLimit: 0,
      coolOffPeriod: 0,
      numUses: 1,
      canPreview: false,
      segments: [],
      mandatorySegments: [],
      tierPolicyLevels: [],
      availability: {},
      ext: {},
    })),
    flattenRhfErrors: vi.fn(() => ({})),
    buildExtFromValues: vi.fn(() => ({ rewardCostCore: "10" })),
    timeToString: vi.fn(() => "00:00"),
    parseTime: vi.fn(() => ({ hours: 0, mins: 0 })),
    DEFAULT_AVAILABILITY: {},
    DAY_KEYS: [],
    DAY_LABELS: {},
  };
});

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

import RewardFormDrawer from "./reward-form-drawer";
import { useRewardSchema } from "../hooks/use-reward-schema";
import { buildRewardDefaultValues, flattenRhfErrors, firstTabWithError } from "../lib/reward-form-helpers";

describe("RewardFormDrawer", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnTabOrderChange = vi.fn();

  const defaultProps = {
    open: true,
    reward: null,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
    nextSortOrder: 1,
    programId: "prog-1",
    orgId: "org-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    mockSchemaData.warnings = undefined;

    // Restore default schema mock after clearAllMocks
    vi.mocked(useRewardSchema).mockReturnValue({
      data: mockSchemaData,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as never);

    vi.mocked(buildRewardDefaultValues).mockReturnValue({
      name: "",
      desc: "",
      effectiveDate: "2026-01-01",
      expirationDate: "2027-01-01",
      countLimit: 0,
      perDayLimit: 0,
      perWeekLimit: 0,
      perOfferLimit: 0,
      transactionLimit: 0,
      coolOffPeriod: 0,
      numUses: 1,
      canPreview: false,
      segments: [],
      mandatorySegments: [],
      tierPolicyLevels: [],
      availability: {},
      ext: {},
    });
  });

  it("exports the component as default", async () => {
    const mod = await import("./reward-form-drawer");
    expect(typeof mod.default).toBe("function");
  });

  it("renders the drawer when open in create mode", () => {
    render(<RewardFormDrawer {...defaultProps} />);
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
    expect(screen.getAllByText("Add Reward").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render when closed", () => {
    render(<RewardFormDrawer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("drawer-shell")).not.toBeInTheDocument();
  });

  it("renders in edit mode with edit title", () => {
    const reward = {
      _id: "rew-1",
      name: "Test Reward",
      desc: "A description",
      effectiveDate: "2026-01-01T00:00:00.000Z",
      expirationDate: "2027-01-01T00:00:00.000Z",
      segments: [],
      mandatorySegments: [],
      tierPolicyLevels: [],
      ext: {},
    } as never;

    render(<RewardFormDrawer {...defaultProps} reward={reward} />);
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
    expect(screen.getByText("Edit: Test Reward")).toBeInTheDocument();
  });

  it("renders tab buttons for each form tab", () => {
    render(<RewardFormDrawer {...defaultProps} />);
    expect(screen.getByRole("tab", { name: /Details/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Limits/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Eligibility/ })).toBeInTheDocument();
  });

  it("renders the Name input field", () => {
    render(<RewardFormDrawer {...defaultProps} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("renders Cancel button", () => {
    render(<RewardFormDrawer {...defaultProps} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("shows loading state when schema is loading", () => {
    vi.mocked(useRewardSchema).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
    } as never);

    render(<RewardFormDrawer {...defaultProps} />);
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error state when schema fails", () => {
    vi.mocked(useRewardSchema).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
    } as never);

    render(<RewardFormDrawer {...defaultProps} />);
    expect(screen.getByTestId("drawer-shell")).toBeInTheDocument();
  });

  it("renders the Details tab as selected by default", () => {
    render(<RewardFormDrawer {...defaultProps} />);
    const detailsTab = screen.getByRole("tab", { name: /Details/ });
    expect(detailsTab).toHaveAttribute("aria-selected", "true");
  });

  it("renders the form with novalidate attribute", () => {
    render(<RewardFormDrawer {...defaultProps} />);
    const form = screen.getByTestId("drawer-shell").querySelector("form");
    expect(form).toHaveAttribute("novalidate");
  });

  describe("tab switching", () => {
    it("switches to Limits tab when clicked", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);

      const limitsTab = screen.getByRole("tab", { name: /Limits/ });
      await user.click(limitsTab);
      expect(limitsTab).toHaveAttribute("aria-selected", "true");
    });

    it("switches to Eligibility tab when clicked", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);

      const eligibilityTab = screen.getByRole("tab", { name: /Eligibility/ });
      await user.click(eligibilityTab);
      expect(eligibilityTab).toHaveAttribute("aria-selected", "true");
    });

    it("Details tab is deselected when switching to Limits", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);

      await user.click(screen.getByRole("tab", { name: /Limits/ }));
      const detailsTab = screen.getByRole("tab", { name: /Details/ });
      expect(detailsTab).toHaveAttribute("aria-selected", "false");
    });

    it("switches tab on ArrowRight keydown in tablist", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowRight" });
      expect(screen.getByRole("tab", { name: /Limits/ })).toHaveAttribute("aria-selected", "true");
    });

    it("switches tab on ArrowLeft keydown in tablist (wraps around)", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      const tablist = screen.getByRole("tablist");
      // Details is at index 0, ArrowLeft wraps to Eligibility (index 2)
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });
      expect(screen.getByRole("tab", { name: /Eligibility/ })).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Cancel button behavior", () => {
    it("calls onCancel when Cancel is clicked and form is not dirty", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Save button", () => {
    it("renders a submit button in create mode with 'Add Reward' label", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      const submitBtn = screen.getByRole("button", { name: /add reward/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).toHaveAttribute("type", "submit");
    });

    it("shows Saving text when saving prop is true", () => {
      render(<RewardFormDrawer {...defaultProps} saving={true} />);
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("shows 'Save Changes' in edit mode", () => {
      const reward = {
        _id: "rew-1",
        name: "Test",
        desc: "",
        effectiveDate: "2026-01-01T00:00:00.000Z",
        expirationDate: "2027-01-01T00:00:00.000Z",
        segments: [],
        mandatorySegments: [],
        tierPolicyLevels: [],
        ext: {},
      } as never;
      render(<RewardFormDrawer {...defaultProps} reward={reward} />);
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });
  });

  describe("schema error banner", () => {
    it("shows schema warning banner when schema fails", () => {
      vi.mocked(useRewardSchema).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isSuccess: false,
      } as never);

      render(<RewardFormDrawer {...defaultProps} />);
      const alerts = screen.getAllByRole("alert");
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe("schema warnings", () => {
    it("renders schema warnings when present", () => {
      mockSchemaData.warnings = ["Warning 1", "Warning 2"];
      render(<RewardFormDrawer {...defaultProps} />);
      expect(screen.getByText("Warning 1")).toBeInTheDocument();
      expect(screen.getByText("Warning 2")).toBeInTheDocument();
    });
  });

  describe("form fields", () => {
    it("renders description textarea on Details tab", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("renders effective date field on Details tab", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
    });

    it("renders expiration date field on Details tab", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument();
    });
  });

  describe("Limits tab", () => {
    it("renders number fields on the Limits tab", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);
      await user.click(screen.getByRole("tab", { name: "Limits" }));
      expect(screen.getByText(/starting inventory/i)).toBeInTheDocument();
      expect(screen.getByText(/per-day limit/i)).toBeInTheDocument();
      expect(screen.getByText(/per-week limit/i)).toBeInTheDocument();
      expect(screen.getByText(/per-offer limit/i)).toBeInTheDocument();
      expect(screen.getByText(/per-transaction usage limit/i)).toBeInTheDocument();
      expect(screen.getByText(/cool-off period/i)).toBeInTheDocument();
      expect(screen.getByText(/uses per issuance/i)).toBeInTheDocument();
    });

    it("renders Show in Preview switch on the Limits tab", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);
      await user.click(screen.getByRole("tab", { name: /Limits/ }));
      expect(screen.getByText("Show in Preview")).toBeInTheDocument();
    });
  });

  describe("Eligibility tab", () => {
    it("renders segments and mandatory segments selects", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);
      await user.click(screen.getByRole("tab", { name: /Eligibility/ }));
      expect(screen.getByText("Segments")).toBeInTheDocument();
      expect(screen.getByText("Mandatory Segments")).toBeInTheDocument();
    });

    it("renders tier levels section", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);
      await user.click(screen.getByRole("tab", { name: /Eligibility/ }));
      expect(screen.getByText("Tier Levels")).toBeInTheDocument();
    });

    it("shows 'No tier policies available' when empty", async () => {
      const user = userEvent.setup();
      render(<RewardFormDrawer {...defaultProps} />);
      await user.click(screen.getByRole("tab", { name: /Eligibility/ }));
      expect(screen.getByText("No tier policies available")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls onSave with payload on submit in create mode", async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      render(<RewardFormDrawer {...defaultProps} />);

      // Fill name to pass validation
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "My Reward");

      const submitBtn = screen.getByRole("button", { name: /add reward/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("calls onSave with update payload in edit mode", async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      vi.mocked(buildRewardDefaultValues).mockReturnValue({
        name: "Existing Reward",
        desc: "Desc",
        effectiveDate: "2026-01-01",
        expirationDate: "2027-01-01",
        countLimit: 0,
        perDayLimit: 0,
        perWeekLimit: 0,
        perOfferLimit: 0,
        transactionLimit: 0,
        coolOffPeriod: 0,
        numUses: 1,
        canPreview: false,
        segments: [],
        mandatorySegments: [],
        tierPolicyLevels: [],
        availability: {},
        ext: {},
      });

      const reward = {
        _id: "rew-1",
        name: "Existing Reward",
        desc: "Desc",
        effectiveDate: "2026-01-01T00:00:00.000Z",
        expirationDate: "2027-01-01T00:00:00.000Z",
        segments: [],
        mandatorySegments: [],
        tierPolicyLevels: [],
        ext: {},
        extCategories: [],
      } as never;

      render(<RewardFormDrawer {...defaultProps} reward={reward} />);

      // Modify name to make form dirty
      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Updated Reward" } });

      const submitBtn = screen.getByRole("button", { name: /save changes/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const payload = mockOnSave.mock.calls[0]![0];
        expect(payload.name).toBe("Updated Reward");
        expect(payload._id).toBe("rew-1");
      });
    });

    it("handles API error with field details", async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue({
        details: [{ path: "name", message: "Name already exists" }],
      });
      render(<RewardFormDrawer {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Duplicate");

      const submitBtn = screen.getByRole("button", { name: /add reward/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("handles API error with ext. field path", async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue({
        details: [{ path: "ext.customField", message: "Invalid value" }],
      });
      render(<RewardFormDrawer {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Test");

      const submitBtn = screen.getByRole("button", { name: /add reward/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it("handles API error without details (general error)", async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error("Server error"));
      render(<RewardFormDrawer {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Test");

      const submitBtn = screen.getByRole("button", { name: /add reward/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("general error can be dismissed", async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error("Server error"));
      render(<RewardFormDrawer {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Test");

      await user.click(screen.getByRole("button", { name: /add reward/i }));

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Dismiss"));
      expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    });

    it("handles validation error by calling firstTabWithError", async () => {
      const user = userEvent.setup();
      vi.mocked(flattenRhfErrors).mockReturnValue({ name: "Required" });
      vi.mocked(firstTabWithError).mockReturnValue("details");
      render(<RewardFormDrawer {...defaultProps} />);

      // Submit without entering name
      const submitBtn = screen.getByRole("button", { name: /add reward/i });
      await user.click(submitBtn);

      // The validation error handler should be called
      await waitFor(() => {
        expect(flattenRhfErrors).toHaveBeenCalled();
      });
    });
  });

  describe("drawer close behavior", () => {
    it("calls onCancel via drawer shell close when form is clean", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      fireEvent.click(screen.getByTestId("drawer-close-btn"));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("edit mode details", () => {
    it("renders Created and Last Updated fields when editing with dates", () => {
      vi.mocked(buildRewardDefaultValues).mockReturnValue({
        name: "Test Reward",
        desc: "",
        effectiveDate: "2026-01-01",
        expirationDate: "2027-01-01",
        countLimit: 0,
        perDayLimit: 0,
        perWeekLimit: 0,
        perOfferLimit: 0,
        transactionLimit: 0,
        coolOffPeriod: 0,
        numUses: 1,
        canPreview: false,
        segments: [],
        mandatorySegments: [],
        tierPolicyLevels: [],
        availability: {},
        ext: {},
      });

      const reward = {
        _id: "rew-1",
        name: "Test Reward",
        desc: "",
        effectiveDate: "2026-01-01T00:00:00.000Z",
        expirationDate: "2027-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: "admin",
        updatedAt: "2026-01-02T00:00:00.000Z",
        updatedBy: { _id: "u1", login: "editor", empName: "Editor User" },
        segments: [],
        mandatorySegments: [],
        tierPolicyLevels: [],
        ext: {},
      } as never;

      render(<RewardFormDrawer {...defaultProps} reward={reward} />);
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Last Updated")).toBeInTheDocument();
    });
  });

  describe("tablist role", () => {
    it("has a tablist role element", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });
  });

  describe("Ctrl+Tab keyboard shortcut", () => {
    it("switches to next tab on Ctrl+Tab", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      // Ctrl+Tab should move from Details to Limits
      fireEvent.keyDown(window, { key: "Tab", ctrlKey: true });
      expect(screen.getByRole("tab", { name: /Limits/ })).toHaveAttribute("aria-selected", "true");
    });

    it("switches to previous tab on Ctrl+Shift+Tab", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      // Ctrl+Shift+Tab should wrap from Details to Eligibility
      fireEvent.keyDown(window, { key: "Tab", ctrlKey: true, shiftKey: true });
      expect(screen.getByRole("tab", { name: /Eligibility/ })).toHaveAttribute("aria-selected", "true");
    });

    it("does not handle Ctrl+Tab when drawer is closed", () => {
      render(<RewardFormDrawer {...defaultProps} open={false} />);
      fireEvent.keyDown(window, { key: "Tab", ctrlKey: true });
      // No error, nothing to assert since drawer is closed
    });
  });

  describe("tab drag and drop", () => {
    it("handles drag start and drop to reorder tabs", () => {
      render(<RewardFormDrawer {...defaultProps} onTabOrderChange={mockOnTabOrderChange} />);
      const limitsTab = screen.getByRole("tab", { name: /Limits/ });
      const detailsTab = screen.getByRole("tab", { name: /Details/ });

      // Simulate drag start on Details
      fireEvent.dragStart(detailsTab);
      // Simulate drag over on Limits
      fireEvent.dragOver(limitsTab);
      // Simulate drop on Limits
      fireEvent.drop(limitsTab);

      // Tab should not error
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("handles drag end cleanup", () => {
      render(<RewardFormDrawer {...defaultProps} />);
      const detailsTab = screen.getByRole("tab", { name: /Details/ });
      fireEvent.dragStart(detailsTab);
      fireEvent.dragEnd(detailsTab);
      // No error
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });
  });
});
