import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { SchemaFieldDiff, isSchemaField } from "./schema-field-diff";

describe("isSchemaField", () => {
  it("returns true for extSchema", () => {
    expect(isSchemaField("extSchema")).toBe(true);
  });

  it("returns true for uiDef", () => {
    expect(isSchemaField("uiDef")).toBe(true);
  });

  it("returns true for query", () => {
    expect(isSchemaField("query")).toBe(true);
  });

  it("returns true for inclusionParams", () => {
    expect(isSchemaField("inclusionParams")).toBe(true);
  });

  it("returns false for other keys", () => {
    expect(isSchemaField("name")).toBe(false);
    expect(isSchemaField("conditions")).toBe(false);
  });
});

describe("SchemaFieldDiff", () => {
  const beforeExtSchema = JSON.stringify({
    type: "object",
    properties: {
      brandCode: { type: "string", format: "enum", enumType: "BrandType" },
      channel: { type: "string", description: "Sales channel" },
    },
  });

  const afterExtSchema = JSON.stringify({
    type: "object",
    properties: {
      brandCode: { type: "string", format: "enum", enumType: "BrandType", description: "Brand" },
      region: { type: "string" },
    },
  });

  it("renders null when both values are unparseable", () => {
    const { container } = render(
      <SchemaFieldDiff fieldKey="extSchema" before="invalid" after="invalid" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows changed fields for extSchema", () => {
    render(
      <SchemaFieldDiff fieldKey="extSchema" before={beforeExtSchema} after={afterExtSchema} />,
    );
    // brandCode changed (description added)
    expect(screen.getByText("brandCode")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.changed")).toBeInTheDocument();
    // channel removed
    expect(screen.getByText("channel")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.removed")).toBeInTheDocument();
    // region added
    expect(screen.getByText("region")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.added")).toBeInTheDocument();
  });

  it("shows Before/After columns for changed fields", () => {
    render(
      <SchemaFieldDiff fieldKey="extSchema" before={beforeExtSchema} after={afterExtSchema} />,
    );
    expect(screen.getAllByText("auditLogs.snapshot.before").length).toBeGreaterThan(0);
    expect(screen.getAllByText("auditLogs.snapshot.after").length).toBeGreaterThan(0);
  });

  it("shows unchanged fields toggle", () => {
    const before = JSON.stringify({
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "number" },
      },
    });
    const after = JSON.stringify({
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
      },
    });
    render(<SchemaFieldDiff fieldKey="extSchema" before={before} after={after} />);
    expect(screen.getByText(/auditLogs\.diff\.unchangedFields/)).toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText(/auditLogs\.diff\.unchangedFields/));
    expect(screen.getByText("a")).toBeInTheDocument();
  });

  it("handles uiDef field maps", () => {
    const beforeUiDef = JSON.stringify({
      brandCode: { title: "Brand Code", category: "General", showInList: true },
    });
    const afterUiDef = JSON.stringify({
      brandCode: { title: "Brand Code", category: "General", showInList: false },
    });
    render(<SchemaFieldDiff fieldKey="uiDef" before={beforeUiDef} after={afterUiDef} />);
    expect(screen.getByText("brandCode")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.changed")).toBeInTheDocument();
  });

  it("shows empty panel for added fields", () => {
    const before = JSON.stringify({ type: "object", properties: {} });
    const after = JSON.stringify({
      type: "object",
      properties: { newField: { type: "string" } },
    });
    render(<SchemaFieldDiff fieldKey="extSchema" before={before} after={after} />);
    expect(screen.getByText("newField")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.added")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.fieldDidNotExist")).toBeInTheDocument();
  });

  it("shows empty panel for removed fields", () => {
    const before = JSON.stringify({
      type: "object",
      properties: { oldField: { type: "number" } },
    });
    const after = JSON.stringify({ type: "object", properties: {} });
    render(<SchemaFieldDiff fieldKey="extSchema" before={before} after={after} />);
    expect(screen.getByText("oldField")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.removed")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.fieldRemoved")).toBeInTheDocument();
  });

  it("handles raw object values (not JSON strings)", () => {
    const before = {
      type: "object",
      properties: { x: { type: "string" } },
    };
    const after = {
      type: "object",
      properties: { x: { type: "number" } },
    };
    render(<SchemaFieldDiff fieldKey="extSchema" before={before} after={after} />);
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.changed")).toBeInTheDocument();
  });

  it("renders side-by-side JSON diff for query field", () => {
    const before = JSON.stringify({ status: "active" });
    const after = JSON.stringify({ status: "inactive", region: "US" });
    render(<SchemaFieldDiff fieldKey="query" before={before} after={after} />);
    expect(screen.getByText("auditLogs.snapshot.before")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.after")).toBeInTheDocument();
  });

  it("renders unchanged JSON for query when both sides match", () => {
    const query = JSON.stringify({ status: "active" });
    const { container } = render(
      <SchemaFieldDiff fieldKey="query" before={query} after={query} />,
    );
    // No Before/After headers when unchanged
    expect(screen.queryByText("auditLogs.snapshot.before")).not.toBeInTheDocument();
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  it("renders query with only after side (added)", () => {
    render(<SchemaFieldDiff fieldKey="query" before={null} after={JSON.stringify({ x: 1 })} />);
    expect(screen.getByText("auditLogs.snapshot.before")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.after")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.fieldDidNotExist")).toBeInTheDocument();
  });

  it("renders query with only before side (removed)", () => {
    render(<SchemaFieldDiff fieldKey="query" before={JSON.stringify({ x: 1 })} after={null} />);
    expect(screen.getByText("auditLogs.snapshot.before")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.after")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.snapshot.fieldRemoved")).toBeInTheDocument();
  });

  it("returns null for query when both sides are unparseable", () => {
    const { container } = render(
      <SchemaFieldDiff fieldKey="query" before="bad" after="bad" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("handles inclusionParams as flat field map", () => {
    const before = JSON.stringify({
      brandCode: { title: "Brand", type: "string" },
    });
    const after = JSON.stringify({
      brandCode: { title: "Brand Code", type: "string" },
    });
    render(<SchemaFieldDiff fieldKey="inclusionParams" before={before} after={after} />);
    expect(screen.getByText("brandCode")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.changed")).toBeInTheDocument();
  });

  it("shows added fields for inclusionParams", () => {
    const before = JSON.stringify({});
    const after = JSON.stringify({
      region: { title: "Region", type: "string" },
    });
    render(<SchemaFieldDiff fieldKey="inclusionParams" before={before} after={after} />);
    expect(screen.getByText("region")).toBeInTheDocument();
    expect(screen.getByText("auditLogs.diff.added")).toBeInTheDocument();
  });
});
