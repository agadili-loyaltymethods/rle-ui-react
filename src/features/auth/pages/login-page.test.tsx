import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import LoginPage from "./login-page";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/shared/hooks/use-auth", () => ({
  useLogin: () => ({
    mutate: mockMutate,
    get isPending() {
      return mockIsPending;
    },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("renders sign in heading", () => {
    render(<LoginPage />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("renders username and password inputs", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-username-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-password-input")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Sign In");
  });

  it("renders SSO button", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-sso-button")).toBeInTheDocument();
    expect(screen.getByText("Sign in with OIDC SSO")).toBeInTheDocument();
  });

  it("shows placeholder text for username", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("org/username")).toBeInTheDocument();
  });

  it("shows validation error on empty submit", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Username and password are required.")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows validation error when only username is provided", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByTestId("login-username-input"), "org/user");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Username and password are required.")).toBeInTheDocument();
  });

  it("calls login mutation with credentials on valid submit", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByTestId("login-username-input"), "org/user");
    await user.type(screen.getByTestId("login-password-input"), "secret123");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
    expect(mockMutate).toHaveBeenCalledWith(
      { username: "org/user", password: "secret123" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("does not show error initially", () => {
    render(<LoginPage />);
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
  });

  it("shows signing in text when pending", () => {
    mockIsPending = true;
    render(<LoginPage />);
    expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Signing in...");
  });

  it("navigates to /overview on successful login", async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_creds: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });

    render(<LoginPage />);
    await user.type(screen.getByTestId("login-username-input"), "org/user");
    await user.type(screen.getByTestId("login-password-input"), "secret123");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/overview", { replace: true });
    });
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_creds: unknown, opts: { onError: (err: unknown) => void }) => {
      opts.onError({ message: "Invalid credentials" });
    });

    render(<LoginPage />);
    await user.type(screen.getByTestId("login-username-input"), "org/user");
    await user.type(screen.getByTestId("login-password-input"), "wrong");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows default error when error has no message", async () => {
    const user = userEvent.setup();
    mockMutate.mockImplementation((_creds: unknown, opts: { onError: (err: unknown) => void }) => {
      opts.onError("something");
    });

    render(<LoginPage />);
    await user.type(screen.getByTestId("login-username-input"), "org/user");
    await user.type(screen.getByTestId("login-password-input"), "wrong");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials. Please try again.")).toBeInTheDocument();
    });
  });
});
