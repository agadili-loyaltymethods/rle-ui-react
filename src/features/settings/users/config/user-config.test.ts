import { describe, it, expect } from "vitest";
import { userConfig } from "./user-config";

describe("user-config", () => {
  it("exports userConfig object", () => {
    expect(userConfig).toBeTypeOf("object");
  });

  it("has correct modelName", () => {
    expect(userConfig.modelName).toBe("User");
  });

  it("has correct endpoint", () => {
    expect(userConfig.endpoint).toBe("users");
  });

  it("has correct pageTitle", () => {
    expect(userConfig.pageTitle).toBe("Users");
  });

  it("has testIdPrefix", () => {
    expect(userConfig.testIdPrefix).toBe("users");
  });

  it("has defaultSort set to login", () => {
    expect(userConfig.defaultSort).toBe("login");
  });

  it("has populate array with org", () => {
    expect(userConfig.populate).toContain("org");
  });

  it("has searchFields defined", () => {
    expect(userConfig.searchFields).toBeInstanceOf(Array);
    expect(userConfig.searchFields).toContain("login");
    expect(userConfig.searchFields).toContain("email");
  });

  it("has coreColumns with required login field", () => {
    const loginCol = userConfig.coreColumns.find((c) => c.field === "login");
    expect(loginCol).toBeDefined();
    expect(loginCol!.required).toBe(true);
  });

  it("has org column with named-ref renderer", () => {
    const orgCol = userConfig.coreColumns.find((c) => c.field === "org");
    expect(orgCol).toBeDefined();
    expect(orgCol!.cellRenderer).toBe("named-ref");
  });

  it("has boolean columns for flags", () => {
    const boolFields = ["active", "blocked", "sessMultiFlag", "sessMgmtFlag", "limitsEnabled", "divisionCheckEnabled"];
    for (const field of boolFields) {
      const col = userConfig.coreColumns.find((c) => c.field === field);
      expect(col, `missing column: ${field}`).toBeDefined();
      expect(col!.type).toBe("boolean");
    }
  });

  it("has coreFormFields with login required", () => {
    const loginField = userConfig.coreFormFields.find((f) => f.field === "login");
    expect(loginField).toBeDefined();
    expect(loginField!.required).toBe(true);
  });

  it("has active field with default value true", () => {
    const activeField = userConfig.coreFormFields.find((f) => f.field === "active");
    expect(activeField).toBeDefined();
    expect(activeField!.defaultValue).toBe(true);
  });

  it("marks uberFlag as readOnly in form fields", () => {
    const uberField = userConfig.coreFormFields.find((f) => f.field === "uberFlag");
    expect(uberField).toBeDefined();
    expect(uberField!.readOnly).toBe(true);
  });

  it("has at most 6 default-visible columns", () => {
    const visible = userConfig.coreColumns.filter((c) => c.defaultVisible !== false);
    expect(visible.length).toBeLessThanOrEqual(6);
  });
});
