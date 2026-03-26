import { describe, expect, it } from "vitest";
import { getMixedValue } from "./bulk-field-utils";

describe("getMixedValue", () => {
  it("is a function", () => {
    expect(typeof getMixedValue).toBe("function");
  });

  it("returns false for a single item", () => {
    expect(getMixedValue([{ name: "A" }], "name", false)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(getMixedValue([], "name", false)).toBe(false);
  });

  it("returns false when all items have the same value", () => {
    const items = [{ name: "A" }, { name: "A" }];
    expect(getMixedValue(items, "name", false)).toBe(false);
  });

  it("returns true when items have different values", () => {
    const items = [{ name: "A" }, { name: "B" }];
    expect(getMixedValue(items, "name", false)).toBe(true);
  });

  it("reads from ext when isExt is true", () => {
    const items = [
      { ext: { color: "red" } },
      { ext: { color: "blue" } },
    ];
    expect(getMixedValue(items, "color", true)).toBe(true);
  });

  it("returns false when ext values match", () => {
    const items = [
      { ext: { color: "red" } },
      { ext: { color: "red" } },
    ];
    expect(getMixedValue(items, "color", true)).toBe(false);
  });

  it("handles missing ext property gracefully", () => {
    const items = [{ ext: { color: "red" } }, { name: "no ext" }];
    expect(getMixedValue(items, "color", true)).toBe(true);
  });

  it("handles undefined items in the middle of array", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = [{ name: "A" }, undefined as any, { name: "A" }];
    expect(getMixedValue(items, "name", false)).toBe(false);
  });

  it("uses deep comparison for objects", () => {
    const items = [
      { data: { a: 1, b: 2 } },
      { data: { a: 1, b: 2 } },
    ];
    expect(getMixedValue(items, "data", false)).toBe(false);
  });

  it("detects deep differences in objects", () => {
    const items = [
      { data: { a: 1, b: 2 } },
      { data: { a: 1, b: 3 } },
    ];
    expect(getMixedValue(items, "data", false)).toBe(true);
  });

  it("handles arrays as values", () => {
    const items = [
      { tags: ["a", "b"] },
      { tags: ["a", "b"] },
    ];
    expect(getMixedValue(items, "tags", false)).toBe(false);
  });

  it("detects different arrays", () => {
    const items = [
      { tags: ["a", "b"] },
      { tags: ["a", "c"] },
    ];
    expect(getMixedValue(items, "tags", false)).toBe(true);
  });

  it("handles three or more items", () => {
    const items = [{ v: 1 }, { v: 1 }, { v: 2 }];
    expect(getMixedValue(items, "v", false)).toBe(true);
  });
});
