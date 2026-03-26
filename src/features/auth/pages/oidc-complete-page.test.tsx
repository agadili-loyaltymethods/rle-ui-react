import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import OidcCompletePage from "./oidc-complete-page";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(() =>
      Promise.resolve({
        data: { id: "user-1", login: "org/user", email: "user@test.com" },
      }),
    ),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

describe("OidcCompletePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("shows loading spinner when processing login", () => {
    mockSearchParams = new URLSearchParams({ token: "abc", username: "org/user" });
    render(<OidcCompletePage />);
    expect(screen.getByText("Completing sign-in...")).toBeInTheDocument();
  });

  it("displays error when error param is present", () => {
    mockSearchParams = new URLSearchParams({ error: "Access denied" });
    render(<OidcCompletePage />);
    expect(screen.getByText("Authentication Error")).toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("shows back to login button on error", () => {
    mockSearchParams = new URLSearchParams({ error: "Something went wrong" });
    render(<OidcCompletePage />);
    expect(screen.getByText("Back to Login")).toBeInTheDocument();
  });

  it("navigates to login when back button is clicked on error", async () => {
    mockSearchParams = new URLSearchParams({ error: "fail" });
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<OidcCompletePage />);

    await user.click(screen.getByText("Back to Login"));
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("displays error when token or username is missing", () => {
    mockSearchParams = new URLSearchParams();
    render(<OidcCompletePage />);
    expect(screen.getByText("Missing authentication data.")).toBeInTheDocument();
  });

  it("navigates to overview on successful login", async () => {
    mockSearchParams = new URLSearchParams({ token: "abc123", username: "org/testuser" });
    render(<OidcCompletePage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/overview", { replace: true });
    });
  });
});
