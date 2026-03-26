import { describe, expect, it } from "vitest";
import {
  NEVER_EXPIRES_DATE,
  isNeverDate,
  toDateOnly,
  todayDateOnly,
  formatDate,
} from "./date-utils";

describe("NEVER_EXPIRES_DATE", () => {
  it("is defined as a string", () => {
    expect(typeof NEVER_EXPIRES_DATE).toBe("string");
    expect(NEVER_EXPIRES_DATE).toBe("3000-01-01");
  });
});

describe("isNeverDate", () => {
  it("returns true for year >= 2999", () => {
    expect(isNeverDate("3000-01-01")).toBe(true);
    expect(isNeverDate("2999-12-31")).toBe(true);
  });

  it("returns false for normal dates", () => {
    expect(isNeverDate("2025-06-15")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isNeverDate(null)).toBe(false);
    expect(isNeverDate(undefined)).toBe(false);
  });
});

describe("toDateOnly", () => {
  it("extracts YYYY-MM-DD from an ISO datetime string", () => {
    expect(toDateOnly("2025-06-15T12:30:00.000Z")).toBe("2025-06-15");
  });
});

describe("todayDateOnly", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = todayDateOnly();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatDate", () => {
  it("returns an em dash for null/undefined", () => {
    expect(formatDate(null)).toBe("\u2014");
    expect(formatDate(undefined)).toBe("\u2014");
  });

  it('returns "Never" for sentinel dates', () => {
    expect(formatDate("3000-01-01")).toBe("Never");
  });

  it("returns a formatted string for normal dates", () => {
    const result = formatDate("2025-06-15");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("\u2014");
    expect(result).not.toBe("Never");
  });
});
