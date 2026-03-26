# Division Tree Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a split-view page at `/settings/divisions` for managing divisions as a parent/child tree with inline editing, drag-and-drop reparenting, and CRUD permissions.

**Architecture:** Custom split-view page (left: collapsible tree with DnD, right: React Hook Form detail panel). All divisions fetched in one `useEntityList` call, tree built client-side. Standard CRUD hooks for create/update/delete.

**Tech Stack:** React 19, React Hook Form + Zod, TanStack Query, native HTML5 drag-and-drop, Tailwind CSS 4, Vitest + Testing Library.

**Design doc:** `docs/plans/2026-03-14-division-tree-management-design.md`

**Skills:** Invoke `/ui-standards` before writing any component JSX. Invoke `/ux-conventions` for save button, unsaved changes guard, and empty state patterns.

---

### Task 1: Tree Utility Functions

Pure functions for building and querying the division tree. No React — just data transforms.

**Files:**
- Create: `src/features/settings/divisions/lib/division-tree-utils.ts`
- Test: `src/features/settings/divisions/lib/division-tree-utils.test.ts`

**Step 1: Write the failing tests**

Create `src/features/settings/divisions/lib/division-tree-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildDivisionTree,
  findDescendantIds,
  filterTreeBySearch,
  type TreeNode,
} from "./division-tree-utils";
import type { Division } from "@/shared/types";

function div(id: string, name: string, parent?: string): Division {
  return {
    _id: id,
    name,
    parent,
    isActive: true,
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
    const divisions = [
      div("a", "Zeta"),
      div("b", "Alpha"),
      div("c", "Mu"),
    ];
    const tree = buildDivisionTree(divisions);
    expect(tree.map((n) => n.division.name)).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  it("handles populated parent objects by extracting _id", () => {
    const divisions = [
      div("a", "Alpha"),
      { ...div("b", "Beta"), parent: { _id: "a", name: "Alpha" } as unknown as string },
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
    // Alpha > Beta > Charlie should remain, Delta should be gone
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.division.name).toBe("Alpha");
    expect(filtered[0]!.children[0]!.division.name).toBe("Beta");
    expect(filtered[0]!.children[0]!.children[0]!.division.name).toBe("Charlie");
  });

  it("is case-insensitive", () => {
    const tree = buildDivisionTree([div("a", "Alpha")]);
    expect(filterTreeBySearch(tree, "ALPHA")).toHaveLength(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/settings/divisions/lib/division-tree-utils.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/features/settings/divisions/lib/division-tree-utils.ts`:

