import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="Members" />);
    expect(screen.getByText("Members")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<PageHeader title="Members" description="Manage all members" />);
    expect(screen.getByText("Manage all members")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(
      <PageHeader
        title="Members"
        actions={<button data-testid="action-btn">Add</button>}
      />,
    );
    expect(screen.getByTestId("action-btn")).toBeInTheDocument();
  });
});
