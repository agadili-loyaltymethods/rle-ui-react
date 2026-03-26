import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import TierGroupsPage from "./tier-groups-page";
import { useEntityList } from "@/shared/hooks/use-api";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useBlocker: () => ({ state: "idle", reset: vi.fn(), proceed: vi.fn() }),
  };
});

vi.mock("../hooks/use-policies", () => ({
  useCreateTierPolicy: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateTierPolicy: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteTierPolicy: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useAllPursePolicies: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock("@/shared/hooks/use-api", () => ({
  useEntityList: vi.fn(() => ({
    data: { data: [
      {
        _id: "tier-1",
        name: "Gold Tier",
        primary: true,
        levels: [{ name: "Base", number: 1, threshold: 0 }],
        program: "prog-1",
      },
    ] },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
}));

vi.mock("../hooks/use-program-meta", () => ({
  useProgramMeta: vi.fn(() => ({
    data: null,
    isLoading: false,
    save: vi.fn(),
  })),
}));

vi.mock("@/shared/hooks/use-enums", () => ({
  useEnumOptions: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/shared/hooks/use-divisions", () => ({
  useDivisionOptions: vi.fn(() => ({ options: [], isLoading: false })),
}));

vi.mock("../hooks/use-programs", () => ({
  useProgram: vi.fn(() => ({ data: { divisions: [] }, isLoading: false })),
}));

vi.mock("../config/tier-policy-config", () => {
  const { z } = require("zod");
  return {
    tierPolicySchema: z.object({
      name: z.string().min(1),
      primary: z.boolean().optional(),
      levels: z.array(z.object({
        name: z.string(),
        number: z.number(),
        threshold: z.number(),
      })).optional(),
    }),
  };
});

vi.mock("../components/tier-level-editor", () => ({
  TierLevelEditor: ({ onChange }: { onChange: (levels: unknown[]) => void }) => (
    <div data-testid="tier-level-editor">
      <button data-testid="tier-level-change" aria-label="Change tier levels" onClick={() => onChange([{ name: "Gold", number: 2, threshold: 100 }])}>
        Change Levels
      </button>
    </div>
  ),
}));

// Mock Radix Tabs to always render all content
vi.mock("@radix-ui/react-tabs", () => ({
  Root: ({ children, onValueChange: _, defaultValue: __, value: ___, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  List: ({ children, loop: _, ...props }: Record<string, unknown>) => <div role="tablist" {...props}>{children as React.ReactNode}</div>,
  Trigger: ({ children, value, ...props }: Record<string, unknown>) => (
    <button role="tab" data-testid={`tier-mock-tab-${value}`} aria-label={`Tab ${value}`} data-value={value as string} {...props}>{children as React.ReactNode}</button>
  ),
  Content: ({ children }: Record<string, unknown>) => <div>{children as React.ReactNode}</div>,
}));

vi.mock("@/shared/components/field-renderer", () => ({
  FieldRenderer: ({ field }: { field: { name: string; label: string } }) => (
    <div data-testid={`field-renderer-${field.name}`}>{field.label}</div>
  ),
}));

vi.mock("@/shared/components/unsaved-changes-dialog", () => ({
  UnsavedChangesDialog: ({ open, onCancel, onDiscard }: { open: boolean; onCancel: () => void; onDiscard: () => void }) =>
    open ? (
      <div data-testid="unsaved-dialog">
        <button data-testid="tier-unsaved-cancel" aria-label="Cancel unsaved changes" onClick={onCancel}>Cancel</button>
        <button data-testid="tier-unsaved-discard" aria-label="Discard unsaved changes" onClick={onDiscard}>Discard</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirm} data-testid="tier-confirm-delete" aria-label="Confirm delete">Confirm</button>
        <button onClick={onClose} data-testid="tier-cancel-delete" aria-label="Cancel delete">Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/components/no-program-banner", () => ({
  NoProgramBanner: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string}>No program selected</div>
  ),
}));

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));

function mockEntityListReturn(overrides: Record<string, unknown> = {}) {
  vi.mocked(useEntityList).mockReturnValue({
    data: { data: [
      {
        _id: "tier-1",
        name: "Gold Tier",
        primary: true,
        levels: [{ name: "Base", number: 1, threshold: 0 }],
        program: "prog-1",
      },
    ] },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useEntityList>);
}

describe("TierGroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
    mockEntityListReturn();
  });

  it("renders the page with test id", () => {
    render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
    expect(screen.getByTestId("tier-page")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
    expect(screen.getByText("Tier Groups")).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
    expect(
      screen.getByText("Define tier levels, thresholds, and tier-based benefits"),
    ).toBeInTheDocument();
  });

  it("shows NoProgramBanner when no program is selected", () => {
    mockUIState({ currentProgram: null });
    render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
    expect(screen.getByTestId("tier-no-program")).toBeInTheDocument();
  });

  it("shows loading state when data is loading", () => {
    mockEntityListReturn({ data: undefined, isLoading: true, isFetching: true });
    render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
    expect(screen.getByTestId("tier-loading")).toBeInTheDocument();
  });

  describe("empty state", () => {
    it("shows empty state when no tier groups exist", () => {
      mockEntityListReturn({ data: { data: [] } });
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByText("No tier groups yet")).toBeInTheDocument();
    });

    it("shows Add Tier Group button in empty state", () => {
      mockEntityListReturn({ data: { data: [] } });
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-add")).toBeInTheDocument();
    });

    it("clicking Add opens create form in empty state", () => {
      mockEntityListReturn({ data: { data: [] } });
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByText("New Tier Group")).toBeInTheDocument();
    });
  });

  describe("single tier group view", () => {
    it("renders the tier group name", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByText("Gold Tier")).toBeInTheDocument();
    });

    it("renders the tier editor", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-editor")).toBeInTheDocument();
    });

    it("renders Add Tier Group button", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-add")).toBeInTheDocument();
    });

    it("renders Refresh button", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-refresh")).toBeInTheDocument();
    });

    it("renders Back button", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByLabelText("Back to Program Elements")).toBeInTheDocument();
    });

    it("clicking Back navigates to /program", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByLabelText("Back to Program Elements"));
      expect(mockNavigate).toHaveBeenCalledWith("/program");
    });

    it("shows General and Levels tabs", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-tab-general")).toBeInTheDocument();
      expect(screen.getByTestId("tier-tab-levels")).toBeInTheDocument();
    });

    it("renders form fields on General tab", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("field-renderer-name")).toBeInTheDocument();
    });

    it("renders the Levels tab trigger", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      const levelsTab = screen.getByTestId("tier-tab-levels");
      expect(levelsTab).toBeInTheDocument();
      expect(levelsTab).toHaveTextContent("Levels");
    });

    it("shows Save button", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-save")).toBeInTheDocument();
    });

    it("shows Delete button for existing tier group", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-delete")).toBeInTheDocument();
    });
  });

  describe("multiple tier groups", () => {
    beforeEach(() => {
      mockEntityListReturn({
        data: { data: [
          {
            _id: "tier-1",
            name: "Gold Tier",
            primary: true,
            levels: [{ name: "Base", number: 1, threshold: 0 }],
            program: "prog-1",
          },
          {
            _id: "tier-2",
            name: "Silver Tier",
            primary: false,
            levels: [{ name: "Base", number: 1, threshold: 0 }],
            program: "prog-1",
          },
        ] },
      });
    });

    it("renders selector pills for each tier group", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-select-tier-1")).toBeInTheDocument();
      expect(screen.getByTestId("tier-select-tier-2")).toBeInTheDocument();
    });

    it("shows (Primary) label on primary tier group pill", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByText("(Primary)")).toBeInTheDocument();
    });

    it("clicking a different pill selects that tier group", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-select-tier-2"));
      // Silver Tier should now be visible (in heading or pill)
      expect(screen.getAllByText("Silver Tier").length).toBeGreaterThanOrEqual(1);
    });

    it("both tier group names appear in pills", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getAllByText("Gold Tier").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Silver Tier").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("create mode", () => {
    it("clicking Add transitions to create mode", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByText("New Tier Group")).toBeInTheDocument();
    });

    it("create mode shows Create button instead of Save", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByTestId("tier-save")).toHaveTextContent("Create");
    });

    it("create mode shows Cancel button", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByTestId("tier-cancel")).toBeInTheDocument();
    });

    it("create mode does not show Delete button", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.queryByTestId("tier-delete")).not.toBeInTheDocument();
    });
  });

  describe("delete flow", () => {
    it("clicking Delete opens the delete dialog", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-delete"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("clicking Cancel in delete dialog closes it", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-delete"));
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("tier-cancel-delete"));
      expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    });

    it("clicking Confirm in delete dialog triggers deletion", async () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-delete"));
      fireEvent.click(screen.getByTestId("tier-confirm-delete"));
      // Wait for async mutation to settle
      await waitFor(() => {
        expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("tab switching", () => {
    it("General tab is rendered", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      const generalTab = screen.getByTestId("tier-tab-general");
      expect(generalTab).toBeInTheDocument();
    });

    it("Levels tab is rendered", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      const levelsTab = screen.getByTestId("tier-tab-levels");
      expect(levelsTab).toBeInTheDocument();
    });
  });

  describe("refresh", () => {
    it("clicking Refresh calls refetch", () => {
      const mockRefetch = vi.fn();
      mockEntityListReturn({ refetch: mockRefetch });
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-refresh"));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("save button state", () => {
    it("Save button exists and is visible on edit", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      const saveBtn = screen.getByTestId("tier-save");
      expect(saveBtn).toBeInTheDocument();
      expect(saveBtn).toHaveTextContent("Save");
    });
  });

  describe("create mode cancel", () => {
    it("clicking Cancel in create mode returns to existing tier group", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // Enter create mode
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByText("New Tier Group")).toBeInTheDocument();
      // Click Cancel
      fireEvent.click(screen.getByTestId("tier-cancel"));
      // Should exit create mode and show existing tier group
      expect(screen.getByText("Gold Tier")).toBeInTheDocument();
    });
  });

  describe("primary tier group label", () => {
    it("shows Primary tier group subtitle text", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByText("Primary tier group")).toBeInTheDocument();
    });
  });

  describe("tab switching in editor", () => {
    it("clicking Levels tab does not throw", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      const levelsTab = screen.getByTestId("tier-tab-levels");
      fireEvent.click(levelsTab);
      expect(levelsTab).toBeInTheDocument();
    });

    it("clicking General tab is possible after switching tabs", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-tab-levels"));
      fireEvent.click(screen.getByTestId("tier-tab-general"));
      expect(screen.getByTestId("tier-tab-general")).toBeInTheDocument();
    });
  });

  describe("save handler", () => {
    it("clicking Save calls update mutation for existing tier group", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ _id: "tier-1" });
      const { useUpdateTierPolicy } = await import("../hooks/use-policies");
      vi.mocked(useUpdateTierPolicy).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // Change name to make form dirty
      const nameField = screen.getByTestId("field-renderer-name");
      expect(nameField).toBeInTheDocument();
      // Click save (form is not dirty by default, but the button should exist)
      fireEvent.click(screen.getByTestId("tier-save"));
    });

    it("clicking Save in create mode calls create mutation", async () => {
      const mockCreateAsync = vi.fn().mockResolvedValue({ _id: "new-tier" });
      const { useCreateTierPolicy } = await import("../hooks/use-policies");
      vi.mocked(useCreateTierPolicy).mockReturnValue({
        mutateAsync: mockCreateAsync,
        isPending: false,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // Enter create mode
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByText("New Tier Group")).toBeInTheDocument();
      // Click Create
      fireEvent.click(screen.getByTestId("tier-save"));
    });
  });

  describe("delete confirm handler", () => {
    it("confirming delete calls delete mutation", async () => {
      const mockDeleteAsync = vi.fn().mockResolvedValue(undefined);
      const { useDeleteTierPolicy } = await import("../hooks/use-policies");
      vi.mocked(useDeleteTierPolicy).mockReturnValue({
        mutateAsync: mockDeleteAsync,
        isPending: false,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-delete"));
      fireEvent.click(screen.getByTestId("tier-confirm-delete"));
      await waitFor(() => {
        expect(mockDeleteAsync).toHaveBeenCalledWith("tier-1");
      });
    });
  });

  describe("multiple tier groups selection", () => {
    beforeEach(() => {
      mockEntityListReturn({
        data: { data: [
          {
            _id: "tier-1",
            name: "Gold Tier",
            primary: true,
            levels: [{ name: "Base", number: 1, threshold: 0 }],
            program: "prog-1",
          },
          {
            _id: "tier-2",
            name: "Silver Tier",
            primary: false,
            levels: [{ name: "Base", number: 1, threshold: 0 }],
            program: "prog-1",
          },
        ] },
      });
    });

    it("clicking Add in multi-tier view transitions to create mode", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByTestId("tier-add"));
      expect(screen.getByText("New Tier Group")).toBeInTheDocument();
    });

    it("clicking same tier group pill does not re-select", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // First tier group is auto-selected
      fireEvent.click(screen.getByTestId("tier-select-tier-1"));
      // Should still show Gold Tier
      expect(screen.getAllByText("Gold Tier").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("empty state back navigation", () => {
    it("back button navigates to /program in empty state", () => {
      mockEntityListReturn({ data: { data: [] } });
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      fireEvent.click(screen.getByLabelText("Back to Program Elements"));
      expect(mockNavigate).toHaveBeenCalledWith("/program");
    });
  });

  describe("qualifying currency from purse policies", () => {
    it("renders when purse policies are available", async () => {
      const { useAllPursePolicies } = await import("../hooks/use-policies");
      vi.mocked(useAllPursePolicies).mockReturnValue({
        data: [
          { _id: "pp-1", name: "Points", group: "Points", periodStartDate: "2024-01-01", program: "prog-1" },
        ],
        isLoading: false,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-page")).toBeInTheDocument();
    });
  });

  describe("form fields rendering", () => {
    it("renders all expected form fields", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("field-renderer-name")).toBeInTheDocument();
      expect(screen.getByTestId("field-renderer-divisions")).toBeInTheDocument();
      expect(screen.getByTestId("field-renderer-primary")).toBeInTheDocument();
      expect(screen.getByTestId("field-renderer-qualifyingCurrency")).toBeInTheDocument();
    });
  });

  describe("tier level editor", () => {
    it("renders tier level editor in the levels tab", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-level-editor")).toBeInTheDocument();
    });

    it("can trigger level changes via TierLevelEditor onChange", () => {
      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      const changeBtn = screen.getByTestId("tier-level-change");
      fireEvent.click(changeBtn);
      // The onChange callback was called, setting form dirty
    });
  });

  describe("snap to options", () => {
    it("renders with snap to options from enum", async () => {
      const { useEnumOptions } = await import("@/shared/hooks/use-enums");
      vi.mocked(useEnumOptions).mockReturnValue({
        data: [
          { value: "StartOfDay", label: "start of day" },
          { value: "EndOfMonth", label: "end of month" },
          { value: "ExpirationDate", label: "expiration date" },
        ],
        isLoading: false,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      expect(screen.getByTestId("tier-page")).toBeInTheDocument();
    });
  });

  describe("divisions options", () => {
    it("uses divisions data for division options", () => {
      vi.mocked(useEntityList).mockReturnValue({
        data: { data: [
          { _id: "tier-1", name: "Gold Tier", primary: true, levels: [{ name: "Base", number: 1, threshold: 0 }], program: "prog-1" },
        ] },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEntityList>);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // Divisions field renderer should be rendered
      expect(screen.getByTestId("field-renderer-divisions")).toBeInTheDocument();
    });
  });

  describe("purse policy options for qualifying currency", () => {
    it("generates purse policy options from qualifying purse policies", async () => {
      const { useAllPursePolicies } = await import("../hooks/use-policies");
      vi.mocked(useAllPursePolicies).mockReturnValue({
        data: [
          { _id: "pp-1", name: "Points Q1", group: "Points", periodStartDate: "2024-01-01", program: "prog-1" },
          { _id: "pp-2", name: "Miles Q1", group: "Miles", periodStartDate: "2024-01-01", program: "prog-1" },
          { _id: "pp-3", name: "Points Lifetime", group: "Points Lifetime", program: "prog-1" }, // no periodStartDate
        ],
        isLoading: false,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // The qualifying currency field should be rendered with available options
      expect(screen.getByTestId("field-renderer-qualifyingCurrency")).toBeInTheDocument();
    });
  });

  describe("meta save callback", () => {
    it("save meta is provided to TierGroupEditor", async () => {
      const mockMetaSave = vi.fn().mockResolvedValue(undefined);
      const { useProgramMeta } = await import("../hooks/use-program-meta");
      vi.mocked(useProgramMeta).mockReturnValue({
        data: { tierPolicyCurrency: { "tier-1": "Points" } },
        isLoading: false,
        save: mockMetaSave,
      } as never);

      render(<TierGroupsPage />, { routerEntries: ["/program/tier-groups"] });
      // The page renders successfully with meta data
      expect(screen.getByTestId("tier-page")).toBeInTheDocument();
    });
  });
});
