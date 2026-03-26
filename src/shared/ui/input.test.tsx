import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { Input } from "./input";

describe("Input", () => {
  it("renders without crashing", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders with type='password'", () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");
  });

  it("renders with error state", () => {
    render(<Input error placeholder="Error input" />);
    expect(screen.getByPlaceholderText("Error input")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders disabled", () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });
});
