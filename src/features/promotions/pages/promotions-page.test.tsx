import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import Component from "./promotions-page";

describe("PromotionsPage", () => {
  it("renders the page heading", () => {
    render(<Component />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Promotions",
    );
  });

  it("shows under construction message", () => {
    render(<Component />);
    expect(screen.getByText(/under construction/i)).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<Component />);
    expect(screen.getByTestId("page-promotions")).toBeInTheDocument();
  });
});
