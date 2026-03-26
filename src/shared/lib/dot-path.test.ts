import { describe, expect, it } from "vitest";
import { flattenNested, unflattenDotPaths, summarizeNested } from "./dot-path";

describe("dot-path module", () => {
  it("exports flattenNested as a function", () => {
    expect(typeof flattenNested).toBe("function");
  });

  it("exports unflattenDotPaths as a function", () => {
    expect(typeof unflattenDotPaths).toBe("function");
  });

  it("exports summarizeNested as a function", () => {
    expect(typeof summarizeNested).toBe("function");
  });
});

describe("flattenNested", () => {
  it("flattens nested objects into dot-path keys", () => {
    expect(flattenNested({ featured: { AT: true, BR: false } })).toEqual({
      "featured.AT": true,
      "featured.BR": false,
    });
  });

  it("passes through scalars unchanged", () => {
    expect(flattenNested({ brandCode: "X" })).toEqual({ brandCode: "X" });
  });
});

describe("unflattenDotPaths", () => {
  it("reassembles dot-path keys into nested objects", () => {
    expect(unflattenDotPaths({ "featured.AT": true, brandCode: "X" })).toEqual({
      featured: { AT: true },
      brandCode: "X",
    });
  });
});

describe("summarizeNested", () => {
  it("returns empty string for nullish values", () => {
    expect(summarizeNested(null)).toBe("");
    expect(summarizeNested(undefined)).toBe("");
  });

  it("joins truthy keys for boolean maps", () => {
    expect(summarizeNested({ AT: true, BR: false, GP: true })).toBe("AT, GP");
  });
});
