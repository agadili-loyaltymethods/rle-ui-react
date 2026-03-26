import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, within, fireEvent } from "@/test-utils";
import { ServerTable, type ServerTableProps } from "./server-table";
import type { ColumnDescriptor } from "@/features/reference-data/shared/lib/build-columns";
import type { ChooserState } from "@/shared/hooks/use-column-chooser";
import { createRef } from "react";

// Mock the build-columns module to avoid importing the full dependency tree
vi.mock("@/features/reference-data/shared/lib/build-columns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/reference-data/shared/lib/build-columns")>();
  return {
    ...actual,
    getColumnValue: (entity: Record<string, unknown>, col: { key: string }) => entity[col.key],
    formatCellValue: (value: unknown) => (value == null ? "" : String(value)),
  };
});

type TestEntity = { _id: string; name: string; status: string; count: number };

function makeColumns(): ColumnDescriptor[] {
  return [
    {
      key: "name",
      label: "Name",
      type: "string",
      sortable: true,
      defaultVisible: true,
      filterable: true,
      source: "core",
      corePath: "name",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      sortable: true,
      defaultVisible: true,
      cellRenderer: "status-badge",
      filterable: true,
      source: "core",
      corePath: "status",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      sortable: true,
      defaultVisible: true,
      filterable: true,
      source: "core",
      corePath: "count",
    },
  ] as ColumnDescriptor[];
}

function makeSampleData(): TestEntity[] {
  return [
    { _id: "1", name: "Item A", status: "active", count: 100 },
    { _id: "2", name: "Item B", status: "inactive", count: 200 },
    { _id: "3", name: "Item C", status: "pending", count: 300 },
  ];
}

function makeChooser(): ChooserState {
  return {
    open: false,
    search: "",
    setSearch: vi.fn(),
    pos: null,
    panelRef: createRef(),
    btnRef: createRef(),
    searchRef: createRef(),
    dragOverCol: null,
    openChooser: vi.fn(),
    toggleColumn: vi.fn(),
    setAllVisible: vi.fn(),
    invertColumns: vi.fn(),
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
    handleDragEnd: vi.fn(),
  };
}

function renderServerTable(overrides?: Partial<ServerTableProps<TestEntity>>) {
  const defaultProps: ServerTableProps<TestEntity> = {
    data: makeSampleData(),
    activeColumns: makeColumns(),
    sorting: [],
    onSortChange: vi.fn(),
    columnFilters: [],
    onFilterChange: vi.fn(),
    selectedIds: new Set(),
    onRowSelect: vi.fn(),
    chooser: makeChooser(),
    testIdPrefix: "test",
    ...overrides,
  };
  return render(<ServerTable {...defaultProps} />);
}

