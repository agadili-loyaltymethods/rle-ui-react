import { describe, it, expect } from "vitest";
import {
  buildDivisionTree,
  findDescendantIds,
  filterTreeBySearch,
  filterTreeByActive,
} from "./division-tree-utils";
import type { Division } from "@/shared/types";

function div(id: string, name: string, parent?: string, isActive = true): Division {
  return {
    _id: id,
    name,
    parent,
    isActive,
    org: "test-org",
    createdAt: "",
    updatedAt: "",
  };
}

describe("buildDivisionTree", () => {
  it("returns empty array for empty input", () => {
    expect(buildDivisionTree([])).toEqual([]);
  });

  it("places root divisions (no parent) at top level", () => {
    const divisions = [div("a", "Alpha"), div("b", "Beta")];
    const tree = buildDivisionTree(divisions);
    expect(tree).toHaveLength(2);
    expect(tree[0]!.division.name).toBe("Alpha");
    expect(tree[1]!.division.name).toBe("Beta");
  });

  it("nests children under their parent", () => {
    const divisions = [
      div("a", "Alpha"),
      div("b", "Beta", "a"),
      div("c", "Charlie", "a"),
    ];
    const tree = buildDivisionTree(divisions);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(2);
    expect(tree[0]!.children[0]!.division.name).toBe("Beta");
    expect(tree[0]!.children[1]!.division.name).toBe("Charlie");
  });

  it("handles multi-level nesting", () => {
    const divisions = [
      div("a", "Alpha"),
      div("b", "Beta", "a"),
      div("c", "Charlie", "b"),
    ];
    const tree = buildDivisionTree(divisions);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children[0]!.children[0]!.division.name).toBe("Charlie");
  });

  it("sorts siblings alphabetically by name", () => {
    const divisions = [div("a", "Zeta"), div("b", "Alpha"), div("c", "Mu")];
    const tree = buildDivisionTree(divisions);
    expect(tree.map((n) => n.division.name)).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  it("handles populated parent objects by extracting _id", () => {
    const divisions = [
      div("a", "Alpha"),
      {
        ...div("b", "Beta"),
        parent: { _id: "a", name: "Alpha" } as unknown as string,
      },
    ];
    const tree = buildDivisionTree(divisions);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(1);
  });
});

describe("findDescendantIds", () => {
  it("returns empty set for a leaf node", () => {
    const divisions = [div("a", "Alpha")];
    expect(findDescendantIds("a", divisions)).toEqual(new Set());
  });

  it("returns all descendants recursively", () => {
    const divisions = [
      div("a", "Alpha"),
      div("b", "Beta", "a"),
      div("c", "Charlie", "b"),
      div("d", "Delta", "a"),
    ];
    expect(findDescendantIds("a", divisions)).toEqual(
      new Set(["b", "c", "d"]),
    );
  });

  it("returns empty set for unknown id", () => {
    expect(findDescendantIds("x", [div("a", "Alpha")])).toEqual(new Set());
  });
});

describe("filterTreeBySearch", () => {
  it("returns full tree when query is empty", () => {
    const tree = buildDivisionTree([div("a", "Alpha"), div("b", "Beta")]);
    expect(filterTreeBySearch(tree, "")).toHaveLength(2);
  });

  it("filters to matching nodes and their ancestors", () => {
    const tree = buildDivisionTree([
      div("a", "Alpha"),
      div("b", "Beta", "a"),
      div("c", "Charlie", "b"),
      div("d", "Delta"),
    ]);
    const filtered = filterTreeBySearch(tree, "charlie");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.division.name).toBe("Alpha");
    expect(filtered[0]!.children[0]!.division.name).toBe("Beta");
    expect(filtered[0]!.children[0]!.children[0]!.division.name).toBe(
      "Charlie",
    );
  });

  it("is case-insensitive", () => {
    const tree = buildDivisionTree([div("a", "Alpha")]);
    expect(filterTreeBySearch(tree, "ALPHA")).toHaveLength(1);
  });
});

describe("filterTreeByActive", () => {
  it("removes fully inactive subtrees", () => {
    const tree = buildDivisionTree([
      div("a", "Alpha", undefined, true),
      div("b", "Beta", "a", false),
      div("c", "Charlie", undefined, false),
    ]);
    const filtered = filterTreeByActive(tree);
    // Alpha is active (kept), Beta is inactive child with no active descendants (removed)
    // Charlie is inactive root with no active descendants (removed)
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.division.name).toBe("Alpha");
    expect(filtered[0]!.children).toHaveLength(0);
  });

  it("retains inactive ancestors of active descendants", () => {
    const tree = buildDivisionTree([
      div("a", "Alpha", undefined, false),
      div("b", "Beta", "a", true),
    ]);
    const filtered = filterTreeByActive(tree);
    // Alpha is inactive but has active child Beta — both kept
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.division.name).toBe("Alpha");
    expect(filtered[0]!.children).toHaveLength(1);
    expect(filtered[0]!.children[0]!.division.name).toBe("Beta");
  });

  it("returns full tree when all divisions are active", () => {
    const tree = buildDivisionTree([
      div("a", "Alpha"),
      div("b", "Beta", "a"),
    ]);
    const filtered = filterTreeByActive(tree);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.children).toHaveLength(1);
  });
});
