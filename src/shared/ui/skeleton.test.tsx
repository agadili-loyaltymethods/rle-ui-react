import { describe, it, expect } from "vitest";
import { render } from "@/test-utils";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    expect(container.firstChild).toHaveClass("h-10", "w-full");
  });

  it("renders with data-testid", () => {
    const { container } = render(<Skeleton data-testid="loading-skeleton" />);
    expect(container.querySelector("[data-testid='loading-skeleton']")).toBeInTheDocument();
  });
});
