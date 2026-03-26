import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, userEvent } from "@/test-utils";
import { useForm } from "react-hook-form";
import { FieldRenderer } from "./field-renderer";
import type { FieldConfig } from "@/shared/components/form-modal";

/** Helper that wraps FieldRenderer in a React Hook Form context. */
function TestWrapper({
  field,
  defaultValues = {},
  disabled,
}: {
  field: FieldConfig;
  defaultValues?: Record<string, unknown>;
  disabled?: boolean;
}) {
  const {
    control,
    formState: { errors },
  } = useForm({ defaultValues });
  return (
    <FieldRenderer
      field={field}
      control={control}
      errors={errors}
      testIdPrefix="test"
      disabled={disabled}
    />
  );
}

/** Wrapper that injects a manual error into the errors object. */
function TestWrapperWithError({
  field,
  defaultValues = {},
  errorMessage,
}: {
  field: FieldConfig;
  defaultValues?: Record<string, unknown>;
  errorMessage: string;
}) {
  const { control } = useForm({ defaultValues });
  const errors = { [field.name]: { message: errorMessage } };
  return (
    <FieldRenderer
      field={field}
      control={control}
      errors={errors}
      testIdPrefix="test"
    />
  );
}

/** Wrapper with custom className and idPrefix. */
function TestWrapperWithOptions({
  field,
  defaultValues = {},
  className,
  idPrefix,
}: {
  field: FieldConfig;
  defaultValues?: Record<string, unknown>;
  className?: string;
  idPrefix?: string;
}) {
  const {
    control,
    formState: { errors },
  } = useForm({ defaultValues });
  return (
    <FieldRenderer
      field={field}
      control={control}
      errors={errors}
      testIdPrefix="test"
      className={className}
      idPrefix={idPrefix}
    />
  );
}

