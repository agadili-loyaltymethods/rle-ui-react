import { describe, it, expect } from "vitest";
import {
  formatCellValue,
  buildColumns,
  getColumnValue,
  type ColumnDescriptor,
} from "../build-columns";
import type {
  ServerTableConfig,
  ServerEntitySchemaData,
} from "../../types/server-table-types";

// ── formatCellValue ─────────────────────────────────────────────────────────

describe("formatCellValue", () => {
  it('returns "" for null and undefined', () => {
    expect(formatCellValue(null, "text")).toBe("");
    expect(formatCellValue(undefined, "text")).toBe("");
  });

  it("formats date string to localized date", () => {
    const result = formatCellValue("2024-06-15T00:00:00Z", "date");
    expect(result).not.toBe("");
    expect(result).not.toBe("2024-06-15T00:00:00Z");
    expect(result).toMatch(/\d/);
  });

  it("returns raw string for invalid date", () => {
    expect(formatCellValue("not-a-date", "date")).toBe("not-a-date");
  });

  it('formats "date-time" type same as "date"', () => {
    const dateResult = formatCellValue("2024-06-15T12:30:00Z", "date");
    const dateTimeResult = formatCellValue(
      "2024-06-15T12:30:00Z",
      "date-time",
    );
    expect(dateTimeResult).toBe(dateResult);
  });

  it('returns "Yes" for true, "No" for false (type "boolean")', () => {
    expect(formatCellValue(true, "boolean")).toBe("Yes");
    expect(formatCellValue(false, "boolean")).toBe("No");
  });

  it('formats numbers with toLocaleString (type "number")', () => {
    const result = formatCellValue(1234.5, "number");
    expect(result).toMatch(/1.*234/);
  });

  it('formats integers with toLocaleString (type "integer")', () => {
    const result = formatCellValue(9876, "integer");
    expect(result).toMatch(/9.*876/);
  });

  it('returns String(value) for plain strings (type "text")', () => {
    expect(formatCellValue("hello", "text")).toBe("hello");
  });

  it('returns String(value) for enums (type "enum")', () => {
    expect(formatCellValue("active", "enum")).toBe("active");
  });

  it("summarizes object values", () => {
    const result = formatCellValue({ AT: true, BR: false, GP: true }, "text");
    expect(result).toBe("AT, GP");
  });

  it("returns string for zero number", () => {
    const result = formatCellValue(0, "number");
    expect(result).toBe("0");
  });

  it("handles boolean-like values for boolean type", () => {
    expect(formatCellValue(1, "boolean")).toBe("Yes");
    expect(formatCellValue(0, "boolean")).toBe("No");
    expect(formatCellValue("", "boolean")).toBe("No");
  });
});

// ── getColumnValue ──────────────────────────────────────────────────────────

describe("getColumnValue", () => {
  it("retrieves core field value from entity by corePath", () => {
    const entity = { _id: "1", name: "Test", status: "active" };
    const col: ColumnDescriptor = {
      key: "name",
      label: "Name",
      source: "core",
      corePath: "name",
      type: "text",
      sortable: true,
      defaultVisible: true,
      filterable: true,
    };
    expect(getColumnValue(entity, col)).toBe("Test");
  });

  it("retrieves nested core field value using dot-path", () => {
    const entity = { _id: "1", meta: { region: "US" } };
    const col: ColumnDescriptor = {
      key: "meta.region",
      label: "Region",
      source: "core",
      corePath: "meta.region",
      type: "text",
      sortable: true,
      defaultVisible: true,
      filterable: true,
    };
    expect(getColumnValue(entity, col)).toBe("US");
  });

  it("retrieves ext field value from entity.ext", () => {
    const entity = { _id: "1", ext: { brandCode: "GAP" } };
    const col: ColumnDescriptor = {
      key: "ext.brandCode",
      label: "Brand Code",
      source: "ext",
      extField: "brandCode",
      type: "text",
      sortable: true,
      defaultVisible: true,
      filterable: true,
    };
    expect(getColumnValue(entity, col)).toBe("GAP");
  });

  it("returns undefined when ext is missing", () => {
    const entity = { _id: "1" };
    const col: ColumnDescriptor = {
      key: "ext.brandCode",
      label: "Brand Code",
      source: "ext",
      extField: "brandCode",
      type: "text",
      sortable: true,
      defaultVisible: true,
      filterable: true,
    };
    expect(getColumnValue(entity, col)).toBeUndefined();
  });

  it("returns undefined for missing nested core path", () => {
    const entity = { _id: "1" };
    const col: ColumnDescriptor = {
      key: "meta.region",
      label: "Region",
      source: "core",
      corePath: "meta.region",
      type: "text",
      sortable: true,
      defaultVisible: true,
      filterable: true,
    };
    expect(getColumnValue(entity, col)).toBeUndefined();
  });
});