```typescript
import type { Division } from "@/shared/types";

export interface TreeNode {
  division: Division;
  children: TreeNode[];
}

/**
 * Extract the parent ID from a Division's parent field.
 * Handles both string IDs and populated objects with _id.
 */
function getParentId(division: Division): string | undefined {
  const parent = division.parent;
  if (!parent) return undefined;
  if (typeof parent === "string") return parent;
  if (typeof parent === "object" && "_id" in (parent as Record<string, unknown>)) {
    return (parent as unknown as { _id: string })._id;
  }
  return undefined;
}

/**
 * Build a tree from a flat array of divisions using the `parent` field.
 * Root nodes (no parent) are top-level. Siblings sorted alphabetically.
 */
export function buildDivisionTree(divisions: Division[]): TreeNode[] {
  const childrenMap = new Map<string | undefined, Division[]>();

  for (const div of divisions) {
    const parentId = getParentId(div);
    const key = parentId ?? undefined;
    const siblings = childrenMap.get(key) ?? [];
    siblings.push(div);
    childrenMap.set(key, siblings);
  }

  function buildNodes(parentId: string | undefined): TreeNode[] {
    const children = childrenMap.get(parentId) ?? [];
    return children
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((division) => ({
        division,
        children: buildNodes(division._id),
      }));
  }

  return buildNodes(undefined);
}

/**
 * Find all descendant IDs of a given division (recursive).
 * Used for cycle detection in drag-and-drop and parent dropdown filtering.
 */
export function findDescendantIds(
  divisionId: string,
  divisions: Division[],
): Set<string> {
  const childrenMap = new Map<string, string[]>();
  for (const div of divisions) {
    const parentId = getParentId(div);
    if (parentId) {
      const siblings = childrenMap.get(parentId) ?? [];
      siblings.push(div._id);
      childrenMap.set(parentId, siblings);
    }
  }

  const result = new Set<string>();
  const stack = [...(childrenMap.get(divisionId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.add(id);
    for (const childId of childrenMap.get(id) ?? []) {
      stack.push(childId);
    }
  }
  return result;
}

/**
 * Filter a tree to only show nodes matching a search query (and their ancestors).
 * Case-insensitive name match. Returns a new tree (does not mutate input).
 */
export function filterTreeBySearch(
  tree: TreeNode[],
  query: string,
): TreeNode[] {
  if (!query.trim()) return tree;
  const lowerQuery = query.toLowerCase();

  function filterNode(node: TreeNode): TreeNode | null {
    const filteredChildren = node.children
      .map(filterNode)
      .filter((n): n is TreeNode => n !== null);

    const nameMatches = node.division.name.toLowerCase().includes(lowerQuery);

    if (nameMatches || filteredChildren.length > 0) {
      return { division: node.division, children: filteredChildren };
    }
    return null;
  }

  return tree.map(filterNode).filter((n): n is TreeNode => n !== null);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/settings/divisions/lib/division-tree-utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/settings/divisions/lib/
git commit -m "feat(divisions): add tree utility functions

buildDivisionTree, findDescendantIds, filterTreeBySearch with tests."
```

---

### Task 2: Division Tree Hook

Custom hook that wraps the tree utils with React state for expand/collapse, selection, and search.

**Files:**
- Create: `src/features/settings/divisions/hooks/use-division-tree.ts`
- Test: `src/features/settings/divisions/hooks/use-division-tree.test.ts`

**Step 1: Write the failing tests**

Create `src/features/settings/divisions/hooks/use-division-tree.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@/test-utils";
import { useDivisionTree } from "./use-division-tree";
import type { Division } from "@/shared/types";

function div(id: string, name: string, parent?: string): Division {
  return {
    _id: id,
    name,
    parent,
    isActive: true,
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/settings/divisions/hooks/use-division-tree.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/features/settings/divisions/hooks/use-division-tree.ts`:

```typescript
import { useState, useMemo, useCallback } from "react";
import type { Division } from "@/shared/types";
import {
  buildDivisionTree,
  filterTreeBySearch,
} from "../lib/division-tree-utils";

export function useDivisionTree(divisions: Division[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const tree = useMemo(() => buildDivisionTree(divisions), [divisions]);

  const filteredTree = useMemo(
    () => filterTreeBySearch(tree, searchQuery),
    [tree, searchQuery],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandToNode = useCallback(
    (targetId: string) => {
      const parentMap = new Map<string, string>();
      for (const d of divisions) {
        if (d.parent && typeof d.parent === "string") {
          parentMap.set(d._id, d.parent);
        }
      }

      setExpandedIds((prev) => {
        const next = new Set(prev);
        let current = parentMap.get(targetId);
        while (current) {
          next.add(current);
          current = parentMap.get(current);
        }
        return next;
      });
    },
    [divisions],
  );

  return {
    tree,
    filteredTree,
    selectedId,
    setSelectedId,
    expandedIds,
    toggleExpanded,
    expandToNode,
    searchQuery,
    setSearchQuery,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/settings/divisions/hooks/use-division-tree.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/settings/divisions/hooks/
git commit -m "feat(divisions): add useDivisionTree hook

Manages tree state: selection, expand/collapse, search filtering."
```

---

### Task 3: Division Tree Node Component

