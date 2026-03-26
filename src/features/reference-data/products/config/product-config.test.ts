import { describe, it, expect } from "vitest";
import { productConfig } from "./product-config";

describe("product-config", () => {
  it("exports productConfig object", () => {
    expect(productConfig).toBeTypeOf("object");
  });

  it("has correct modelName", () => {
    expect(productConfig.modelName).toBe("Product");
  });

  it("has correct endpoint", () => {
    expect(productConfig.endpoint).toBe("products");
  });

  it("has correct pageTitle", () => {
    expect(productConfig.pageTitle).toBe("Products");
  });

  it("has testIdPrefix", () => {
    expect(productConfig.testIdPrefix).toBe("products");
  });

  it("has defaultSort set to name", () => {
    expect(productConfig.defaultSort).toBe("name");
  });

  it("has populate array", () => {
    expect(productConfig.populate).toContain("createdBy");
    expect(productConfig.populate).toContain("updatedBy");
  });

  it("has searchFields defined", () => {
    expect(productConfig.searchFields).toBeInstanceOf(Array);
    expect(productConfig.searchFields).toContain("name");
    expect(productConfig.searchFields).toContain("sku");
  });

  it("has coreColumns with required name field", () => {
    const nameCol = productConfig.coreColumns.find((c) => c.field === "name");

    expect(nameCol).toBeDefined();
    expect(nameCol!.required).toBe(true);
  });

  it("has coreFormFields defined", () => {
    expect(productConfig.coreFormFields).toBeInstanceOf(Array);
    expect(productConfig.coreFormFields!.length).toBeGreaterThan(0);

    const nameField = productConfig.coreFormFields!.find(
      (f) => f.field === "name",
    );
    expect(nameField).toBeDefined();
    expect(nameField!.required).toBe(true);
  });
});
