import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { CoreFieldRenderer } from "./core-field-renderer";

describe("CoreFieldRenderer", () => {
  it("renders a text field by default", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "name", label: "Name", type: "text", required: false }}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("renders a boolean field as a switch", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "active", label: "Active", type: "boolean", required: false }}
        value={true}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("renders a boolean switch with false value", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "active", label: "Active", type: "boolean", required: false }}
        value={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when boolean switch is toggled", () => {
    const onChange = vi.fn();
    render(
      <CoreFieldRenderer
        def={{ field: "active", label: "Active", type: "boolean", required: false }}
        value={false}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders a number field with number input", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "points", label: "Points", type: "number", required: false }}
        value={42}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Points")).toBeInTheDocument();
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveValue(42);
  });

  it("calls onChange with parsed number for number fields", () => {
    const onChange = vi.fn();
    render(
      <CoreFieldRenderer
        def={{ field: "points", label: "Points", type: "number", required: false }}
        value={0}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "99", valueAsNumber: 99 },
    });
    expect(onChange).toHaveBeenCalledWith(99);
  });

  it("renders a date field with date input", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "startDate", label: "Start Date", type: "date", required: false }}
        value="2026-03-11T00:00:00.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    const input = screen.getByDisplayValue("2026-03-11");
    expect(input).toHaveAttribute("type", "date");
  });

  it("renders empty date input when value is null", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "endDate", label: "End Date", type: "date", required: false }}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("End Date")).toBeInTheDocument();
  });

  it("renders an enum field as select when enumOptions are provided", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "status", label: "Status", type: "enum", required: false }}
        value="active"
        onChange={vi.fn()}
        enumOptions={["active", "inactive", "pending"]}
      />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    // Select component renders the current value
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders a textarea field", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "description", label: "Description", type: "textarea", required: false }}
        value="Some text"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Description")).toBeInTheDocument();
    const textarea = screen.getByDisplayValue("Some text");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("calls onChange when textarea content changes", () => {
    const onChange = vi.fn();
    render(
      <CoreFieldRenderer
        def={{ field: "description", label: "Description", type: "textarea", required: false }}
        value=""
        onChange={onChange}
      />,
    );
    const textarea = document.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "new text" } });
    expect(onChange).toHaveBeenCalledWith("new text");
  });

  it("shows required asterisk when field is required", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "name", label: "Name", type: "text", required: true }}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not show required asterisk when field is not required", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "name", label: "Name", type: "text", required: false }}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("displays error message for text field", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "name", label: "Name", type: "text", required: true }}
        value=""
        onChange={vi.fn()}
        error="Name is required"
      />,
    );
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("displays error message for number field", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "points", label: "Points", type: "number", required: true }}
        value={null}
        onChange={vi.fn()}
        error="Points must be a positive number"
      />,
    );
    expect(screen.getByText("Points must be a positive number")).toBeInTheDocument();
  });

  it("displays error message for date field", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "endDate", label: "End Date", type: "date", required: true }}
        value=""
        onChange={vi.fn()}
        error="End date is required"
      />,
    );
    expect(screen.getByText("End date is required")).toBeInTheDocument();
  });

  it("renders text field with placeholder", () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "name",
          label: "Name",
          type: "text",
          required: false,
          placeholder: "Enter name",
        }}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
  });

  it("calls onChange when text input changes", () => {
    const onChange = vi.fn();
    render(
      <CoreFieldRenderer
        def={{ field: "name", label: "Name", type: "text", required: false }}
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "John" },
    });
    expect(onChange).toHaveBeenCalledWith("John");
  });

  it("renders null value as empty string for text field", () => {
    render(
      <CoreFieldRenderer
        def={{ field: "name", label: "Name", type: "text", required: false }}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("renders staticOptions instead of enumOptions when both are provided", async () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "status",
          label: "Status",
          type: "enum",
          required: false,
          staticOptions: ["draft", "published"],
        }}
        value="draft"
        onChange={vi.fn()}
        enumOptions={["active", "inactive", "pending"]}
      />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    // Open the select to verify options
    fireEvent.click(screen.getByTestId("select-select-trigger"));
    expect(await screen.findByTestId("select-select-option-draft")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-published")).toBeInTheDocument();
    // enumOptions values should NOT be present
    expect(screen.queryByTestId("select-select-option-active")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-select-option-inactive")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-select-option-pending")).not.toBeInTheDocument();
  });

  it("renders staticOptions when no enumOptions are provided", () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "priority",
          label: "Priority",
          type: "enum",
          required: false,
          staticOptions: ["low", "medium", "high"],
        }}
        value="medium"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("filters out excludeOptions from enumOptions", async () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "status",
          label: "Status",
          type: "enum",
          required: false,
          excludeOptions: ["pending"],
        }}
        value="active"
        onChange={vi.fn()}
        enumOptions={["active", "inactive", "pending"]}
      />,
    );
    expect(screen.getByText("active")).toBeInTheDocument();
    // Open the select to verify options
    fireEvent.click(screen.getByTestId("select-select-trigger"));
    expect(await screen.findByTestId("select-select-option-active")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-inactive")).toBeInTheDocument();
    // "pending" should be excluded
    expect(screen.queryByTestId("select-select-option-pending")).not.toBeInTheDocument();
  });

  it("filters out multiple excludeOptions from enumOptions", async () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "status",
          label: "Status",
          type: "enum",
          required: false,
          excludeOptions: ["inactive", "pending"],
        }}
        value="active"
        onChange={vi.fn()}
        enumOptions={["active", "inactive", "pending", "archived"]}
      />,
    );
    fireEvent.click(screen.getByTestId("select-select-trigger"));
    expect(await screen.findByTestId("select-select-option-active")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-archived")).toBeInTheDocument();
    expect(screen.queryByTestId("select-select-option-inactive")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-select-option-pending")).not.toBeInTheDocument();
  });

  it("filters out excludeOptions from staticOptions", async () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "tier",
          label: "Tier",
          type: "enum",
          required: false,
          staticOptions: ["bronze", "silver", "gold", "platinum"],
          excludeOptions: ["platinum"],
        }}
        value="silver"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("silver")).toBeInTheDocument();
    // Open the select to verify options
    fireEvent.click(screen.getByTestId("select-select-trigger"));
    expect(await screen.findByTestId("select-select-option-bronze")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-silver")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-gold")).toBeInTheDocument();
    // "platinum" should be excluded
    expect(screen.queryByTestId("select-select-option-platinum")).not.toBeInTheDocument();
  });

  it("does not filter when excludeOptions is not provided", async () => {
    render(
      <CoreFieldRenderer
        def={{
          field: "status",
          label: "Status",
          type: "enum",
          required: false,
        }}
        value="active"
        onChange={vi.fn()}
        enumOptions={["active", "inactive", "pending"]}
      />,
    );
    fireEvent.click(screen.getByTestId("select-select-trigger"));
    expect(await screen.findByTestId("select-select-option-active")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-inactive")).toBeInTheDocument();
    expect(screen.getByTestId("select-select-option-pending")).toBeInTheDocument();
  });
});
