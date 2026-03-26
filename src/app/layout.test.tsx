import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import { useAuthStore } from "@/shared/stores/auth-store";
import { AppLayout } from "./layout";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("@/shared/components/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("@/shared/components/header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/shared/components/breadcrumb-context", () => ({
  BreadcrumbProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="breadcrumb-provider">{children}</div>
  ),
}));

describe("AppLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sidebar, header, and outlet when authenticated", () => {
    mockAuthenticatedUser();
    mockUIState();
    render(
      <MemoryRouter initialEntries={["/test"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/test" element={<div data-testid="child-route">Child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("child-route")).toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    useAuthStore.setState({ isAuthenticated: false, token: null, user: null });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });
});