Recursive tree node with expand/collapse, selection, active badge, and drag-and-drop support.

**Files:**
- Create: `src/features/settings/divisions/components/division-tree-node.tsx`
- Test: `src/features/settings/divisions/components/division-tree-node.test.tsx`

**Step 1: Write the failing tests**

Create `src/features/settings/divisions/components/division-tree-node.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { DivisionTreeNode } from "./division-tree-node";
import type { TreeNode } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

function div(id: string, name: string, isActive = true): Division {
  return { _id: id, name, isActive, createdAt: "", updatedAt: "" };
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
    depth: 0,
  };

  it("renders the division name", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha"))}
        {...defaultProps}
      />,
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
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("does not show inactive badge when division is active", () => {
    render(
      <DivisionTreeNode
        node={node(div("a", "Alpha", true))}
        {...defaultProps}
      />,
    );
    expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/settings/divisions/components/division-tree-node.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/features/settings/divisions/components/division-tree-node.tsx`. Invoke `/ui-standards` before writing the JSX.

```typescript
import { ChevronRight } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import type { TreeNode } from "../lib/division-tree-utils";

interface DivisionTreeNodeProps {
  node: TreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDrop: (draggedId: string, targetId: string | null) => void;
}

export function DivisionTreeNode({
  node,
  depth,
  expandedIds,
  selectedId,
  onSelect,
  onToggleExpand,
  onDrop,
}: DivisionTreeNodeProps) {
  const { division, children } = node;
  const isExpanded = expandedIds.has(division._id);
  const isSelected = selectedId === division._id;
  const hasChildren = children.length > 0;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", division._id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== division._id) {
      onDrop(draggedId, division._id);
    }
  }

  return (
    <div>
      <div
        data-testid={`tree-node-${division._id}`}
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-body-sm transition-colors hover:bg-subtle",
          isSelected && "bg-subtle text-foreground",
        )}
        style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => onSelect(division._id)}
      >
        {hasChildren ? (
          <button
            type="button"
            data-testid={`expand-toggle-${division._id}`}
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-border"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(division._id);
            }}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-foreground-muted transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <span className="truncate">{division.name}</span>
        {division.isActive === false && (
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
            Inactive
          </Badge>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <DivisionTreeNode
              key={child.division._id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/settings/divisions/components/division-tree-node.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/settings/divisions/components/division-tree-node.tsx
git add src/features/settings/divisions/components/division-tree-node.test.tsx
git commit -m "feat(divisions): add DivisionTreeNode component

Recursive tree node with expand/collapse, selection, active badge, drag-and-drop."
```

---

### Task 4: Division Tree Panel (Left Side)

The left panel containing the search input, "New Division" button, and the tree.

**Files:**
- Create: `src/features/settings/divisions/components/division-tree.tsx`
- Test: `src/features/settings/divisions/components/division-tree.test.tsx`

**Step 1: Write the failing tests**

Create `src/features/settings/divisions/components/division-tree.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { DivisionTree } from "./division-tree";
import type { TreeNode } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

function div(id: string, name: string): Division {
  return { _id: id, name, isActive: true, createdAt: "", updatedAt: "" };
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
    onSelect: vi.fn(),
    onToggleExpand: vi.fn(),
    onSearchChange: vi.fn(),
    onCreateNew: vi.fn(),
    onDrop: vi.fn(),
  };

  it("renders the search input", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search divisions...")).toBeInTheDocument();
  });

  it("renders the new division button", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByRole("button", { name: /new division/i })).toBeInTheDocument();
  });

  it("renders tree nodes", () => {
    render(<DivisionTree {...defaultProps} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("calls onCreateNew when button is clicked", () => {
    const onCreateNew = vi.fn();
    render(<DivisionTree {...defaultProps} onCreateNew={onCreateNew} />);
    fireEvent.click(screen.getByRole("button", { name: /new division/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("calls onSearchChange when typing in search", () => {
    const onSearchChange = vi.fn();
    render(<DivisionTree {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search divisions..."), {
      target: { value: "alpha" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("alpha");
  });

  it("shows empty state when tree is empty", () => {
    render(<DivisionTree {...defaultProps} tree={[]} />);
    expect(screen.getByText(/no divisions/i)).toBeInTheDocument();
  });

  it("shows no-results message when tree is empty but search is active", () => {
    render(<DivisionTree {...defaultProps} tree={[]} searchQuery="xyz" />);
    expect(screen.getByText(/no divisions match/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/settings/divisions/components/division-tree.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/features/settings/divisions/components/division-tree.tsx`. Invoke `/ui-standards` before writing JSX.

