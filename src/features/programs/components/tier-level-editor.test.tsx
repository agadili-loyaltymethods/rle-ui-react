import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { TierLevelEditor } from "./tier-level-editor";
import type { TierLevel } from "@/shared/types/member";

const baseLevels: TierLevel[] = [
  { name: "Silver", number: 1, threshold: 0, color: "#C0C0C0", defaultLevel: true },
  { name: "Gold", number: 2, threshold: 500, color: "#FFD700", defaultLevel: false },
  { name: "Platinum", number: 3, threshold: 1000, color: "#E5E4E2", defaultLevel: false },
];

describe("TierLevelEditor", () => {
  it("renders empty state when no levels", () => {
    render(<TierLevelEditor levels={[]} onChange={vi.fn()} />);
    expect(screen.getByText("No levels defined. Add at least one.")).toBeInTheDocument();
  });

  it("renders with levels", () => {
    const levels: TierLevel[] = [
      { name: "Gold", number: 1, threshold: 100, color: "#FFD700", defaultLevel: true },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} />);
    expect(screen.getByTestId("tier-level-editor")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("shows add level button", () => {
    render(<TierLevelEditor levels={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Add First Level")).toBeInTheDocument();
  });

  it("renders all level items in the left panel", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
  });

  it("displays level count", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    expect(screen.getByText(/3 levels/)).toBeInTheDocument();
  });

  it("displays singular level count for 1 level", () => {
    const levels: TierLevel[] = [
      { name: "Base", number: 1, threshold: 0, color: "#888", defaultLevel: true },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} />);
    expect(screen.getByText(/1 level\b/)).toBeInTheDocument();
  });

  it("shows Add Level button in header", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    expect(screen.getByTestId("tier-add-level")).toBeInTheDocument();
  });

  it("calls onChange with new level when Add Level is clicked", () => {
    const onChange = vi.fn();
    render(<TierLevelEditor levels={baseLevels} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("tier-add-level"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const newLevels = onChange.mock.calls[0]![0] as TierLevel[];
    expect(newLevels).toHaveLength(4);
    expect(newLevels[3]!.number).toBe(4);
  });

  it("calls onChange with new level from empty state", () => {
    const onChange = vi.fn();
    render(<TierLevelEditor levels={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Add First Level"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const newLevels = onChange.mock.calls[0]![0] as TierLevel[];
    expect(newLevels).toHaveLength(1);
    expect(newLevels[0]!.number).toBe(1);
  });

  it("selects a level when clicking on it", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    // First level is selected by default - detail form shows
    expect(screen.getByTestId("tier-level-detail-0")).toBeInTheDocument();

    // Click on Gold level
    fireEvent.click(screen.getByTestId("tier-level-item-new-1"));
    expect(screen.getByTestId("tier-level-detail-1")).toBeInTheDocument();
  });

  it("shows detail form for selected level", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    // Default selected is index 0 (Silver)
    const nameInput = screen.getByTestId("tier-level-0-name");
    expect(nameInput).toHaveValue("Silver");
  });

  it("calls onChange when updating level name", () => {
    const onChange = vi.fn();
    render(<TierLevelEditor levels={baseLevels} onChange={onChange} />);
    const nameInput = screen.getByTestId("tier-level-0-name");
    fireEvent.change(nameInput, { target: { value: "Bronze" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0]![0] as TierLevel[];
    expect(updated[0]!.name).toBe("Bronze");
  });

  it("calls onChange when updating threshold", () => {
    const onChange = vi.fn();
    render(<TierLevelEditor levels={baseLevels} onChange={onChange} />);
    // Threshold input for the default level is disabled
    const thresholdInput = screen.getByTestId("tier-level-0-threshold");
    expect(thresholdInput).toBeDisabled();

    // Select a non-default level (Gold, index 1)
    fireEvent.click(screen.getByTestId("tier-level-item-new-1"));
    const goldThreshold = screen.getByTestId("tier-level-1-threshold");
    fireEvent.change(goldThreshold, { target: { value: "750" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows Remove Level button only when more than one level", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    expect(screen.getByText("Remove Level")).toBeInTheDocument();
  });

  it("does not show Remove Level button for single level", () => {
    const levels: TierLevel[] = [
      { name: "Base", number: 1, threshold: 0, color: "#888", defaultLevel: true },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} />);
    expect(screen.queryByText("Remove Level")).not.toBeInTheDocument();
  });

  it("calls onChange when removing a level", () => {
    const onChange = vi.fn();
    render(<TierLevelEditor levels={baseLevels} onChange={onChange} />);
    fireEvent.click(screen.getByText("Remove Level"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0]![0] as TierLevel[];
    expect(updated).toHaveLength(2);
    // Remaining levels are renumbered
    expect(updated[0]!.number).toBe(1);
    expect(updated[1]!.number).toBe(2);
  });

  it("toggles default level checkbox", () => {
    const onChange = vi.fn();
    // Select gold (non-default)
    render(<TierLevelEditor levels={baseLevels} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("tier-level-item-new-1"));

    const defaultCheckbox = screen.getByTestId("tier-level-1-default");
    fireEvent.click(defaultCheckbox);
    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[0]![0] as TierLevel[];
    // When setting Gold as default, Silver should no longer be default
    expect(updated[1]!.defaultLevel).toBe(true);
    expect(updated[0]!.defaultLevel).toBe(false);
  });

  it("shows 'never expires' message for default level", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    expect(screen.getByText("The default tier level never expires.")).toBeInTheDocument();
  });

  it("shows Expiry Settings accordion for non-default level", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    // Select Gold (non-default)
    fireEvent.click(screen.getByTestId("tier-level-item-new-1"));
    expect(screen.getByText("Expiry Settings")).toBeInTheDocument();
  });

  it("expands Expiry Settings on click", () => {
    render(<TierLevelEditor levels={baseLevels} onChange={vi.fn()} />);
    // Select Gold (non-default)
    fireEvent.click(screen.getByTestId("tier-level-item-new-1"));
    fireEvent.click(screen.getByText("Expiry Settings"));
    // Should show Expiry Unit label
    expect(screen.getByText("Expiry Unit")).toBeInTheDocument();
    expect(screen.getByText("Expiry Value")).toBeInTheDocument();
    expect(screen.getByText("Snap To")).toBeInTheDocument();
    expect(screen.getByText("Warning Days")).toBeInTheDocument();
  });

  it("setting defaultLevel resets threshold and expiry fields", () => {
    const onChange = vi.fn();
    render(<TierLevelEditor levels={baseLevels} onChange={onChange} />);
    // Select Gold and make it default
    fireEvent.click(screen.getByTestId("tier-level-item-new-1"));
    const defaultCheckbox = screen.getByTestId("tier-level-1-default");
    fireEvent.click(defaultCheckbox);

    const updated = onChange.mock.calls[0]![0] as TierLevel[];
    expect(updated[1]!.threshold).toBe(0);
    expect(updated[1]!.expiryUnit).toBeUndefined();
    expect(updated[1]!.expiryValue).toBeUndefined();
    expect(updated[1]!.expirationSnapTo).toBeUndefined();
    expect(updated[1]!.expiryWarningDays).toBeUndefined();
  });

  it("renders 'Untitled' for level with no name", () => {
    const levels: TierLevel[] = [
      { name: "", number: 1, threshold: 0, color: "#888", defaultLevel: true },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("renders 'Base' for level with zero threshold", () => {
    const levels: TierLevel[] = [
      { name: "Test", number: 1, threshold: 0, color: "#888", defaultLevel: false },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} />);
    expect(screen.getByText("Base")).toBeInTheDocument();
  });

  it("uses custom currencyLabel", () => {
    const levels: TierLevel[] = [
      { name: "Gold", number: 1, threshold: 500, color: "#FFD700", defaultLevel: false },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} currencyLabel="credits" />);
    expect(screen.getByText(/500.*credits/)).toBeInTheDocument();
  });

  it("uses 'pts' as default currencyLabel", () => {
    const levels: TierLevel[] = [
      { name: "Gold", number: 1, threshold: 500, color: "#FFD700", defaultLevel: false },
    ];
    render(<TierLevelEditor levels={levels} onChange={vi.fn()} />);
    expect(screen.getByText(/500.*pts/)).toBeInTheDocument();
  });
});
