import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "./ui-store";

describe("ui-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: "light",
      currentOrg: null,
      currentProgram: null,
      currentProgramName: null,
    });
  });

  it("has correct initial state", () => {
    const state = useUIStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.sidebarMobileOpen).toBe(false);
    expect(state.theme).toBe("light");
    expect(state.currentOrg).toBeNull();
    expect(state.currentProgram).toBeNull();
    expect(state.currentProgramName).toBeNull();
  });

  describe("toggleSidebar", () => {
    it("toggles sidebarCollapsed and persists to localStorage", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
      expect(localStorage.getItem("rcx.ui.sidebarCollapsed")).toBe("true");

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
      expect(localStorage.getItem("rcx.ui.sidebarCollapsed")).toBe("false");
    });
  });

  describe("setSidebarMobileOpen", () => {
    it("sets sidebarMobileOpen", () => {
      useUIStore.getState().setSidebarMobileOpen(true);
      expect(useUIStore.getState().sidebarMobileOpen).toBe(true);

      useUIStore.getState().setSidebarMobileOpen(false);
      expect(useUIStore.getState().sidebarMobileOpen).toBe(false);
    });
  });

  describe("setTheme", () => {
    it("sets theme and persists to localStorage", () => {
      useUIStore.getState().setTheme("dark");

      expect(useUIStore.getState().theme).toBe("dark");
      expect(localStorage.getItem("rcx.ui.theme")).toBe("dark");
    });

    it("adds dark class to document when theme is dark", () => {
      useUIStore.getState().setTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class from document when theme is light", () => {
      useUIStore.getState().setTheme("dark");
      useUIStore.getState().setTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("setOrg", () => {
    it("sets currentOrg", () => {
      useUIStore.getState().setOrg("gap");
      expect(useUIStore.getState().currentOrg).toBe("gap");
    });

    it("clears currentOrg when null", () => {
      useUIStore.getState().setOrg("gap");
      useUIStore.getState().setOrg(null);
      expect(useUIStore.getState().currentOrg).toBeNull();
    });
  });

  describe("setProgram", () => {
    it("sets currentProgram and currentProgramName and persists to localStorage", () => {
      useUIStore.getState().setProgram("prog1", "Loyalty Program");

      expect(useUIStore.getState().currentProgram).toBe("prog1");
      expect(useUIStore.getState().currentProgramName).toBe("Loyalty Program");
      expect(localStorage.getItem("rcx.ui.currentProgram")).toBe("prog1");
      expect(localStorage.getItem("rcx.ui.currentProgramName")).toBe("Loyalty Program");
    });

    it("clears program from state and localStorage when id is null", () => {
      useUIStore.getState().setProgram("prog1", "Loyalty Program");
      useUIStore.getState().setProgram(null);

      expect(useUIStore.getState().currentProgram).toBeNull();
      expect(useUIStore.getState().currentProgramName).toBeNull();
      expect(localStorage.getItem("rcx.ui.currentProgram")).toBeNull();
      expect(localStorage.getItem("rcx.ui.currentProgramName")).toBeNull();
    });

    it("defaults name to null when not provided", () => {
      useUIStore.getState().setProgram("prog1");
      expect(useUIStore.getState().currentProgramName).toBeNull();
    });
  });
});
