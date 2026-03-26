import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders dialog content when open", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        description="Are you sure?"
      />,
    );
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        description="Are you sure?"
      />,
    );
    expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
  });

  describe("confirm button", () => {
    it("calls onConfirm when confirm button is clicked", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          title="Confirm Action"
          description="Are you sure?"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Confirm" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("renders custom confirm label", () => {
      render(
        <ConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Confirm"
          description="Proceed?"
          confirmLabel="Yes, do it"
        />,
      );
      expect(screen.getByRole("button", { name: "Yes, do it" })).toBeInTheDocument();
    });

    it("disables confirm button when isPending is true", () => {
      render(
        <ConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Confirm"
          description="Loading..."
          isPending={true}
        />,
      );
      expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    });
  });

  describe("cancel button", () => {
    it("calls onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <ConfirmDialog
          open={true}
          onClose={onClose}
          onConfirm={vi.fn()}
          title="Confirm Action"
          description="Are you sure?"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("custom title and description", () => {
    it("displays custom title and description", () => {
      render(
        <ConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Bulk Update"
          description="This will update 50 records."
        />,
      );
      expect(screen.getByText("Bulk Update")).toBeInTheDocument();
      expect(screen.getByText("This will update 50 records.")).toBeInTheDocument();
    });
  });

  describe("data-testid", () => {
    it("passes data-testid to confirm button", () => {
      render(
        <ConfirmDialog
          open={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Confirm"
          description="Sure?"
          data-testid="my-confirm-btn"
        />,
      );
      expect(screen.getByTestId("my-confirm-btn")).toBeInTheDocument();
    });
  });
});
