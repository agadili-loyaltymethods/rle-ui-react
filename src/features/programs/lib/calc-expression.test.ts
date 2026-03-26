import { describe, it, expect } from "vitest";
import {
  tokenize,
  extractFieldRefs,
  validateExpression,
  computeDependencies,
  topologicalSort,
  sortByDependencies,
  formatExpression,
} from "./calc-expression";

describe("tokenize", () => {
  it("tokenizes a simple expression", () => {
    expect(tokenize("a + b")).toEqual([
      { type: "field", value: "a" },
      { type: "operator", value: "+" },
      { type: "field", value: "b" },
    ]);
  });

  it("handles dot-notation fields", () => {
    expect(tokenize("lineItems.itemAmount * lineItems.quantity")).toEqual([
      { type: "field", value: "lineItems.itemAmount" },
      { type: "operator", value: "*" },
      { type: "field", value: "lineItems.quantity" },
    ]);
  });

  it("handles numbers and parentheses", () => {
    expect(tokenize("(a + 2.5) * b")).toEqual([
      { type: "paren", value: "(" },
      { type: "field", value: "a" },
      { type: "operator", value: "+" },
      { type: "number", value: "2.5" },
      { type: "paren", value: ")" },
      { type: "operator", value: "*" },
      { type: "field", value: "b" },
    ]);
  });

  it("throws on invalid characters", () => {
    expect(() => tokenize("a & b")).toThrow("Unexpected character '&'");
  });
});

describe("extractFieldRefs", () => {
  it("extracts unique field references", () => {
    expect(extractFieldRefs("a + b * a - c")).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty expression", () => {
    expect(extractFieldRefs("")).toEqual([]);
  });

  it("handles dot-notation", () => {
    expect(extractFieldRefs("lineItems.itemAmount * lineItems.quantity")).toEqual([
      "lineItems.itemAmount",
      "lineItems.quantity",
    ]);
  });
});

describe("validateExpression", () => {
  it("returns null for valid expression", () => {
    expect(validateExpression("a + b * (c - d)")).toBeNull();
  });

  it("returns error for empty expression", () => {
    expect(validateExpression("")).toBe("Expression is required");
  });

  it("returns error for unmatched parens", () => {
    expect(validateExpression("(a + b")).toBe("Unmatched opening parenthesis");
    expect(validateExpression("a + b)")).toBe("Unmatched closing parenthesis");
  });

  it("returns error for invalid characters", () => {
    expect(validateExpression("a & b")).toContain("Unexpected character");
  });
});

describe("computeDependencies", () => {
  it("finds dependencies on other calc fields", () => {
    const calcNames = new Set(["eligibleSpend", "discountTotal"]);
    const refs = ["eligibleSpend", "value", "discountTotal"];
    expect(computeDependencies(refs, calcNames)).toEqual(["eligibleSpend", "discountTotal"]);
  });

  it("returns empty when no dependencies", () => {
    const calcNames = new Set(["x"]);
    expect(computeDependencies(["a", "b"], calcNames)).toEqual([]);
  });
});

describe("topologicalSort", () => {
  it("sorts by dependency order", () => {
    const fields = [
      { name: "netTotal", expression: "eligibleSpend - discountTotal" },
      { name: "eligibleSpend", expression: "value * 1" },
      { name: "discountTotal", expression: "value * 0.1" },
    ];
    const order = topologicalSort(fields);
    expect(order.indexOf("eligibleSpend")).toBeLessThan(order.indexOf("netTotal"));
    expect(order.indexOf("discountTotal")).toBeLessThan(order.indexOf("netTotal"));
  });

  it("throws on circular dependency", () => {
    const fields = [
      { name: "a", expression: "b + 1" },
      { name: "b", expression: "a + 1" },
    ];
    expect(() => topologicalSort(fields)).toThrow("Circular dependency");
  });

  it("handles independent fields", () => {
    const fields = [
      { name: "a", expression: "value + 1" },
      { name: "b", expression: "value + 2" },
    ];
    expect(topologicalSort(fields)).toHaveLength(2);
  });
});

describe("sortByDependencies", () => {
  it("returns fields in execution order", () => {
    const fields = [
      { name: "net", expression: "gross - tax" },
      { name: "gross", expression: "value * 1" },
      { name: "tax", expression: "value * 0.1" },
    ];
    const sorted = sortByDependencies(fields);
    expect(sorted[sorted.length - 1]!.name).toBe("net");
  });
});

describe("formatExpression", () => {
  it("replaces field refs with labels", () => {
    const labels = { value: "Transaction Value", discountAmount: "Discount" };
    expect(formatExpression("value - discountAmount", labels)).toBe(
      "Transaction Value - Discount",
    );
  });

  it("keeps unknown fields as-is", () => {
    expect(formatExpression("a + b", {})).toBe("a + b");
  });
});
