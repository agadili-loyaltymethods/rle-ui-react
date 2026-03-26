import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, fireEvent } from "@/test-utils";
import { RewardsToolbar } from "./rewards-toolbar";

const defaultProps = {
  filterStatus: [] as string[],
  onFilterStatusChange: vi.fn(),
  expirationSince: "1m" as const,
  onExpirationSinceChange: vi.fn(),
  customDateRange: { start: "", end: "" },
  onCustomDateRangeChange: vi.fn(),
  viewMode: "list" as const,
  onViewModeChange: vi.fn(),
};

function setup(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  // Reset mocks each call
  Object.values(props).forEach((v) => {
    if (typeof v === "function") (v as ReturnType<typeof vi.fn>).mockClear?.();
  });
  return render(<RewardsToolbar {...props} />);
}

describe("RewardsToolbar", () => {
  it("renders 'All Status' when no filters", () => {
    setup();
    expect(screen.getByText("All Status")).toBeInTheDocument();
  });

  it("shows selected status labels", () => {
    setup({ filterStatus: ["active", "expired"] });
    expect(screen.getByText("Active, Expired")).toBeInTheDocument();
  });

  it("opens status dropdown on click", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("All Status"));
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Future")).toBeInTheDocument();
  });

  it("toggles status filter on option click", async () => {
    const user = userEvent.setup();
    const onFilterStatusChange = vi.fn();
    setup({ onFilterStatusChange });
    await user.click(screen.getByText("All Status"));
    await user.click(screen.getByText("Active"));
    expect(onFilterStatusChange).toHaveBeenCalledWith(["active"]);
  });

  it("removes status filter when clicking already selected", async () => {
    const user = userEvent.setup();
    const onFilterStatusChange = vi.fn();
    setup({ filterStatus: ["active"], onFilterStatusChange });
    // "Active" appears in button label — click it to open dropdown
    const allActive = screen.getAllByText("Active");
    await user.click(allActive[0]!);
    // Now click the "Active" option in dropdown to deselect
    const activeOptions = screen.getAllByText("Active");
    await user.click(activeOptions[activeOptions.length - 1]!);
    expect(onFilterStatusChange).toHaveBeenCalledWith([]);
  });

  it("renders view toggle with list and grid buttons", () => {
    setup();
    expect(screen.getByTitle("List view")).toBeInTheDocument();
    expect(screen.getByTitle("Grid view")).toBeInTheDocument();
  });

  it("calls onViewModeChange when grid is clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    setup({ onViewModeChange });
    await user.click(screen.getByTitle("Grid view"));
    expect(onViewModeChange).toHaveBeenCalledWith("grid");
  });

  it("calls onViewModeChange when list is clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    setup({ viewMode: "grid", onViewModeChange });
    await user.click(screen.getByTitle("List view"));
    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });

  it("renders add and reload buttons when provided", () => {
    setup({ onAdd: vi.fn(), onReload: vi.fn() });
    expect(screen.getByTitle("Add Reward")).toBeInTheDocument();
    expect(screen.getByTitle("Reload")).toBeInTheDocument();
  });

  it("calls onAdd when Add Reward is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    setup({ onAdd });
    await user.click(screen.getByTitle("Add Reward"));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("calls onReload when Reload is clicked", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    setup({ onReload });
    await user.click(screen.getByTitle("Reload"));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("renders exit fullscreen button when onExitFullscreen provided", () => {
    setup({ onExitFullscreen: vi.fn() });
    expect(screen.getByTitle("Exit fullscreen (Esc)")).toBeInTheDocument();
  });

  it("does not render add/reload/exit buttons when not provided", () => {
    setup();
    expect(screen.queryByTitle("Add Reward")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Reload")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Exit fullscreen (Esc)")).not.toBeInTheDocument();
  });

  it("shows expiration preset select", () => {
    setup();
    expect(screen.getByDisplayValue("Active in the last month")).toBeInTheDocument();
  });

  it("calls onExpirationSinceChange when preset changes", async () => {
    const onExpirationSinceChange = vi.fn();
    setup({ onExpirationSinceChange });
    fireEvent.change(screen.getByDisplayValue("Active in the last month"), {
      target: { value: "3m" },
    });
    expect(onExpirationSinceChange).toHaveBeenCalledWith("3m");
  });

  it("opens custom date popover when Custom range selected", async () => {
    setup();
    fireEvent.change(screen.getByDisplayValue("Active in the last month"), {
      target: { value: "custom" },
    });
    expect(screen.getByText("Active During Range")).toBeInTheDocument();
    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByText("End date")).toBeInTheDocument();
  });

  it("shows custom date label when expirationSince is custom", () => {
    setup({
      expirationSince: "custom",
      customDateRange: { start: "2025-01-01", end: "2025-06-30" },
    });
    expect(screen.getByText("01/01/2025 – 06/30/2025")).toBeInTheDocument();
  });

  it("applies custom date range when Apply is clicked", async () => {
    const user = userEvent.setup();
    const onCustomDateRangeChange = vi.fn();
    const onExpirationSinceChange = vi.fn();
    setup({ onCustomDateRangeChange, onExpirationSinceChange });

    // Switch to custom
    fireEvent.change(screen.getByDisplayValue("Active in the last month"), {
      target: { value: "custom" },
    });

    // Fill in dates
    const inputs = screen.getAllByDisplayValue("");
    fireEvent.change(inputs[0]!, { target: { value: "2025-01-01" } });
    fireEvent.change(inputs[1]!, { target: { value: "2025-06-30" } });

    // Click Apply
    await user.click(screen.getByText("Apply"));
    expect(onExpirationSinceChange).toHaveBeenCalledWith("custom");
    expect(onCustomDateRangeChange).toHaveBeenCalledWith({ start: "2025-01-01", end: "2025-06-30" });
  });

  it("resets custom date range when Reset is clicked", async () => {
    const user = userEvent.setup();
    const onExpirationSinceChange = vi.fn();
    setup({
      expirationSince: "custom",
      customDateRange: { start: "2025-01-01", end: "2025-06-30" },
      onExpirationSinceChange,
    });

    // When expirationSince is "custom", a button with the date label is rendered
    // Click it to open the custom date popover
    await user.click(screen.getByText("01/01/2025 – 06/30/2025"));

    // Click Reset
    await user.click(screen.getByText("Reset"));
    expect(onExpirationSinceChange).toHaveBeenCalledWith("1m");
  });

  it("calls onExitFullscreen when exit button is clicked", async () => {
    const user = userEvent.setup();
    const onExitFullscreen = vi.fn();
    setup({ onExitFullscreen });
    await user.click(screen.getByTitle("Exit fullscreen (Esc)"));
    expect(onExitFullscreen).toHaveBeenCalledOnce();
  });
});
