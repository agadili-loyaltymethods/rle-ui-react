// src/features/audit-logs/lib/parse-logic-json.test.ts
import { describe, it, expect } from "vitest";
import {
  parseLogicJSON,
  guessLabelFromPath,
  getOperatorSymbol,
  getParamTier,
  stripQuotes,
  isLogicJSONArray,
  diffConditionRules,
  diffActionItems,
} from "./parse-logic-json";
import type { ConditionGroup, ActionItem } from "./parse-logic-json";

describe("parseLogicJSON", () => {
  it("parses a condition group", () => {
    const json = JSON.stringify({
      group: {
        operator: "and",
        rules: [
          {
            function: "eq",
            enabled: true,
            params: [
              { expr: "$.Context.activity.type", name: "Activity Type" },
              { expr: "'Accrual'", name: "Accrual" },
            ],
          },
        ],
      },
    });
    const result = parseLogicJSON(json);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("condition-group");
    if (result!.kind === "condition-group") {
      expect(result!.data.operator).toBe("and");
      expect(result!.data.rules).toHaveLength(1);
    }
  });

  it("parses an action list", () => {
    const json = JSON.stringify([
      {
        action: "addPoints",
        enabled: true,
        params: [
          { expr: "$.Context.member.purses[?(@.name == 'Main')]", name: "Main" },
          { expr: "1", name: "1" },
          { expr: "100", name: "100" },
        ],
      },
    ]);
    const result = parseLogicJSON(json);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("action-list");
    if (result!.kind === "action-list") {
      expect(result!.data).toHaveLength(1);
      expect(result!.data[0]!.action).toBe("addPoints");
    }
  });

  it("returns null for invalid JSON", () => {
    expect(parseLogicJSON("not json")).toBeNull();
  });

  it("returns null for valid JSON that is not a condition or action", () => {
    expect(parseLogicJSON(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseLogicJSON("")).toBeNull();
  });
});

describe("guessLabelFromPath", () => {
  it("extracts label from simple JSONPath", () => {
    expect(guessLabelFromPath("$.Context.activity.type")).toBe("Activity Type");
  });

  it("extracts label from JSONPath with filter", () => {
    expect(guessLabelFromPath("$.Context.member.purses[?(@.name == 'Points')]"))
      .toBe("Member Purses (Points)");
  });

  it("returns null for non-JSONPath strings", () => {
    expect(guessLabelFromPath("100")).toBeNull();
  });

  it("returns null for raw expressions", () => {
    expect(guessLabelFromPath("var x = 1")).toBeNull();
  });
});

describe("getOperatorSymbol", () => {
  it("maps known operators to human-readable labels", () => {
    expect(getOperatorSymbol("eq")).toBe("equals");
    expect(getOperatorSymbol("ne")).toBe("not equals");
    expect(getOperatorSymbol("neq")).toBe("not equals");
    expect(getOperatorSymbol("gt")).toBe("greater than");
    expect(getOperatorSymbol("gte")).toBe("greater than or equals");
    expect(getOperatorSymbol("lt")).toBe("less than");
    expect(getOperatorSymbol("lte")).toBe("less than or equals");
    expect(getOperatorSymbol("contains")).toBe("contains");
    expect(getOperatorSymbol("in")).toBe("in");
    expect(getOperatorSymbol("inl")).toBe("in list");
    expect(getOperatorSymbol("innl")).toBe("not in list");
    expect(getOperatorSymbol("it")).toBe("is true");
    expect(getOperatorSymbol("bf")).toBe("is false");
    expect(getOperatorSymbol("sw")).toBe("starts with");
    expect(getOperatorSymbol("ew")).toBe("ends with");
    expect(getOperatorSymbol("exists")).toBe("exists");
    expect(getOperatorSymbol("regex")).toBe("matches pattern");
  });

  it("returns the raw function name for unknown operators", () => {
    expect(getOperatorSymbol("customOp")).toBe("customOp");
  });
});

describe("stripQuotes", () => {
  it("strips surrounding single quotes", () => {
    expect(stripQuotes("'Accrual'")).toBe("Accrual");
  });

  it("strips surrounding double quotes", () => {
    expect(stripQuotes('"Accrual"')).toBe("Accrual");
  });

  it("leaves unquoted strings alone", () => {
    expect(stripQuotes("100")).toBe("100");
  });
});

describe("getParamTier", () => {
  it("returns 3 for code blocks", () => {
    expect(getParamTier([{ expr: "function() { return 1; }" }])).toBe(3);
  });

  it("returns 3 for arrow functions", () => {
    expect(getParamTier([{ expr: "() => 1" }])).toBe(3);
  });

  it("returns 3 for multiline expressions", () => {
    expect(getParamTier([{ expr: "var x = 1;\nreturn x;" }])).toBe(3);
  });

  it("returns 2 for long param strings", () => {
    const longExpr = "$.Context.member.purses[?(@.name == 'Very Long Purse Name That Goes On And On')]";
    expect(getParamTier([{ expr: longExpr }, { expr: "50" }])).toBe(2);
  });

  it("returns 1 for simple params", () => {
    expect(getParamTier([{ expr: "100" }, { expr: "1" }])).toBe(1);
  });
});

describe("isLogicJSONArray", () => {
  it("returns true for arrays with logicJSON strings", () => {
    expect(isLogicJSONArray([{ name: "c1", logicJSON: "{}" }])).toBe(true);
  });

  it("returns false for empty arrays", () => {
    expect(isLogicJSONArray([])).toBe(false);
  });

  it("returns false for non-arrays", () => {
    expect(isLogicJSONArray("string")).toBe(false);
    expect(isLogicJSONArray(null)).toBe(false);
    expect(isLogicJSONArray(42)).toBe(false);
    expect(isLogicJSONArray({ logicJSON: "{}" })).toBe(false);
  });

  it("returns false for arrays without logicJSON", () => {
    expect(isLogicJSONArray([{ name: "c1" }])).toBe(false);
  });

  it("returns false for arrays with non-string logicJSON", () => {
    expect(isLogicJSONArray([{ logicJSON: 123 }])).toBe(false);
  });
});

describe("diffConditionRules", () => {
  const makeGroup = (rules: unknown[]): ConditionGroup => ({
    operator: "and",
    rules: rules as ConditionGroup["rules"],
  });

  it("returns empty maps for identical groups", () => {
    const rule = { function: "eq", params: [{ expr: "1" }, { expr: "1" }] };
    const result = diffConditionRules(makeGroup([rule]), makeGroup([rule]));
    expect(result.beforeHighlights.size).toBe(0);
    expect(result.afterHighlights.size).toBe(0);
  });

  it("marks changed rules", () => {
    const before = makeGroup([{ function: "eq", params: [{ expr: "1" }, { expr: "1" }] }]);
    const after = makeGroup([{ function: "eq", params: [{ expr: "1" }, { expr: "2" }] }]);
    const result = diffConditionRules(before, after);
    expect(result.beforeHighlights.get(0)).toBe("changed");
    expect(result.afterHighlights.get(0)).toBe("changed");
  });

  it("marks added rules", () => {
    const before = makeGroup([]);
    const after = makeGroup([{ function: "eq", params: [] }]);
    const result = diffConditionRules(before, after);
    expect(result.afterHighlights.get(0)).toBe("added");
    expect(result.beforeHighlights.size).toBe(0);
  });

  it("marks removed rules", () => {
    const before = makeGroup([{ function: "eq", params: [] }]);
    const after = makeGroup([]);
    const result = diffConditionRules(before, after);
    expect(result.beforeHighlights.get(0)).toBe("removed");
    expect(result.afterHighlights.size).toBe(0);
  });
});

describe("diffActionItems", () => {
  const action = (name: string, expr: string): ActionItem => ({
    action: name,
    enabled: true,
    params: [{ expr, name: expr }],
  });

  it("returns empty maps for identical action lists", () => {
    const a = action("addPoints", "100");
    const result = diffActionItems([a], [a]);
    expect(result.beforeHighlights.size).toBe(0);
    expect(result.afterHighlights.size).toBe(0);
  });

  it("marks changed action items", () => {
    const result = diffActionItems(
      [action("addPoints", "100")],
      [action("addPoints", "200")],
    );
    expect(result.beforeHighlights.get(0)).toBe("changed");
    expect(result.afterHighlights.get(0)).toBe("changed");
  });

  it("marks added action items", () => {
    const result = diffActionItems([], [action("addPoints", "100")]);
    expect(result.afterHighlights.get(0)).toBe("added");
    expect(result.beforeHighlights.size).toBe(0);
  });

  it("marks removed action items", () => {
    const result = diffActionItems([action("addPoints", "100")], []);
    expect(result.beforeHighlights.get(0)).toBe("removed");
    expect(result.afterHighlights.size).toBe(0);
  });

  it("handles mixed changes across multiple items", () => {
    const before = [action("a", "1"), action("b", "2")];
    const after = [action("a", "1"), action("b", "3")];
    const result = diffActionItems(before, after);
    expect(result.beforeHighlights.has(0)).toBe(false);
    expect(result.beforeHighlights.get(1)).toBe("changed");
  });
});