describe("FieldRenderer", () => {
  it("renders a text field with label", () => {
    render(
      <TestWrapper
        field={{ name: "name", label: "Name", type: "text" }}
        defaultValues={{ name: "" }}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByTestId("test-field-name")).toBeInTheDocument();
  });

  it("renders a number field", () => {
    render(
      <TestWrapper
        field={{ name: "points", label: "Points", type: "number" }}
        defaultValues={{ points: 1000 }}
      />,
    );
    expect(screen.getByText("Points")).toBeInTheDocument();
    // FormattedNumberInput renders with thousands separator
    const input = screen.getByTestId("test-field-points");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("1,000");
  });

  it("renders a date field", () => {
    render(
      <TestWrapper
        field={{ name: "startDate", label: "Start Date", type: "date" }}
        defaultValues={{ startDate: "2026-01-15" }}
      />,
    );
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    const input = screen.getByTestId("test-field-startDate");
    expect(input).toHaveAttribute("type", "date");
  });

  it("renders a checkbox field", () => {
    render(
      <TestWrapper
        field={{
          name: "active",
          label: "Active",
          type: "checkbox",
          placeholder: "Is active",
        }}
        defaultValues={{ active: false }}
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    const checkbox = screen.getByTestId("test-field-active");
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("renders a textarea field", () => {
    render(
      <TestWrapper
        field={{
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Enter description",
        }}
        defaultValues={{ description: "" }}
      />,
    );
    expect(screen.getByText("Description")).toBeInTheDocument();
    const textarea = screen.getByTestId("test-field-description");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders a select field with options", () => {
    render(
      <TestWrapper
        field={{
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        }}
        defaultValues={{ status: "" }}
      />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByTestId("test-field-status")).toBeInTheDocument();
  });

  it("shows required indicator when field is required", () => {
    render(
      <TestWrapper
        field={{ name: "name", label: "Name", type: "text", required: true }}
        defaultValues={{ name: "" }}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not show required indicator when field is not required", () => {
    render(
      <TestWrapper
        field={{ name: "name", label: "Name", type: "text" }}
        defaultValues={{ name: "" }}
      />,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("displays error message when present", () => {
    render(
      <TestWrapperWithError
        field={{ name: "name", label: "Name", type: "text" }}
        defaultValues={{ name: "" }}
        errorMessage="Name is required"
      />,
    );
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("renders text field as disabled when disabled prop is true", () => {
    render(
      <TestWrapper
        field={{ name: "name", label: "Name", type: "text" }}
        defaultValues={{ name: "" }}
        disabled
      />,
    );
    expect(screen.getByTestId("test-field-name")).toBeDisabled();
  });

  it("renders checkbox as disabled when disabled prop is true", () => {
    render(
      <TestWrapper
        field={{
          name: "active",
          label: "Active",
          type: "checkbox",
          placeholder: "Is active",
        }}
        defaultValues={{ active: false }}
        disabled
      />,
    );
    expect(screen.getByTestId("test-field-active")).toBeDisabled();
  });

  it("renders number field as disabled when disabled prop is true", () => {
    render(
      <TestWrapper
        field={{ name: "points", label: "Points", type: "number" }}
        defaultValues={{ points: 0 }}
        disabled
      />,
    );
    expect(screen.getByTestId("test-field-points")).toBeDisabled();
  });

  it("renders multiselect field with checkbox options", () => {
    render(
      <TestWrapper
        field={{
          name: "tags",
          label: "Tags",
          type: "multiselect",
          options: [
            { value: "vip", label: "VIP" },
            { value: "new", label: "New" },
          ],
        }}
        defaultValues={{ tags: ["vip"] }}
      />,
    );
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("number field handles typing formatted numbers", () => {
    render(
      <TestWrapper
        field={{ name: "amount", label: "Amount", type: "number" }}
        defaultValues={{ amount: undefined }}
      />,
    );
    const input = screen.getByTestId("test-field-amount");
    fireEvent.change(input, { target: { value: "1234" } });
    // After typing a raw number, it should parse and format
    expect(input).toHaveValue("1,234");
  });

  it("number field strips commas from input and parses correctly", () => {
    render(
      <TestWrapper
        field={{ name: "amount", label: "Amount", type: "number" }}
        defaultValues={{ amount: 500 }}
      />,
    );
    const input = screen.getByTestId("test-field-amount");
    // Typing a value with commas should strip them and parse
    fireEvent.change(input, { target: { value: "1,234,567" } });
    expect(input).toHaveValue("1,234,567");
  });

  it("renders textarea as disabled", () => {
    render(
      <TestWrapper
        field={{
          name: "description",
          label: "Description",
          type: "textarea",
        }}
        defaultValues={{ description: "" }}
        disabled
      />,
    );
    expect(screen.getByTestId("test-field-description")).toBeDisabled();
  });

  it("renders with custom className", () => {
    const { container } = render(
      <TestWrapperWithOptions
        field={{ name: "name", label: "Name", type: "text" }}
        defaultValues={{ name: "" }}
        className="custom-class"
      />,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("renders with custom idPrefix", () => {
    render(
      <TestWrapperWithOptions
        field={{ name: "name", label: "Name", type: "text" }}
        defaultValues={{ name: "" }}
        idPrefix="custom-prefix"
      />,
    );
    // The label should have htmlFor pointing to custom-prefix-name
    const label = screen.getByText("Name");
    expect(label).toHaveAttribute("for", "custom-prefix-name");
  });

  it("checkbox toggles on click", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        field={{
          name: "active",
          label: "Active",
          type: "checkbox",
          placeholder: "Is active",
        }}
        defaultValues={{ active: false }}
      />,
    );
    const checkbox = screen.getByTestId("test-field-active");
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("checkbox renders with checked default", () => {
    render(
      <TestWrapper
        field={{
          name: "active",
          label: "Active",
          type: "checkbox",
          placeholder: "Is active",
        }}
        defaultValues={{ active: true }}
      />,
    );
    expect(screen.getByTestId("test-field-active")).toBeChecked();
  });

  it("multiselect disables checkboxes when disabled", () => {
    render(
      <TestWrapper
        field={{
          name: "tags",
          label: "Tags",
          type: "multiselect",
          options: [
            { value: "vip", label: "VIP" },
          ],
        }}
        defaultValues={{ tags: [] }}
        disabled
      />,
    );
    const checkboxes = screen.getByTestId("test-field-tags").querySelectorAll("input[type='checkbox']");
    expect(checkboxes[0]).toBeDisabled();
  });

  it("date-never renders checkbox and date input", () => {
    render(
      <TestWrapper
        field={{
          name: "expiryDate",
          label: "Expiry Date",
          type: "date-never",
          placeholder: "Never expires",
        }}
        defaultValues={{ expiryDate: "" }}
      />,
    );
    expect(screen.getByText("Expiry Date")).toBeInTheDocument();
    expect(screen.getByText("Never expires")).toBeInTheDocument();
    expect(screen.getByTestId("test-field-expiryDate-never")).toBeInTheDocument();
    // When not checked, date input should be visible
    expect(screen.getByTestId("test-field-expiryDate")).toBeInTheDocument();
  });

  it("date-never hides date input when never checkbox is checked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        field={{
          name: "expiryDate",
          label: "Expiry Date",
          type: "date-never",
          placeholder: "Never expires",
        }}
        defaultValues={{ expiryDate: "" }}
      />,
    );
    const neverCheckbox = screen.getByTestId("test-field-expiryDate-never");
    await user.click(neverCheckbox);
    // Date input should be hidden when "never" is checked
    expect(screen.queryByTestId("test-field-expiryDate")).not.toBeInTheDocument();
  });

  it("warning-days renders Add warning button", () => {
    render(
      <TestWrapper
        field={{
          name: "warningDays",
          label: "Warning Days",
          type: "warning-days",
        }}
        defaultValues={{ warningDays: "" }}
      />,
    );
    expect(screen.getByText("Warning Days")).toBeInTheDocument();
    expect(screen.getByText("Add warning")).toBeInTheDocument();
  });

  it("warning-days renders existing values with remove buttons", () => {
    render(
      <TestWrapper
        field={{
          name: "warningDays",
          label: "Warning Days",
          type: "warning-days",
        }}
        defaultValues={{ warningDays: "30,60" }}
      />,
    );
    expect(screen.getByTestId("test-field-warningDays-0")).toBeInTheDocument();
    expect(screen.getByTestId("test-field-warningDays-1")).toBeInTheDocument();
    // Each warning day entry shows "days before expiry"
    const labels = screen.getAllByText("days before expiry");
    expect(labels).toHaveLength(2);
  });

  it("warning-days hides Add warning button when disabled", () => {
    render(
      <TestWrapper
        field={{
          name: "warningDays",
          label: "Warning Days",
          type: "warning-days",
        }}
        defaultValues={{ warningDays: "30" }}
        disabled
      />,
    );
    expect(screen.queryByText("Add warning")).not.toBeInTheDocument();
  });

  it("renders empty fragment for unknown field type", () => {
    const { container } = render(
      <TestWrapper
        // @ts-expect-error: testing unknown type
        field={{ name: "unknown", label: "Unknown", type: "fancy-widget" }}
        defaultValues={{ unknown: "" }}
      />,
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    // No input rendered for unknown types
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("textarea renders with placeholder", () => {
    render(
      <TestWrapper
        field={{
          name: "notes",
          label: "Notes",
          type: "textarea",
          placeholder: "Enter notes...",
        }}
        defaultValues={{ notes: "" }}
      />,
    );
    expect(screen.getByPlaceholderText("Enter notes...")).toBeInTheDocument();
  });

  it("text field renders with placeholder", () => {
    render(
      <TestWrapper
        field={{
          name: "email",
          label: "Email",
          type: "text",
          placeholder: "user@example.com",
        }}
        defaultValues={{ email: "" }}
      />,
    );
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
  });

  it("number field shows empty string for null/undefined value", () => {
    render(
      <TestWrapper
        field={{ name: "amount", label: "Amount", type: "number" }}
        defaultValues={{ amount: undefined }}
      />,
    );
    expect(screen.getByTestId("test-field-amount")).toHaveValue("");
  });

  it("warning-days adds a new warning when Add warning is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        field={{
          name: "warningDays",
          label: "Warning Days",
          type: "warning-days",
        }}
        defaultValues={{ warningDays: "30" }}
      />,
    );
    expect(screen.getByTestId("test-field-warningDays-0")).toBeInTheDocument();
    expect(screen.queryByTestId("test-field-warningDays-1")).not.toBeInTheDocument();

    await user.click(screen.getByText("Add warning"));
    expect(screen.getByTestId("test-field-warningDays-1")).toBeInTheDocument();
  });

  it("warning-days removes a warning when remove button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        field={{
          name: "warningDays",
          label: "Warning Days",
          type: "warning-days",
        }}
        defaultValues={{ warningDays: "30,60" }}
      />,
    );
    expect(screen.getByTestId("test-field-warningDays-0")).toBeInTheDocument();
    expect(screen.getByTestId("test-field-warningDays-1")).toBeInTheDocument();

    // Click the remove button for the first warning day
    const removeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg") && btn.closest(".flex.items-center.gap-2"),
    );
    await user.click(removeButtons[0]!);

    // Should have only one warning day now
    expect(screen.getByTestId("test-field-warningDays-0")).toBeInTheDocument();
    expect(screen.queryByTestId("test-field-warningDays-1")).not.toBeInTheDocument();
  });
});
