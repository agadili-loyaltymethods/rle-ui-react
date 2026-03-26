import { describe, it, expect } from "vitest";
import {
  getUserDisplayName,
  getRewardStatus,
  type RewardCatalogItem,
  type PopulatedUser,
} from "./reward-policy";

describe("getUserDisplayName", () => {
  it("returns empty string for undefined", () => {
    expect(getUserDisplayName(undefined)).toBe("");
  });

  it("returns the string directly if value is a string", () => {
    expect(getUserDisplayName("john_doe")).toBe("john_doe");
  });

  it("returns empName when populated user has empName", () => {
    const user: PopulatedUser = { _id: "u1", login: "org/john", empName: "John Doe" };
    expect(getUserDisplayName(user)).toBe("John Doe");
  });

  it("returns login when populated user has no empName", () => {
    const user: PopulatedUser = { _id: "u1", login: "org/john" };
    expect(getUserDisplayName(user)).toBe("org/john");
  });

  it("returns _id when populated user has no empName or login", () => {
    const user: PopulatedUser = { _id: "u1", login: "" };
    expect(getUserDisplayName(user)).toBe("u1");
  });
});

describe("getRewardStatus", () => {
  const baseReward = {
    _id: "rew-1",
    name: "Test",
    desc: "",
  } as RewardCatalogItem;

  it("returns 'active' for current reward", () => {
    const reward = {
      ...baseReward,
      effectiveDate: "2020-01-01T00:00:00.000Z",
      expirationDate: "3000-01-01T00:00:00.000Z",
    };
    expect(getRewardStatus(reward)).toBe("active");
  });

  it("returns 'expired' for past reward", () => {
    const reward = {
      ...baseReward,
      effectiveDate: "2020-01-01T00:00:00.000Z",
      expirationDate: "2020-06-01T00:00:00.000Z",
    };
    expect(getRewardStatus(reward)).toBe("expired");
  });

  it("returns 'future' for future reward", () => {
    const reward = {
      ...baseReward,
      effectiveDate: "3000-01-01T00:00:00.000Z",
      expirationDate: "3001-01-01T00:00:00.000Z",
    };
    expect(getRewardStatus(reward)).toBe("future");
  });
});
