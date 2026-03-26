import { describe, it, expect } from "vitest";
import {
  buildFormTabs,
  buildFieldTabMap,
  firstTabWithError,
  tabErrorCounts,
  flattenRhfErrors,
  buildEntityFormZodSchema,
  buildEntityDefaultValues,
} from "../form-tab-helpers";
import type {
  ServerTableConfig,
  ServerEntitySchemaData,
  ExtFieldDef,
} from "../../types/server-table-types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseSchema: ServerEntitySchemaData = {
  extFields: {},
  categories: [],
  coreRequiredFields: new Set(),
  extRequiredFields: new Set(),
  enumFields: {},
  bulkEditableFields: new Set(),
  dbSchema: {},
  isLoading: false,
  error: null,
};

const minimalConfig: ServerTableConfig = {
  modelName: "TestModel",
  endpoint: "test-models",
  pageTitle: "Test Models",
  testIdPrefix: "test",
  coreColumns: [],
  coreFormFields: [
    { field: "name", label: "Name", type: "text" },
    { field: "status", label: "Status", type: "enum" },
  ],
};

function makeExtField(overrides: Partial<ExtFieldDef> = {}): ExtFieldDef {
  return {
    type: "string",
    title: "Field",
    required: false,
    category: "",
    displayOrder: 0,
    showInList: false,
    searchable: false,
    sortable: false,
    ...overrides,
  };
}

// ── buildFormTabs ───────────────────────────────────────────────────────────

describe("buildFormTabs", () => {
  it('always includes a "details" tab with core form fields', () => {
    const tabs = buildFormTabs(minimalConfig, baseSchema);
    expect(tabs[0]).toEqual({
      key: "details",
      label: "Details",
      fields: ["name", "status"],
      columns: 2,
    });
  });

  it("creates one tab per category with matching ext fields", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      categories: [
        { name: "General", columns: 2 },
        { name: "Advanced", columns: 3 },
      ],
      extFields: {
        color: makeExtField({ category: "General", displayOrder: 1 }),
        size: makeExtField({ category: "Advanced", displayOrder: 1 }),
      },
    };
    const tabs = buildFormTabs(minimalConfig, schema);
    expect(tabs).toHaveLength(3); // details + General + Advanced
    expect(tabs[1]).toMatchObject({
      key: "general",
      label: "General",
      fields: ["color"],
      columns: 2,
    });
    expect(tabs[2]).toMatchObject({
      key: "advanced",
      label: "Advanced",
      fields: ["size"],
      columns: 3,
    });
  });

  it('creates single "Extensions" tab when no categories defined', () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        alpha: makeExtField({ displayOrder: 1 }),
        beta: makeExtField({ displayOrder: 2 }),
      },
    };
    const tabs = buildFormTabs(minimalConfig, schema);
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toMatchObject({
      key: "extensions",
      label: "Extensions",
      fields: ["alpha", "beta"],
    });
  });

  it("filters out parent/isParent fields from ext tabs", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        visible: makeExtField({ displayOrder: 1 }),
        hidden: makeExtField({ displayOrder: 2, isParent: true }),
      },
    };
    const tabs = buildFormTabs(minimalConfig, schema);
    const extTab = tabs.find((t) => t.key === "extensions");
    expect(extTab?.fields).toEqual(["visible"]);
  });

  it("sorts ext fields by displayOrder", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        z_last: makeExtField({ displayOrder: 10 }),
        a_first: makeExtField({ displayOrder: 1 }),
        m_mid: makeExtField({ displayOrder: 5 }),
      },
    };
    const tabs = buildFormTabs(minimalConfig, schema);
    const extTab = tabs.find((t) => t.key === "extensions");
    expect(extTab?.fields).toEqual(["a_first", "m_mid", "z_last"]);
  });

  it("skips categories with no matching ext fields", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      categories: [
        { name: "HasFields", columns: 2 },
        { name: "Empty", columns: 1 },
      ],
      extFields: {
        color: makeExtField({ category: "HasFields", displayOrder: 1 }),
      },
    };
    const tabs = buildFormTabs(minimalConfig, schema);
    expect(tabs).toHaveLength(2); // details + HasFields only
    expect(tabs.find((t) => t.key === "empty")).toBeUndefined();
  });

  it("returns only details tab when no ext fields exist", () => {
    const tabs = buildFormTabs(minimalConfig, baseSchema);
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.key).toBe("details");
  });

  it("normalizes category name to lowercase kebab-case for tab key", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      categories: [{ name: "My Category", columns: 2 }],
      extFields: {
        field1: makeExtField({ category: "My Category", displayOrder: 1 }),
      },
    };
    const tabs = buildFormTabs(minimalConfig, schema);
    expect(tabs[1]?.key).toBe("my-category");
  });
});

