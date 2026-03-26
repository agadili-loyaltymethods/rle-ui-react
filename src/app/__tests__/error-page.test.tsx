import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { render } from "@/test-utils";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/test-utils/mocks";
import {
  AuthenticatedErrorPage,
  AnonymousErrorPage,
  RootErrorBoundary,
} from "../error-page";

function ThrowingComponent(): never {
  throw new Error("Test explosion");
}

function renderWithErrorRoute(
  errorElement: React.ReactElement,
  initialEntries: string[] = ["/"],
) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <ThrowingComponent />,
        errorElement,
      },
      {
        path: "/overview",
        element: <div data-testid="overview-page">Overview</div>,
      },
    ],
    { initialEntries },
  );

  return { ...render(<RouterProvider router={router} />), router };
}

function ThrowingNonError(): never {
  // eslint-disable-next-line no-throw-literal
  throw "string error";
}

// Throwing a Response from a component doesn't produce a route error response.
// Use a loader to trigger non-404 route error responses.

function renderWithCustomError(
  errorElement: React.ReactElement,
  ErrorComponent: () => never,
) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <ErrorComponent />,
        errorElement,
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

function renderWith404(errorElement: React.ReactElement) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <div>Home</div>,
        errorElement,
      },
    ],
    { initialEntries: ["/nonexistent-page"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("AnonymousErrorPage", () => {
  it("renders the error message with branding and login button", () => {
    renderWithErrorRoute(<AnonymousErrorPage />);

    expect(screen.getByTestId("error-page-anonymous")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-login")).toBeInTheDocument();
    expect(screen.getByAltText("ReactorCX logo")).toBeInTheDocument();
  });

  it("renders error description text", () => {
    renderWithErrorRoute(<AnonymousErrorPage />);

    // In DEV mode, the actual error message is shown ("Test explosion")
    expect(screen.getByText("Test explosion")).toBeInTheDocument();
  });

  it("shows 'Page not found' for 404 route errors", () => {
    renderWith404(<AnonymousErrorPage />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByText(/doesn't exist or has been moved/),
    ).toBeInTheDocument();
  });

  it("shows generic message for non-Error thrown values", () => {
    renderWithCustomError(<AnonymousErrorPage />, ThrowingNonError);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred. Please try again."),
    ).toBeInTheDocument();
  });

  it("login button has correct aria-label", () => {
    renderWithErrorRoute(<AnonymousErrorPage />);

    const loginButton = screen.getByTestId("error-go-login");
    expect(loginButton).toHaveAttribute("aria-label", "Go to login page");
  });

  it("login button is clickable", async () => {
    const user = userEvent.setup();
    renderWithErrorRoute(<AnonymousErrorPage />);

    const loginButton = screen.getByTestId("error-go-login");
    expect(loginButton).toBeEnabled();
    await user.click(loginButton);
  });
});

describe("AuthenticatedErrorPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
  });

  it("renders the error message with go back and go home buttons", () => {
    renderWithErrorRoute(<AuthenticatedErrorPage />);

    expect(screen.getByTestId("error-page")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-back")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-home")).toBeInTheDocument();
  });

  it("shows 'Page not found' for 404 route errors", () => {
    mockAuthenticatedUser();
    renderWith404(<AuthenticatedErrorPage />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("go back button has correct aria-label", () => {
    renderWithErrorRoute(<AuthenticatedErrorPage />);

    expect(screen.getByTestId("error-go-back")).toHaveAttribute(
      "aria-label",
      "Go back to previous page",
    );
  });

  it("go home button has correct aria-label", () => {
    renderWithErrorRoute(<AuthenticatedErrorPage />);

    expect(screen.getByTestId("error-go-home")).toHaveAttribute(
      "aria-label",
      "Go to home page",
    );
  });

  it("go home button is clickable", async () => {
    const user = userEvent.setup();
    renderWithErrorRoute(<AuthenticatedErrorPage />);

    const goHomeButton = screen.getByTestId("error-go-home");
    expect(goHomeButton).toBeEnabled();
    // Verify clicking doesn't throw
    await user.click(goHomeButton);
  });
});

describe("RootErrorBoundary", () => {
  it("renders authenticated error page when user is logged in", () => {
    mockAuthenticatedUser();
    renderWithErrorRoute(<RootErrorBoundary />);

    expect(screen.getByTestId("error-page")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-home")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-back")).toBeInTheDocument();
  });

  it("renders anonymous error page when user is not logged in", () => {
    mockUnauthenticatedUser();
    renderWithErrorRoute(<RootErrorBoundary />);

    expect(screen.getByTestId("error-page-anonymous")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-login")).toBeInTheDocument();
  });

  it("does not show go home/back buttons for anonymous users", () => {
    mockUnauthenticatedUser();
    renderWithErrorRoute(<RootErrorBoundary />);

    expect(screen.queryByTestId("error-go-home")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-go-back")).not.toBeInTheDocument();
  });

  it("does not show login button for authenticated users", () => {
    mockAuthenticatedUser();
    renderWithErrorRoute(<RootErrorBoundary />);

    expect(screen.queryByTestId("error-go-login")).not.toBeInTheDocument();
  });
});
