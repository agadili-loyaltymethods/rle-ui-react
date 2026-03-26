import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders without crashing", () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).toBeInTheDocument();
  });

  it("renders checked", () => {
    render(<Checkbox checked aria-label="Checked" />);
    expect(screen.getByRole("checkbox", { name: "Checked" })).toBeChecked();
  });

  it("renders unchecked by default", () => {
    render(<Checkbox aria-label="Unchecked" />);
    expect(screen.getByRole("checkbox", { name: "Unchecked" })).not.toBeChecked();
  });

  it("renders disabled", () => {
    render(<Checkbox disabled aria-label="Disabled" />);
    expect(screen.getByRole("checkbox", { name: "Disabled" })).toBeDisabled();
  });

  it("calls onCheckedChange when clicked", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="Toggle" />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Toggle" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
