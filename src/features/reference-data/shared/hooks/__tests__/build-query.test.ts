import { describe, it, expect } from "vitest";
import { escapeRegex, buildQuery } from "../use-server-table";
import type { ServerTableConfig } from "../../types/server-table-types";

const testConfig: ServerTableConfig = {
  modelName: "TestModel",
  endpoint: "testmodels",
  pageTitle: "Test Models",
  testIdPrefix: "test",
  searchFields: ["name", "description"],
  coreColumns: [],
  coreFormFields: [],
};

describe("escapeRegex", () => {
  it("escapes all regex special characters", () => {
    const input = "hello.*+?^${}()|[]\\world";
    const result = escapeRegex(input);
    expect(result).toBe("hello\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\world");
  });

  it("returns plain strings unchanged", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
    expect(escapeRegex("abc123")).toBe("abc123");
    expect(escapeRegex("")).toBe("");
  });
});

describe("buildQuery", () => {
  it("returns undefined when no search and no filters", () => {
    expect(buildQuery(testConfig, "", [])).toBeUndefined();
    expect(buildQuery(testConfig, "   ", [])).toBeUndefined();
  });

  it("generates $or across searchFields with escaped regex and $options: 'i'", () => {
    const result = buildQuery(testConfig, "test", []);
    expect(result).toEqual({
      $or: [
        { name: { $regex: "test", $options: "i" } },
        { description: { $regex: "test", $options: "i" } },
      ],
    });
  });

  it("escapes special chars in search query", () => {
    const result = buildQuery(testConfig, "foo.bar", []);
    expect(result).toEqual({
      $or: [
        { name: { $regex: "foo\\.bar", $options: "i" } },
        { description: { $regex: "foo\\.bar", $options: "i" } },
      ],
    });
  });

  it("column filter with array value produces $in", () => {
    const filters = [{ id: "status", value: ["active", "pending"] }];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({ status: { $in: ["active", "pending"] } });
  });

  it("column filter with range {min, max} produces $gte/$lte", () => {
    const filters = [{ id: "amount", value: { min: 10, max: 100 } }];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({ amount: { $gte: 10, $lte: 100 } });
  });

  it("column filter with only min produces only $gte", () => {
    const filters = [{ id: "amount", value: { min: 5 } }];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({ amount: { $gte: 5 } });
  });

  it("column filter with string produces regex with $options: 'i'", () => {
    const filters = [{ id: "name", value: "john" }];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({
      name: { $regex: "john", $options: "i" },
    });
  });

  it("column filter with boolean produces exact match", () => {
    const filters = [{ id: "active", value: true }];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({ active: true });
  });

  it("skips empty/null filter values", () => {
    const filters = [
      { id: "a", value: null },
      { id: "b", value: "" },
      { id: "c", value: undefined },
    ];
    expect(buildQuery(testConfig, "", filters)).toBeUndefined();
  });

  it("single condition returns unwrapped (not in $and)", () => {
    const filters = [{ id: "status", value: true }];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({ status: true });
    expect(result).not.toHaveProperty("$and");
  });

  it("multiple conditions wrap in $and", () => {
    const filters = [
      { id: "active", value: true },
      { id: "name", value: "test" },
    ];
    const result = buildQuery(testConfig, "", filters);
    expect(result).toEqual({
      $and: [
        { active: true },
        { name: { $regex: "test", $options: "i" } },
      ],
    });
  });

  it("skips search when searchFields is empty", () => {
    const noSearchConfig: ServerTableConfig = {
      ...testConfig,
      searchFields: [],
    };
    expect(buildQuery(noSearchConfig, "test", [])).toBeUndefined();
  });

  it("skips search when searchFields is undefined", () => {
    const noSearchConfig: ServerTableConfig = {
      ...testConfig,
      searchFields: undefined,
    };
    expect(buildQuery(noSearchConfig, "test", [])).toBeUndefined();
  });

  it("merges additionalQuery into conditions", () => {
    const additional = { "ext._meta.subType": "RewardsCatalog" };
    const result = buildQuery(testConfig, "", [], additional);
    expect(result).toEqual({ "ext._meta.subType": "RewardsCatalog" });
  });

  it("additionalQuery merges with search via $and", () => {
    const additional = { status: "active" };
    const result = buildQuery(testConfig, "test", [], additional);
    expect(result).toEqual({
      $and: [
        {
          $or: [
            { name: { $regex: "test", $options: "i" } },
            { description: { $regex: "test", $options: "i" } },
          ],
        },
        { status: "active" },
      ],
    });
  });

  it("additionalQuery with multiple keys adds one condition per key", () => {
    const additional = {
      effectiveDate: { $lte: "2026-01-01" },
      expirationDate: { $gte: "2025-01-01" },
    };
    const result = buildQuery(testConfig, "", [], additional);
    expect(result).toEqual({
      $and: [
        { effectiveDate: { $lte: "2026-01-01" } },
        { expirationDate: { $gte: "2025-01-01" } },
      ],
    });
  });

  it("empty additionalQuery is ignored", () => {
    expect(buildQuery(testConfig, "", [], {})).toBeUndefined();
    expect(buildQuery(testConfig, "", [], undefined)).toBeUndefined();
  });
});
