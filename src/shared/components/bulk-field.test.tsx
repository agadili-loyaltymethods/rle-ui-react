import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { BulkField } from "./bulk-field";

describe("BulkField", () => {
  it("renders children without crashing", () => {
    render(
      <BulkField
        fieldKey="name"
        enabled={true}
        mixed={false}
        onToggle={vi.fn()}
      >
        <input data-testid="inner-input" aria-label="Inner input" />
      </BulkField>,
    );
    expect(screen.getByTestId("inner-input")).toBeInTheDocument();
  });

  it("shows mixed indicator when disabled and mixed", () => {
    render(
      <BulkField
        fieldKey="name"
        enabled={false}
        mixed={true}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    expect(screen.getByText("(mixed)")).toBeInTheDocument();
  });

  it("does not show mixed indicator when enabled and mixed", () => {
    render(
      <BulkField
        fieldKey="name"
        enabled={true}
        mixed={true}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    expect(screen.queryByText("(mixed)")).not.toBeInTheDocument();
  });

  it("does not show mixed indicator when disabled but not mixed", () => {
    render(
      <BulkField
        fieldKey="name"
        enabled={false}
        mixed={false}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    expect(screen.queryByText("(mixed)")).not.toBeInTheDocument();
  });

  it("renders checkbox that reflects enabled state (checked)", () => {
    render(
      <BulkField
        fieldKey="name"
        enabled={true}
        mixed={false}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("renders checkbox that reflects enabled state (unchecked)", () => {
    render(
      <BulkField
        fieldKey="name"
        enabled={false}
        mixed={false}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("calls onToggle with fieldKey when checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <BulkField
        fieldKey="status"
        enabled={false}
        mixed={false}
        onToggle={onToggle}
      >
        <span>field</span>
      </BulkField>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("status");
  });

  it("applies opacity styling when disabled", () => {
    const { container } = render(
      <BulkField
        fieldKey="name"
        enabled={false}
        mixed={false}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    // The content wrapper div should have opacity-50 class when disabled
    const contentDiv = container.querySelector(".opacity-50");
    expect(contentDiv).toBeInTheDocument();
  });

  it("does not apply opacity styling when enabled", () => {
    const { container } = render(
      <BulkField
        fieldKey="name"
        enabled={true}
        mixed={false}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    const contentDiv = container.querySelector(".opacity-50");
    expect(contentDiv).not.toBeInTheDocument();
  });

  it("applies pointer-events-none when disabled", () => {
    const { container } = render(
      <BulkField
        fieldKey="name"
        enabled={false}
        mixed={false}
        onToggle={vi.fn()}
      >
        <span>field</span>
      </BulkField>,
    );
    const contentDiv = container.querySelector(".pointer-events-none");
    expect(contentDiv).toBeInTheDocument();
  });

  it("renders different field types as children", () => {
    render(
      <BulkField
        fieldKey="description"
        enabled={true}
        mixed={false}
        onToggle={vi.fn()}
      >
        <textarea data-testid="bulk-textarea" aria-label="Bulk textarea" />
      </BulkField>,
    );
    expect(screen.getByTestId("bulk-textarea")).toBeInTheDocument();
  });

  it("toggles from disabled to enabled and calls onToggle", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <BulkField
        fieldKey="name"
        enabled={false}
        mixed={true}
        onToggle={onToggle}
      >
        <input data-testid="inner-toggle-disabled" aria-label="Toggle disabled input" />
      </BulkField>,
    );
    // Mixed indicator should be visible when disabled
    expect(screen.getByText("(mixed)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("name");

    // After re-render as enabled, mixed should disappear
    rerender(
      <BulkField
        fieldKey="name"
        enabled={true}
        mixed={true}
        onToggle={onToggle}
      >
        <input data-testid="inner-toggle-enabled" aria-label="Toggle enabled input" />
      </BulkField>,
    );
    expect(screen.queryByText("(mixed)")).not.toBeInTheDocument();
  });
});
