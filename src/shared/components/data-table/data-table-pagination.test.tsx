import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { DataTablePagination } from "./data-table-pagination";

describe("DataTablePagination", () => {
  const defaultProps = {
    pageIndex: 0,
    pageSize: 25,
    totalCount: 100,
    onPageChange: vi.fn(),
  };

  it("displays 'Showing 1-25 of 100' for first page", () => {
    render(<DataTablePagination {...defaultProps} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText("1-25")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("displays 'Showing 26-50 of 100' for second page", () => {
    render(<DataTablePagination {...defaultProps} pageIndex={1} />);
    expect(screen.getByText("26-50")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("displays 'Showing 76-100 of 100' for last page", () => {
    render(<DataTablePagination {...defaultProps} pageIndex={3} />);
    expect(screen.getByText("76-100")).toBeInTheDocument();
  });

  it("displays 'Showing 0-0 of 0' for empty data", () => {
    render(
      <DataTablePagination {...defaultProps} totalCount={0} />,
    );
    expect(screen.getByText("0-0")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("prev button is disabled on first page", () => {
    render(<DataTablePagination {...defaultProps} pageIndex={0} />);
    const prevButton = screen.getByTestId("table-pagination-prev");
    expect(prevButton).toBeDisabled();
  });

  it("next button is disabled on last page", () => {
    render(<DataTablePagination {...defaultProps} pageIndex={3} />);
    const nextButton = screen.getByTestId("table-pagination-next");
    expect(nextButton).toBeDisabled();
  });

  it("prev button is enabled when not on first page", () => {
    render(<DataTablePagination {...defaultProps} pageIndex={2} />);
    const prevButton = screen.getByTestId("table-pagination-prev");
    expect(prevButton).not.toBeDisabled();
  });

  it("next button is enabled when not on last page", () => {
    render(<DataTablePagination {...defaultProps} pageIndex={0} />);
    const nextButton = screen.getByTestId("table-pagination-next");
    expect(nextButton).not.toBeDisabled();
  });

  it("clicking prev calls onPageChange with pageIndex - 1", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTablePagination
        {...defaultProps}
        pageIndex={2}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByTestId("table-pagination-prev"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("clicking next calls onPageChange with pageIndex + 1", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTablePagination
        {...defaultProps}
        pageIndex={1}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByTestId("table-pagination-next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("page numbers are shown as 1-indexed", () => {
    render(
      <DataTablePagination {...defaultProps} pageSize={25} totalCount={100} />,
    );
    // 4 pages total (100/25), displayed as 1, 2, 3, 4
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("clicking a page number calls onPageChange with 0-indexed page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTablePagination
        {...defaultProps}
        onPageChange={onPageChange}
      />,
    );

    // Click page "3" which is 0-indexed as 2
    await user.click(screen.getByTestId("table-pagination-page-2"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("applies test-id prefix", () => {
    render(<DataTablePagination {...defaultProps} testIdPrefix="members" />);
    expect(screen.getByTestId("members-pagination")).toBeInTheDocument();
    expect(screen.getByTestId("members-pagination-prev")).toBeInTheDocument();
    expect(screen.getByTestId("members-pagination-next")).toBeInTheDocument();
  });

  it("does not render page size selector when onPageSizeChange is not provided", () => {
    render(<DataTablePagination {...defaultProps} />);
    expect(
      screen.queryByTestId("table-pagination-page-size"),
    ).not.toBeInTheDocument();
  });

  it("renders page size selector when onPageSizeChange is provided", () => {
    render(
      <DataTablePagination
        {...defaultProps}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("table-pagination-page-size"),
    ).toBeInTheDocument();
  });

  it("page size selector uses default options [10, 25, 50, 100]", () => {
    render(
      <DataTablePagination
        {...defaultProps}
        onPageSizeChange={vi.fn()}
      />,
    );
    const select = screen.getByTestId("table-pagination-page-size");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveValue("10");
    expect(options[1]).toHaveValue("25");
    expect(options[2]).toHaveValue("50");
    expect(options[3]).toHaveValue("100");
  });

  it("shows ellipsis for many pages", () => {
    render(
      <DataTablePagination
        {...defaultProps}
        pageSize={10}
        totalCount={200}
        pageIndex={10}
      />,
    );
    // With 20 pages and current at index 10, there should be ellipsis
    expect(screen.getAllByText("...").length).toBeGreaterThanOrEqual(1);
  });

  it("handles partial last page correctly", () => {
    render(
      <DataTablePagination
        {...defaultProps}
        pageIndex={4}
        pageSize={25}
        totalCount={110}
      />,
    );
    // Last page: showing 101-110 of 110
    expect(screen.getByText("101-110")).toBeInTheDocument();
    expect(screen.getByText("110")).toBeInTheDocument();
  });

  it("calls onPageSizeChange when page size is changed", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    render(
      <DataTablePagination
        {...defaultProps}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const select = screen.getByTestId("table-pagination-page-size");
    // Use fireEvent.change for native select
    const { fireEvent } = await import("@/test-utils");
    fireEvent.change(select, { target: { value: "50" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
