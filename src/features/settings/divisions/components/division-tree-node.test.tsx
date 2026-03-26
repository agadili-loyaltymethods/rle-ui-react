import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { DivisionTreeNode } from "./division-tree-node";
import type { TreeNode } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

function div(id: string, name: string, isActive = true): Division {
  return {
    _id: id,
    name,
    isActive,
    org: "test-org",
    createdAt: "",
    updatedAt: "",
  };
}

function node(division: Division, children: TreeNode[] = []): TreeNode {
  return { division, children };
}

describe("DivisionTreeNode", () => {
  const defaultProps = {
    expandedIds: new Set<string>(),
    selectedId: null as string | null,
    onSelect: vi.fn(),
    onToggleExpand: vi.fn(),
    onDrop: vi.fn(),
    onAddChild: vi.fn(),
    depth: 0,
  };

  it("renders the division name", () => {
    render(
      <DivisionTreeNode node={node(div("a", "Alpha"))} {...defaultProps} />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("shows inactive badge when division is not active", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha", false))}
        {...defaultProps}
      />,
    );
    expect(screen.getByText("divisions.inactive")).toBeInTheDocument();
  });

  it("shows active badge when division is active", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha", true))}
        {...defaultProps}
      />,
    );
    expect(screen.getByText("divisions.isActive")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"))}
        {...defaultProps}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("highlights the selected node", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"))}
        {...defaultProps}
        selectedId="a"
      />,
    );
    const row = screen.getByTestId("tree-node-a");
    expect(row.className).toContain("bg-subtle");
  });

  it("shows expand chevron when node has children", () => {
    const child = node(div("b", "Beta"));
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"), [child])}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("expand-toggle-a")).toBeInTheDocument();
  });

  it("expand toggle has aria-label and title", () => {
    const child = node(div("b", "Beta"));
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"), [child])}
        {...defaultProps}
      />,
    );
    const toggle = screen.getByTestId("expand-toggle-a");
    expect(toggle).toHaveAttribute("aria-label");
    expect(toggle).toHaveAttribute("title");
  });

  it("drag handle has aria-label and title when onDrop is provided", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"))}
        {...defaultProps}
        onDrop={vi.fn()}
      />,
    );
    const handle = screen.getByTestId("drag-handle-a");
    expect(handle).toHaveAttribute("aria-label");
    expect(handle).toHaveAttribute("title");
  });

  it("hides drag handle when onDrop is undefined", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"))}
        {...defaultProps}
        onDrop={undefined}
      />,
    );
    expect(screen.queryByTestId("drag-handle-a")).not.toBeInTheDocument();
  });

  it("hides add-child button when onAddChild is undefined", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"))}
        {...defaultProps}
        onAddChild={undefined}
      />,
    );
    expect(screen.queryByTestId("add-child-a")).not.toBeInTheDocument();
  });

  it("renders children when expanded", () => {
    const child = node(div("b", "Beta"));
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"), [child])}
        {...defaultProps}
        expandedIds={new Set(["a"])}
      />,
    );
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("hides children when collapsed", () => {
    const child = node(div("b", "Beta"));
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"), [child])}
        {...defaultProps}
        expandedIds={new Set()}
      />,
    );
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("calls onToggleExpand when chevron is clicked", () => {
    const onToggleExpand = vi.fn();
    const child = node(div("b", "Beta"));
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"), [child])}
        {...defaultProps}
        onToggleExpand={onToggleExpand}
      />,
    );
    fireEvent.click(screen.getByTestId("expand-toggle-a"));
    expect(onToggleExpand).toHaveBeenCalledWith("a");
  });
});