// ── buildFieldTabMap ────────────────────────────────────────────────────────

describe("buildFieldTabMap", () => {
  it("maps each field to its tab key", () => {
    const tabs = [
      { key: "details", label: "Details", fields: ["name", "status"], columns: 2 },
      { key: "extras", label: "Extras", fields: ["color", "size"], columns: 2 },
    ];
    const map = buildFieldTabMap(tabs);
    expect(map).toEqual({
      name: "details",
      status: "details",
      color: "extras",
      size: "extras",
    });
  });

  it("returns empty map for empty tabs array", () => {
    expect(buildFieldTabMap([])).toEqual({});
  });

  it("handles tabs with no fields", () => {
    const tabs = [{ key: "empty", label: "Empty", fields: [], columns: 2 }];
    expect(buildFieldTabMap(tabs)).toEqual({});
  });
});

// ── firstTabWithError ───────────────────────────────────────────────────────

describe("firstTabWithError", () => {
  it("returns first tab key that has a field with an error", () => {
    const fieldTabMap = { name: "details", color: "extras" };
    const errors = { color: "required" };
    expect(firstTabWithError(fieldTabMap, errors)).toBe("extras");
  });

  it("returns null when no errors match any tab", () => {
    const fieldTabMap = { name: "details" };
    const errors = { unknown_field: "required" };
    expect(firstTabWithError(fieldTabMap, errors)).toBeNull();
  });

  it("returns null for empty errors", () => {
    const fieldTabMap = { name: "details" };
    expect(firstTabWithError(fieldTabMap, {})).toBeNull();
  });

  it("returns null for empty field tab map", () => {
    expect(firstTabWithError({}, { name: "required" })).toBeNull();
  });
});

// ── tabErrorCounts ──────────────────────────────────────────────────────────

describe("tabErrorCounts", () => {
  it("counts errors per tab correctly", () => {
    const tabs = [
      { key: "details", label: "Details", fields: ["name", "status"], columns: 2 },
      { key: "extras", label: "Extras", fields: ["color", "size"], columns: 2 },
    ];
    const errors = { name: "required", color: "invalid", size: "too big" };
    const counts = tabErrorCounts(tabs, errors);
    expect(counts).toEqual({ details: 1, extras: 2 });
  });

  it("returns 0 for tabs with no errors", () => {
    const tabs = [
      { key: "details", label: "Details", fields: ["name"], columns: 2 },
      { key: "extras", label: "Extras", fields: ["color"], columns: 2 },
    ];
    const errors = {};
    const counts = tabErrorCounts(tabs, errors);
    expect(counts).toEqual({ details: 0, extras: 0 });
  });

  it("returns empty object for no tabs", () => {
    expect(tabErrorCounts([], { name: "error" })).toEqual({});
  });
});

// ── flattenRhfErrors ────────────────────────────────────────────────────────

describe("flattenRhfErrors", () => {
  it("flattens simple field errors", () => {
    const errors = {
      name: { message: "Name is required", type: "required" },
    };
    expect(flattenRhfErrors(errors)).toEqual({ name: "Name is required" });
  });

  it("returns empty object for no errors", () => {
    expect(flattenRhfErrors({})).toEqual({});
  });

  it("skips fields with no message", () => {
    const errors = {
      name: { type: "required" },
    };
    expect(flattenRhfErrors(errors as never)).toEqual({});
  });

  it("skips null/undefined error entries", () => {
    const errors = {
      name: null,
      status: undefined,
    };
    expect(flattenRhfErrors(errors as never)).toEqual({});
  });
});

// ── buildEntityFormZodSchema ────────────────────────────────────────────────

