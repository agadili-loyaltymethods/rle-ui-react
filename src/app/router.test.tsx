import { describe, it, expect } from "vitest";
import { AppRouter } from "./router";

describe("AppRouter", () => {
  it("exports a named AppRouter component", () => {
    expect(typeof AppRouter).toBe("function");
  });
});
