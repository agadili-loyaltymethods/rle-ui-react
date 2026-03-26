import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

describe("UnsavedChangesDialog", () => {
  it("renders dialog content when open", () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    expect(screen.getByText("Keep Editing")).toBeInTheDocument();
    expect(screen.getByText("Discard Changes")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <UnsavedChangesDialog
        open={false}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
  });

  it("calls onCancel when Keep Editing is clicked", () => {
    const onCancel = vi.fn();
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={onCancel}
        onDiscard={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Keep Editing"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onDiscard when Discard Changes is clicked", () => {
    const onDiscard = vi.fn();
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={vi.fn()}
        onDiscard={onDiscard}
      />,
    );
    fireEvent.click(screen.getByText("Discard Changes"));
    expect(onDiscard).toHaveBeenCalled();
  });

  it("shows default description text", () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(
      screen.getByText("You have unsaved changes that will be lost. Are you sure you want to leave?"),
    ).toBeInTheDocument();
  });

  it("shows custom description when provided", () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        description="Custom warning text"
      />,
    );
    expect(screen.getByText("Custom warning text")).toBeInTheDocument();
  });

  it("calls onCancel when the X close button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={onCancel}
        onDiscard={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when dialog is closed via onOpenChange(false)", () => {
    // When the dialog's onOpenChange fires with false (e.g. pressing Escape),
    // it should call onCancel. The X close button triggers onOpenChange(false).
    const onCancel = vi.fn();
    render(
      <UnsavedChangesDialog
        open={true}
        onCancel={onCancel}
        onDiscard={vi.fn()}
      />,
    );
    // Press Escape to trigger onOpenChange(false) -> onCancel
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});
