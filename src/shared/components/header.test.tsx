import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor, mockAuthenticatedUser } from "@/test-utils";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useUIStore } from "@/shared/stores/ui-store";
import { BreadcrumbProvider } from "./breadcrumb-context";
import { Header } from "./header";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHeader(route = "/") {
  return render(
    <BreadcrumbProvider>
      <Header />
    </BreadcrumbProvider>,
    { routerEntries: [route] },
  );
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser({
      user: {
        id: "user-1",
        login: "testuser",
        empName: "Test User",
        email: "test@example.com",
        org: "test-org",
      },
    });
    useUIStore.setState({ theme: "light", sidebarMobileOpen: false });
  });

  it("renders the header", () => {
    renderHeader();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("displays user initials derived from empName", () => {
    renderHeader();
    // "Test User" -> "TU"
    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("displays login-based initials when empName is absent", () => {
    mockAuthenticatedUser({
      user: {
        id: "user-1",
        login: "admin",
        email: "admin@test.com",
        org: "test-org",
      },
    });
    renderHeader();
    // "admin" -> "AD"
    expect(screen.getByText("AD")).toBeInTheDocument();
  });

  it("shows generic icon when no user is logged in", () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    renderHeader();
    // No initials rendered; the User icon is used instead
    expect(screen.queryByText("TU")).not.toBeInTheDocument();
  });

  it("opens the user menu on avatar click", async () => {
    const user = userEvent.setup();
    renderHeader();
    expect(screen.queryByTestId("header-user-menu")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("header-user-menu-trigger"));
    expect(screen.getByTestId("header-user-menu")).toBeInTheDocument();
  });

  it("displays user name and email in the open menu", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-user-menu-trigger"));

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays login as name when empName is absent", async () => {
    mockAuthenticatedUser({
      user: {
        id: "user-1",
        login: "admin",
        email: "admin@test.com",
        org: "test-org",
      },
    });
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-user-menu-trigger"));

    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("navigates to profile when Profile is clicked", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-user-menu-trigger"));
    await user.click(screen.getByTestId("header-user-menu-profile"));

    expect(mockNavigate).toHaveBeenCalledWith("/settings/account");
    // Menu should close
    expect(screen.queryByTestId("header-user-menu")).not.toBeInTheDocument();
  });

  it("toggles theme from light to dark", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-user-menu-trigger"));

    const themeBtn = screen.getByTestId("header-user-menu-theme-toggle");
    expect(themeBtn).toHaveTextContent("Dark mode");

    await user.click(themeBtn);
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("shows Light mode label when theme is dark", async () => {
    useUIStore.setState({ theme: "dark" });
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-user-menu-trigger"));

    expect(screen.getByTestId("header-user-menu-theme-toggle")).toHaveTextContent("Light mode");
  });

  it("logs out and navigates to /login", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-user-menu-trigger"));
    await user.click(screen.getByTestId("header-user-menu-logout"));

    expect(mockNavigate).toHaveBeenCalledWith("/login");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(screen.queryByTestId("header-user-menu")).not.toBeInTheDocument();
  });

  it("closes user menu when clicking outside", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByTestId("header-user-menu-trigger"));
    expect(screen.getByTestId("header-user-menu")).toBeInTheDocument();

    // Click on the header itself (outside the menu)
    await user.click(screen.getByTestId("app-header"));
    await waitFor(() => {
      expect(screen.queryByTestId("header-user-menu")).not.toBeInTheDocument();
    });
  });

  it("hamburger button sets mobile sidebar open", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTestId("header-hamburger"));
    expect(useUIStore.getState().sidebarMobileOpen).toBe(true);
  });

  it("renders notifications button", () => {
    renderHeader();
    expect(screen.getByTestId("header-notifications")).toBeInTheDocument();
  });

  it("renders command palette trigger", () => {
    renderHeader();
    expect(screen.getByTestId("command-palette-trigger")).toBeInTheDocument();
  });

  it("toggles user menu closed on second click", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByTestId("header-user-menu-trigger"));
    expect(screen.getByTestId("header-user-menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("header-user-menu-trigger"));
    expect(screen.queryByTestId("header-user-menu")).not.toBeInTheDocument();
  });
});
