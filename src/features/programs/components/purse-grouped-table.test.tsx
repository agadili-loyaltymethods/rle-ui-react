import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { PurseGroupedTable } from "./purse-grouped-table";
import type { PurseDisplayEntry } from "../utils/group-purse-policies";

vi.mock("@/shared/components/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
}));

const mockToggleSort = vi.fn();
const mockSetFiltersVisible = vi.fn();
const mockSetColumnFilter = vi.fn();
const mockClearAllFilters = vi.fn();
let mockFiltersVisible = false;
let mockHasActiveFilters = false;

vi.mock("@/shared/hooks/use-client-table", () => ({
  useClientTable: vi.fn(({ items }: { items: unknown[] }) => ({
    sort: null,
    columnFilters: {},
    setColumnFilter: mockSetColumnFilter,
    filtersVisible: mockFiltersVisible,
    setFiltersVisible: mockSetFiltersVisible,
    hasActiveFilters: mockHasActiveFilters,
    clearAllFilters: mockClearAllFilters,
    processedItems: items,
    paginatedItems: items,
    page: 0,
    pageSize: 25,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    toggleSort: mockToggleSort,
  })),
  renderSortIcon: () => null,
}));

const makePursePolicy = (overrides: Partial<import("@/shared/types/policy").PursePolicy> = {}): import("@/shared/types/policy").PursePolicy => ({
  _id: "pp-1",
  name: "Base Points",
  program: "prog-1",
  effectiveDate: "2025-01-01",
  expirationDate: "2026-01-01",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
} as import("@/shared/types/policy").PursePolicy);

const standaloneEntries: PurseDisplayEntry[] = [
  {
    type: "standalone" as const,
    policy: makePursePolicy({
      _id: "pp-1",
      name: "Base Points",
      primary: true,
      ptMultiplier: 1,
      overdraftLimit: 0,
    }),
  },
];

const groupEntries: PurseDisplayEntry[] = [
  {
    type: "group" as const,
    groupName: "Tier Credits",
    policies: [
      makePursePolicy({
        _id: "pp-q1",
        name: "Q1 Credits",
        group: "Tier Credits",
        primary: false,
        ptMultiplier: 1.5,
        periodStartDate: "2025-01-01",
        periodEndDate: "2025-03-31",
      }),
      makePursePolicy({
        _id: "pp-q2",
        name: "Q2 Credits",
        group: "Tier Credits",
        primary: false,
        ptMultiplier: 1.5,
        periodStartDate: "2025-04-01",
        periodEndDate: "2025-06-30",
      }),
    ],
  },
];

const mixedEntries: PurseDisplayEntry[] = [...groupEntries, ...standaloneEntries];

