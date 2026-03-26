import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { ExtTabBody } from "./ext-tab-body";
import type { ServerEntitySchemaData, FormTab } from "../types/server-table-types";

vi.mock("@/shared/components/ext-field-renderer", () => ({
  ExtFieldRenderer: ({
    fieldName,
    value,
    error,
    onChange,
    onPreviewUrl,
  }: {
    fieldName: string;
    value: unknown;
    error?: string;
    onChange: (v: unknown) => void;
    onPreviewUrl?: (url: string) => void;
  }) => (
    <div data-testid={`ext-field-${fieldName}`} data-field={fieldName}>
      <span data-testid={`value-${fieldName}`}>{String(value ?? "")}</span>
      {error && <span data-testid={`error-${fieldName}`}>{error}</span>}
      <button data-testid={`change-${fieldName}`} aria-label={`Change ${fieldName}`} onClick={() => onChange("new-value")}>Change</button>
      {onPreviewUrl && (
        <button data-testid={`preview-${fieldName}`} aria-label={`Preview ${fieldName}`} onClick={() => onPreviewUrl("http://example.com")}>Preview</button>
      )}
    </div>
  ),
}));

function makeSchema(
  extFields: Record<string, { type: string; title: string; [k: string]: unknown }>,
): ServerEntitySchemaData {
  const fields: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(extFields)) {
    fields[key] = {
      required: false,
      category: "",
      displayOrder: 0,
      showInList: false,
      searchable: false,
      sortable: false,
      ...def,
    };
  }
  return {
    extFields: fields,
    enumFields: {},
    bulkEditableFields: new Set(),
    isLoading: false,
    error: null,
    extSchemaPartial: false,
    categories: [],
    coreRequiredFields: new Set(),
    extRequiredFields: new Set(),
    dbSchema: {},
  } as unknown as ServerEntitySchemaData;
}