describe("ServerTable", () => {
  describe("rendering data rows", () => {
    it("renders column headers", () => {
      renderServerTable();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Count")).toBeInTheDocument();
    });

    it("renders data rows for each entity", () => {
      renderServerTable();
      expect(screen.getByText("Item A")).toBeInTheDocument();
      expect(screen.getByText("Item B")).toBeInTheDocument();
      expect(screen.getByText("Item C")).toBeInTheDocument();
    });

    it("renders row test ids using testIdPrefix", () => {
      renderServerTable();
      expect(screen.getByTestId("test-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("test-row-2")).toBeInTheDocument();
      expect(screen.getByTestId("test-row-3")).toBeInTheDocument();
    });

    it("renders edit and delete action buttons for each row", () => {
      renderServerTable({ onEdit: vi.fn(), onDelete: vi.fn() });
      expect(screen.getByTestId("test-edit-1")).toBeInTheDocument();
      expect(screen.getByTestId("test-delete-1")).toBeInTheDocument();
    });

    it("renders custom row actions when renderRowActions provided", () => {
      renderServerTable({
        renderRowActions: (entity) => (
          <button data-testid={`custom-action-${entity._id}`} aria-label={`Custom action for ${entity._id}`}>Custom</button>
        ),
      });
      expect(screen.getByTestId("custom-action-1")).toBeInTheDocument();
      // Default edit/delete should NOT be rendered
      expect(screen.queryByTestId("test-edit-1")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("renders skeleton rows when isLoading is true", () => {
      renderServerTable({ isLoading: true, data: [] });
      // Should render 5 skeleton rows with pulse animations
      const skeletonCells = document.querySelectorAll(".animate-pulse");
      expect(skeletonCells.length).toBeGreaterThan(0);
    });

    it("does not render data rows when loading", () => {
      renderServerTable({ isLoading: true, data: makeSampleData() });
      // Skeleton rows are rendered, not data rows
      expect(screen.queryByText("Item A")).not.toBeInTheDocument();
    });

    it("applies opacity when isFetching but not isLoading (refetch)", () => {
      renderServerTable({ isFetching: true, isLoading: false });
      const tbody = document.querySelector("tbody");
      expect(tbody?.className).toContain("opacity-50");
    });
  });

  describe("empty state", () => {
    it("shows default empty message when no data", () => {
      renderServerTable({ data: [] });
      expect(screen.getByText("No items found")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting your filters or search criteria")).toBeInTheDocument();
    });

    it("shows custom empty message", () => {
      renderServerTable({ data: [], emptyMessage: "Nothing here" });
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
    });

    it("renders emptyAction when provided and data is empty", () => {
      renderServerTable({
        data: [],
        emptyAction: <button data-testid="add-btn">Add new</button>,
      });
      expect(screen.getByTestId("add-btn")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("renders select-all checkbox in header", () => {
      renderServerTable();
      const headerCheckboxes = document.querySelectorAll("thead input[type='checkbox']");
      expect(headerCheckboxes.length).toBe(1);
    });

    it("renders a checkbox for each data row", () => {
      renderServerTable();
      const rowCheckboxes = document.querySelectorAll("tbody input[type='checkbox']");
      expect(rowCheckboxes.length).toBe(3);
    });

    it("shows row as selected when id is in selectedIds", () => {
      renderServerTable({ selectedIds: new Set(["1"]) });
      const row = screen.getByTestId("test-row-1");
      expect(row.className).toContain("table-selected");
    });

    it("shows select-all as checked when all rows selected", () => {
      renderServerTable({ selectedIds: new Set(["1", "2", "3"]) });
      const headerCheckbox = document.querySelector("thead input[type='checkbox']") as HTMLInputElement;
      expect(headerCheckbox.checked).toBe(true);
    });
  });

  describe("sorting", () => {
    it("calls onSortChange when clicking a sortable column header", async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderServerTable({ onSortChange });

      await user.click(screen.getByText("Name"));
      expect(onSortChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
    });

    it("toggles to desc on second click of same column", async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderServerTable({
        onSortChange,
        sorting: [{ id: "name", desc: false }],
      });

      await user.click(screen.getByText("Name"));
      expect(onSortChange).toHaveBeenCalledWith([{ id: "name", desc: true }]);
    });

    it("clears sort on third click (desc -> none)", async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderServerTable({
        onSortChange,
        sorting: [{ id: "name", desc: true }],
      });

      await user.click(screen.getByText("Name"));
      expect(onSortChange).toHaveBeenCalledWith([]);
    });
  });

  describe("row interactions", () => {
    it("calls onRowClick when clicking a row", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderServerTable({ onRowClick });

      await user.click(screen.getByTestId("test-row-1"));
      expect(onRowClick).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "1", name: "Item A" }),
      );
    });

    it("calls onEdit when edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      renderServerTable({ onEdit });

      await user.click(screen.getByTestId("test-edit-1"));
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "1" }),
      );
    });

    it("calls onDelete when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      renderServerTable({ onDelete });

      await user.click(screen.getByTestId("test-delete-1"));
      expect(onDelete).toHaveBeenCalledWith("1");
    });
  });

  describe("filter toggle", () => {
    it("shows filter row when filter button is clicked", async () => {
      const user = userEvent.setup();
      renderServerTable();

      const filterBtn = screen.getByTitle("Show filters");
      await user.click(filterBtn);

      // Filter inputs should now be visible
      const filterInput = screen.getByPlaceholderText("Filter name...");
      expect(filterInput).toBeInTheDocument();
    });

    it("hides filter row and clears filters when filter button clicked with active filters", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({
        columnFilters: [{ id: "name", value: "test" }],
        onFilterChange,
      });

      // Filter button should be visible and filters are active
      const filterBtn = screen.getByTitle("Show filters");
      // First click shows the filter row
      await user.click(filterBtn);
      // Now filters are visible and active, clicking should clear them
      const hideBtn = screen.getByTitle("Hide filters");
      await user.click(hideBtn);
      expect(onFilterChange).toHaveBeenCalledWith([]);
    });

    it("typing in a text filter calls onFilterChange", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({ onFilterChange });

      // Show filter row
      await user.click(screen.getByTitle("Show filters"));

      const filterInput = screen.getByPlaceholderText("Filter name...");
      await user.type(filterInput, "test");
      expect(onFilterChange).toHaveBeenCalled();
    });

    it("renders date/number filter with operator select", async () => {
      const user = userEvent.setup();
      renderServerTable();

      // Show filter row
      await user.click(screen.getByTitle("Show filters"));

      // The "count" column is type "number", should have an operator select
      const selects = document.querySelectorAll("select");
      expect(selects.length).toBeGreaterThan(0);
    });

    it("typing in a number filter calls onFilterChange with op filter", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({ onFilterChange });

      await user.click(screen.getByTitle("Show filters"));

      // Find the number input (for count column)
      const numberInputs = document.querySelectorAll('input[type="number"]');
      expect(numberInputs.length).toBeGreaterThan(0);
      await user.type(numberInputs[0]!, "50");
      expect(onFilterChange).toHaveBeenCalled();
    });

    it("clear all filters button appears and clears filters", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({
        columnFilters: [{ id: "name", value: "test" }],
        onFilterChange,
      });

      // Show the filter row first
      await user.click(screen.getByTitle("Show filters"));

      const clearBtn = screen.getByTitle("Clear all filters");
      await user.click(clearBtn);
      expect(onFilterChange).toHaveBeenCalledWith([]);
    });

    it("NOT button toggles negation on a text filter", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({
        columnFilters: [{ id: "name", value: "test" }],
        onFilterChange,
      });

      await user.click(screen.getByTitle("Show filters"));

      // Find NOT buttons
      const notButtons = screen.getAllByText("NOT");
      expect(notButtons.length).toBeGreaterThan(0);
      await user.click(notButtons[0]!);
      // Should call onFilterChange with negated value
      expect(onFilterChange).toHaveBeenCalled();
    });

    it("changing operator select on number column updates filter", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({
        columnFilters: [{ id: "count", value: { op: "=", value: "50" } as unknown as string }],
        onFilterChange,
      });

      await user.click(screen.getByTitle("Show filters"));

      const selects = document.querySelectorAll("select");
      expect(selects.length).toBeGreaterThan(0);
      // Change operator to >
      await user.selectOptions(selects[0]!, ">");
      expect(onFilterChange).toHaveBeenCalled();
    });

    it("clear button on number filter clears the op filter", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({
        columnFilters: [{ id: "count", value: { op: "=", value: "50" } as unknown as string }],
        onFilterChange,
      });

      await user.click(screen.getByTitle("Show filters"));

      const clearBtns = screen.getAllByTitle("Clear filter");
      expect(clearBtns.length).toBeGreaterThan(0);
      await user.click(clearBtns[0]!);
      expect(onFilterChange).toHaveBeenCalledWith([]);
    });
  });

  describe("column chooser", () => {
    it("calls openChooser when settings button is clicked", async () => {
      const user = userEvent.setup();
      const chooser = makeChooser();
      renderServerTable({ chooser });

      await user.click(screen.getByTitle("Choose columns"));
      expect(chooser.openChooser).toHaveBeenCalled();
    });
  });

  describe("status-badge cell renderer", () => {
    it("renders status values as badges", () => {
      renderServerTable();
      // The status-badge renderer wraps values in a Badge component
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("inactive")).toBeInTheDocument();
    });
  });

  describe("selection interactions", () => {
    it("calls onRowSelect to select all when select-all checkbox clicked", async () => {
      const user = userEvent.setup();
      const onRowSelect = vi.fn();
      renderServerTable({ onRowSelect });

      const headerCheckbox = document.querySelector("thead input[type='checkbox']") as HTMLInputElement;
      await user.click(headerCheckbox);
      expect(onRowSelect).toHaveBeenCalledWith({
        "1": true,
        "2": true,
        "3": true,
      });
    });

    it("deselects all when select-all is clicked and all are already selected", async () => {
      const user = userEvent.setup();
      const onRowSelect = vi.fn();
      renderServerTable({
        onRowSelect,
        selectedIds: new Set(["1", "2", "3"]),
      });

      const headerCheckbox = document.querySelector("thead input[type='checkbox']") as HTMLInputElement;
      await user.click(headerCheckbox);
      expect(onRowSelect).toHaveBeenCalledWith({});
    });

    it("toggles individual row selection when row checkbox cell is clicked", async () => {
      const user = userEvent.setup();
      const onRowSelect = vi.fn();
      renderServerTable({ onRowSelect });

      // Click the checkbox cell (the td containing the checkbox)
      const row1 = screen.getByTestId("test-row-1");
      const checkboxCell = row1.querySelector("td");
      await user.click(checkboxCell!);
      expect(onRowSelect).toHaveBeenCalledWith({ "1": true });
    });

    it("deselects a row when its checkbox cell is clicked and it is already selected", async () => {
      const user = userEvent.setup();
      const onRowSelect = vi.fn();
      renderServerTable({
        onRowSelect,
        selectedIds: new Set(["1"]),
      });

      const row1 = screen.getByTestId("test-row-1");
      const checkboxCell = row1.querySelector("td");
      await user.click(checkboxCell!);
      // Should call with "1" removed
      expect(onRowSelect).toHaveBeenCalledWith({});
    });
  });

  describe("keyboard interactions", () => {
    it("calls onRowClick when Enter is pressed on a row", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderServerTable({ onRowClick });

      const row = screen.getByTestId("test-row-1");
      row.focus();
      await user.keyboard("{Enter}");
      expect(onRowClick).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "1" }),
      );
    });

    it("calls onRowClick when Space is pressed on a row", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderServerTable({ onRowClick });

      const row = screen.getByTestId("test-row-1");
      row.focus();
      await user.keyboard(" ");
      expect(onRowClick).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "1" }),
      );
    });
  });

  describe("custom cell renderers", () => {
    it("uses custom cellRenderer when provided", () => {
      renderServerTable({
        cellRenderers: {
          "status-badge": (value) => <span data-testid="custom-badge">{String(value)}</span>,
        },
      });
      expect(screen.getAllByTestId("custom-badge").length).toBeGreaterThan(0);
    });

    it("renders user cell renderer for populated refs", () => {
      const columns = makeColumns();
      columns.push({
        key: "createdBy",
        label: "Created By",
        type: "string",
        sortable: false,
        defaultVisible: true,
        cellRenderer: "user",
        source: "core",
        corePath: "createdBy",
      } as ColumnDescriptor);

      const data = [
        {
          _id: "1",
          name: "Item A",
          status: "active",
          count: 100,
          createdBy: { _id: "u1", empName: "John Doe", login: "jdoe" },
        },
      ] as TestEntity[];

      renderServerTable({ activeColumns: columns, data });
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders user cell renderer with string value", () => {
      const columns = makeColumns();
      columns.push({
        key: "createdBy",
        label: "Created By",
        type: "string",
        sortable: false,
        defaultVisible: true,
        cellRenderer: "user",
        source: "core",
        corePath: "createdBy",
      } as ColumnDescriptor);

      const data = [
        {
          _id: "1",
          name: "Item A",
          status: "active",
          count: 100,
          createdBy: "someUserId",
        },
      ] as TestEntity[];

      renderServerTable({ activeColumns: columns, data });
      expect(screen.getByText("someUserId")).toBeInTheDocument();
    });
  });

  describe("sort icons", () => {
    it("shows ascending sort icon for active asc sort", () => {
      renderServerTable({ sorting: [{ id: "name", desc: false }] });
      // The header for Name should be styled as active
      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader?.className).toContain("text-foreground");
    });

    it("shows descending sort icon for active desc sort", () => {
      renderServerTable({ sorting: [{ id: "name", desc: true }] });
      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader?.className).toContain("text-foreground");
    });
  });

  describe("context menu", () => {
    it("shows context menu on right-click of a cell", async () => {
      renderServerTable();
      const row1 = screen.getByTestId("test-row-1");
      const cells = row1.querySelectorAll("td");
      // Right-click the name cell (2nd td, after checkbox)
      fireEvent.contextMenu(cells[1]!);
      // Context menu should appear with "Filter by this value"
      expect(screen.getByText("Filter by this value")).toBeInTheDocument();
      expect(screen.getByText("Exclude this value")).toBeInTheDocument();
    });

    it("applies filter when 'Filter by this value' is clicked in context menu", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({ onFilterChange });
      const row1 = screen.getByTestId("test-row-1");
      const cells = row1.querySelectorAll("td");
      fireEvent.contextMenu(cells[1]!);
      await user.click(screen.getByText("Filter by this value"));
      expect(onFilterChange).toHaveBeenCalled();
    });

    it("applies negated filter when 'Exclude this value' is clicked", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      renderServerTable({ onFilterChange });
      const row1 = screen.getByTestId("test-row-1");
      const cells = row1.querySelectorAll("td");
      fireEvent.contextMenu(cells[1]!);
      await user.click(screen.getByText("Exclude this value"));
      expect(onFilterChange).toHaveBeenCalled();
    });

    it("shows operator options for number column context menu", () => {
      renderServerTable();
      const row1 = screen.getByTestId("test-row-1");
      const cells = row1.querySelectorAll("td");
      // Right-click the count cell (4th td: checkbox, name, status, count)
      fireEvent.contextMenu(cells[3]!);
      expect(screen.getByText("Greater than")).toBeInTheDocument();
      expect(screen.getByText("Less than")).toBeInTheDocument();
    });

    it("closes context menu on Escape", () => {
      renderServerTable();
      const row1 = screen.getByTestId("test-row-1");
      const cells = row1.querySelectorAll("td");
      fireEvent.contextMenu(cells[1]!);
      expect(screen.getByText("Filter by this value")).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByText("Filter by this value")).not.toBeInTheDocument();
    });

    it("closes context menu on outside click", () => {
      renderServerTable();
      const row1 = screen.getByTestId("test-row-1");
      const cells = row1.querySelectorAll("td");
      fireEvent.contextMenu(cells[1]!);
      expect(screen.getByText("Filter by this value")).toBeInTheDocument();
      fireEvent.click(window);
      expect(screen.queryByText("Filter by this value")).not.toBeInTheDocument();
    });
  });

  describe("column drag and drop", () => {
    it("calls chooser.handleDragStart on dragStart", () => {
      const chooser = makeChooser();
      renderServerTable({ chooser });

      const nameHeader = screen.getByText("Name").closest("th")!;
      fireEvent.dragStart(nameHeader);
      expect(chooser.handleDragStart).toHaveBeenCalledWith("name");
    });

    it("calls chooser.handleDrop on drop", () => {
      const chooser = makeChooser();
      renderServerTable({ chooser });

      const nameHeader = screen.getByText("Name").closest("th")!;
      fireEvent.drop(nameHeader);
      expect(chooser.handleDrop).toHaveBeenCalledWith("name");
    });

    it("calls chooser.handleDragEnd on dragEnd", () => {
      const chooser = makeChooser();
      renderServerTable({ chooser });

      const nameHeader = screen.getByText("Name").closest("th")!;
      fireEvent.dragEnd(nameHeader);
      expect(chooser.handleDragEnd).toHaveBeenCalled();
    });

    it("shows drag-over indicator when dragOverCol matches", () => {
      const chooser = makeChooser();
      chooser.dragOverCol = "name";
      renderServerTable({ chooser });

      const nameHeader = screen.getByText("Name").closest("th");
      expect(nameHeader?.className).toContain("border-brand");
    });
  });

  describe("user renderer for populated ref column with right-click filter", () => {
    it("shows read-only filter with clear button for user column filter", async () => {
      const user = userEvent.setup();
      const columns = makeColumns();
      columns.push({
        key: "createdBy",
        label: "Created By",
        type: "string",
        sortable: false,
        defaultVisible: true,
        cellRenderer: "user",
        filterable: true,
        source: "core",
        corePath: "createdBy",
      } as ColumnDescriptor);

      const onFilterChange = vi.fn();
      renderServerTable({
        activeColumns: columns,
        columnFilters: [{ id: "createdBy", value: { __objectId: "u1", __display: "John Doe" } as unknown as string }],
        onFilterChange,
      });

      await user.click(screen.getByTitle("Show filters"));
      // Should show "John Doe" as a read-only filter display
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      // Should have a clear button
      const clearBtn = screen.getByTitle("Clear filter");
      await user.click(clearBtn);
      expect(onFilterChange).toHaveBeenCalled();
    });
  });
});
