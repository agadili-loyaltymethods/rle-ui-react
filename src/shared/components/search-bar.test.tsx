import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  it("renders search input with placeholder", () => {
    render(
      <SearchBar value="" onChange={vi.fn()} placeholder="Search members..." />,
    );
    expect(screen.getByPlaceholderText("Search members...")).toBeInTheDocument();
  });

  it("renders with default placeholder", () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  describe("typing in search input", () => {
    it("calls onChange after debounce when user types", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} debounceMs={300} />);

      const input = screen.getByTestId("search-search-input");
      await user.type(input, "hello");

      // onChange should not have been called with the full string yet (debounce pending)
      onChange.mockClear();

      // Advance past debounce
      vi.advanceTimersByTime(300);
      expect(onChange).toHaveBeenCalledWith("hello");

      vi.useRealTimers();
    });
  });

  describe("clear button", () => {
    it("does not show clear button when input is empty", () => {
      render(<SearchBar value="" onChange={vi.fn()} />);
      expect(screen.queryByTestId("search-search-clear")).not.toBeInTheDocument();
    });

    it("shows clear button when input has text", () => {
      render(<SearchBar value="test" onChange={vi.fn()} />);
      expect(screen.getByTestId("search-search-clear")).toBeInTheDocument();
    });

    it("clears input and calls onChange immediately when clear is clicked", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const onChange = vi.fn();
      render(<SearchBar value="test" onChange={onChange} />);

      await user.click(screen.getByTestId("search-search-clear"));
      expect(onChange).toHaveBeenCalledWith("");

      vi.useRealTimers();
    });
  });

  describe("custom testIdPrefix", () => {
    it("uses custom testIdPrefix for input", () => {
      render(<SearchBar value="" onChange={vi.fn()} testIdPrefix="members" />);
      expect(screen.getByTestId("members-search-input")).toBeInTheDocument();
    });
  });

  describe("search icon", () => {
    it("renders the search icon", () => {
      const { container } = render(<SearchBar value="" onChange={vi.fn()} />);
      // The Search icon from lucide renders as an SVG with aria-hidden
      const svg = container.querySelector("svg[aria-hidden]");
      expect(svg).toBeInTheDocument();
    });
  });
});
