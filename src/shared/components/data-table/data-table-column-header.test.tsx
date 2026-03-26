import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { DataTableColumnHeader } from "./data-table-column-header";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockColumn(overrides: Record<string, any> = {}) {
  return {
    id: "test-col",
    getCanSort: () => true,
    getIsSorted: () => false as false | "asc" | "desc",
    toggleSorting: vi.fn(),
    getCanMultiSort: () => false,
    ...overrides,
  };
}

describe("DataTableColumnHeader", () => {
  it("renders non-sortable column as plain text (no button)", () => {
    const column = createMockColumn({ getCanSort: () => false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders sortable column as a clickable button", () => {
    const column = createMockColumn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    expect(screen.getByRole("button", { name: /Name/ })).toBeInTheDocument();
  });

  it("shows ArrowUpDown icon when unsorted", () => {
    const column = createMockColumn({ getIsSorted: () => false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    const button = screen.getByRole("button");
    // ArrowUpDown renders an SVG inside the button
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // The unsorted icon has opacity-40 class
    expect(svg).toHaveClass("opacity-40");
  });

  it("shows ArrowUp icon when sorted ascending (no opacity-40)", () => {
    const column = createMockColumn({ getIsSorted: () => "asc" as const });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).not.toHaveClass("opacity-40");
  });

  it("shows ArrowDown icon when sorted descending (no opacity-40)", () => {
    const column = createMockColumn({ getIsSorted: () => "desc" as const });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).not.toHaveClass("opacity-40");
  });

  it("clicking button calls toggleSorting", async () => {
    const user = userEvent.setup();
    const column = createMockColumn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(column.toggleSorting).toHaveBeenCalledTimes(1);
    expect(column.toggleSorting).toHaveBeenCalledWith(undefined, false);
  });

  it("passes multiSort capability to toggleSorting", async () => {
    const user = userEvent.setup();
    const column = createMockColumn({ getCanMultiSort: () => true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);

    await user.click(screen.getByRole("button"));
    expect(column.toggleSorting).toHaveBeenCalledWith(undefined, true);
  });

  it("applies test-id prefix with column id", () => {
    const column = createMockColumn({ id: "email" });
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <DataTableColumnHeader column={column as any} title="Email" testIdPrefix="users" />,
    );
    expect(screen.getByTestId("users-column-email")).toBeInTheDocument();
  });

  it("uses default test-id prefix of 'table'", () => {
    const column = createMockColumn({ id: "name" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Name" />);
    expect(screen.getByTestId("table-column-name")).toBeInTheDocument();
  });

  it("applies test-id prefix for non-sortable column", () => {
    const column = createMockColumn({ id: "status", getCanSort: () => false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<DataTableColumnHeader column={column as any} title="Status" testIdPrefix="orders" />);
    expect(screen.getByTestId("orders-column-status")).toBeInTheDocument();
  });
});
