import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { App } from "./app";

vi.mock("./providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

vi.mock("./router", () => ({
  AppRouter: () => <div data-testid="app-router">Router</div>,
}));

describe("App", () => {
  it("renders Providers wrapping AppRouter", () => {
    render(<App />);
    expect(screen.getByTestId("providers")).toBeInTheDocument();
    expect(screen.getByTestId("app-router")).toBeInTheDocument();
  });

  it("renders AppRouter inside Providers", () => {
    render(<App />);
    const providers = screen.getByTestId("providers");
    const router = screen.getByTestId("app-router");
    expect(providers).toContainElement(router);
  });
});
