import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { DrawerShell } from "./drawer-shell";

describe("DrawerShell", () => {
  it("renders title and children when open", () => {
    render(
      <DrawerShell
        open={true}
        onOpenChange={vi.fn()}
        title="Edit Item"
      >
        <div data-testid="drawer-body">content</div>
      </DrawerShell>,
    );
    expect(screen.getByRole("heading", { name: "Edit Item" })).toBeInTheDocument();
    expect(screen.getByTestId("drawer-body")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <DrawerShell
        open={false}
        onOpenChange={vi.fn()}
        title="Edit Item"
      >
        <div data-testid="drawer-body">content</div>
      </DrawerShell>,
    );
    expect(screen.queryByText("Edit Item")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <DrawerShell
        open={true}
        onOpenChange={onOpenChange}
        title="Edit Item"
      >
        <div>content</div>
      </DrawerShell>,
    );

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders with custom testId", () => {
    render(
      <DrawerShell
        open={true}
        onOpenChange={vi.fn()}
        title="Edit Item"
        testId="custom-drawer"
      >
        <div>content</div>
      </DrawerShell>,
    );

    expect(screen.getByTestId("custom-drawer")).toBeInTheDocument();
  });

  it("renders with custom widthClass", () => {
    render(
      <DrawerShell
        open={true}
        onOpenChange={vi.fn()}
        title="Edit Item"
        widthClass="w-[600px]"
      >
        <div>content</div>
      </DrawerShell>,
    );

    expect(screen.getByRole("heading", { name: "Edit Item" })).toBeInTheDocument();
  });

  it("prevents outside interaction from closing the drawer", () => {
    const onOpenChange = vi.fn();
    render(
      <DrawerShell
        open={true}
        onOpenChange={onOpenChange}
        title="Drawer"
      >
        <div>content</div>
      </DrawerShell>,
    );
    // The overlay click should be intercepted by onInteractOutside -> e.preventDefault()
    // So clicking overlay should NOT call onOpenChange
    const overlay = document.querySelector("[data-state='open']");
    if (overlay) {
      fireEvent.click(overlay);
    }
    // onOpenChange should not have been called from outside click
    // (close button click is separate)
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("renders multiple children correctly", () => {
    render(
      <DrawerShell
        open={true}
        onOpenChange={vi.fn()}
        title="Multi-child"
      >
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </DrawerShell>,
    );
    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });
});
