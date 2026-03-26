import { describe, expect, it } from "vitest";
import { formatNumber, toFieldLabel, generateObjectId } from "./format-utils";

describe("formatNumber", () => {
  it("formats a number with thousands separators", () => {
    expect(formatNumber(10000)).toBe("10,000");
  });

  it("returns fallback formatted when input is null/undefined", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });

  it("uses a custom fallback value", () => {
    expect(formatNumber(null, 42)).toBe("42");
  });
});

describe("toFieldLabel", () => {
  it("converts camelCase to Title Case", () => {
    expect(toFieldLabel("srcChannelType")).toBe("Src Channel Type");
  });

  it("handles uppercase acronyms", () => {
    expect(toFieldLabel("memberID")).toBe("Member ID");
  });

  it("capitalizes a single word", () => {
    expect(toFieldLabel("name")).toBe("Name");
  });
});

describe("generateObjectId", () => {
  it("returns a 24-character hex string", () => {
    const id = generateObjectId();
    expect(id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("generates unique values", () => {
    const id1 = generateObjectId();
    const id2 = generateObjectId();
    expect(id1).not.toBe(id2);
  });
});
