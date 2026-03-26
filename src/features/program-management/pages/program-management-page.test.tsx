import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import Component from "./program-management-page";

describe("ProgramManagementPage", () => {
  it("renders the page heading", () => {
    render(<Component />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Program Management",
    );
  });

  it("shows under construction message", () => {
    render(<Component />);
    expect(screen.getByText(/under construction/i)).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<Component />);
    expect(
      screen.getByTestId("page-program-management"),
    ).toBeInTheDocument();
  });
});
