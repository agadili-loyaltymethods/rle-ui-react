import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders without crashing", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders with variant='success'", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders with variant='error'", () => {
    render(<Badge variant="error">Error</Badge>);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders with variant='outline'", () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText("Outline")).toBeInTheDocument();
  });
});
