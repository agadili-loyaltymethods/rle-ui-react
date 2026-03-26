import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { ViewToggle } from "./view-toggle";

describe("ViewToggle", () => {
  it("renders card and list buttons", () => {
    render(<ViewToggle value="card" onChange={vi.fn()} />);
    expect(screen.getByTestId("view-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("view-toggle-card")).toBeInTheDocument();
    expect(screen.getByTestId("view-toggle-list")).toBeInTheDocument();
  });

  it("renders with list mode selected", () => {
    render(<ViewToggle value="list" onChange={vi.fn()} />);
    expect(screen.getByTestId("view-toggle-list")).toBeInTheDocument();
  });

  it("calls onChange with 'card' when card button is clicked", () => {
    const onChange = vi.fn();
    render(<ViewToggle value="list" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("view-toggle-card"));
    expect(onChange).toHaveBeenCalledWith("card");
  });

  it("calls onChange with 'list' when list button is clicked", () => {
    const onChange = vi.fn();
    render(<ViewToggle value="card" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("view-toggle-list"));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});
