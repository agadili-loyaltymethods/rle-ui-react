import { describe, it, expect } from "vitest";
import { rewardConfig } from "./reward-config";

describe("reward-config", () => {
  it("exports rewardConfig object", () => {
    expect(rewardConfig).toBeTypeOf("object");
  });

  it("has correct modelName", () => {
    expect(rewardConfig.modelName).toBe("RewardPolicy");
  });

  it("has correct endpoint", () => {
    expect(rewardConfig.endpoint).toBe("rewardpolicies");
  });

  it("has correct pageTitle", () => {
    expect(rewardConfig.pageTitle).toBe("Rewards Catalog");
  });

  it("has correct singularTitle", () => {
    expect(rewardConfig.singularTitle).toBe("Reward");
  });

  it("has testIdPrefix", () => {
    expect(rewardConfig.testIdPrefix).toBe("rewards");
  });

  it("has defaultSort set to name", () => {
    expect(rewardConfig.defaultSort).toBe("name");
  });

  it("has populate array with createdBy and updatedBy", () => {
    expect(rewardConfig.populate).toContain("createdBy");
    expect(rewardConfig.populate).toContain("updatedBy");
  });

  it("has searchFields defined", () => {
    expect(rewardConfig.searchFields).toBeInstanceOf(Array);
    expect(rewardConfig.searchFields!.length).toBeGreaterThan(0);
    expect(rewardConfig.searchFields).toContain("name");
  });

  it("has coreColumns defined", () => {
    expect(rewardConfig.coreColumns).toBeInstanceOf(Array);
    expect(rewardConfig.coreColumns.length).toBeGreaterThan(0);
  });

  it("has image column with custom renderer", () => {
    const imageCol = rewardConfig.coreColumns.find((c) => c.field === "image");

    expect(imageCol).toBeDefined();
    expect(imageCol!.cellRenderer).toBe("image");
  });

  it("has empty coreFormFields (uses custom drawer)", () => {
    expect(rewardConfig.coreFormFields).toEqual([]);
  });
});