// ── buildColumns ────────────────────────────────────────────────────────────

describe("buildColumns", () => {
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

  const baseConfig: ServerTableConfig = {
    modelName: "TestModel",
    endpoint: "test-models",
    pageTitle: "Test Models",
    testIdPrefix: "test",
    coreColumns: [
      { field: "name", label: "Name", type: "text" },
      { field: "status", label: "Status", type: "enum" },
    ],
    coreFormFields: [],
  };

  it("includes core columns from config", () => {
    const columns = buildColumns(baseConfig, baseSchema);
    expect(columns).toHaveLength(2);
    expect(columns[0]).toMatchObject({
      key: "name",
      label: "Name",
      source: "core",
      corePath: "name",
      type: "text",
      sortable: true,
    });
  });

  it("sets defaultVisible to true when not specified", () => {
    const columns = buildColumns(baseConfig, baseSchema);
    expect(columns[0]?.defaultVisible).toBe(true);
  });

  it("respects defaultVisible: false on core columns", () => {
    const config: ServerTableConfig = {
      ...baseConfig,
      coreColumns: [
        { field: "name", label: "Name", type: "text", defaultVisible: false },
      ],
    };
    const columns = buildColumns(config, baseSchema);
    expect(columns[0]?.defaultVisible).toBe(false);
  });

  it("includes ext columns where showInList is true", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        brandCode: {
          type: "string",
          title: "Brand Code",
          required: false,
          category: "",
          displayOrder: 1,
          showInList: true,
          searchable: false,
          sortable: true,
        },
        hidden: {
          type: "string",
          title: "Hidden",
          required: false,
          category: "",
          displayOrder: 2,
          showInList: false,
          searchable: false,
          sortable: false,
        },
      },
    };
    const columns = buildColumns(baseConfig, schema);
    const extCols = columns.filter((c) => c.source === "ext");
    expect(extCols).toHaveLength(1);
    expect(extCols[0]).toMatchObject({
      key: "ext.brandCode",
      label: "Brand Code",
      source: "ext",
    });
  });

  it("excludes isParent ext fields", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        parentField: {
          type: "object",
          title: "Parent",
          required: false,
          category: "",
          displayOrder: 1,
          showInList: true,
          searchable: false,
          sortable: false,
          isParent: true,
        },
      },
    };
    const columns = buildColumns(baseConfig, schema);
    const extCols = columns.filter((c) => c.source === "ext");
    expect(extCols).toHaveLength(0);
  });

  it("sorts ext columns by displayOrder", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        z_field: {
          type: "string",
          title: "Z Field",
          required: false,
          category: "",
          displayOrder: 10,
          showInList: true,
          searchable: false,
          sortable: false,
        },
        a_field: {
          type: "string",
          title: "A Field",
          required: false,
          category: "",
          displayOrder: 1,
          showInList: true,
          searchable: false,
          sortable: false,
        },
      },
    };
    const columns = buildColumns(baseConfig, schema);
    const extCols = columns.filter((c) => c.source === "ext");
    expect(extCols[0]?.label).toBe("A Field");
    expect(extCols[1]?.label).toBe("Z Field");
  });

  it("returns empty array when no core or ext columns", () => {
    const config: ServerTableConfig = {
      ...baseConfig,
      coreColumns: [],
    };
    const columns = buildColumns(config, baseSchema);
    expect(columns).toHaveLength(0);
  });

  it("preserves cellRenderer from core column config", () => {
    const config: ServerTableConfig = {
      ...baseConfig,
      coreColumns: [
        { field: "status", label: "Status", type: "enum", cellRenderer: "status-badge" },
      ],
    };
    const columns = buildColumns(config, baseSchema);
    expect(columns[0]?.cellRenderer).toBe("status-badge");
  });

  it("sets filterable to false when core column has filterable: false", () => {
    const config: ServerTableConfig = {
      ...baseConfig,
      coreColumns: [
        { field: "computed", label: "Computed", type: "text", filterable: false },
      ],
    };
    const columns = buildColumns(config, baseSchema);
    expect(columns[0]?.filterable).toBe(false);
  });

  it("uses fieldName as label when ext title is empty", () => {
    const schema: ServerEntitySchemaData = {
      ...baseSchema,
      extFields: {
        myField: {
          type: "string",
          title: "",
          required: false,
          category: "",
          displayOrder: 1,
          showInList: true,
          searchable: false,
          sortable: false,
        },
      },
    };
    const columns = buildColumns(baseConfig, schema);
    const extCol = columns.find((c) => c.source === "ext");
    expect(extCol?.label).toBe("myField");
  });
});
