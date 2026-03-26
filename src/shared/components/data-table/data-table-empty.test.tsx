import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { DataTableEmpty } from "./data-table-empty";

describe("DataTableEmpty", () => {
  it("renders default 'No data found' message", () => {
    render(<DataTableEmpty />);
    expect(screen.getByText("No data found")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<DataTableEmpty message="No members found" />);
    expect(screen.getByText("No members found")).toBeInTheDocument();
    expect(screen.queryByText("No data found")).not.toBeInTheDocument();
  });

  it("shows helper text about adjusting filters", () => {
    render(<DataTableEmpty />);
    expect(
      screen.getByText("Try adjusting your filters or search criteria"),
    ).toBeInTheDocument();
  });

  it("shows inbox icon", () => {
    render(<DataTableEmpty />);
    // Lucide icons render as SVGs; the Inbox icon is inside the component
    const container = screen.getByTestId("table-empty");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows action button when both actionLabel and onAction are provided", () => {
    const onAction = vi.fn();
    render(<DataTableEmpty actionLabel="Create Item" onAction={onAction} />);
    expect(
      screen.getByRole("button", { name: "Create Item" }),
    ).toBeInTheDocument();
  });

  it("does NOT show action button when only actionLabel is provided", () => {
    render(<DataTableEmpty actionLabel="Create Item" />);
    expect(screen.queryByRole("button", { name: "Create Item" })).not.toBeInTheDocument();
  });

  it("does NOT show action button when only onAction is provided", () => {
    render(<DataTableEmpty onAction={vi.fn()} />);
    // No button should appear at all
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clicking action button calls onAction", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<DataTableEmpty actionLabel="Add New" onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Add New" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("applies test-id prefix", () => {
    render(<DataTableEmpty testIdPrefix="members" />);
    expect(screen.getByTestId("members-empty")).toBeInTheDocument();
  });

  it("applies test-id prefix to action button", () => {
    render(
      <DataTableEmpty
        testIdPrefix="members"
        actionLabel="Create"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId("members-empty-action")).toBeInTheDocument();
  });

  it("uses default test-id prefix of 'table'", () => {
    render(<DataTableEmpty />);
    expect(screen.getByTestId("table-empty")).toBeInTheDocument();
  });
});
