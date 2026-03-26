import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { BulkActionBar } from "./bulk-action-bar";

const defaultProps = {
  count: 3,
  onInvert: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onClear: vi.fn(),
};

describe("BulkActionBar", () => {
  it("renders when count > 0", () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("returns null when count is 0", () => {
    const { container } = render(<BulkActionBar {...defaultProps} count={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows correct count for different values", () => {
    render(<BulkActionBar {...defaultProps} count={42} />);
    expect(screen.getByText("42 selected")).toBeInTheDocument();
  });

  it("renders Invert button and calls onInvert when clicked", async () => {
    const onInvert = vi.fn();
    const user = userEvent.setup();
    render(<BulkActionBar {...defaultProps} onInvert={onInvert} />);

    const invertBtn = screen.getByText("Invert");
    expect(invertBtn).toBeInTheDocument();
    await user.click(invertBtn);
    expect(onInvert).toHaveBeenCalledOnce();
  });

  it("renders Edit button and calls onEdit when clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<BulkActionBar {...defaultProps} onEdit={onEdit} />);

    const editBtn = screen.getByTestId("bulk-action-edit");
    expect(editBtn).toBeInTheDocument();
    await user.click(editBtn);
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("renders Delete button and calls onDelete when clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<BulkActionBar {...defaultProps} onDelete={onDelete} />);

    const deleteBtn = screen.getByText("Delete");
    expect(deleteBtn).toBeInTheDocument();
    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("renders clear selection button and calls onClear when clicked", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(<BulkActionBar {...defaultProps} onClear={onClear} />);

    const clearBtn = screen.getByRole("button", { name: "Clear selection" });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("shows Select All button when onSelectAll is provided and count < totalCount", () => {
    render(
      <BulkActionBar
        {...defaultProps}
        count={3}
        totalCount={100}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getByText("All 100")).toBeInTheDocument();
  });

  it("calls onSelectAll when Select All button is clicked", async () => {
    const onSelectAll = vi.fn();
    const user = userEvent.setup();
    render(
      <BulkActionBar
        {...defaultProps}
        count={3}
        totalCount={100}
        onSelectAll={onSelectAll}
      />,
    );

    await user.click(screen.getByText("All 100"));
    expect(onSelectAll).toHaveBeenCalledOnce();
  });

  it("does not show Select All button when count equals totalCount", () => {
    render(
      <BulkActionBar
        {...defaultProps}
        count={100}
        totalCount={100}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.queryByText("All 100")).not.toBeInTheDocument();
  });

  it("does not show Select All button when onSelectAll is not provided", () => {
    render(<BulkActionBar {...defaultProps} count={3} totalCount={100} />);
    expect(screen.queryByText("All 100")).not.toBeInTheDocument();
  });

  it("shows 'Selecting...' text when selectingAll is true", () => {
    render(
      <BulkActionBar
        {...defaultProps}
        count={3}
        totalCount={100}
        onSelectAll={vi.fn()}
        selectingAll={true}
      />,
    );
    expect(screen.getByText("Selecting\u2026")).toBeInTheDocument();
  });

  it("disables Select All button when selectingAll is true", () => {
    render(
      <BulkActionBar
        {...defaultProps}
        count={3}
        totalCount={100}
        onSelectAll={vi.fn()}
        selectingAll={true}
      />,
    );
    const selectAllBtn = screen.getByText("Selecting\u2026").closest("button");
    expect(selectAllBtn).toBeDisabled();
  });
});