describe("PurseGroupedTable", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleGroup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFiltersVisible = false;
    mockHasActiveFilters = false;
  });

  it("renders a table element", () => {
    const { container } = render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Pt Multiplier")).toBeInTheDocument();
    expect(screen.getByText("Effective Date")).toBeInTheDocument();
    expect(screen.getByText("Expiration Date")).toBeInTheDocument();
    expect(screen.getByText("Overdraft")).toBeInTheDocument();
  });

  it("renders table pagination", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const paginations = screen.getAllByTestId("table-pagination");
    expect(paginations.length).toBeGreaterThanOrEqual(1);
  });

  it("renders standalone entry name", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("Base Points")).toBeInTheDocument();
  });

  it("renders standalone row with Non-qualifying badge", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("Non-qualifying")).toBeInTheDocument();
  });

  it("renders standalone row with test id", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByTestId("purse-row-pp-1")).toBeInTheDocument();
  });

  it("renders group header row", () => {
    render(
      <PurseGroupedTable
        entries={groupEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByTestId("purse-group-Tier Credits")).toBeInTheDocument();
    expect(screen.getByText("Tier Credits")).toBeInTheDocument();
    expect(screen.getByText("Qualifying")).toBeInTheDocument();
    expect(screen.getByText(/2 periods/)).toBeInTheDocument();
  });

  it("calls onToggleGroup when group header is clicked", () => {
    render(
      <PurseGroupedTable
        entries={groupEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    fireEvent.click(screen.getByTestId("purse-group-Tier Credits"));
    expect(mockOnToggleGroup).toHaveBeenCalledWith("Tier Credits");
  });

  it("does not show period sub-rows when group is collapsed", () => {
    render(
      <PurseGroupedTable
        entries={groupEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.queryByTestId("purse-period-pp-q1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("purse-period-pp-q2")).not.toBeInTheDocument();
  });

  it("shows period sub-rows when group is expanded", () => {
    render(
      <PurseGroupedTable
        entries={groupEntries}
        expandedGroups={new Set(["Tier Credits"])}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByTestId("purse-period-pp-q1")).toBeInTheDocument();
    expect(screen.getByTestId("purse-period-pp-q2")).toBeInTheDocument();
    expect(screen.getByText("Q1 Credits")).toBeInTheDocument();
    expect(screen.getByText("Q2 Credits")).toBeInTheDocument();
  });

  it("calls onEdit when edit action is clicked on standalone row", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const actionButtons = screen.getByTestId("purse-actions-pp-1");
    const editButton = actionButtons.querySelector('button[title="Edit"]');
    fireEvent.click(editButton!);
    expect(mockOnEdit).toHaveBeenCalledWith(standaloneEntries[0]!.type === "standalone" ? standaloneEntries[0]!.policy : undefined);
  });

  it("calls onDelete when delete action is clicked on standalone row", () => {
    render(
      <PurseGroupedTable
        entries={standaloneEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const actionButtons = screen.getByTestId("purse-actions-pp-1");
    const deleteButton = actionButtons.querySelector('button[title="Delete"]');
    fireEvent.click(deleteButton!);
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it("renders both groups and standalone entries", () => {
    render(
      <PurseGroupedTable
        entries={mixedEntries}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByTestId("purse-group-Tier Credits")).toBeInTheDocument();
    expect(screen.getByTestId("purse-row-pp-1")).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    render(
      <PurseGroupedTable
        entries={[]}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("No purse policies found.")).toBeInTheDocument();
  });

  it("renders action buttons on expanded period rows", () => {
    render(
      <PurseGroupedTable
        entries={groupEntries}
        expandedGroups={new Set(["Tier Credits"])}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByTestId("purse-actions-pp-q1")).toBeInTheDocument();
    expect(screen.getByTestId("purse-actions-pp-q2")).toBeInTheDocument();
  });

  it("calls onEdit for individual period row", () => {
    render(
      <PurseGroupedTable
        entries={groupEntries}
        expandedGroups={new Set(["Tier Credits"])}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const actionButtons = screen.getByTestId("purse-actions-pp-q1");
    const editButton = actionButtons.querySelector('button[title="Edit"]');
    fireEvent.click(editButton!);
    expect(mockOnEdit).toHaveBeenCalled();
  });

  it("shows singular period count for single-period group", () => {
    const singlePeriodGroup: PurseDisplayEntry[] = [
      {
        type: "group" as const,
        groupName: "Solo",
        policies: [makePursePolicy({ _id: "pp-solo", group: "Solo", periodStartDate: "2025-01-01" })],
      },
    ];
    render(
      <PurseGroupedTable
        entries={singlePeriodGroup}
        expandedGroups={new Set()}
        onToggleGroup={mockOnToggleGroup}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText(/1 period$/)).toBeInTheDocument();
  });

  describe("column sorting", () => {
    it("calls toggleSort when a column header is clicked", () => {
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      fireEvent.click(screen.getByText("Name"));
      expect(mockToggleSort).toHaveBeenCalledWith("name");
    });

    it("calls toggleSort for Type column", () => {
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      fireEvent.click(screen.getByText("Type"));
      expect(mockToggleSort).toHaveBeenCalledWith("type");
    });
  });

  describe("filter toggle button", () => {
    it("calls setFiltersVisible to show filters", () => {
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const filterBtn = screen.getByTitle("Show filters");
      fireEvent.click(filterBtn);
      expect(mockSetFiltersVisible).toHaveBeenCalled();
    });

    it("calls clearAllFilters when filters are visible and active", () => {
      mockFiltersVisible = true;
      mockHasActiveFilters = true;
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const filterBtn = screen.getByTitle("Hide filters");
      fireEvent.click(filterBtn);
      expect(mockClearAllFilters).toHaveBeenCalled();
    });
  });

  describe("filter row inputs", () => {
    it("renders filter inputs when filtersVisible is true", () => {
      mockFiltersVisible = true;
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      expect(screen.getByPlaceholderText("Filter name...")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Filter type...")).toBeInTheDocument();
    });

    it("calls setColumnFilter when a filter input changes", () => {
      mockFiltersVisible = true;
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const filterInput = screen.getByPlaceholderText("Filter name...");
      fireEvent.change(filterInput, { target: { value: "Base" } });
      expect(mockSetColumnFilter).toHaveBeenCalledWith("name", "Base");
    });
  });

  describe("empty state with active filters", () => {
    it("shows filter-specific empty message when hasActiveFilters is true", () => {
      mockHasActiveFilters = true;
      render(
        <PurseGroupedTable
          entries={[]}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      expect(screen.getByText("No purse policies match the current filters.")).toBeInTheDocument();
    });
  });

  describe("clear all filters button in filter row", () => {
    it("renders clear filters button when hasActiveFilters and filtersVisible", () => {
      mockFiltersVisible = true;
      mockHasActiveFilters = true;
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const clearBtn = screen.getByTitle("Clear all filters");
      fireEvent.click(clearBtn);
      expect(mockClearAllFilters).toHaveBeenCalled();
    });
  });

  describe("ActionButtons stopPropagation", () => {
    it("edit click does not trigger group row toggle", () => {
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const actionButtons = screen.getByTestId("purse-actions-pp-1");
      const editButton = actionButtons.querySelector('button[title="Edit"]')!;
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalled();
      // onToggleGroup should NOT have been called (stopPropagation)
      expect(mockOnToggleGroup).not.toHaveBeenCalled();
    });

    it("delete click does not trigger group row toggle", () => {
      render(
        <PurseGroupedTable
          entries={standaloneEntries}
          expandedGroups={new Set()}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const actionButtons = screen.getByTestId("purse-actions-pp-1");
      const deleteButton = actionButtons.querySelector('button[title="Delete"]')!;
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalled();
      expect(mockOnToggleGroup).not.toHaveBeenCalled();
    });
  });

  describe("isPeriodPast rendering", () => {
    it("shows Closed badge for past period in expanded group", () => {
      const pastGroupEntries: PurseDisplayEntry[] = [
        {
          type: "group" as const,
          groupName: "Past Group",
          policies: [
            makePursePolicy({
              _id: "pp-past",
              name: "Past Period",
              group: "Past Group",
              periodStartDate: "2020-01-01",
              periodEndDate: "2020-06-30",
            }),
          ],
        },
      ];
      render(
        <PurseGroupedTable
          entries={pastGroupEntries}
          expandedGroups={new Set(["Past Group"])}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("shows Open badge for future period in expanded group", () => {
      const futureGroupEntries: PurseDisplayEntry[] = [
        {
          type: "group" as const,
          groupName: "Future Group",
          policies: [
            makePursePolicy({
              _id: "pp-future",
              name: "Future Period",
              group: "Future Group",
              periodStartDate: "2025-01-01",
              periodEndDate: "3000-12-31",
            }),
          ],
        },
      ];
      render(
        <PurseGroupedTable
          entries={futureGroupEntries}
          expandedGroups={new Set(["Future Group"])}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });

  describe("period sub-row details", () => {
    it("shows periodCloseDate when present", () => {
      const groupWithClose: PurseDisplayEntry[] = [
        {
          type: "group" as const,
          groupName: "Close Group",
          policies: [
            makePursePolicy({
              _id: "pp-close",
              name: "Has Close",
              group: "Close Group",
              periodStartDate: "2025-01-01",
              periodEndDate: "3000-06-30",
              periodCloseDate: "3000-07-15",
            }),
          ],
        },
      ];
      render(
        <PurseGroupedTable
          entries={groupWithClose}
          expandedGroups={new Set(["Close Group"])}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      expect(screen.getByText(/Close:/)).toBeInTheDocument();
    });

    it("shows periodTimezone when present", () => {
      const groupWithTz: PurseDisplayEntry[] = [
        {
          type: "group" as const,
          groupName: "TZ Group",
          policies: [
            makePursePolicy({
              _id: "pp-tz",
              name: "Has TZ",
              group: "TZ Group",
              periodStartDate: "2025-01-01",
              periodEndDate: "3000-06-30",
              periodTimezone: "America/New_York",
            }),
          ],
        },
      ];
      render(
        <PurseGroupedTable
          entries={groupWithTz}
          expandedGroups={new Set(["TZ Group"])}
          onToggleGroup={mockOnToggleGroup}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      expect(screen.getByText("America/New_York")).toBeInTheDocument();
    });
  });
});
