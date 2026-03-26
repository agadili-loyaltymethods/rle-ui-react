import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { StatsBar } from "./stats-bar";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ data: { count: 0 } }) },
}));

describe("StatsBar", () => {
  it("renders stat labels", () => {
    render(<StatsBar />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Redeemed")).toBeInTheDocument();
  });
});