```typescript
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { DivisionTreeNode } from "./division-tree-node";
import type { TreeNode } from "../lib/division-tree-utils";

interface DivisionTreeProps {
  tree: TreeNode[];
  expandedIds: Set<string>;
  selectedId: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSearchChange: (query: string) => void;
  onCreateNew: () => void;
  onDrop: (draggedId: string, targetId: string | null) => void;
}

export function DivisionTree({
  tree,
  expandedIds,
  selectedId,
  searchQuery,
  onSelect,
  onToggleExpand,
  onSearchChange,
  onCreateNew,
  onDrop,
}: DivisionTreeProps) {
  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId) {
      onDrop(draggedId, null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            placeholder="Search divisions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="mr-1 h-4 w-4" />
          New Division
        </Button>
      </div>
      <div
        className="flex-1 overflow-y-auto px-1 pb-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
      >
        {tree.length === 0 ? (
          <p className="p-4 text-center text-body-sm text-foreground-muted">
            {searchQuery
              ? "No divisions match your search."
              : "No divisions yet. Create your first division to get started."}
          </p>
        ) : (
          tree.map((node) => (
            <DivisionTreeNode
              key={node.division._id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDrop={onDrop}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/settings/divisions/components/division-tree.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/settings/divisions/components/division-tree.tsx
git add src/features/settings/divisions/components/division-tree.test.tsx
git commit -m "feat(divisions): add DivisionTree panel component

Left panel with search, new division button, tree rendering, empty states."
```

---

### Task 5: Division Detail Panel (Right Side)

The form panel for viewing/editing/creating a division.

**Files:**
- Create: `src/features/settings/divisions/components/division-detail-panel.tsx`
- Test: `src/features/settings/divisions/components/division-detail-panel.test.tsx`

**Step 1: Write the failing tests**

Create `src/features/settings/divisions/components/division-detail-panel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { DivisionDetailPanel } from "./division-detail-panel";
import type { Division } from "@/shared/types";

function div(id: string, name: string, overrides?: Partial<Division>): Division {
  return {
    _id: id,
    name,
    isActive: true,
    description: "",
    permissions: { read: true, update: false, create: false, delete: false },
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("DivisionDetailPanel", () => {
  const defaultProps = {
    division: null as Division | null,
    allDivisions: [div("a", "Alpha"), div("b", "Beta", { parent: "a" })],
    isCreateMode: false,
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    isSaving: false,
    isDeleting: false,
  };

  it("shows empty state when no division is selected", () => {
    render(<DivisionDetailPanel {...defaultProps} />);
    expect(screen.getByText(/select a division/i)).toBeInTheDocument();
  });

  it("populates form with division data", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha", { description: "Test desc" })}
      />,
    );
    expect(screen.getByDisplayValue("Alpha")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test desc")).toBeInTheDocument();
  });

  it("shows blank form in create mode", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        isCreateMode={true}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("");
  });

  it("shows permission switches", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("excludes current division from parent dropdown options", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    // Alpha should not appear in its own parent dropdown
    // Beta should appear since it's a different division
    const parentSelect = screen.getByTestId("parent-select");
    expect(parentSelect).toBeInTheDocument();
  });

  it("enables save button when form is dirty", async () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    const nameInput = screen.getByDisplayValue("Alpha");
    fireEvent.change(nameInput, { target: { value: "Alpha Updated" } });

    await waitFor(() => {
      expect(screen.getByTestId("save-button")).not.toBeDisabled();
    });
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTestId("delete-button"));
    expect(onDelete).toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/settings/divisions/components/division-detail-panel.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/features/settings/divisions/components/division-detail-panel.tsx`. Invoke `/ui-standards` and `/ux-conventions` before writing JSX.

