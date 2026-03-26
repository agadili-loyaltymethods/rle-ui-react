import { describe, expect, it } from "vitest";
import i18n from "./i18n";
import type { SupportedLocale, Namespace } from "./i18n";

describe("i18n", () => {
  it("exports a default i18n instance", () => {
    expect(i18n).toBeDefined();
    expect(typeof i18n.t).toBe("function");
  });

  it("has the expected fallback language", () => {
    expect(i18n.options.fallbackLng).toEqual(["en"]);
  });

  it("has the expected default namespace", () => {
    expect(i18n.options.defaultNS).toBe("common");
  });

  it("exports SupportedLocale type (compile-time check)", () => {
    const locale: SupportedLocale = "en";
    expect(locale).toBe("en");
  });

  it("exports Namespace type (compile-time check)", () => {
    const ns: Namespace = "common";
    expect(ns).toBe("common");
  });
});
