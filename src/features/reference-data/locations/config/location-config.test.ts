import { describe, it, expect } from "vitest";
import { locationConfig } from "./location-config";

describe("location-config", () => {
  it("exports locationConfig object", () => {
    expect(locationConfig).toBeTypeOf("object");
  });

  it("has correct modelName", () => {
    expect(locationConfig.modelName).toBe("Location");
  });

  it("has correct endpoint", () => {
    expect(locationConfig.endpoint).toBe("locations");
  });

  it("has correct pageTitle", () => {
    expect(locationConfig.pageTitle).toBe("Locations");
  });

  it("has testIdPrefix", () => {
    expect(locationConfig.testIdPrefix).toBe("locations");
  });

  it("has defaultSort set to name", () => {
    expect(locationConfig.defaultSort).toBe("name");
  });

  it("has populate array", () => {
    expect(locationConfig.populate).toContain("createdBy");
    expect(locationConfig.populate).toContain("updatedBy");
  });

  it("has searchFields defined", () => {
    expect(locationConfig.searchFields).toBeInstanceOf(Array);
    expect(locationConfig.searchFields).toContain("name");
    expect(locationConfig.searchFields).toContain("city");
  });

  it("has coreColumns with required name field", () => {
    const nameCol = locationConfig.coreColumns.find((c) => c.field === "name");

    expect(nameCol).toBeDefined();
    expect(nameCol!.required).toBe(true);
  });

  it("has status column with enum type", () => {
    const statusCol = locationConfig.coreColumns.find(
      (c) => c.field === "status",
    );

    expect(statusCol).toBeDefined();
    expect(statusCol!.type).toBe("enum");
    expect(statusCol!.enumType).toBe("LocationStatusType");
  });

  it("has coreFormFields with status default value", () => {
    const statusField = locationConfig.coreFormFields!.find(
      (f) => f.field === "status",
    );

    expect(statusField).toBeDefined();
    expect(statusField!.defaultValue).toBe("Active");
  });
});
