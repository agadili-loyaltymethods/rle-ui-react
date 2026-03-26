import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

describe("DeleteConfirmDialog", () => {
  it("renders with default title and description when open", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Delete" })).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this item? This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("shows itemName in description", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        itemName="Gold Points"
      />,
    );
    expect(
      screen.getByText(/Are you sure you want to delete "Gold Points"/),
    ).toBeInTheDocument();
  });

  describe("confirm button", () => {
    it("calls onConfirm when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(
        <DeleteConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Delete" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("disables delete button when isPending is true", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isPending={true}
        />,
      );
      expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    });

    it("renders custom confirmLabel", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          confirmLabel="Remove"
        />,
      );
      expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("calls onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <DeleteConfirmDialog
          open={true}
          onClose={onClose}
          onConfirm={vi.fn()}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("custom title and description", () => {
    it("renders custom title", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Remove Member"
        />,
      );
      expect(screen.getByRole("heading", { name: "Remove Member" })).toBeInTheDocument();
    });

    it("renders custom description over itemName", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          itemName="Gold Points"
          description="Custom warning message"
        />,
      );
      expect(screen.getByText("Custom warning message")).toBeInTheDocument();
      expect(screen.queryByText(/Gold Points/)).not.toBeInTheDocument();
    });
  });

  describe("does not render when closed", () => {
    it("hides all content", () => {
      render(
        <DeleteConfirmDialog
          open={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.queryByRole("heading", { name: "Delete" })).not.toBeInTheDocument();
    });
  });
});