describe("buildEntityFormZodSchema", () => {
  it("creates a schema that validates required text fields", () => {
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "name", label: "Name", type: "text", required: true },
      ],
    };
    const schema = buildEntityFormZodSchema(config, baseSchema);
    const result = schema.safeParse({ name: "" });
    expect(result.success).toBe(false);

    const valid = schema.safeParse({ name: "hello" });
    expect(valid.success).toBe(true);
  });

  it("makes optional text fields accept empty strings", () => {
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "notes", label: "Notes", type: "text" },
      ],
    };
    const schema = buildEntityFormZodSchema(config, baseSchema);
    const result = schema.safeParse({ notes: "" });
    expect(result.success).toBe(true);
  });

  it("creates boolean fields that default to false", () => {
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "active", label: "Active", type: "boolean" },
      ],
    };
    const schema = buildEntityFormZodSchema(config, baseSchema);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(false);
    }
  });

  it("creates number fields with coercion", () => {
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "count", label: "Count", type: "number", required: true },
      ],
    };
    const schema = buildEntityFormZodSchema(config, baseSchema);
    const result = schema.safeParse({ count: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(42);
    }
  });

  it("creates enum fields with allowed values from schema", () => {
    const schemaWithEnum: ServerEntitySchemaData = {
      ...baseSchema,
      enumFields: { status: ["active", "inactive"] },
    };
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "status", label: "Status", type: "enum", required: true },
      ],
    };
    const zodSchema = buildEntityFormZodSchema(config, schemaWithEnum);
    const valid = zodSchema.safeParse({ status: "active" });
    expect(valid.success).toBe(true);

    const invalid = zodSchema.safeParse({ status: "unknown" });
    expect(invalid.success).toBe(false);
  });

  it("allows empty string for optional enum fields", () => {
    const schemaWithEnum: ServerEntitySchemaData = {
      ...baseSchema,
      enumFields: { status: ["active", "inactive"] },
    };
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "status", label: "Status", type: "enum" },
      ],
    };
    const zodSchema = buildEntityFormZodSchema(config, schemaWithEnum);
    const result = zodSchema.safeParse({ status: "" });
    expect(result.success).toBe(true);
  });
});

// ── buildEntityDefaultValues ────────────────────────────────────────────────

describe("buildEntityDefaultValues", () => {
  it("returns empty strings for core fields when creating (entity=null)", () => {
    const values = buildEntityDefaultValues(minimalConfig, baseSchema, null);
    expect(values.name).toBe("");
    expect(values.status).toBe("");
  });

  it("uses defaultValue from field config when creating", () => {
    const config: ServerTableConfig = {
      ...minimalConfig,
      coreFormFields: [
        { field: "status", label: "Status", type: "enum", defaultValue: "active" },
      ],
    };
    const values = buildEntityDefaultValues(config, baseSchema, null);
    expect(values.status).toBe("active");
  });

  it("populates core field values from entity when editing", () => {
    const entity = { _id: "1", name: "Test", status: "active" };
    const values = buildEntityDefaultValues(minimalConfig, baseSchema, entity);
    expect(values.name).toBe("Test");
    expect(values.status).toBe("active");
  });

  it("populates ext field values from entity.ext", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        brandCode: makeExtField({ displayOrder: 1 }),
      },
    };
    const entity = { _id: "1", name: "Test", ext: { brandCode: "GAP" } };
    const values = buildEntityDefaultValues(minimalConfig, schema, entity);
    expect(values.brandCode).toBe("GAP");
  });

  it("uses ext field defaultValue when entity has no ext data", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        brandCode: makeExtField({ displayOrder: 1, defaultValue: "DEFAULT" }),
      },
    };
    const values = buildEntityDefaultValues(minimalConfig, schema, null);
    expect(values.brandCode).toBe("DEFAULT");
  });

  it("uses false as default for boolean ext fields", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        isActive: makeExtField({ type: "boolean", displayOrder: 1 }),
      },
    };
    const values = buildEntityDefaultValues(minimalConfig, schema, null);
    expect(values.isActive).toBe(false);
  });

  it("skips isParent ext fields", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        parent: makeExtField({ isParent: true, displayOrder: 1 }),
        child: makeExtField({ displayOrder: 2 }),
      },
    };
    const values = buildEntityDefaultValues(minimalConfig, schema, null);
    expect("parent" in values).toBe(false);
    expect("child" in values).toBe(true);
  });

  it("flattens nested ext objects", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        "featured.AT": makeExtField({ displayOrder: 1 }),
        "featured.BR": makeExtField({ displayOrder: 2 }),
      },
    };
    const entity = {
      _id: "1",
      name: "Test",
      ext: { featured: { AT: true, BR: false } },
    };
    const values = buildEntityDefaultValues(minimalConfig, schema, entity);
    expect(values["featured.AT"]).toBe(true);
    expect(values["featured.BR"]).toBe(false);
  });
});
