import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { TablePagination } from "./table-pagination";

describe("TablePagination", () => {
  it("renders page info and navigation buttons", () => {
    render(
      <TablePagination
        page={1}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/1–25 of 100/)).toBeInTheDocument();
    expect(screen.getByTitle("Next page")).toBeInTheDocument();
    expect(screen.getByTitle("Previous page")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(
      <TablePagination
        page={1}
        totalItems={50}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTitle("Previous page")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(
      <TablePagination
        page={2}
        totalItems={50}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTitle("Next page")).toBeDisabled();
  });

  it("enables both buttons on middle page", () => {
    render(
      <TablePagination
        page={2}
        totalItems={75}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTitle("Previous page")).not.toBeDisabled();
    expect(screen.getByTitle("Next page")).not.toBeDisabled();
  });

  it("calls onPageChange with previous page when previous button is clicked", () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination
        page={3}
        totalItems={100}
        pageSize={25}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByTitle("Previous page"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page when next button is clicked", () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination
        page={1}
        totalItems={100}
        pageSize={25}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByTitle("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when a specific page number is clicked", () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination
        page={1}
        totalItems={100}
        pageSize={25}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByText("3"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("displays correct row range for middle page", () => {
    render(
      <TablePagination
        page={2}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/26–50 of 100/)).toBeInTheDocument();
  });

  it("displays correct row range for last partial page", () => {
    render(
      <TablePagination
        page={3}
        totalItems={65}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/51–65 of 65/)).toBeInTheDocument();
  });

  it("displays 0–0 of 0 when there are no items", () => {
    render(
      <TablePagination
        page={1}
        totalItems={0}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/0–0 of 0/)).toBeInTheDocument();
  });

  it("renders page size options when onPageSizeChange is provided", () => {
    render(
      <TablePagination
        page={1}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Per page")).toBeInTheDocument();
  });

  it("does not render page size options when onPageSizeChange is not provided", () => {
    render(
      <TablePagination
        page={1}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Per page")).not.toBeInTheDocument();
  });

  it("calls onPageSizeChange when a page size option is clicked", () => {
    const onPageSizeChange = vi.fn();
    render(
      <TablePagination
        page={1}
        totalItems={100}
        pageSize={25}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.click(screen.getByText("50"));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("calls onPageSizeChange with 100 when 100 option is clicked", () => {
    const onPageSizeChange = vi.fn();
    render(
      <TablePagination
        page={1}
        totalItems={200}
        pageSize={25}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.click(screen.getByText("100"));
    expect(onPageSizeChange).toHaveBeenCalledWith(100);
  });

  it("renders page number buttons for all pages when few pages", () => {
    render(
      <TablePagination
        page={1}
        totalItems={75}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows ellipsis when many pages exist", () => {
    render(
      <TablePagination
        page={1}
        totalItems={250}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    // Page 1 is current, should show nearby pages and last page (10)
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("handles single page correctly", () => {
    render(
      <TablePagination
        page={1}
        totalItems={10}
        pageSize={25}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/1–10 of 10/)).toBeInTheDocument();
    expect(screen.getByTitle("Previous page")).toBeDisabled();
    expect(screen.getByTitle("Next page")).toBeDisabled();
  });
});
