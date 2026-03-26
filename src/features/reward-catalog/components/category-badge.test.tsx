import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { CategoryBadge } from "./category-badge";

describe("CategoryBadge", () => {
  it("renders with name and color", () => {
    render(<CategoryBadge name="Electronics" color="#3B82F6" />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("applies color styling", () => {
    render(<CategoryBadge name="Food" color="#EF4444" />);
    const badge = screen.getByText("Food");
    expect(badge).toHaveStyle({ color: "#EF4444" });
  });
});
