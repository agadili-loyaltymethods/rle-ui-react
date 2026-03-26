import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { RewardsCardGrid } from "./rewards-card-grid";
import type { RewardCatalogItem, EntitySchemaData } from "@/features/reward-catalog/types/reward-policy";

const makeReward = (overrides?: Partial<RewardCatalogItem>): RewardCatalogItem => ({
  _id: "r1",
  name: "Test Reward",
  desc: "A test reward",
  effectiveDate: "2025-01-01T00:00:00.000Z",
  expirationDate: "2027-01-01T00:00:00.000Z",
  redemptions: 10,
  ext: {
    rewardType: "Physical",
    displayType: "Standard",
    imageListPageUrlDesktopWide: "",
    imageListPageUrlDesktopNormal: "",
  },
  ...overrides,
} as RewardCatalogItem);

const mockReward = makeReward();

const defaultProps = {
  rewards: [mockReward],
  selectedIds: new Set<string>(),
  onSelect: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  page: 1,
  pageSize: 25,
};

describe("RewardsCardGrid", () => {
  it("renders empty state when no rewards", () => {
    render(<RewardsCardGrid {...defaultProps} rewards={[]} />);
    expect(screen.getByText("No rewards found.")).toBeInTheDocument();
  });

  it("renders reward cards", () => {
    render(<RewardsCardGrid {...defaultProps} />);
    expect(screen.getByText("Test Reward")).toBeInTheDocument();
    expect(screen.getByText("A test reward")).toBeInTheDocument();
  });

  it("shows reward type badge", () => {
    render(<RewardsCardGrid {...defaultProps} />);
    expect(screen.getByText("Physical")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(<RewardsCardGrid {...defaultProps} />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows redemptions count", () => {
    render(<RewardsCardGrid {...defaultProps} />);
    expect(screen.getByText("10 redemptions")).toBeInTheDocument();
  });

  it("calls onSelect when card image area is clicked", () => {
    const onSelect = vi.fn();
    render(<RewardsCardGrid {...defaultProps} onSelect={onSelect} />);
    // Click the image area (the first div with cursor-pointer)
    const imageArea = document.querySelector(".cursor-pointer") as HTMLElement;
    fireEvent.click(imageArea);
    expect(onSelect).toHaveBeenCalledWith("r1");
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    render(<RewardsCardGrid {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByTitle("Edit"));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ _id: "r1" }));
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<RewardsCardGrid {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("shows selected state when reward is in selectedIds", () => {
    render(<RewardsCardGrid {...defaultProps} selectedIds={new Set(["r1"])} />);
    // Selected cards have border-brand class
    const card = document.querySelector(".border-brand");
    expect(card).toBeInTheDocument();
  });

  it("renders image when imageUrl is available", () => {
    const reward = makeReward({
      ext: {
        rewardType: "Physical",
        displayType: "Standard",
        imageListPageUrlDesktopWide: "https://example.com/image.jpg",
        imageListPageUrlDesktopNormal: "",
      } as never,
    });
    render(<RewardsCardGrid {...defaultProps} rewards={[reward]} />);
    const img = document.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.src).toBe("https://example.com/image.jpg");
  });

  it("renders Gift icon when no image is available", () => {
    render(<RewardsCardGrid {...defaultProps} />);
    // The Gift icon placeholder should be present
    const icons = document.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("shows Featured badge when displayType is Featured", () => {
    const reward = makeReward({
      ext: {
        rewardType: "Physical",
        displayType: "Featured",
        imageListPageUrlDesktopWide: "",
        imageListPageUrlDesktopNormal: "",
      } as never,
    });
    render(<RewardsCardGrid {...defaultProps} rewards={[reward]} />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("renders tier fields from schemaData", () => {
    const schemaData: EntitySchemaData = {
      extRequiredFields: new Set(),
      coreRequiredFields: new Set(),
      enumFields: {},
      extFields: {
        rewardCostCore: { type: "number", title: "Core", displayOrder: 1, isParent: false },
        rewardCostPremium: { type: "number", title: "Premium", displayOrder: 2, isParent: false },
      },
      categories: [],
      bulkEditableFields: new Set(),
    };
    const reward = makeReward({
      ext: {
        rewardType: "Physical",
        displayType: "Standard",
        imageListPageUrlDesktopWide: "",
        imageListPageUrlDesktopNormal: "",
        rewardCostCore: 100,
        rewardCostPremium: 200,
      } as never,
    });
    render(<RewardsCardGrid {...defaultProps} rewards={[reward]} schemaData={schemaData} />);
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("paginates rewards based on page and pageSize", () => {
    const rewards = [
      makeReward({ _id: "r1", name: "First" }),
      makeReward({ _id: "r2", name: "Second" }),
      makeReward({ _id: "r3", name: "Third" }),
    ];
    render(<RewardsCardGrid {...defaultProps} rewards={rewards} page={1} pageSize={2} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.queryByText("Third")).not.toBeInTheDocument();
  });
});
