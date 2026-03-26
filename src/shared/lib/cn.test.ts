import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("is a function", () => {
    expect(typeof cn).toBe("function");
  });

  it("returns a string when given class names", () => {
    expect(typeof cn("a", "b")).toBe("string");
  });

  it("merges multiple class names", () => {
    const result = cn("px-2", "py-1");
    expect(result).toContain("px-2");
    expect(result).toContain("py-1");
  });

  it("handles conditional classes via clsx syntax", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toContain("base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("treats custom typography classes as font-size, not text-color", () => {
    const result = cn("text-label", "text-foreground-inverse");
    expect(result).toContain("text-label");
    expect(result).toContain("text-foreground-inverse");
  });
});
