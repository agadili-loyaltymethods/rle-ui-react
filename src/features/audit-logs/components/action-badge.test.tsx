import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { ActionBadge } from "./action-badge";

describe("ActionBadge", () => {
  it("renders the action text", () => {
    render(<ActionBadge action="CREATE" />);
    expect(screen.getByText("CREATE")).toBeInTheDocument();
  });

  it("renders UPDATE action", () => {
    render(<ActionBadge action="UPDATE" />);
    expect(screen.getByText("UPDATE")).toBeInTheDocument();
  });

  it("renders DELETE action", () => {
    render(<ActionBadge action="DELETE" />);
    expect(screen.getByText("DELETE")).toBeInTheDocument();
  });

  it("renders unknown action with fallback variant", () => {
    render(<ActionBadge action="UNKNOWN" />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});
