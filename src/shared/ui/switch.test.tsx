import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders without crashing", () => {
    render(<Switch checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders checked state", () => {
    render(<Switch checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("renders unchecked state", () => {
    render(<Switch checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("renders disabled", () => {
    render(<Switch checked={false} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
