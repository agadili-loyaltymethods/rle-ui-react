import { describe, expect, it } from "vitest";
import { flattenRhfErrors } from "./rhf-error-utils";

describe("flattenRhfErrors", () => {
  it("is a function", () => {
    expect(typeof flattenRhfErrors).toBe("function");
  });

  it("returns empty object for empty errors", () => {
    expect(flattenRhfErrors({})).toEqual({});
  });

  it("flattens top-level field errors", () => {
    const errors = {
      name: { message: "Required", type: "required" },
      code: { message: "Too short", type: "minLength" },
    };
    expect(flattenRhfErrors(errors)).toEqual({
      name: "Required",
      code: "Too short",
    });
  });

  it("promotes ext nested errors to top level", () => {
    const errors = {
      ext: {
        color: { message: "Invalid color", type: "validate" },
      },
    };
    const result = flattenRhfErrors(errors);
    expect(result).toEqual({ color: "Invalid color" });
  });

  it("handles deeply nested ext dot-path errors", () => {
    const errors = {
      ext: {
        featured: {
          AT: { message: "Required", type: "required" },
        },
      },
    };
    const result = flattenRhfErrors(errors);
    expect(result).toEqual({ "featured.AT": "Required" });
  });
});
