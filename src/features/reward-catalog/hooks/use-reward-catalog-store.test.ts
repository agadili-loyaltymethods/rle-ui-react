import { describe, it, expect, beforeEach } from "vitest";
import { useRewardCatalogStore } from "./use-reward-catalog-store";

beforeEach(() => {
  // Reset store to initial state
  useRewardCatalogStore.setState({
    filterStatus: [],
    viewMode: "list",
    expirationSince: "1m",
    customDateRange: { start: "", end: "" },
    editingReward: null,
    isCreating: false,
    deleteTarget: null,
    bulkDeleteConfirm: false,
    bulkEditOpen: false,
    saving: false,
    quickSearchOpen: false,
    fullscreen: false,
  });
});

describe("use-reward-catalog-store", () => {
  it("exports useRewardCatalogStore", () => {
    expect(useRewardCatalogStore).toBeTypeOf("function");
  });

  it("has correct initial state", () => {
    const state = useRewardCatalogStore.getState();

    expect(state.filterStatus).toEqual([]);
    expect(state.viewMode).toBe("list");
    expect(state.expirationSince).toBe("1m");
    expect(state.customDateRange).toEqual({ start: "", end: "" });
    expect(state.editingReward).toBeNull();
    expect(state.isCreating).toBe(false);
    expect(state.deleteTarget).toBeNull();
    expect(state.bulkDeleteConfirm).toBe(false);
    expect(state.bulkEditOpen).toBe(false);
    expect(state.saving).toBe(false);
    expect(state.quickSearchOpen).toBe(false);
    expect(state.fullscreen).toBe(false);
  });

  it("setFilterStatus updates filterStatus", () => {
    useRewardCatalogStore.getState().setFilterStatus(["active", "expired"]);

    expect(useRewardCatalogStore.getState().filterStatus).toEqual([
      "active",
      "expired",
    ]);
  });

  it("setViewMode updates viewMode", () => {
    useRewardCatalogStore.getState().setViewMode("grid");

    expect(useRewardCatalogStore.getState().viewMode).toBe("grid");
  });

  it("setExpirationSince updates expirationSince", () => {
    useRewardCatalogStore.getState().setExpirationSince("3m");

    expect(useRewardCatalogStore.getState().expirationSince).toBe("3m");
  });

  it("setCustomDateRange updates customDateRange", () => {
    const range = { start: "2026-01-01", end: "2026-12-31" };
    useRewardCatalogStore.getState().setCustomDateRange(range);

    expect(useRewardCatalogStore.getState().customDateRange).toEqual(range);
  });

  it("setIsCreating updates isCreating", () => {
    useRewardCatalogStore.getState().setIsCreating(true);

    expect(useRewardCatalogStore.getState().isCreating).toBe(true);
  });

  it("setDeleteTarget updates deleteTarget", () => {
    useRewardCatalogStore.getState().setDeleteTarget("item-123");

    expect(useRewardCatalogStore.getState().deleteTarget).toBe("item-123");
  });

  it("setBulkDeleteConfirm updates bulkDeleteConfirm", () => {
    useRewardCatalogStore.getState().setBulkDeleteConfirm(true);

    expect(useRewardCatalogStore.getState().bulkDeleteConfirm).toBe(true);
  });

  it("setBulkEditOpen updates bulkEditOpen", () => {
    useRewardCatalogStore.getState().setBulkEditOpen(true);

    expect(useRewardCatalogStore.getState().bulkEditOpen).toBe(true);
  });

  it("setSaving updates saving", () => {
    useRewardCatalogStore.getState().setSaving(true);

    expect(useRewardCatalogStore.getState().saving).toBe(true);
  });

  it("setQuickSearchOpen updates quickSearchOpen", () => {
    useRewardCatalogStore.getState().setQuickSearchOpen(true);

    expect(useRewardCatalogStore.getState().quickSearchOpen).toBe(true);
  });

  it("setFullscreen updates fullscreen", () => {
    useRewardCatalogStore.getState().setFullscreen(true);

    expect(useRewardCatalogStore.getState().fullscreen).toBe(true);
  });
});
