import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { Providers } from "./providers";

// Mock ReactQueryDevtools to avoid rendering in tests
vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

describe("Providers", () => {
  it("renders children within the provider tree", () => {
    render(
      <Providers>
        <div data-testid="child-content">Hello</div>
      </Providers>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("exports a named Providers component", () => {
    expect(typeof Providers).toBe("function");
  });
});