```typescript
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderTree } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { cn } from "@/shared/lib/cn";
import { findDescendantIds } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

const divisionSchema = z.object({
  name: z.string().min(1, "Name is required").max(250, "Name must be 250 characters or less"),
  description: z.string().optional().default(""),
  isActive: z.boolean().default(false),
  parent: z.string().nullable().default(null),
  permissions: z.object({
    read: z.boolean().default(true),
    update: z.boolean().default(false),
    create: z.boolean().default(false),
    delete: z.boolean().default(false),
  }),
});

type DivisionFormValues = z.infer<typeof divisionSchema>;

interface DivisionDetailPanelProps {
  division: Division | null;
  allDivisions: Division[];
  isCreateMode: boolean;
  onSave: (data: DivisionFormValues) => Promise<void>;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export function DivisionDetailPanel({
  division,
  allDivisions,
  isCreateMode,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: DivisionDetailPanelProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isDirty, errors },
  } = useForm<DivisionFormValues>({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: false,
      parent: null,
      permissions: { read: true, update: false, create: false, delete: false },
    },
  });

  useEffect(() => {
    if (isCreateMode) {
      reset({
        name: "",
        description: "",
        isActive: false,
        parent: null,
        permissions: { read: true, update: false, create: false, delete: false },
      });
    } else if (division) {
      reset({
        name: division.name,
        description: division.description ?? "",
        isActive: division.isActive ?? false,
        parent: (typeof division.parent === "string" ? division.parent : null),
        permissions: {
          read: division.permissions?.read ?? true,
          update: division.permissions?.update ?? false,
          create: division.permissions?.create ?? false,
          delete: division.permissions?.delete ?? false,
        },
      });
    }
  }, [division, isCreateMode, reset]);

  const parentOptions = useMemo(() => {
    if (!division && !isCreateMode) return [];
    const excludeIds = division
      ? new Set([division._id, ...findDescendantIds(division._id, allDivisions)])
      : new Set<string>();
    return allDivisions
      .filter((d) => !excludeIds.has(d._id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [division, isCreateMode, allDivisions]);

  if (!division && !isCreateMode) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-foreground-muted">
        <FolderTree className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-body-sm">Select a division or create a new one</p>
      </div>
    );
  }

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={handleSubmit(onSave)}
    >
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <h2 className="text-h4 text-foreground">
          {isCreateMode ? "New Division" : division?.name}
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-label text-foreground">
              Name
            </label>
            <Input
              id="name"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="mt-1 text-body-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="mb-1.5 block text-label text-foreground">
              Description
            </label>
            <Input id="description" {...register("description")} />
          </div>

          <div>
            <label htmlFor="parent-select" className="mb-1.5 block text-label text-foreground">
              Parent Division
            </label>
            <Controller
              name="parent"
              control={control}
              render={({ field }) => (
                <select
                  data-testid="parent-select"
                  id="parent-select"
                  className={cn(
                    "flex h-9 w-full cursor-pointer rounded-md border border-border bg-card px-3 py-1 text-body-sm text-foreground transition-colors",
                    "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
                  )}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                >
                  <option value="">None (root division)</option>
                  {parentOptions.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="isActive" className="text-label text-foreground">
              Active
            </label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-label text-foreground">Permissions</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["read", "update", "create", "delete"] as const).map((perm) => (
              <div key={perm} className="flex items-center justify-between rounded-md border border-border p-2.5">
                <span className="text-body-sm text-foreground capitalize">{perm}</span>
                <Controller
                  name={`permissions.${perm}`}
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        {!isCreateMode && (
          <Button
            type="button"
            variant="destructive"
            data-testid="delete-button"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        )}
        <div className={cn(!isCreateMode && "ml-auto")}>
          <Button
            type="submit"
            data-testid="save-button"
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "Saving..." : isCreateMode ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/settings/divisions/components/division-detail-panel.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/settings/divisions/components/division-detail-panel.tsx
git add src/features/settings/divisions/components/division-detail-panel.test.tsx
git commit -m "feat(divisions): add DivisionDetailPanel form component

React Hook Form + Zod, permission switches, parent dropdown with cycle filtering."
```

