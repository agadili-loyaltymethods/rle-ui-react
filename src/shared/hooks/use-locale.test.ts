import { describe, it, expect } from "vitest";
import { renderHook } from "@/test-utils";
import { useLocale } from "./use-locale";

describe("useLocale", () => {
  it("returns currentLocale, changeLocale, isRTL, and dir", () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.currentLocale).toBe("en");
    expect(typeof result.current.changeLocale).toBe("function");
    expect(result.current.isRTL).toBe(false);
    expect(result.current.dir).toBe("ltr");
  });

  it("returns ltr direction for English locale", () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.dir).toBe("ltr");
    expect(result.current.isRTL).toBe(false);
  });
});
