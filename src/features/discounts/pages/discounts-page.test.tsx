import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import Component from "./discounts-page";

describe("DiscountsPage", () => {
  it("renders the page heading", () => {
    render(<Component />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Discounts",
    );
  });

  it("shows under construction message", () => {
    render(<Component />);
    expect(screen.getByText(/under construction/i)).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<Component />);
    expect(screen.getByTestId("page-discounts")).toBeInTheDocument();
  });
});