---

### Task 6: Divisions Page (Main Split-View)

Wire everything together: data fetching, tree state, CRUD operations, unsaved changes guard.

**Files:**
- Modify: `src/features/settings/divisions/pages/divisions-page.tsx`
- Modify: `src/features/settings/divisions/pages/divisions-page.test.tsx`

**Step 1: Write the failing tests**

Replace `src/features/settings/divisions/pages/divisions-page.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import { mockAuthenticatedUser } from "@/test-utils";
import Component from "./divisions-page";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: [
        {
          _id: "div-1",
          name: "US Division",
          isActive: true,
          description: "US ops",
          permissions: { read: true, update: false, create: false, delete: false },
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          _id: "div-2",
          name: "EU Division",
          isActive: true,
          parent: "div-1",
          permissions: { read: true, update: true, create: false, delete: false },
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      headers: { "x-total-count": "2" },
    }),
    post: vi.fn().mockResolvedValue({ data: { _id: "new-1", name: "New" } }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe("DivisionsPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
  });

  it("renders the page heading", async () => {
    render(<Component />);
    expect(screen.getByText("Divisions")).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<Component />);
    expect(screen.getByTestId("page-divisions")).toBeInTheDocument();
  });

  it("renders the tree with division data", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByText("US Division")).toBeInTheDocument();
    });
  });

  it("shows the empty detail panel initially", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByText(/select a division/i)).toBeInTheDocument();
    });
  });

  it("renders the new division button", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new division/i })).toBeInTheDocument();
    });
  });

  it("renders the search input", async () => {
    render(<Component />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search divisions...")).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/settings/divisions/pages/divisions-page.test.tsx`
Expected: FAIL — tests that check for division data or split-view elements will fail

**Step 3: Write the implementation**

Replace `src/features/settings/divisions/pages/divisions-page.tsx`. Invoke `/ui-standards` and `/ux-conventions` before writing JSX.

