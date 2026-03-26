import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { z } from "zod";
import { FormModal } from "./form-modal";

const schema = z.object({ name: z.string().min(1, "Name is required") });

describe("FormModal", () => {
  it("renders modal with title when open", () => {
    render(
      <FormModal
        open={true}
        onOpenChange={vi.fn()}
        title="Create Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Create Item" })).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <FormModal
        open={false}
        onOpenChange={vi.fn()}
        title="Create Item"
        schema={schema}
        onSubmit={vi.fn()}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />,
    );
    expect(screen.queryByText("Create Item")).not.toBeInTheDocument();
  });

  describe("form submission", () => {
    it("calls onSubmit with form data on valid submission", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create Item"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      const input = screen.getByTestId("form-modal-field-name");
      await user.type(input, "Test Item");
      await user.click(screen.getByTestId("form-modal-submit"));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: "Test Item" });
      });
    });

    it("shows validation errors when submitting empty required field", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create Item"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text", required: true }]}
          defaultValues={{ name: "" }}
        />,
      );

      await user.click(screen.getByTestId("form-modal-submit"));

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
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create Item"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "Test" }}
        />,
      );

      await user.click(screen.getByTestId("form-modal-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("form-modal-submit")).toBeDisabled();
      });

      resolveSubmit!();
      await waitFor(() => {
        expect(screen.getByTestId("form-modal-submit")).not.toBeDisabled();
      });
    });
  });

  describe("cancel behavior", () => {
    it("calls onOpenChange(false) when cancel button is clicked on clean form", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create Item"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );

      await user.click(screen.getByTestId("form-modal-cancel"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("description", () => {
    it("renders description when provided", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create Item"
          description="Fill in the details below"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );
      expect(screen.getByText("Fill in the details below")).toBeInTheDocument();
    });
  });

  describe("field types", () => {
    it("renders select field with options", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ status: z.string() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          }]}
        />,
      );
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders checkbox field", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ enabled: z.boolean() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "enabled",
            label: "Enabled",
            type: "checkbox",
            placeholder: "Enable this item",
          }]}
        />,
      );
      expect(screen.getByText("Enable this item")).toBeInTheDocument();
    });

    it("renders textarea field", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ notes: z.string() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "notes",
            label: "Notes",
            type: "textarea",
            placeholder: "Enter notes...",
          }]}
        />,
      );
      expect(screen.getByPlaceholderText("Enter notes...")).toBeInTheDocument();
    });
  });

  describe("conditional visibility", () => {
    it("hides field when visible returns false", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ name: z.string(), extra: z.string().optional() })}
          onSubmit={vi.fn()}
          fields={[
            { name: "name", label: "Name", type: "text" },
            { name: "extra", label: "Extra", type: "text", visible: () => false },
          ]}
        />,
      );
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.queryByText("Extra")).not.toBeInTheDocument();
    });
  });

  describe("select field type", () => {
    it("renders a select with options", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ category: z.string().optional() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "category",
            label: "Category",
            type: "select",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
          }]}
        />,
      );
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByTestId("form-modal-field-category")).toBeInTheDocument();
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });

    it("shows placeholder option in select", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ category: z.string().optional() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "category",
            label: "Category",
            type: "select",
            placeholder: "Pick one",
            options: [{ value: "a", label: "Alpha" }],
          }]}
        />,
      );
      expect(screen.getByText("Pick one")).toBeInTheDocument();
    });
  });

  describe("multiselect field type", () => {
    it("renders a multiselect with options", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ tags: z.array(z.string()).optional() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "tags",
            label: "Tags",
            type: "multiselect",
            options: [
              { value: "t1", label: "Tag 1" },
              { value: "t2", label: "Tag 2" },
            ],
          }]}
        />,
      );
      expect(screen.getByText("Tags")).toBeInTheDocument();
      const select = screen.getByTestId("form-modal-field-tags");
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute("multiple");
    });
  });

  describe("checkbox field type", () => {
    it("renders a checkbox with placeholder label", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ active: z.boolean().optional() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "active",
            label: "Active",
            type: "checkbox",
            placeholder: "Enable this feature",
          }]}
        />,
      );
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Enable this feature")).toBeInTheDocument();
      const checkbox = screen.getByTestId("form-modal-field-active");
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });

    it("checkbox toggles on click", async () => {
      const user = userEvent.setup();
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ active: z.boolean().optional() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "active",
            label: "Active",
            type: "checkbox",
            placeholder: "Enable",
          }]}
          defaultValues={{ active: false }}
        />,
      );
      const checkbox = screen.getByTestId("form-modal-field-active") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe("number field type", () => {
    it("renders a number input", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ count: z.coerce.number().optional() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "count",
            label: "Count",
            type: "number",
            placeholder: "0",
          }]}
        />,
      );
      expect(screen.getByText("Count")).toBeInTheDocument();
      const input = screen.getByTestId("form-modal-field-count");
      expect(input).toHaveAttribute("type", "number");
    });
  });

  describe("disabled field", () => {
    it("disables field when disabled function returns true", () => {
      render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={z.object({ name: z.string() })}
          onSubmit={vi.fn()}
          fields={[{
            name: "name",
            label: "Name",
            type: "text",
            disabled: () => true,
          }]}
        />,
      );
      expect(screen.getByTestId("form-modal-field-name")).toBeDisabled();
    });
  });

  describe("close button on clean form", () => {
    it("calls onOpenChange(false) when X close is clicked on clean form", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
        />,
      );
      await user.click(screen.getByTestId("form-modal-close"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("successful submission closes modal", () => {
    it("calls onOpenChange(false) after successful submit", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create"
          schema={schema}
          onSubmit={onSubmit}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "Pre-filled" }}
        />,
      );
      await user.click(screen.getByTestId("form-modal-submit"));
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("form reset on re-open", () => {
    it("resets form values when modal re-opens with new defaults", async () => {
      const { rerender } = render(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "initial" }}
        />,
      );
      expect(screen.getByTestId("form-modal-field-name")).toHaveValue("initial");

      // Close and re-open with different defaults
      rerender(
        <FormModal
          open={false}
          onOpenChange={vi.fn()}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "updated" }}
        />,
      );
      rerender(
        <FormModal
          open={true}
          onOpenChange={vi.fn()}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "updated" }}
        />,
      );
      expect(screen.getByTestId("form-modal-field-name")).toHaveValue("updated");
    });
  });

  describe("unsaved changes guard", () => {
    it("shows unsaved changes dialog when closing with dirty form", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "" }}
        />,
      );

      // Dirty the form by typing something
      await user.type(screen.getByTestId("form-modal-field-name"), "dirty");

      // Click the X close button - this triggers handleClose with isDirty=true
      await user.click(screen.getByTestId("form-modal-close"));

      // UnsavedChangesDialog should show (it renders "Unsaved Changes" text)
      await waitFor(() => {
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
      });
      // onOpenChange should NOT have been called yet
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("keeps editing when Keep Editing is clicked in unsaved dialog", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "" }}
        />,
      );

      await user.type(screen.getByTestId("form-modal-field-name"), "dirty");
      await user.click(screen.getByTestId("form-modal-close"));

      await waitFor(() => {
        expect(screen.getByText("Keep Editing")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Keep Editing"));

      // Dialog should close, form still open, onOpenChange not called
      await waitFor(() => {
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
      });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("discards changes when Discard Changes is clicked in unsaved dialog", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FormModal
          open={true}
          onOpenChange={onOpenChange}
          title="Create"
          schema={schema}
          onSubmit={vi.fn()}
          fields={[{ name: "name", label: "Name", type: "text" }]}
          defaultValues={{ name: "" }}
        />,
      );

      await user.type(screen.getByTestId("form-modal-field-name"), "dirty");
      await user.click(screen.getByTestId("form-modal-close"));

      await waitFor(() => {
        expect(screen.getByText("Discard Changes")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Discard Changes"));

      // Should close the modal
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
