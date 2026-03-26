import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, fireEvent, waitFor } from "@/test-utils";
import { useUIStore } from "@/shared/stores/ui-store";
import { CommandPalette } from "./command-palette";

describe("CommandPalette", () => {
  beforeEach(() => {
    useUIStore.setState({ currentProgramName: null });
  });

  it("renders trigger button without crashing", () => {
    render(<CommandPalette />);
    expect(screen.getByTestId("command-palette-trigger")).toBeInTheDocument();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("command-palette-dialog")).toBeInTheDocument();
  });

  it("opens on Ctrl+K keyboard shortcut", async () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();
    });
  });

  it("opens on Meta+K (Cmd+K) keyboard shortcut", async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();
    });
  });

  it("shows search input when open", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
  });

  it("shows default placeholder text when no program is selected", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-input")).toHaveAttribute(
      "placeholder",
      "Search\u2026",
    );
  });

  it("shows program-specific placeholder when a program is selected", async () => {
    useUIStore.setState({ currentProgramName: "Gold Rewards" });
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-input")).toHaveAttribute(
      "placeholder",
      "Search in Gold Rewards\u2026",
    );
  });

  it("shows empty state message before typing", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByText("Type to search across the platform...")).toBeInTheDocument();
  });

  it("shows no results message when search has text", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    const input = screen.getByTestId("command-palette-input");
    await user.type(input, "foobar");

    expect(screen.getByText(/No results found for/)).toBeInTheDocument();
  });

  it("closes on Escape key press in the input", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();

    // Escape is handled on the input's onKeyDown
    const input = screen.getByTestId("command-palette-input");
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();
    });
  });

  it("closes when clicking backdrop", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();

    // Click backdrop (the overlay area outside the dialog)
    const overlay = screen.getByTestId("command-palette-overlay");
    // The backdrop is the first child with absolute positioning
    const backdrop = overlay.querySelector(".absolute.inset-0") as HTMLElement;
    await user.click(backdrop);

    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();
  });

  it("clears search text when reopened", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    // Open and type
    await user.click(screen.getByTestId("command-palette-trigger"));
    await user.type(screen.getByTestId("command-palette-input"), "hello");
    expect(screen.getByTestId("command-palette-input")).toHaveValue("hello");

    // Close
    await user.keyboard("{Escape}");

    // Reopen
    await user.click(screen.getByTestId("command-palette-trigger"));
    expect(screen.getByTestId("command-palette-input")).toHaveValue("");
  });

  it("shows program name in trigger button text when program is selected", () => {
    useUIStore.setState({ currentProgramName: "Silver Tier" });
    render(<CommandPalette />);
    expect(screen.getByText("Search in Silver Tier\u2026")).toBeInTheDocument();
  });
});
