import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, userEvent } from "@/test-utils";
import { ExtFieldRenderer, isUrlField } from "./ext-field-renderer";
import type { ExtFieldRendererDef, ExtFieldSchemaData } from "./ext-field-renderer";

describe("ExtFieldRenderer", () => {
  it("renders a text field by default", () => {
    render(
      <ExtFieldRenderer
        fieldName="customField"
        def={{ type: "string", title: "Custom Field", required: false }}
        value=""
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Custom Field")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("renders a boolean field as a switch", () => {
    render(
      <ExtFieldRenderer
        fieldName="isActive"
        def={{ type: "boolean", title: "Is Active", required: false }}
        value={false}
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Is Active")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("toggles boolean field when switch is clicked", () => {
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="isActive"
        def={{ type: "boolean", title: "Is Active", required: false }}
        value={false}
        onChange={onChange}
        schemaData={null}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders a number field with number input", () => {
    render(
      <ExtFieldRenderer
        fieldName="quantity"
        def={{ type: "number", title: "Quantity", required: false }}
        value={42}
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Quantity")).toBeInTheDocument();
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveValue(42);
  });

  it("renders an integer field with number input", () => {
    render(
      <ExtFieldRenderer
        fieldName="count"
        def={{ type: "integer", title: "Count", required: false }}
        value={10}
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(10);
  });

  it("calls onChange with parsed number for number field", () => {
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="quantity"
        def={{ type: "number", title: "Quantity", required: false }}
        value={0}
        onChange={onChange}
        schemaData={null}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "55", valueAsNumber: 55 },
    });
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it("renders a date field when format is date-time", () => {
    render(
      <ExtFieldRenderer
        fieldName="expiryDate"
        def={{ type: "string", title: "Expiry Date", required: false, format: "date-time" }}
        value="2026-06-15T00:00:00.000Z"
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Expiry Date")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-06-15")).toHaveAttribute("type", "date");
  });

  it("renders a date field when format is date", () => {
    render(
      <ExtFieldRenderer
        fieldName="startDate"
        def={{ type: "string", title: "Start Date", required: false, format: "date" }}
        value="2026-01-01"
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-01-01")).toHaveAttribute("type", "date");
  });

  it("renders an enum field as select when def.enum is provided", () => {
    render(
      <ExtFieldRenderer
        fieldName="tier"
        def={{
          type: "string",
          title: "Tier",
          required: false,
          enum: ["gold", "silver", "bronze"],
        }}
        value="gold"
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Tier")).toBeInTheDocument();
    expect(screen.getByText("gold")).toBeInTheDocument();
  });

  it("renders an enum field from schemaData.enumFields", () => {
    const schemaData: ExtFieldSchemaData = {
      extFields: { status: {} },
      enumFields: { status: ["active", "inactive", "suspended"] },
    };
    render(
      <ExtFieldRenderer
        fieldName="status"
        def={{ type: "string", title: "Status", required: false }}
        value="active"
        onChange={vi.fn()}
        schemaData={schemaData}
      />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows required asterisk when field is required", () => {
    render(
      <ExtFieldRenderer
        fieldName="name"
        def={{ type: "string", title: "Name", required: true }}
        value=""
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not show required asterisk when field is not required", () => {
    render(
      <ExtFieldRenderer
        fieldName="name"
        def={{ type: "string", title: "Name", required: false }}
        value=""
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("displays error message for text field", () => {
    render(
      <ExtFieldRenderer
        fieldName="name"
        def={{ type: "string", title: "Name", required: true }}
        value=""
        onChange={vi.fn()}
        schemaData={null}
        error="This field is required"
      />,
    );
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("displays error message for number field", () => {
    render(
      <ExtFieldRenderer
        fieldName="quantity"
        def={{ type: "number", title: "Quantity", required: true }}
        value={null}
        onChange={vi.fn()}
        schemaData={null}
        error="Must be a number"
      />,
    );
    expect(screen.getByText("Must be a number")).toBeInTheDocument();
  });

  it("uses fieldName as label when title is empty", () => {
    render(
      <ExtFieldRenderer
        fieldName="myField"
        def={{ type: "string", title: "", required: false }}
        value=""
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("myField")).toBeInTheDocument();
  });

  it("renders URL field with preview button for uri format", () => {
    render(
      <ExtFieldRenderer
        fieldName="website"
        def={{ type: "string", title: "Website", required: false, format: "uri" }}
        value="https://example.com"
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByTitle("Preview")).toBeInTheDocument();
  });

  it("renders URL field when fieldName contains 'url'", () => {
    render(
      <ExtFieldRenderer
        fieldName="imageUrl"
        def={{ type: "string", title: "Image URL", required: false }}
        value=""
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByTitle("Preview")).toBeInTheDocument();
  });

  it("calls onChange when text input value changes", () => {
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="note"
        def={{ type: "string", title: "Note", required: false }}
        value=""
        onChange={onChange}
        schemaData={null}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("renders null value as empty string for text field", () => {
    render(
      <ExtFieldRenderer
        fieldName="note"
        def={{ type: "string", title: "Note", required: false }}
        value={null}
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("renders empty date input when value is null", () => {
    render(
      <ExtFieldRenderer
        fieldName="expiryDate"
        def={{ type: "string", title: "Expiry", required: false, format: "date" }}
        value={null}
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    expect(screen.getByText("Expiry")).toBeInTheDocument();
  });

  it("calls onChange when enum option is selected from popover", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="tier"
        def={{
          type: "string",
          title: "Tier",
          required: false,
          enum: ["gold", "silver", "bronze"],
        }}
        value="gold"
        onChange={onChange}
        schemaData={null}
      />,
    );
    // Open the select popover
    await user.click(screen.getByTestId("select-select-trigger"));
    // Click the "silver" option
    await user.click(screen.getByTestId("select-select-option-silver"));
    expect(onChange).toHaveBeenCalledWith("silver");
  });

  it("calls onChange when date input changes", () => {
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="expiryDate"
        def={{ type: "string", title: "Expiry", required: false, format: "date" }}
        value="2026-01-01"
        onChange={onChange}
        schemaData={null}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("2026-01-01"), {
      target: { value: "2026-06-15" },
    });
    expect(onChange).toHaveBeenCalledWith("2026-06-15");
  });

  it("calls onChange with parsed number when number field is empty", () => {
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="quantity"
        def={{ type: "number", title: "Quantity", required: false }}
        value={42}
        onChange={onChange}
        schemaData={null}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "", valueAsNumber: NaN },
    });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("opens URL in new tab when preview is clicked for non-image URL", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(
      <ExtFieldRenderer
        fieldName="website"
        def={{ type: "string", title: "Website", required: false, format: "uri" }}
        value="https://example.com"
        onChange={vi.fn()}
        schemaData={null}
      />,
    );
    fireEvent.click(screen.getByTitle("Preview"));
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("calls onPreviewUrl for image URLs when preview is clicked", () => {
    const onPreviewUrl = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="imageUrl"
        def={{ type: "string", title: "Image", required: false, format: "uri" }}
        value="https://example.com/photo.png"
        onChange={vi.fn()}
        schemaData={null}
        onPreviewUrl={onPreviewUrl}
      />,
    );
    fireEvent.click(screen.getByTitle("Preview"));
    expect(onPreviewUrl).toHaveBeenCalledWith("https://example.com/photo.png");
  });

  it("calls onChange when URL text input changes", () => {
    const onChange = vi.fn();
    render(
      <ExtFieldRenderer
        fieldName="website"
        def={{ type: "string", title: "Website", required: false, format: "uri" }}
        value=""
        onChange={onChange}
        schemaData={null}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "https://test.com" },
    });
    expect(onChange).toHaveBeenCalledWith("https://test.com");
  });
});

describe("isUrlField", () => {
  it("returns true for uri format", () => {
    expect(isUrlField("website", { type: "string", title: "Website", required: false, format: "uri" })).toBe(true);
  });

  it("returns true for url format", () => {
    expect(isUrlField("link", { type: "string", title: "Link", required: false, format: "url" })).toBe(true);
  });

  it("returns true when fieldName contains 'url'", () => {
    expect(isUrlField("imageUrl", { type: "string", title: "Image URL", required: false })).toBe(true);
  });

  it("returns true when fieldName contains 'imagelistpage'", () => {
    expect(isUrlField("imageListPage", { type: "string", title: "Image", required: false })).toBe(true);
  });

  it("returns false for regular text fields", () => {
    expect(isUrlField("name", { type: "string", title: "Name", required: false })).toBe(false);
  });
});
