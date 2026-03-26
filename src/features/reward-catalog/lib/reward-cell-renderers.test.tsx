import { describe, it, expect, vi } from "vitest";

vi.mock("../types/reward-policy", () => ({
  getRewardStatus: vi.fn(() => "active"),
  getUserDisplayName: vi.fn((val: unknown) =>
    typeof val === "string" ? val : "Unknown",
  ),
}));

import { rewardCellRenderers } from "./reward-cell-renderers";

describe("reward-cell-renderers", () => {
  it("exports rewardCellRenderers object", () => {
    expect(rewardCellRenderers).toBeTypeOf("object");
  });

  it("has image renderer", () => {
    expect(rewardCellRenderers.image).toBeTypeOf("function");
  });

  it("has reward-name renderer", () => {
    expect(rewardCellRenderers["reward-name"]).toBeTypeOf("function");
  });

  it("has reward-status renderer", () => {
    expect(rewardCellRenderers["reward-status"]).toBeTypeOf("function");
  });

  it("has user renderer", () => {
    expect(rewardCellRenderers.user).toBeTypeOf("function");
  });

  it("image renderer returns fallback when no image URL", () => {
    const row = { _id: "1", name: "Test", ext: {} } as never;
    const result = rewardCellRenderers.image(null, row);

    expect(result).toBeTruthy();
  });

  it("reward-name renderer returns element with name", () => {
    const row = { _id: "1", name: "Test Reward", desc: "Description" } as never;
    const result = rewardCellRenderers["reward-name"](null, row);

    expect(result).toBeTruthy();
  });

  it("user renderer returns element", () => {
    const row = { _id: "1", name: "Test" } as never;
    const result = rewardCellRenderers.user("admin-user", row);

    expect(result).toBeTruthy();
  });
});
