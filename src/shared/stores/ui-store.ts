import { create } from "zustand";

type Theme = "light" | "dark";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  theme: Theme;
  currentOrg: string | null;
  currentProgram: string | null;
  currentProgramName: string | null;
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setOrg: (org: string | null) => void;
  setProgram: (id: string | null, name?: string | null) => void;
}

function loadBoolean(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val === "true" : fallback;
  } catch {
    return fallback;
  }
}

function loadString<T extends string>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return (val as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: loadBoolean("rcx.ui.sidebarCollapsed", false),
  sidebarMobileOpen: false,
  theme: loadString<Theme>("rcx.ui.theme", "light"),
  currentOrg: null,
  currentProgram: localStorage.getItem("rcx.ui.currentProgram") ?? null,
  currentProgramName: localStorage.getItem("rcx.ui.currentProgramName") ?? null,

  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem("rcx.ui.sidebarCollapsed", String(next));
      return { sidebarCollapsed: next };
    }),

  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

  setTheme: (theme) => {
    localStorage.setItem("rcx.ui.theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ theme });
  },

  setOrg: (org) => set({ currentOrg: org }),
  setProgram: (id, name) => {
    if (id) {
      localStorage.setItem("rcx.ui.currentProgram", id);
      localStorage.setItem("rcx.ui.currentProgramName", name ?? "");
    } else {
      localStorage.removeItem("rcx.ui.currentProgram");
      localStorage.removeItem("rcx.ui.currentProgramName");
    }
    set({ currentProgram: id, currentProgramName: name ?? null });
  },
}));
