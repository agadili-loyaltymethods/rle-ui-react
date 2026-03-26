import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { CategoryManager } from "./category-manager";
import type { Category } from "@/features/reward-catalog/types/reward-policy";

vi.mock("@/shared/lib/format-utils", () => ({
  generateObjectId: () => "generated-id",
}));

const categories: Category[] = [
  { _id: "c1", name: "Food", color: "#EF4444", createdAt: "2025-01-01" },
  { _id: "c2", name: "Travel", color: "#3B82F6", createdAt: "2025-01-01" },
];

function setup(cats = categories) {
  const onAdd = vi.fn();
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const utils = render(
    <CategoryManager
      categories={cats}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />,
  );
  return { ...utils, onAdd, onUpdate, onDelete };
}

describe("CategoryManager", () => {
  it("renders manage categories button with count", () => {
    setup();
    expect(screen.getByText("Manage Categories")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    setup();
    expect(screen.queryByPlaceholderText("New category name")).not.toBeInTheDocument();
  });

  it("expands when clicking header", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Manage Categories"));
    expect(screen.getByPlaceholderText("New category name")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
  });

  it("collapses on second click", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Manage Categories"));
    expect(screen.getByText("Food")).toBeInTheDocument();
    await user.click(screen.getByText("Manage Categories"));
    expect(screen.queryByText("Food")).not.toBeInTheDocument();
  });

  it("shows Edit and Delete buttons for each category", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Manage Categories"));
    expect(screen.getAllByText("Edit")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
  });

  it("calls onDelete when Delete is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup();
    await user.click(screen.getByText("Manage Categories"));
    const deleteButtons = screen.getAllByText("Delete");
    await user.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  it("enters edit mode when Edit is clicked", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Manage Categories"));
    const editButtons = screen.getAllByText("Edit");
    await user.click(editButtons[0]!);
    expect(screen.getByTitle("Save")).toBeInTheDocument();
    expect(screen.getByTitle("Cancel")).toBeInTheDocument();
  });

  it("calls onUpdate when saving an edit", async () => {
    const user = userEvent.setup();
    const { onUpdate } = setup();
    await user.click(screen.getByText("Manage Categories"));
    await user.click(screen.getAllByText("Edit")[0]!);
    const input = screen.getByDisplayValue("Food");
    await user.clear(input);
    await user.type(input, "Snacks");
    await user.click(screen.getByTitle("Save"));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "c1", name: "Snacks" }),
    );
  });

  it("cancels edit when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onUpdate } = setup();
    await user.click(screen.getByText("Manage Categories"));
    await user.click(screen.getAllByText("Edit")[0]!);
    await user.click(screen.getByTitle("Cancel"));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText("Food")).toBeInTheDocument();
  });

  it("adds a new category", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByText("Manage Categories"));
    const input = screen.getByPlaceholderText("New category name");
    await user.type(input, "Entertainment");
    await user.click(screen.getByText("Add"));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Entertainment", _id: "generated-id" }),
    );
  });

  it("disables Add button when name is empty", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Manage Categories"));
    expect(screen.getByText("Add")).toBeDisabled();
  });

  it("does not call onAdd for whitespace-only name", async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByText("Manage Categories"));
    const input = screen.getByPlaceholderText("New category name");
    await user.type(input, "   ");
    // Button should still be disabled since trim() is empty
    expect(screen.getByText("Add")).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows 0 count with empty categories", () => {
    setup([]);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
