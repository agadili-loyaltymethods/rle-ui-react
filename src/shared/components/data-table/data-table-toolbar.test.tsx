import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { DataTableToolbar } from "./data-table-toolbar";

function createMockTable(overrides = {}) {
  const columns = [
    {
      id: "name",
      columnDef: { header: "Name" },
      getIsVisible: () => true,
      toggleVisibility: vi.fn(),
      getCanHide: () => true,
      getFilterValue: () => undefined,
      setFilterValue: vi.fn(),
      depth: 0,
      columns: [],
    },
    {
      id: "status",
      columnDef: { header: "Status" },
      getIsVisible: () => false,
      toggleVisibility: vi.fn(),
      getCanHide: () => true,
      getFilterValue: () => undefined,
      setFilterValue: vi.fn(),
      depth: 0,
      columns: [],
    },
  ];
  return {
    getAllColumns: () => columns,
    getAllLeafColumns: () => columns,
    getColumn: (id: string) => columns.find((c) => c.id === id),
    resetColumnFilters: vi.fn(),
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderToolbar(props: Partial<Parameters<typeof DataTableToolbar>[0]> = {}) {
  const defaultProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: createMockTable() as any,
    searchValue: "",
    onSearchChange: vi.fn(),
    density: "comfortable" as const,
    onDensityChange: vi.fn(),
  };
  return render(<DataTableToolbar {...defaultProps} {...props} />);
}

describe("DataTableToolbar", () => {
  it("renders search bar", () => {
    renderToolbar();
    expect(screen.getByTestId("table-search-input")).toBeInTheDocument();
  });

  it("renders density toggle button", () => {
    renderToolbar();
    expect(screen.getByTestId("table-density-toggle")).toBeInTheDocument();
  });

  it("renders export button when onExport is provided", () => {
    renderToolbar({ onExport: vi.fn() });
    expect(screen.getByTestId("table-export")).toBeInTheDocument();
  });

  it("does not render export button when onExport is omitted", () => {
    renderToolbar();
    expect(screen.queryByTestId("table-export")).not.toBeInTheDocument();
  });

  it("calls onDensityChange with 'compact' when current density is 'comfortable'", async () => {
    const onDensityChange = vi.fn();
    renderToolbar({ density: "comfortable", onDensityChange });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("table-density-toggle"));

    expect(onDensityChange).toHaveBeenCalledWith("compact");
  });

  it("calls onDensityChange with 'comfortable' when current density is 'compact'", async () => {
    const onDensityChange = vi.fn();
    renderToolbar({ density: "compact", onDensityChange });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("table-density-toggle"));

    expect(onDensityChange).toHaveBeenCalledWith("comfortable");
  });

  it("applies custom testIdPrefix", () => {
    renderToolbar({ testIdPrefix: "members" });
    expect(screen.getByTestId("members-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("members-density-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("members-search-input")).toBeInTheDocument();
  });

  it("renders active filter chips when columns have filter values", () => {
    const filteredColumn = {
      id: "name",
      columnDef: { header: "Name" },
      getIsVisible: () => true,
      toggleVisibility: vi.fn(),
      getCanHide: () => true,
      getFilterValue: () => "test",
      setFilterValue: vi.fn(),
      depth: 0,
      columns: [],
    };
    const table = createMockTable({
      getAllColumns: () => [filteredColumn],
      getAllLeafColumns: () => [filteredColumn],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToolbar({ table: table as any });

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear Name filter")).toBeInTheDocument();
  });

  it("clears a single filter when clicking the X on a filter chip", async () => {
    const setFilterValue = vi.fn();
    const filteredColumn = {
      id: "name",
      columnDef: { header: "Name" },
      getIsVisible: () => true,
      toggleVisibility: vi.fn(),
      getCanHide: () => true,
      getFilterValue: () => "test",
      setFilterValue,
      depth: 0,
      columns: [],
    };
    const table = createMockTable({
      getAllColumns: () => [filteredColumn],
      getAllLeafColumns: () => [filteredColumn],
      getColumn: () => filteredColumn,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToolbar({ table: table as any });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Clear Name filter"));

    expect(setFilterValue).toHaveBeenCalledWith(undefined);
  });

  it("shows 'Clear all' button and calls resetColumnFilters when more than one filter is active", async () => {
    const filteredColumns = [
      {
        id: "name",
        columnDef: { header: "Name" },
        getIsVisible: () => true,
        toggleVisibility: vi.fn(),
        getCanHide: () => true,
        getFilterValue: () => "test",
        setFilterValue: vi.fn(),
        depth: 0,
        columns: [],
      },
      {
        id: "status",
        columnDef: { header: "Status" },
        getIsVisible: () => true,
        toggleVisibility: vi.fn(),
        getCanHide: () => true,
        getFilterValue: () => "active",
        setFilterValue: vi.fn(),
        depth: 0,
        columns: [],
      },
    ];
    const resetColumnFilters = vi.fn();
    const table = createMockTable({
      getAllColumns: () => filteredColumns,
      getAllLeafColumns: () => filteredColumns,
      resetColumnFilters,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToolbar({ table: table as any });

    const clearAllButton = screen.getByText("Clear all");
    expect(clearAllButton).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(clearAllButton);

    expect(resetColumnFilters).toHaveBeenCalled();
  });

  it("does not show 'Clear all' when only one filter is active", () => {
    const filteredColumn = {
      id: "name",
      columnDef: { header: "Name" },
      getIsVisible: () => true,
      toggleVisibility: vi.fn(),
      getCanHide: () => true,
      getFilterValue: () => "test",
      setFilterValue: vi.fn(),
      depth: 0,
      columns: [],
    };
    const table = createMockTable({
      getAllColumns: () => [filteredColumn],
      getAllLeafColumns: () => [filteredColumn],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToolbar({ table: table as any });

    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("calls onExport when export button is clicked", async () => {
    const onExport = vi.fn();
    renderToolbar({ onExport });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("table-export"));

    expect(onExport).toHaveBeenCalledOnce();
  });

  it("renders correct aria-label for density toggle based on current density", () => {
    const { unmount } = renderToolbar({ density: "comfortable" });
    expect(screen.getByLabelText("Switch to compact view")).toBeInTheDocument();
    unmount();

    renderToolbar({ density: "compact" });
    expect(screen.getByLabelText("Switch to comfortable view")).toBeInTheDocument();
  });
});