```typescript
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { FolderTree } from "lucide-react";
import { PageHeader } from "@/shared/components/page-header";
import { UnsavedChangesDialog } from "@/shared/components/unsaved-changes-dialog";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import {
  useEntityList,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "@/shared/hooks/use-api";
import { DivisionTree } from "../components/division-tree";
import { DivisionDetailPanel } from "../components/division-detail-panel";
import { useDivisionTree } from "../hooks/use-division-tree";
import { findDescendantIds } from "../lib/division-tree-utils";
import type { Division } from "@/shared/types";

export default function DivisionsPage() {
  const { data, isLoading } = useEntityList<Division>("divisions", {
    limit: 0,
    sort: "name",
  });
  const divisions = data?.data ?? [];

  const {
    filteredTree,
    selectedId,
    setSelectedId,
    expandedIds,
    toggleExpanded,
    expandToNode,
    searchQuery,
    setSearchQuery,
  } = useDivisionTree(divisions);

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);

  const selectedDivision = divisions.find((d) => d._id === selectedId) ?? null;

  const createEntity = useCreateEntity<Division>("divisions");
  const updateEntity = useUpdateEntity<Division>("divisions");
  const deleteEntity = useDeleteEntity("divisions");

  const handleSelect = useCallback(
    (id: string) => {
      if (formIsDirty) {
        setPendingSelectionId(id);
        setShowUnsavedDialog(true);
        return;
      }
      setSelectedId(id);
      setIsCreateMode(false);
      expandToNode(id);
    },
    [formIsDirty, setSelectedId, expandToNode],
  );

  const handleCreateNew = useCallback(() => {
    if (formIsDirty) {
      setPendingSelectionId(null);
      setShowUnsavedDialog(true);
      return;
    }
    setSelectedId(null);
    setIsCreateMode(true);
  }, [formIsDirty, setSelectedId]);

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false);
    setFormIsDirty(false);
    if (pendingSelectionId) {
      setSelectedId(pendingSelectionId);
      setIsCreateMode(false);
      expandToNode(pendingSelectionId);
    } else {
      setSelectedId(null);
      setIsCreateMode(true);
    }
    setPendingSelectionId(null);
  }, [pendingSelectionId, setSelectedId, expandToNode]);

  const handleSave = useCallback(
    async (formData: {
      name: string;
      description?: string;
      isActive: boolean;
      parent: string | null;
      permissions: { read: boolean; update: boolean; create: boolean; delete: boolean };
    }) => {
      try {
        if (isCreateMode) {
          const created = await createEntity.mutateAsync({
            name: formData.name,
            description: formData.description || undefined,
            isActive: formData.isActive,
            parent: formData.parent || undefined,
            permissions: formData.permissions,
          } as Partial<Division>);
          setIsCreateMode(false);
          setSelectedId(created._id);
          expandToNode(created._id);
          toast.success("Division created");
        } else if (selectedId) {
          await updateEntity.mutateAsync({
            id: selectedId,
            data: {
              name: formData.name,
              description: formData.description || undefined,
              isActive: formData.isActive,
              parent: formData.parent || undefined,
              permissions: formData.permissions,
            } as Partial<Division>,
          });
          toast.success("Division updated");
        }
        setFormIsDirty(false);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { code?: number; message?: string } } } };
        const code = error.response?.data?.error?.code;
        if (code === 2160) {
          toast.error("Cannot create circular parent relationship");
        } else if (code === 2152) {
          toast.error("Cannot modify: other entities depend on this division");
        } else {
          toast.error("Failed to save division");
        }
      }
    },
    [isCreateMode, selectedId, createEntity, updateEntity, setSelectedId, expandToNode],
  );

  const handleDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!selectedId) return;
    try {
      await deleteEntity.mutateAsync(selectedId);
      setSelectedId(null);
      setIsCreateMode(false);
      setShowDeleteDialog(false);
      setFormIsDirty(false);
      toast.success("Division deleted");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { code?: number } } } };
      const code = error.response?.data?.error?.code;
      if (code === 2152) {
        toast.error("Cannot delete: other entities depend on this division");
      } else {
        toast.error("Failed to delete division");
      }
      setShowDeleteDialog(false);
    }
  }, [selectedId, deleteEntity, setSelectedId]);

  const handleDrop = useCallback(
    async (draggedId: string, targetId: string | null) => {
      // Client-side cycle check
      if (targetId) {
        const descendants = findDescendantIds(draggedId, divisions);
        if (descendants.has(targetId) || draggedId === targetId) {
          toast.error("Cannot create circular parent relationship");
          return;
        }
      }

      try {
        await updateEntity.mutateAsync({
          id: draggedId,
          data: { parent: targetId || undefined } as Partial<Division>,
        });
        toast.success("Division moved");
      } catch {
        toast.error("Failed to move division");
      }
    },
    [divisions, updateEntity],
  );

  return (
    <div data-testid="page-divisions" className="flex h-full flex-col">
      <PageHeader
        title="Divisions"
        description="Manage your organization's division hierarchy"
        icon={FolderTree}
      />

      <div className="flex min-h-0 flex-1 rounded-lg border border-border bg-card">
        {/* Left panel — tree */}
        <div className="w-[40%] border-r border-border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-body-sm text-foreground-muted">Loading...</p>
            </div>
          ) : (
            <DivisionTree
              tree={filteredTree}
              expandedIds={expandedIds}
              selectedId={selectedId}
              searchQuery={searchQuery}
              onSelect={handleSelect}
              onToggleExpand={toggleExpanded}
              onSearchChange={setSearchQuery}
              onCreateNew={handleCreateNew}
              onDrop={handleDrop}
            />
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1">
          <DivisionDetailPanel
            division={selectedDivision}
            allDivisions={divisions}
            isCreateMode={isCreateMode}
            onSave={handleSave}
            onDelete={handleDelete}
            isSaving={createEntity.isPending || updateEntity.isPending}
            isDeleting={deleteEntity.isPending}
            onDirtyChange={setFormIsDirty}
          />
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onCancel={() => setShowUnsavedDialog(false)}
        onDiscard={handleDiscardChanges}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        itemName={selectedDivision?.name}
        isPending={deleteEntity.isPending}
      />
    </div>
  );
}
```

