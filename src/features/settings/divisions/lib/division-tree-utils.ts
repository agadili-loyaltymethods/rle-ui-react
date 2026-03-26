import type { Division } from "@/shared/types";

export interface TreeNode {
  division: Division;
  children: TreeNode[];
}

export function getParentId(division: Division): string | undefined {
  const parent = division.parent;
  if (!parent) return undefined;
  if (typeof parent === "string") return parent;
  if (
    typeof parent === "object" &&
    "_id" in (parent as Record<string, unknown>)
  ) {
    return (parent as unknown as { _id: string })._id;
  }
  return undefined;
}

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

/**
 * Filter a tree to only show active divisions.
 * Keeps a parent node if any of its descendants are active.
 */
export function filterTreeByActive(tree: TreeNode[]): TreeNode[] {
  function filterNode(node: TreeNode): TreeNode | null {
    const filteredChildren = node.children
      .map(filterNode)
      .filter((n): n is TreeNode => n !== null);

    if (node.division.isActive || filteredChildren.length > 0) {
      return { division: node.division, children: filteredChildren };
    }
    return null;
  }

  return tree.map(filterNode).filter((n): n is TreeNode => n !== null);
}
