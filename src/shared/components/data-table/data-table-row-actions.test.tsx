import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DataTableRowActions } from "./data-table-row-actions";

describe("DataTableRowActions", () => {
  it("returns null when actions array is empty", () => {
    const { container } = render(<DataTableRowActions actions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders trigger button with aria-label", () => {
    render(
      <DataTableRowActions
        actions={[{ label: "Edit", onClick: vi.fn() }]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Row actions" }),
    ).toBeInTheDocument();
  });

  it("renders trigger button with MoreHorizontal icon (SVG)", () => {
    render(
      <DataTableRowActions
        actions={[{ label: "Edit", onClick: vi.fn() }]}
      />,
    );
    const button = screen.getByRole("button", { name: "Row actions" });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("test-id includes rowId when provided", () => {
    render(
      <DataTableRowActions
        actions={[{ label: "Edit", onClick: vi.fn() }]}
        rowId="abc123"
      />,
    );
    expect(screen.getByTestId("table-row-actions-abc123")).toBeInTheDocument();
  });

  it("test-id uses 'trigger' when rowId is not provided", () => {
    render(
      <DataTableRowActions
        actions={[{ label: "Edit", onClick: vi.fn() }]}
      />,
    );
    expect(screen.getByTestId("table-row-actions-trigger")).toBeInTheDocument();
  });

  it("applies custom test-id prefix", () => {
    render(
      <DataTableRowActions
        actions={[{ label: "Delete", onClick: vi.fn() }]}
        testIdPrefix="members"
        rowId="row1"
      />,
    );
    expect(screen.getByTestId("members-row-actions-row1")).toBeInTheDocument();
  });
});
