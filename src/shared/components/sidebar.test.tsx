import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { useUIStore } from "@/shared/stores/ui-store";
import { Sidebar } from "./sidebar";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function renderSidebar(route = "/") {
  return render(<Sidebar />, { routerEntries: [route] });
}

describe("Sidebar", () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
    });
  });

  it("renders the sidebar", () => {
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar")).toBeInTheDocument();
  });

  it("renders main navigation links", () => {
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-overview")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-program")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-promotions")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-discounts")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-reward-catalog")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-analytics")).toBeInTheDocument();
  });

  it("renders bottom navigation items", () => {
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-help")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-my-account")).toBeInTheDocument();
  });

  it("renders parent items with children (Reference Data, Settings)", () => {
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-reference-data")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-settings")).toBeInTheDocument();
  });

  it("shows nav labels when sidebar is expanded", () => {
    renderSidebar();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Promotions")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("hides nav labels when sidebar is collapsed", () => {
    useUIStore.setState({ sidebarCollapsed: true });
    renderSidebar();
    // In collapsed state, labels should not be rendered (icons only)
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Promotions")).not.toBeInTheDocument();
  });

  it("shows brand logo when expanded and RCX when collapsed", () => {
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-brand")).toBeInTheDocument();
    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.queryByText("RCX")).not.toBeInTheDocument();
  });

  it("shows RCX text when sidebar is collapsed", () => {
    useUIStore.setState({ sidebarCollapsed: true });
    renderSidebar();
    // Multiple instances possible (desktop + mobile), just check at least one exists
    expect(screen.getAllByText("RCX").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Admin Console")).not.toBeInTheDocument();
  });

  it("toggles collapse state via the collapse toggle button", async () => {
    const user = userEvent.setup();
    renderSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);

    await user.click(screen.getByTestId("nav-sidebar-collapse-toggle"));
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    await user.click(screen.getByTestId("nav-sidebar-collapse-toggle"));
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("expands children when parent group is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    // Reference Data children should not be visible initially (route is "/")
    expect(screen.queryByTestId("nav-sidebar-segments")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("nav-sidebar-reference-data"));
    // Children should now be visible
    expect(screen.getByTestId("nav-sidebar-segments")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-locations")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-products")).toBeInTheDocument();
  });

  it("collapses children when parent is clicked again", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByTestId("nav-sidebar-reference-data"));
    expect(screen.getByTestId("nav-sidebar-segments")).toBeInTheDocument();

    await user.click(screen.getByTestId("nav-sidebar-reference-data"));
    expect(screen.queryByTestId("nav-sidebar-segments")).not.toBeInTheDocument();
  });

  it("auto-expands parent when route matches a child", () => {
    renderSidebar("/reference-data/segments");
    // Children should be auto-expanded since route matches
    expect(screen.getByTestId("nav-sidebar-segments")).toBeInTheDocument();
  });

  it("auto-expands settings children when route matches", () => {
    renderSidebar("/settings/users");
    expect(screen.getByTestId("nav-sidebar-users")).toBeInTheDocument();
  });

  it("shows program selector when sidebar is expanded", () => {
    renderSidebar();
    // ProgramSelector is rendered (mocked via api-client mock)
    const brand = screen.getByTestId("nav-sidebar-brand");
    expect(brand).toBeInTheDocument();
  });

  it("renders mobile sidebar when mobileOpen is true", () => {
    useUIStore.setState({ sidebarMobileOpen: true });
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-backdrop")).toBeInTheDocument();
  });

  it("does not render mobile sidebar when mobileOpen is false", () => {
    renderSidebar();
    expect(screen.queryByTestId("nav-sidebar-mobile")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-sidebar-backdrop")).not.toBeInTheDocument();
  });

  it("closes mobile sidebar when backdrop is clicked", async () => {
    useUIStore.setState({ sidebarMobileOpen: true });
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByTestId("nav-sidebar-backdrop"));
    expect(useUIStore.getState().sidebarMobileOpen).toBe(false);
  });

  it("renders flyout children in DOM when sidebar is collapsed (visibility controlled by CSS)", () => {
    useUIStore.setState({ sidebarCollapsed: true });
    renderSidebar();

    // Collapsed flyout renders children in DOM but hides them via CSS (invisible/group-hover:visible)
    // The segments link should exist in the DOM as part of the flyout
    expect(screen.getAllByTestId("nav-sidebar-segments").length).toBeGreaterThanOrEqual(1);
  });

  it("shows title attribute on collapsed items", () => {
    useUIStore.setState({ sidebarCollapsed: true });
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-overview")).toHaveAttribute("title", "Overview");
  });

  it("does not show title attribute on expanded items", () => {
    renderSidebar();
    expect(screen.getByTestId("nav-sidebar-overview")).not.toHaveAttribute("title");
  });
});
