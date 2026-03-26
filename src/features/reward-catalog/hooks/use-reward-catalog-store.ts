/**
 * Zustand store for reward catalog client-only state.
 *
 * Server-managed state (search, pagination, sorting, selection) lives in useServerTable.
 * This store only holds UI-specific state: filters, view mode, drawer/dialog toggles.
 */

import { create } from "zustand";
import type {
  RewardCatalogItem,
  RewardStatus,
  ViewMode,
  ExpirationSince,
  CustomDateRange,
} from "../types/reward-policy";

interface RewardCatalogState {
  filterStatus: RewardStatus[];
  viewMode: ViewMode;
  expirationSince: ExpirationSince;
  customDateRange: CustomDateRange;
  editingReward: RewardCatalogItem | null;
  isCreating: boolean;
  deleteTarget: string | null;
  bulkDeleteConfirm: boolean;
  bulkEditOpen: boolean;
  saving: boolean;
  quickSearchOpen: boolean;
  fullscreen: boolean;

  setFilterStatus: (status: RewardStatus[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setExpirationSince: (since: ExpirationSince) => void;
  setCustomDateRange: (range: CustomDateRange) => void;
  setEditingReward: (reward: RewardCatalogItem | null) => void;
  setIsCreating: (creating: boolean) => void;
  setDeleteTarget: (id: string | null) => void;
  setBulkDeleteConfirm: (open: boolean) => void;
  setBulkEditOpen: (open: boolean) => void;
  setSaving: (saving: boolean) => void;
  setQuickSearchOpen: (open: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
}

export const useRewardCatalogStore = create<RewardCatalogState>((set) => ({
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

  setFilterStatus: (status) => set({ filterStatus: status }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setExpirationSince: (since) => set({ expirationSince: since }),
  setCustomDateRange: (range) => set({ customDateRange: range }),
  setEditingReward: (reward) => set({ editingReward: reward }),
  setIsCreating: (creating) => set({ isCreating: creating }),
  setDeleteTarget: (id) => set({ deleteTarget: id }),
  setBulkDeleteConfirm: (open) => set({ bulkDeleteConfirm: open }),
  setBulkEditOpen: (open) => set({ bulkEditOpen: open }),
  setSaving: (saving) => set({ saving }),
  setQuickSearchOpen: (open) => set({ quickSearchOpen: open }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
}));
