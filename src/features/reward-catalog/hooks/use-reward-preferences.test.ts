import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/hooks/use-user-meta", () => ({
  useUserExtLoader: vi.fn(() => true),
  getUserMeta: vi.fn(),
  patchUserMeta: vi.fn(),
}));

import { renderHook, act } from "@/test-utils";
import { getUserMeta, patchUserMeta } from "@/shared/hooks/use-user-meta";
import {
  useUserExtLoader,
  getSavedTableLayout,
  getSavedFormTabOrder,
  getSavedFilterStatus,
  getSavedExpirationSince,
  getSavedCustomDateRange,
  useRewardPreferences,
} from "./use-reward-preferences";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("use-reward-preferences", () => {
  // ── Export checks ──────────────────────────────────────────────────────────
  it("exports all preference functions and hooks", () => {
    expect(useUserExtLoader).toBeTypeOf("function");
    expect(getSavedTableLayout).toBeTypeOf("function");
    expect(getSavedFormTabOrder).toBeTypeOf("function");
    expect(getSavedFilterStatus).toBeTypeOf("function");
    expect(getSavedExpirationSince).toBeTypeOf("function");
    expect(getSavedCustomDateRange).toBeTypeOf("function");
    expect(useRewardPreferences).toBeTypeOf("function");
  });

  // ── getSavedTableLayout ────────────────────────────────────────────────────
  it("getSavedTableLayout returns null when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);
    expect(getSavedTableLayout()).toBeNull();
  });

  it("getSavedTableLayout returns layout from meta", () => {
    const layout = { columns: [{ key: "name", visible: true }] };
    vi.mocked(getUserMeta).mockReturnValue({ rewardsTableLayout: layout });
    expect(getSavedTableLayout()).toEqual(layout);
  });

  it("getSavedTableLayout returns null when meta has no layout key", () => {
    vi.mocked(getUserMeta).mockReturnValue({ someOtherKey: "value" });
    expect(getSavedTableLayout()).toBeNull();
  });

  // ── getSavedFormTabOrder ───────────────────────────────────────────────────
  it("getSavedFormTabOrder returns null when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);
    expect(getSavedFormTabOrder()).toBeNull();
  });

  it("getSavedFormTabOrder returns array from meta", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardFormTabOrder: ["details", "limits"],
    });
    expect(getSavedFormTabOrder()).toEqual(["details", "limits"]);
  });

  it("getSavedFormTabOrder returns null for non-array value", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardFormTabOrder: "not-an-array",
    });
    expect(getSavedFormTabOrder()).toBeNull();
  });

  // ── getSavedFilterStatus ───────────────────────────────────────────────────
  it("getSavedFilterStatus returns empty array when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);
    expect(getSavedFilterStatus()).toEqual([]);
  });

  it("getSavedFilterStatus returns empty array for 'all'", () => {
    vi.mocked(getUserMeta).mockReturnValue({ rewardsFilterStatus: "all" });
    expect(getSavedFilterStatus()).toEqual([]);
  });

  it("getSavedFilterStatus parses single status string", () => {
    vi.mocked(getUserMeta).mockReturnValue({ rewardsFilterStatus: "active" });
    expect(getSavedFilterStatus()).toEqual(["active"]);
  });

  it("getSavedFilterStatus parses 'expired' status string", () => {
    vi.mocked(getUserMeta).mockReturnValue({ rewardsFilterStatus: "expired" });
    expect(getSavedFilterStatus()).toEqual(["expired"]);
  });

  it("getSavedFilterStatus parses 'future' status string", () => {
    vi.mocked(getUserMeta).mockReturnValue({ rewardsFilterStatus: "future" });
    expect(getSavedFilterStatus()).toEqual(["future"]);
  });

  it("getSavedFilterStatus parses JSON array string", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardsFilterStatus: '["active","expired"]',
    });
    expect(getSavedFilterStatus()).toEqual(["active", "expired"]);
  });

  it("getSavedFilterStatus filters invalid values from JSON array", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardsFilterStatus: '["active","invalid","future"]',
    });
    expect(getSavedFilterStatus()).toEqual(["active", "future"]);
  });

  it("getSavedFilterStatus returns empty for unrecognized string", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardsFilterStatus: "unknown-status",
    });
    expect(getSavedFilterStatus()).toEqual([]);
  });

  it("getSavedFilterStatus returns empty for invalid JSON string", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardsFilterStatus: "{not valid json",
    });
    expect(getSavedFilterStatus()).toEqual([]);
  });

  // ── getSavedExpirationSince ────────────────────────────────────────────────
  it("getSavedExpirationSince returns null when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);
    expect(getSavedExpirationSince()).toBeNull();
  });

  it("getSavedExpirationSince returns value from meta", () => {
    vi.mocked(getUserMeta).mockReturnValue({ rewardsExpirationSince: "3m" });
    expect(getSavedExpirationSince()).toBe("3m");
  });

  // ── getSavedCustomDateRange ────────────────────────────────────────────────
  it("getSavedCustomDateRange returns null when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);
    expect(getSavedCustomDateRange()).toBeNull();
  });

  it("getSavedCustomDateRange returns range from meta", () => {
    const range = { start: "2026-01-01", end: "2026-12-31" };
    vi.mocked(getUserMeta).mockReturnValue({ rewardsCustomDateRange: range });
    expect(getSavedCustomDateRange()).toEqual(range);
  });

  it("getSavedCustomDateRange returns null for invalid shape", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardsCustomDateRange: "not-an-object",
    });
    expect(getSavedCustomDateRange()).toBeNull();
  });

  it("getSavedCustomDateRange returns null when missing start/end", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      rewardsCustomDateRange: { start: "2026-01-01" },
    });
    expect(getSavedCustomDateRange()).toBeNull();
  });

  // ── useRewardPreferences hook ──────────────────────────────────────────────
  it("useRewardPreferences returns all save functions", () => {
    const { result } = renderHook(() => useRewardPreferences());

    expect(result.current.saveTableLayout).toBeTypeOf("function");
    expect(result.current.saveFormTabOrder).toBeTypeOf("function");
    expect(result.current.saveFilterStatus).toBeTypeOf("function");
    expect(result.current.saveExpirationSince).toBeTypeOf("function");
    expect(result.current.saveCustomDateRange).toBeTypeOf("function");
  });

  it("saveTableLayout debounces and calls patchUserMeta", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveTableLayout({ columns: [{ key: "name", visible: true }] });
    });

    // Not called yet (debounced)
    expect(patchUserMeta).not.toHaveBeenCalled();

    // Advance timer past debounce
    act(() => { vi.advanceTimersByTime(500); });

    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardsTableLayout: { columns: [{ key: "name", visible: true }] },
    });
  });

  it("saveFormTabOrder debounces and calls patchUserMeta", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveFormTabOrder(["limits", "details"]);
    });

    act(() => { vi.advanceTimersByTime(500); });

    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardFormTabOrder: ["limits", "details"],
    });
  });

  it("saveFilterStatus saves 'all' for empty array", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveFilterStatus([]);
    });

    act(() => { vi.advanceTimersByTime(500); });

    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardsFilterStatus: "all",
    });
  });

  it("saveFilterStatus saves JSON for non-empty array", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveFilterStatus(["active", "future"]);
    });

    act(() => { vi.advanceTimersByTime(500); });

    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardsFilterStatus: '["active","future"]',
    });
  });

  it("saveExpirationSince debounces and calls patchUserMeta", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveExpirationSince("6m");
    });

    act(() => { vi.advanceTimersByTime(500); });

    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardsExpirationSince: "6m",
    });
  });

  it("saveCustomDateRange debounces and calls patchUserMeta", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveCustomDateRange({ start: "2026-01-01", end: "2026-06-30" });
    });

    act(() => { vi.advanceTimersByTime(500); });

    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardsCustomDateRange: { start: "2026-01-01", end: "2026-06-30" },
    });
  });

  it("debounce cancels previous call when called again quickly", () => {
    const { result } = renderHook(() => useRewardPreferences());

    act(() => {
      result.current.saveExpirationSince("1m");
    });

    act(() => { vi.advanceTimersByTime(200); });

    // Call again before debounce fires
    act(() => {
      result.current.saveExpirationSince("6m");
    });

    act(() => { vi.advanceTimersByTime(500); });

    // Only the last value should be saved
    expect(patchUserMeta).toHaveBeenCalledTimes(1);
    expect(patchUserMeta).toHaveBeenCalledWith({
      rewardsExpirationSince: "6m",
    });
  });
});
