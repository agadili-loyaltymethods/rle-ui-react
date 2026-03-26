import { describe, it, expect } from "vitest";
import { renderHook, act } from "@/test-utils";
import { useDivisionTree } from "./use-division-tree";
import type { Division } from "@/shared/types";

function div(id: string, name: string, parent?: string): Division {
  return {
    _id: id,
    name,
    parent,
    isActive: true,
    org: "test-org",
    createdAt: "",
    updatedAt: "",
  };
}

const divisions = [
  div("a", "Alpha"),
  div("b", "Beta", "a"),
  div("c", "Charlie", "b"),
  div("d", "Delta"),
];

describe("useDivisionTree", () => {
  it("builds the tree from flat divisions", () => {
    const { result } = renderHook(() => useDivisionTree(divisions));
    expect(result.current.tree).toHaveLength(2); // Alpha, Delta
  });

  it("manages selectedId state", () => {
    const { result } = renderHook(() => useDivisionTree(divisions));
    expect(result.current.selectedId).toBeNull();

    act(() => result.current.setSelectedId("a"));
    expect(result.current.selectedId).toBe("a");
  });

  it("manages expanded nodes", () => {
    const { result } = renderHook(() => useDivisionTree(divisions));

    act(() => result.current.toggleExpanded("a"));
    expect(result.current.expandedIds.has("a")).toBe(true);

    act(() => result.current.toggleExpanded("a"));
    expect(result.current.expandedIds.has("a")).toBe(false);
  });

  it("filters tree by search query", () => {
    const { result } = renderHook(() => useDivisionTree(divisions));

    act(() => result.current.setSearchQuery("charlie"));
    expect(result.current.filteredTree).toHaveLength(1); // Alpha ancestor
    expect(result.current.filteredTree[0]!.division.name).toBe("Alpha");
  });

  it("expands all ancestors when selecting a nested node via expandToNode", () => {
    const { result } = renderHook(() => useDivisionTree(divisions));

    act(() => result.current.expandToNode("c")); // Charlie is under Alpha > Beta
    expect(result.current.expandedIds.has("a")).toBe(true);
    expect(result.current.expandedIds.has("b")).toBe(true);
  });
});
