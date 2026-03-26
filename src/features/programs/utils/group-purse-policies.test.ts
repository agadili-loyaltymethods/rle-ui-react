import { describe, it, expect } from "vitest";
import { groupPursePolicies } from "./group-purse-policies";
import type { PursePolicy } from "@/shared/types/policy";

function makePursePolicy(overrides: Partial<PursePolicy> = {}): PursePolicy {
  return {
    _id: "pp-1",
    name: "Test Policy",
    program: "prog-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as PursePolicy;
}

describe("group-purse-policies", () => {
  it("exports groupPursePolicies function", () => {
    expect(groupPursePolicies).toBeTypeOf("function");
  });

  it("returns empty array for empty input", () => {
    const result = groupPursePolicies([]);

    expect(result).toEqual([]);
  });

  it("treats policies without group as standalone", () => {
    const policies = [
      makePursePolicy({ _id: "1", name: "Alpha" }),
      makePursePolicy({ _id: "2", name: "Beta" }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe("standalone");
    expect(result[1]!.type).toBe("standalone");
  });

  it("treats policies without periodStartDate as standalone even with group", () => {
    const policies = [
      makePursePolicy({ _id: "1", name: "Solo", group: "G1" }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("standalone");
  });

  it("groups qualifying policies by group name", () => {
    const policies = [
      makePursePolicy({
        _id: "1",
        name: "P1",
        group: "GroupA",
        periodStartDate: "2026-01-01",
      }),
      makePursePolicy({
        _id: "2",
        name: "P2",
        group: "GroupA",
        periodStartDate: "2026-06-01",
      }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("group");
    if (result[0]!.type === "group") {
      expect(result[0]!.groupName).toBe("GroupA");
      expect(result[0]!.policies).toHaveLength(2);
    }
  });

  it("sorts groups alphabetically and standalone alphabetically", () => {
    const policies = [
      makePursePolicy({
        _id: "1",
        group: "Zebra",
        periodStartDate: "2026-01-01",
      }),
      makePursePolicy({
        _id: "2",
        group: "Alpha",
        periodStartDate: "2026-01-01",
      }),
      makePursePolicy({ _id: "3", name: "Zeta" }),
      makePursePolicy({ _id: "4", name: "Apple" }),
    ];

    const result = groupPursePolicies(policies);

    // Groups come first
    expect(result[0]!.type).toBe("group");
    if (result[0]!.type === "group") {
      expect(result[0]!.groupName).toBe("Alpha");
    }
    expect(result[1]!.type).toBe("group");
    if (result[1]!.type === "group") {
      expect(result[1]!.groupName).toBe("Zebra");
    }
    // Then standalone, sorted by name
    expect(result[2]!.type).toBe("standalone");
    if (result[2]!.type === "standalone") {
      expect(result[2]!.policy.name).toBe("Apple");
    }
    expect(result[3]!.type).toBe("standalone");
    if (result[3]!.type === "standalone") {
      expect(result[3]!.policy.name).toBe("Zeta");
    }
  });

  it("sorts periods within a group: open first, then closed, each by periodStartDate descending", () => {
    const policies = [
      makePursePolicy({
        _id: "closed-recent",
        group: "G",
        periodStartDate: "2025-06-01",
        periodEndDate: "2025-12-31", // past → closed
      }),
      makePursePolicy({
        _id: "open-old",
        group: "G",
        periodStartDate: "2026-01-01",
        periodEndDate: "2027-12-31", // future → open
      }),
      makePursePolicy({
        _id: "open-new",
        group: "G",
        periodStartDate: "2026-06-01",
        periodEndDate: "2028-06-30", // future → open
      }),
      makePursePolicy({
        _id: "closed-old",
        group: "G",
        periodStartDate: "2024-01-01",
        periodEndDate: "2024-12-31", // past → closed
      }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(1);
    if (result[0]!.type === "group") {
      const ids = result[0]!.policies.map((p) => p._id);
      // Open periods first (descending by start date), then closed (descending)
      expect(ids).toEqual(["open-new", "open-old", "closed-recent", "closed-old"]);
    }
  });

  it("handles multiple groups with multiple periods each", () => {
    const policies = [
      makePursePolicy({ _id: "1", group: "B", periodStartDate: "2026-06-01" }),
      makePursePolicy({ _id: "2", group: "A", periodStartDate: "2026-01-01" }),
      makePursePolicy({ _id: "3", group: "A", periodStartDate: "2026-06-01" }),
      makePursePolicy({ _id: "4", group: "B", periodStartDate: "2026-01-01" }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(2);
    // Groups sorted alphabetically
    expect(result[0]!.type).toBe("group");
    if (result[0]!.type === "group") {
      expect(result[0]!.groupName).toBe("A");
      expect(result[0]!.policies).toHaveLength(2);
      expect(result[0]!.policies[0]!._id).toBe("3"); // later date first (descending)
    }
    if (result[1]!.type === "group") {
      expect(result[1]!.groupName).toBe("B");
      expect(result[1]!.policies).toHaveLength(2);
      expect(result[1]!.policies[0]!._id).toBe("1"); // later date first (descending)
    }
  });

  it("handles policies with undefined periodStartDate in groups", () => {
    const policies = [
      makePursePolicy({ _id: "1", group: "G", periodStartDate: "2026-01-01" }),
      makePursePolicy({ _id: "2", group: "G", periodStartDate: undefined }),
    ];
    // Second policy has group but no periodStartDate, so it's standalone
    const result = groupPursePolicies(policies);

    // One should be grouped (has both group + periodStartDate), one standalone
    const groups = result.filter((e) => e.type === "group");
    const standalones = result.filter((e) => e.type === "standalone");
    expect(groups).toHaveLength(1);
    expect(standalones).toHaveLength(1);
  });

  it("handles policies with undefined names in standalone sorting", () => {
    const policies = [
      makePursePolicy({ _id: "1", name: undefined as unknown as string }),
      makePursePolicy({ _id: "2", name: "Alpha" }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(2);
    // Both are standalone, sorted alphabetically (empty string < "Alpha")
    if (result[0]!.type === "standalone") {
      expect(result[0]!.policy._id).toBe("1");
    }
  });

  it("handles mix of qualifying and non-qualifying with same name", () => {
    const policies = [
      makePursePolicy({ _id: "1", name: "Points", group: "G", periodStartDate: "2026-01-01" }),
      makePursePolicy({ _id: "2", name: "Points" }),
    ];

    const result = groupPursePolicies(policies);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe("group");
    expect(result[1]!.type).toBe("standalone");
  });
});