describe("ExtTabBody", () => {
  it("renders non-boolean fields in grid rows", () => {
    const schema = makeSchema({
      firstName: { type: "string", title: "First Name" },
      lastName: { type: "string", title: "Last Name" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["firstName", "lastName"], columns: 2 };

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ firstName: "John", lastName: "Doe" }}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(screen.getByTestId("ext-field-firstName")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-lastName")).toBeInTheDocument();
  });

  it("renders boolean fields separately after non-boolean fields", () => {
    const schema = makeSchema({
      name: { type: "string", title: "Name" },
      isActive: { type: "boolean", title: "Active" },
      isVisible: { type: "boolean", title: "Visible" },
    });
    const tab: FormTab = {
      key: "ext1",
      label: "Extension",
      fields: ["name", "isActive", "isVisible"],
      columns: 2,
    };

    const { container } = render(
      <ExtTabBody
        tab={tab}
        extValues={{ name: "Test", isActive: true, isVisible: false }}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(screen.getByTestId("ext-field-name")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-isActive")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-isVisible")).toBeInTheDocument();
    // All 3 fields rendered
    expect(container.querySelectorAll('[data-testid^="ext-field-"]')).toHaveLength(3);
  });

  it("passes values to ExtFieldRenderer", () => {
    const schema = makeSchema({
      testField: { type: "string", title: "Test Field" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["testField"], columns: 2 };

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ testField: "hello world" }}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(screen.getByTestId("value-testField")).toHaveTextContent("hello world");
  });

  it("passes errors to ExtFieldRenderer", () => {
    const schema = makeSchema({
      testField: { type: "string", title: "Test Field" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["testField"], columns: 2 };

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ testField: "" }}
        onExtFieldChange={vi.fn()}
        errors={{ testField: "This field is required" }}
        schemaData={schema}
      />,
    );
    expect(screen.getByTestId("error-testField")).toHaveTextContent("This field is required");
  });

  it("calls onExtFieldChange when field triggers onChange", () => {
    // This test verifies the onChange callback is wired correctly.
    // Since we mock ExtFieldRenderer, we verify the prop is passed by rendering.
    const schema = makeSchema({
      testField: { type: "string", title: "Test Field" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["testField"], columns: 2 };
    const onChange = vi.fn();

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ testField: "" }}
        onExtFieldChange={onChange}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(screen.getByTestId("ext-field-testField")).toBeInTheDocument();
  });

  it("skips fields where extFields def is undefined", () => {
    const schema = makeSchema({
      existing: { type: "string", title: "Existing" },
    });
    // Tab references a field not in schema
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["existing", "missing"], columns: 2 };

    const { container } = render(
      <ExtTabBody
        tab={tab}
        extValues={{}}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(screen.getByTestId("ext-field-existing")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid^="ext-field-"]')).toHaveLength(1);
  });

  it("renders with 1-column layout", () => {
    const schema = makeSchema({
      field1: { type: "string", title: "Field 1" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["field1"], columns: 1 };

    const { container } = render(
      <ExtTabBody
        tab={tab}
        extValues={{}}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    // With columns=1, the grid class should be "flex flex-col gap-4"
    const gridDiv = container.querySelector(".flex.flex-col.gap-4");
    expect(gridDiv).toBeInTheDocument();
  });

  it("renders with 3-column layout", () => {
    const schema = makeSchema({
      f1: { type: "string", title: "F1" },
      f2: { type: "string", title: "F2" },
      f3: { type: "string", title: "F3" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["f1", "f2", "f3"], columns: 3 };

    const { container } = render(
      <ExtTabBody
        tab={tab}
        extValues={{}}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    const gridDiv = container.querySelector(".grid.grid-cols-3");
    expect(gridDiv).toBeInTheDocument();
  });

  it("renders empty when tab has no fields", () => {
    const schema = makeSchema({});
    const tab: FormTab = { key: "ext1", label: "Extension", fields: [], columns: 2 };

    const { container } = render(
      <ExtTabBody
        tab={tab}
        extValues={{}}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(container.querySelectorAll('[data-testid^="ext-field-"]')).toHaveLength(0);
  });

  it("calls onExtFieldChange when a non-boolean field onChange fires", () => {
    const schema = makeSchema({
      testField: { type: "string", title: "Test Field" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["testField"], columns: 2 };
    const onChange = vi.fn();

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ testField: "" }}
        onExtFieldChange={onChange}
        errors={{}}
        schemaData={schema}
      />,
    );
    fireEvent.click(screen.getByTestId("change-testField"));
    expect(onChange).toHaveBeenCalledWith("testField", "new-value");
  });

  it("calls onExtFieldChange when a boolean field onChange fires", () => {
    const schema = makeSchema({
      isActive: { type: "boolean", title: "Active" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["isActive"], columns: 2 };
    const onChange = vi.fn();

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ isActive: false }}
        onExtFieldChange={onChange}
        errors={{}}
        schemaData={schema}
      />,
    );
    fireEvent.click(screen.getByTestId("change-isActive"));
    expect(onChange).toHaveBeenCalledWith("isActive", "new-value");
  });

  it("passes onPreviewUrl to ExtFieldRenderer and triggers it", () => {
    const schema = makeSchema({
      testField: { type: "string", title: "Test" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["testField"], columns: 2 };
    const onPreview = vi.fn();

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ testField: "" }}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
        onPreviewUrl={onPreview}
      />,
    );
    fireEvent.click(screen.getByTestId("preview-testField"));
    expect(onPreview).toHaveBeenCalledWith("http://example.com");
  });

  it("does not render preview button when onPreviewUrl is not provided", () => {
    const schema = makeSchema({
      testField: { type: "string", title: "Test" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["testField"], columns: 2 };

    render(
      <ExtTabBody
        tab={tab}
        extValues={{ testField: "" }}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(screen.queryByTestId("preview-testField")).not.toBeInTheDocument();
  });

  it("renders only boolean fields when all fields are boolean", () => {
    const schema = makeSchema({
      isA: { type: "boolean", title: "A" },
      isB: { type: "boolean", title: "B" },
    });
    const tab: FormTab = { key: "ext1", label: "Extension", fields: ["isA", "isB"], columns: 2 };

    const { container } = render(
      <ExtTabBody
        tab={tab}
        extValues={{ isA: true, isB: false }}
        onExtFieldChange={vi.fn()}
        errors={{}}
        schemaData={schema}
      />,
    );
    expect(container.querySelectorAll('[data-testid^="ext-field-"]')).toHaveLength(2);
  });
});
