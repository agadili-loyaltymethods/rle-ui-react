import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { NoProgramBanner } from "./no-program-banner";

describe("NoProgramBanner", () => {
  it("renders with default message", () => {
    render(<NoProgramBanner data-testid="no-program" />);
    expect(screen.getByTestId("no-program")).toBeInTheDocument();
    expect(screen.getByText("No program selected")).toBeInTheDocument();
  });

  it("includes context in message", () => {
    render(<NoProgramBanner context="activity templates" />);
    expect(
      screen.getByText(/to view activity templates/),
    ).toBeInTheDocument();
  });
});