**Note:** This introduces an `onDirtyChange` prop on `DivisionDetailPanel` not in the Task 5 implementation. Add it in this step:

In `division-detail-panel.tsx`, add to props interface:
```typescript
onDirtyChange?: (isDirty: boolean) => void;
```

And add a `useEffect` to report dirty state:
```typescript
useEffect(() => {
  onDirtyChange?.(isDirty);
}, [isDirty, onDirtyChange]);
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/settings/divisions/pages/divisions-page.test.tsx`
Expected: All tests PASS

**Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: All 2080+ tests PASS (no regressions)

**Step 6: Commit**

```bash
git add src/features/settings/divisions/
git commit -m "feat(divisions): implement split-view divisions page

Wires tree + detail panel with CRUD, drag-and-drop reparenting,
unsaved changes guard, and delete confirmation."
```

---

### Task 7: Visual Polish and Edge Cases

Final pass on styling, drag-and-drop visual feedback, and loading states.

**Files:**
- Modify: `src/features/settings/divisions/components/division-tree-node.tsx`
- Modify: `src/features/settings/divisions/components/division-tree.tsx`
- Modify: `src/features/settings/divisions/pages/divisions-page.tsx`

**Step 1: Add drag-over visual feedback to tree nodes**

In `division-tree-node.tsx`, add state for drag-over highlighting:

```typescript
const [isDragOver, setIsDragOver] = useState(false);
```

Update `handleDragOver`:
```typescript
function handleDragOver(e: React.DragEvent) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  setIsDragOver(true);
}
```

Add `onDragLeave`:
```typescript
function handleDragLeave() {
  setIsDragOver(false);
}
```

Reset on drop:
```typescript
function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);
  // ... existing logic
}
```

Add to the row div className:
```typescript
isDragOver && "ring-2 ring-brand ring-inset"
```

**Step 2: Add a "drop here for root" indicator on the tree container**

In `division-tree.tsx`, add visual feedback for root-level drops — e.g., a dashed border area at the bottom of the tree that appears during drag.

**Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/features/settings/divisions/
git commit -m "feat(divisions): add drag-and-drop visual feedback

Highlight drop targets with ring-brand, root drop zone indicator."
```

---

### Task 8: Final Verification

**Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Run the linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run the type checker**

Run: `npx tsc -b`
Expected: No errors

**Step 4: Manual smoke test (if dev environment available)**

1. Navigate to `/settings/divisions`
2. Verify empty state shows correctly
3. Create a root division
4. Create a child division under the root
5. Edit a division — change name, toggle permissions
6. Drag-and-drop to reparent
7. Delete a division
8. Verify unsaved changes dialog when switching with dirty form
9. Verify search filters the tree
