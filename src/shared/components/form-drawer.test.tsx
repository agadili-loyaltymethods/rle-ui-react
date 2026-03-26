import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { z } from "zod";
import { FormDrawer } from "./form-drawer";

const schema = z.object({ name: z.string().min(1, "Name is required") });

const multiFieldSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
});

describe("FormDrawer", () => {
  it("renders drawer with title when open", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Add Item" })).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <FormDrawer
        open={false}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />,
    );
    expect(screen.queryByText("Add Item")).not.toBeInTheDocument();
  });

  it("renders Save and Cancel buttons", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />,
    );
    expect(screen.getByTestId("form-drawer-submit")).toHaveTextContent("Save");
    expect(screen.getByTestId("form-drawer-cancel")).toHaveTextContent("Cancel");
  });

  it("renders the form element with correct test id", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />,
    );
    expect(screen.getByTestId("form-drawer-form")).toBeInTheDocument();
  });

  it("renders with custom testIdPrefix", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
        testIdPrefix="custom"
      />,
    );
    expect(screen.getByTestId("custom-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("custom-close")).toBeInTheDocument();
    expect(screen.getByTestId("custom-form")).toBeInTheDocument();
    expect(screen.getByTestId("custom-submit")).toBeInTheDocument();
    expect(screen.getByTestId("custom-cancel")).toBeInTheDocument();
  });

  it("renders multiple fields", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={multiFieldSchema}
        onSubmit={vi.fn()}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "category", label: "Category", type: "text" },
        ]}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
  });

  it("renders default values in fields", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Edit Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
        defaultValues={{ name: "Existing Name" }}
      />,
    );
    expect(screen.getByTestId("form-drawer-field-name")).toHaveValue("Existing Name");
  });

  it("hides field when visible predicate returns false", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={multiFieldSchema}
        onSubmit={vi.fn()}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "category", label: "Category", type: "text", visible: () => false },
        ]}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });

  it("disables field when disabled predicate returns true", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={multiFieldSchema}
        onSubmit={vi.fn()}
        fields={[
          { name: "name", label: "Name", type: "text", disabled: () => true },
        ]}
      />,
    );
    expect(screen.getByTestId("form-drawer-field-name")).toBeDisabled();
  });

  it("disables field when disabled is a boolean true", () => {
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={multiFieldSchema}
        onSubmit={vi.fn()}
        fields={[
          { name: "name", label: "Name", type: "text", disabled: true },
        ]}
      />,
    );
    expect(screen.getByTestId("form-drawer-field-name")).toBeDisabled();
  });

  it("calls renderAfterFields with form and mode", () => {
    const renderAfterFields = vi.fn(() => <div data-testid="custom-section">Custom</div>);
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
        renderAfterFields={renderAfterFields}
        mode="edit"
      />,
    );
    expect(screen.getByTestId("custom-section")).toBeInTheDocument();
    expect(renderAfterFields).toHaveBeenCalledWith(expect.any(Object), "edit");
  });

  it("uses create mode by default for renderAfterFields", () => {
    const renderAfterFields = vi.fn(() => null);
    render(
      <FormDrawer
        open={true}
        onOpenChange={vi.fn()}
        title="Add Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
        renderAfterFields={renderAfterFields}
      />,
    );
    expect(renderAfterFields).toHaveBeenCalledWith(expect.any(Object), "create");
  });

  describe("form submission", () => {
    it("calls onSubmit with form data on valid submission", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={vi.fn()}
          title="Add Item"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      await user.type(screen.getByTestId("form-drawer-field-name"), "New Item");
      await user.click(screen.getByTestId("form-drawer-submit"));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: "New Item" });
      });
    });

    it("shows validation errors when submitting empty required field", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={vi.fn()}
          title="Add Item"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text", required: true }]}
          defaultValues={{ name: "" }}
        />,
      );

      await user.click(screen.getByTestId("form-drawer-submit"));

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("disables submit button while submitting", async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const onSubmit = vi.fn(
        () => new Promise<void>((resolve) => { resolveSubmit = resolve; }),
      );
      render(
        <FormDrawer
          open={true}
          onOpenChange={vi.fn()}
          title="Add Item"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "Test" }}
        />,
      );

      await user.click(screen.getByTestId("form-drawer-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("form-drawer-submit")).toBeDisabled();
      });

      resolveSubmit!();
      await waitFor(() => {
        expect(screen.getByTestId("form-drawer-submit")).not.toBeDisabled();
      });
    });

    it("calls onOpenChange(false) after successful submission", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={onOpenChange}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "Test" }}
        />,
      );

      await user.click(screen.getByTestId("form-drawer-submit"));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

  });

  describe("unsaved changes dialog", () => {
    it("shows unsaved changes dialog when closing dirty form", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={onOpenChange}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      // Dirty the form
      await user.type(screen.getByTestId("form-drawer-field-name"), "dirty");
      // Try to close
      await user.click(screen.getByTestId("form-drawer-close"));

      // Should NOT call onOpenChange directly
      expect(onOpenChange).not.toHaveBeenCalled();
      // Should show unsaved changes dialog
      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    });

    it("discards changes when confirmed in unsaved changes dialog", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={onOpenChange}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      // Dirty the form
      await user.type(screen.getByTestId("form-drawer-field-name"), "dirty");
      // Try to close
      await user.click(screen.getByTestId("form-drawer-close"));

      // Click discard in the unsaved changes dialog
      const discardBtn = screen.getByRole("button", { name: /discard/i });
      await user.click(discardBtn);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("keeps editing when Keep Editing is clicked in unsaved changes dialog", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={onOpenChange}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      await user.type(screen.getByTestId("form-drawer-field-name"), "dirty");
      await user.click(screen.getByTestId("form-drawer-close"));
      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

      await user.click(screen.getByText("Keep Editing"));

      await waitFor(() => {
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
      });
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("cancel behavior", () => {
    it("calls onOpenChange(false) when cancel is clicked on clean form", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={onOpenChange}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      await user.click(screen.getByTestId("form-drawer-cancel"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("description", () => {
    it("renders description when provided", () => {
      render(
        <FormDrawer
          open={true}
          onOpenChange={vi.fn()}
          title="Add Item"
          description="Enter item details"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );
      expect(screen.getByText("Enter item details")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      render(
        <FormDrawer
          open={true}
          onOpenChange={vi.fn()}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );
      // The dialog description element should not exist
      expect(screen.queryByText("Enter item details")).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("calls onOpenChange(false) when close button is clicked on clean form", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormDrawer
          open={true}
          onOpenChange={onOpenChange}
          title="Add Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      await user.click(screen.getByTestId("form-drawer-close"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
