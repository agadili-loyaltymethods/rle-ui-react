import { useState, useRef, useCallback, useEffect } from "react";

interface UseActivityTemplateSelectionOptions {
  /** Items visible on the current page (for shift+click range selection). */
  visibleIds: string[];
  /** All items after filtering (for select-all and invert). */
  allFilteredIds: string[];
}

interface UseActivityTemplateSelectionReturn {
  selectedIds: Set<string>;
  clearSelection: () => void;
  handleRowSelect: (id: string, event: React.MouseEvent) => void;
  handleSelectAllVisible: () => void;
  handleInvertSelection: () => void;
  handleSelectAll: () => void;
}

export function useActivityTemplateSelection({
  visibleIds,
  allFilteredIds,
}: UseActivityTemplateSelectionOptions): UseActivityTemplateSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedId = useRef<string | null>(null);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleRowSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (event.shiftKey && lastClickedId.current) {
          const lastIdx = visibleIds.indexOf(lastClickedId.current);
          const currIdx = visibleIds.indexOf(id);
          if (lastIdx !== -1 && currIdx !== -1) {
            const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
            for (let i = start; i <= end; i++) {
              next.add(visibleIds[i]!);
            }
          }
        } else {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        }
        return next;
      });
      lastClickedId.current = id;
    },
    [visibleIds],
  );

  const handleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [visibleIds]);

  const handleInvertSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }, [visibleIds]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(allFilteredIds));
  }, [allFilteredIds]);

  // Prune selectedIds that no longer exist in the data
  useEffect(() => {
    const validIds = new Set(allFilteredIds);
    setSelectedIds((prev) => {
      const pruned = new Set([...prev].filter((id) => validIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [allFilteredIds]);

  return {
    selectedIds,
    clearSelection,
    handleRowSelect,
    handleSelectAllVisible,
    handleInvertSelection,
    handleSelectAll,
  };
}
