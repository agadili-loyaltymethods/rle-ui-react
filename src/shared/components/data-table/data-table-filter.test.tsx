import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, fireEvent } from "@/test-utils";
import { DataTableFilter } from "./data-table-filter";
import type { Column } from "@tanstack/react-table";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockColumn = Column<any, unknown>;

function createMockColumn(filterValue: unknown = undefined) {
  return {
    id: "test-col",
    getFilterValue: vi.fn(() => filterValue),
    setFilterValue: vi.fn(),
  } as unknown as MockColumn & {
    setFilterValue: ReturnType<typeof vi.fn>;
    getFilterValue: ReturnType<typeof vi.fn>;
  };
}

async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByTestId("table-filter-test-col");
  await user.click(trigger);
}

describe("DataTableFilter", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  // ── General ──

  describe("general", () => {
    it("renders the filter trigger button", () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      expect(screen.getByTestId("table-filter-test-col")).toBeInTheDocument();
    });

    it("applies custom testIdPrefix", () => {
      const column = createMockColumn();
      render(
        <DataTableFilter
          column={column}
          filterType="text"
          testIdPrefix="custom"
        />,
      );

      expect(screen.getByTestId("custom-filter-test-col")).toBeInTheDocument();
    });

    it("trigger has aria-label", () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      expect(
        screen.getByRole("button", { name: "Filter test-col" }),
      ).toBeInTheDocument();
    });

    it("filter icon uses brand color when filter is active", () => {
      const column = createMockColumn("some-value");
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      const trigger = screen.getByTestId("table-filter-test-col");
      expect(trigger.className).toContain("text-brand");
      expect(trigger.className).not.toContain("text-foreground-muted");
    });

    it("filter icon uses muted color when filter is inactive", () => {
      const column = createMockColumn(undefined);
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      const trigger = screen.getByTestId("table-filter-test-col");
      expect(trigger.className).toContain("text-foreground-muted");
      expect(trigger.className).not.toContain("text-brand");
    });

    it("filter icon uses muted color when filter value is empty string", () => {
      const column = createMockColumn("");
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      const trigger = screen.getByTestId("table-filter-test-col");
      expect(trigger.className).toContain("text-foreground-muted");
    });

    it("clicking trigger opens popover", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      expect(screen.getByText("Filter")).toBeInTheDocument();
    });
  });

  // ── Text Filter ──

  describe("text filter", () => {
    it("shows text input in popover", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      expect(
        screen.getByTestId("table-filter-test-col-input"),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
    });

    it("typing in text input calls setFilterValue with the text", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      const input = screen.getByTestId("table-filter-test-col-input");
      await user.type(input, "hello");

      // Each keystroke calls setFilterValue; the last call should contain the final character
      expect(column.setFilterValue).toHaveBeenCalled();
    });

    it("clearing text input calls setFilterValue with undefined", async () => {
      const column = createMockColumn("existing");
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      const input = screen.getByTestId("table-filter-test-col-input");
      await user.clear(input);

      // When input is cleared, onChange fires with empty string which maps to undefined
      expect(column.setFilterValue).toHaveBeenCalledWith(undefined);
    });

    it("shows clear (X) button when filter has value", async () => {
      const column = createMockColumn("active-filter");
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      // The X button is inside the text input area
      // There's also the header "Clear" button
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("does not show header Clear button when filter is empty", async () => {
      const column = createMockColumn(undefined);
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("clicking header Clear button calls setFilterValue(undefined)", async () => {
      const column = createMockColumn("active-filter");
      render(
        <DataTableFilter column={column} filterType="text" />,
      );

      await openPopover(user);

      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      expect(column.setFilterValue).toHaveBeenCalledWith(undefined);
    });
  });

  // ── Number Range Filter ──

  describe("number range filter", () => {
    it("shows min and max inputs", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="number-range" />,
      );

      await openPopover(user);

      expect(
        screen.getByTestId("table-filter-test-col-min"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("table-filter-test-col-max"),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Max")).toBeInTheDocument();
    });

    it("setting min value calls setFilterValue with [min, undefined]", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="number-range" />,
      );

      await openPopover(user);

      const minInput = screen.getByTestId("table-filter-test-col-min");
      fireEvent.change(minInput, { target: { value: "10" } });

      expect(column.setFilterValue).toHaveBeenCalledWith([10, undefined]);
    });

    it("setting max value calls setFilterValue with [undefined, max]", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="number-range" />,
      );

      await openPopover(user);

      const maxInput = screen.getByTestId("table-filter-test-col-max");
      fireEvent.change(maxInput, { target: { value: "99" } });

      expect(column.setFilterValue).toHaveBeenCalledWith([undefined, 99]);
    });

    it("preserves existing min when setting max", async () => {
      const column = createMockColumn([5, undefined]);
      render(
        <DataTableFilter column={column} filterType="number-range" />,
      );

      await openPopover(user);

      const maxInput = screen.getByTestId("table-filter-test-col-max");
      fireEvent.change(maxInput, { target: { value: "20" } });

      expect(column.setFilterValue).toHaveBeenCalledWith([5, 20]);
    });

    it("clearing min input sends undefined for min", async () => {
      const column = createMockColumn([10, 50]);
      render(
        <DataTableFilter column={column} filterType="number-range" />,
      );

      await openPopover(user);

      const minInput = screen.getByTestId("table-filter-test-col-min");
      await user.clear(minInput);

      expect(column.setFilterValue).toHaveBeenCalledWith([undefined, 50]);
    });
  });

  // ── Date Range Filter ──

  describe("date range filter", () => {
    it("shows from and to date inputs", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="date-range" />,
      );

      await openPopover(user);

      expect(
        screen.getByTestId("table-filter-test-col-from"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("table-filter-test-col-to"),
      ).toBeInTheDocument();
    });

    it("setting from date calls setFilterValue with [date, undefined]", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="date-range" />,
      );

      await openPopover(user);

      const fromInput = screen.getByTestId("table-filter-test-col-from");
      // fireEvent is more reliable for date inputs
      await user.type(fromInput, "2025-01-15");

      expect(column.setFilterValue).toHaveBeenCalled();
      const calls = column.setFilterValue.mock.calls;
      const lastCall = calls[calls.length - 1] as unknown[];
      const [from, to] = lastCall[0] as [string, unknown];
      expect(from).toBeTruthy();
      expect(to).toBeUndefined();
    });

    it("setting to date calls setFilterValue with [undefined, date]", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter column={column} filterType="date-range" />,
      );

      await openPopover(user);

      const toInput = screen.getByTestId("table-filter-test-col-to");
      await user.type(toInput, "2025-12-31");

      expect(column.setFilterValue).toHaveBeenCalled();
      const calls = column.setFilterValue.mock.calls;
      const lastCall = calls[calls.length - 1] as unknown[];
      const [from, to] = lastCall[0] as [unknown, string];
      expect(from).toBeUndefined();
      expect(to).toBeTruthy();
    });

    it("preserves existing from date when setting to date", async () => {
      const column = createMockColumn(["2025-01-01", undefined]);
      render(
        <DataTableFilter column={column} filterType="date-range" />,
      );

      await openPopover(user);

      const toInput = screen.getByTestId("table-filter-test-col-to");
      await user.type(toInput, "2025-06-30");

      const calls = column.setFilterValue.mock.calls;
      const lastCall = calls[calls.length - 1] as unknown[];
      const [from] = lastCall[0] as [string, string];
      expect(from).toBe("2025-01-01");
    });
  });

  // ── Enum Filter ──

  describe("enum filter", () => {
    const enumOptions = [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending", label: "Pending" },
    ];

    it("shows checkbox for each enum option", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      expect(
        screen.getByTestId("table-filter-test-col-enum-active"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("table-filter-test-col-enum-inactive"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("table-filter-test-col-enum-pending"),
      ).toBeInTheDocument();

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("checking an option calls setFilterValue with array containing that value", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      const checkbox = screen.getByTestId(
        "table-filter-test-col-enum-active",
      );
      await user.click(checkbox);

      expect(column.setFilterValue).toHaveBeenCalledWith(["active"]);
    });

    it("unchecking the only selected option calls setFilterValue with undefined", async () => {
      const column = createMockColumn(["active"]);
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      const checkbox = screen.getByTestId(
        "table-filter-test-col-enum-active",
      );
      await user.click(checkbox);

      expect(column.setFilterValue).toHaveBeenCalledWith(undefined);
    });

    it("checking a second option appends it to the array", async () => {
      const column = createMockColumn(["active"]);
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      const checkbox = screen.getByTestId(
        "table-filter-test-col-enum-pending",
      );
      await user.click(checkbox);

      expect(column.setFilterValue).toHaveBeenCalledWith([
        "active",
        "pending",
      ]);
    });

    it("checkboxes reflect selected state", async () => {
      const column = createMockColumn(["active", "pending"]);
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      const activeCheckbox = screen.getByTestId(
        "table-filter-test-col-enum-active",
      ) as HTMLInputElement;
      const inactiveCheckbox = screen.getByTestId(
        "table-filter-test-col-enum-inactive",
      ) as HTMLInputElement;
      const pendingCheckbox = screen.getByTestId(
        "table-filter-test-col-enum-pending",
      ) as HTMLInputElement;

      expect(activeCheckbox.checked).toBe(true);
      expect(inactiveCheckbox.checked).toBe(false);
      expect(pendingCheckbox.checked).toBe(true);
    });

    it("shows 'Clear selection' button when items are checked", async () => {
      const column = createMockColumn(["active"]);
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      expect(
        screen.getByRole("button", { name: "Clear selection" }),
      ).toBeInTheDocument();
    });

    it("does not show 'Clear selection' button when no items are checked", async () => {
      const column = createMockColumn();
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      expect(
        screen.queryByRole("button", { name: "Clear selection" }),
      ).not.toBeInTheDocument();
    });

    it("clicking 'Clear selection' calls setFilterValue(undefined)", async () => {
      const column = createMockColumn(["active", "inactive"]);
      render(
        <DataTableFilter
          column={column}
          filterType="enum"
          enumOptions={enumOptions}
        />,
      );

      await openPopover(user);

      const clearButton = screen.getByRole("button", {
        name: "Clear selection",
      });
      await user.click(clearButton);

      expect(column.setFilterValue).toHaveBeenCalledWith(undefined);
    });
  });
});
