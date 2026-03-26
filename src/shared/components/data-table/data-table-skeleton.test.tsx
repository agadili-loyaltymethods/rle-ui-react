import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { DataTableSkeleton } from "./data-table-skeleton";

describe("DataTableSkeleton", () => {
  it("renders default 10 rows when rowCount is not specified", () => {
    render(<DataTableSkeleton columnCount={3} />);
    const container = screen.getByTestId("table-skeleton");
    // Each row is a direct child div
    const rows = container.children;
    expect(rows).toHaveLength(10);
  });

  it("renders custom row count", () => {
    render(<DataTableSkeleton columnCount={3} rowCount={5} />);
    const container = screen.getByTestId("table-skeleton");
    expect(container.children).toHaveLength(5);
  });

  it("renders correct number of columns per row", () => {
    render(<DataTableSkeleton columnCount={4} rowCount={2} />);
    const container = screen.getByTestId("table-skeleton");
    const firstRow = container.children[0]!;
    // Each column is a div wrapper with a Skeleton inside
    expect(firstRow.children).toHaveLength(4);
  });

  it("renders skeleton elements within each cell", () => {
    render(<DataTableSkeleton columnCount={2} rowCount={1} />);
    const container = screen.getByTestId("table-skeleton");
    const firstRow = container.children[0]!;
    // Each cell div should contain a Skeleton (rendered as a div)
    for (let i = 0; i < 2; i++) {
      const cell = firstRow.children[i]!;
      expect(cell.children).toHaveLength(1);
    }
  });

  it("applies test-id prefix", () => {
    render(<DataTableSkeleton columnCount={2} testIdPrefix="members" />);
    expect(screen.getByTestId("members-skeleton")).toBeInTheDocument();
  });

  it("uses default test-id prefix of 'table'", () => {
    render(<DataTableSkeleton columnCount={2} />);
    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  });

  it("renders zero rows when rowCount is 0", () => {
    render(<DataTableSkeleton columnCount={3} rowCount={0} />);
    const container = screen.getByTestId("table-skeleton");
    expect(container.children).toHaveLength(0);
  });
});
