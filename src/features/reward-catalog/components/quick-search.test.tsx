import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, userEvent } from "@/test-utils";
import { QuickSearch } from "./quick-search";
import type { RewardCatalogItem } from "@/features/reward-catalog/types/reward-policy";

beforeAll(() => {
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

const makeReward = (overrides: Partial<RewardCatalogItem> = {}): RewardCatalogItem => ({
  _id: "r1",
  name: "Search Reward",
  desc: "A test reward description",
  effectiveDate: "2025-01-01T00:00:00.000Z",
  expirationDate: "2027-01-01T00:00:00.000Z",
  ext: { rewardType: "Digital", programCode: "LYL" },
  ...overrides,
} as RewardCatalogItem);

const mockReward = makeReward();

const mockRewards = [
  makeReward({ _id: "r1", name: "Alpha Reward", ext: { rewardType: "Physical" } as never }),
  makeReward({ _id: "r2", name: "Beta Reward", ext: { rewardType: "Digital" } as never }),
  makeReward({ _id: "r3", name: "Gamma Reward", ext: { rewardType: "Gift Card" } as never }),
];

describe("QuickSearch", () => {
  it("renders search input and rewards list", () => {
    render(
      <QuickSearch
        rewards={[mockReward]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Search rewards...")).toBeInTheDocument();
    expect(screen.getByText("Search Reward")).toBeInTheDocument();
  });

  it("renders empty state when no rewards", () => {
    render(
      <QuickSearch
        rewards={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("No rewards found")).toBeInTheDocument();
  });

  it("filters rewards by name as user types", async () => {
    const user = userEvent.setup();
    render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Search rewards...");
    await user.type(input, "Alpha");

    expect(screen.getByText("Alpha Reward")).toBeInTheDocument();
    expect(screen.queryByText("Beta Reward")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma Reward")).not.toBeInTheDocument();
  });

  it("filters rewards by reward type", async () => {
    const user = userEvent.setup();
    render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Search rewards...");
    await user.type(input, "Digital");

    expect(screen.getByText("Beta Reward")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Reward")).not.toBeInTheDocument();
  });

  it("shows no results when search matches nothing", async () => {
    const user = userEvent.setup();
    render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Search rewards...");
    await user.type(input, "zzzzzzz");

    expect(screen.getByText("No rewards found")).toBeInTheDocument();
  });

  it("calls onSelect when a reward is clicked", () => {
    const onSelect = vi.fn();
    render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Beta Reward"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ _id: "r2" }));
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    const input = screen.getByPlaceholderText("Search rewards...");
    fireEvent.keyDown(input.closest("[onkeydown]") ?? input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking the overlay backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    // Click the backdrop overlay (the outermost fixed div)
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("navigates with arrow keys and selects with Enter", () => {
    const onSelect = vi.fn();
    render(
      <QuickSearch
        rewards={mockRewards}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    const container = screen.getByPlaceholderText("Search rewards...").closest("[onkeydown]") ?? screen.getByPlaceholderText("Search rewards...");

    // Arrow down to second item
    fireEvent.keyDown(container, { key: "ArrowDown" });
    // Arrow down to third item
    fireEvent.keyDown(container, { key: "ArrowDown" });
    // Arrow up back to second
    fireEvent.keyDown(container, { key: "ArrowUp" });
    // Enter to select
    fireEvent.keyDown(container, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ _id: "r2" }));
  });

  it("renders reward status badge", () => {
    render(
      <QuickSearch
        rewards={[mockReward]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders reward type in the item", () => {
    render(
      <QuickSearch
        rewards={[mockReward]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Digital")).toBeInTheDocument();
  });

  it("renders ESC key hint", () => {
    render(
      <QuickSearch
        rewards={[mockReward]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("ESC")).toBeInTheDocument();
  });
});
