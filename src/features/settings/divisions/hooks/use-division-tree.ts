import { useState, useMemo, useCallback } from "react";
import type { Division } from "@/shared/types";
import {
  buildDivisionTree,
  filterTreeBySearch,
  getParentId,
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
        const pid = getParentId(d);
        if (pid) {
          parentMap.set(d._id, pid);
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
