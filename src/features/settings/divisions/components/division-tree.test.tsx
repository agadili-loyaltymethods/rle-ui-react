import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { DivisionTree } from "./division-tree";
import type { TreeNode } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

function div(id: string, name: string): Division {
  return {
    _id: id,
    name,
    isActive: true,
    org: "test-org",
    createdAt: "",
    updatedAt: "",
  };
}

function node(division: Division, children: TreeNode[] = []): TreeNode {
  return { division, children };
}

describe("DivisionTree", () => {
  const defaultProps = {
    tree: [node(div("a", "Alpha")), node(div("b", "Beta"))],
    expandedIds: new Set<string>(),
    selectedId: null as string | null,
    searchQuery: "",
    activeOnly: true,
    onActiveOnlyChange: vi.fn(),
    onSelect: vi.fn(),
    onToggleExpand: vi.fn(),
    onSearchChange: vi.fn(),
    onCreateNew: vi.fn(),
    onDrop: vi.fn(),
  };

  it("renders the search input", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByTestId("division-search-input")).toBeInTheDocument();
  });

  it("renders the new division button when onCreateNew is provided", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByTestId("division-create-button")).toBeInTheDocument();
  });

  it("hides the new division button when onCreateNew is undefined", () => {
    render(<DivisionTree {...defaultProps} onCreateNew={undefined} />);
    expect(screen.queryByTestId("division-create-button")).not.toBeInTheDocument();
  });

  it("renders tree nodes", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("calls onCreateNew when button is clicked", () => {
    const onCreateNew = vi.fn();
    render(<DivisionTree {...defaultProps} onCreateNew={onCreateNew} />);
    fireEvent.click(screen.getByTestId("division-create-button"));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("calls onSearchChange when typing in search", () => {
    const onSearchChange = vi.fn();
    render(
      <DivisionTree {...defaultProps} onSearchChange={onSearchChange} />,
    );
    fireEvent.change(screen.getByTestId("division-search-input"), {
      target: { value: "alpha" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("alpha");
  });

  it("shows empty state when tree is empty", () => {
    render(<DivisionTree {...defaultProps} tree={[]} />);
    expect(screen.getByText("divisions.noDivisionsYet")).toBeInTheDocument();
  });

  it("shows no-results message when tree is empty but search is active", () => {
    render(<DivisionTree {...defaultProps} tree={[]} searchQuery="xyz" />);
    expect(screen.getByText("divisions.noMatch")).toBeInTheDocument();
  });

  it("renders the active-only switch", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByTestId("division-active-only-switch")).toBeInTheDocument();
  });
});
