/**
 * Shared hook for column chooser state, drag-reorder, and toggle logic.
 *
 * Encapsulates all column visibility/order management used by both
 * ServerTablePage (reference-data) and RewardCatalogPage (reward-catalog).
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

/** Minimal column definition — both ColumnDescriptor types satisfy this. */
export interface ChooserColumn {
  key: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnLayout {
  columns: { key: string; visible: boolean }[];
}

export interface ColumnChooserOptions<T extends ChooserColumn> {
  columns: T[];
  savedLayout?: ColumnLayout | null;
  onLayoutChange?: (layout: ColumnLayout) => void;
  /** True when schema data is ready (triggers column re-init if no saved layout). */
  schemaReady: boolean;
}

export interface ChooserState {
  open: boolean;
  search: string;
  setSearch: (s: string) => void;
  pos: { top: number; left: number } | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  btnRef: React.RefObject<HTMLButtonElement | null>;
  searchRef: React.RefObject<HTMLInputElement | null>;
  dragOverCol: string | null;
  openChooser: () => void;
  toggleColumn: (key: string) => void;
  setAllVisible: (visible: boolean) => void;
  invertColumns: () => void;
  handleDragStart: (key: string) => void;
  handleDragOver: (e: React.DragEvent, key: string) => void;
  handleDrop: (targetKey: string) => void;
  handleDragEnd: () => void;
}

export interface ColumnChooserResult<T extends ChooserColumn> {
  columnOrder: { key: string; visible: boolean }[];
  activeColumns: T[];
  chooser: ChooserState;
}

export function useColumnChooser<T extends ChooserColumn>({
  columns,
  savedLayout,
  onLayoutChange,
  schemaReady,
}: ColumnChooserOptions<T>): ColumnChooserResult<T> {
  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.key, c])),
    [columns],
  );

  const buildOrder = useCallback(
    (saved: ColumnLayout | null | undefined): { key: string; visible: boolean }[] => {
      if (saved?.columns?.length) {
        const known = new Set(columns.map((c) => c.key));
        const result = saved.columns.filter((c) => known.has(c.key));
        for (const col of columns) {
          if (!result.some((c) => c.key === col.key)) {
            result.push({ key: col.key, visible: col.defaultVisible });
          }
        }
        return result;
      }
      return columns.map((c) => ({ key: c.key, visible: c.defaultVisible }));
    },
    [columns],
  );

  const [columnOrder, setColumnOrder] = useState(() => buildOrder(savedLayout));
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserSearch, setChooserSearch] = useState("");
  const chooserRef = useRef<HTMLDivElement>(null);
  const chooserBtnRef = useRef<HTMLButtonElement>(null);
  const chooserSearchRef = useRef<HTMLInputElement>(null);
  const dragColRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [chooserPos, setChooserPos] = useState<{ top: number; left: number } | null>(null);

  // Sync saved layout when it changes externally
  useEffect(() => {
    if (savedLayout?.columns?.length) {
      setColumnOrder(buildOrder(savedLayout));
    }
  }, [savedLayout, buildOrder]);

  // Re-overlay when schema loads (adds new ext columns)
  useEffect(() => {
    if (schemaReady && !savedLayout?.columns?.length) {
      setColumnOrder(buildOrder(null));
    }
  }, [schemaReady, savedLayout, buildOrder]);

  const emitLayoutChange = useCallback(
    (newOrder: { key: string; visible: boolean }[]) => {
      onLayoutChange?.({ columns: newOrder.map((c) => ({ key: c.key, visible: c.visible })) });
    },
    [onLayoutChange],
  );

  const activeColumns = useMemo(
    () =>
      columnOrder
        .filter((c) => c.visible)
        .map((c) => columnMap.get(c.key)!)
        .filter(Boolean),
    [columnOrder, columnMap],
  );

  // Column chooser helpers
  const toggleColumn = (key: string) => {
    setColumnOrder((prev) => {
      const next = prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
      emitLayoutChange(next);
      return next;
    });
  };

  const setAllVisible = (visible: boolean) => {
    setColumnOrder((prev) => {
      const next = prev.map((c) => ({ ...c, visible }));
      emitLayoutChange(next);
      return next;
    });
  };

  const invertColumns = () => {
    setColumnOrder((prev) => {
      const next = prev.map((c) => ({ ...c, visible: !c.visible }));
      emitLayoutChange(next);
      return next;
    });
  };

  // Column drag-and-drop reorder
  const handleDragStart = (key: string) => {
    dragColRef.current = key;
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (dragColRef.current && dragColRef.current !== key) {
      setDragOverCol(key);
    }
  };

  const handleDrop = (targetKey: string) => {
    const sourceKey = dragColRef.current;
    if (!sourceKey || sourceKey === targetKey) {
      dragColRef.current = null;
      setDragOverCol(null);
      return;
    }

    setColumnOrder((prev) => {
      const next = [...prev];
      const srcIdx = next.findIndex((c) => c.key === sourceKey);
      const tgtIdx = next.findIndex((c) => c.key === targetKey);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      const moved = next.splice(srcIdx, 1)[0];
      if (!moved) return prev;
      next.splice(tgtIdx, 0, moved);
      emitLayoutChange(next);
      return next;
    });

    dragColRef.current = null;
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    dragColRef.current = null;
    setDragOverCol(null);
  };

  const openChooser = () => {
    if (chooserOpen) {
      setChooserOpen(false);
      return;
    }
    if (chooserBtnRef.current) {
      const rect = chooserBtnRef.current.getBoundingClientRect();
      setChooserPos({ top: rect.bottom + 4, left: rect.right - 240 });
    }
    setChooserSearch("");
    setChooserOpen(true);
    requestAnimationFrame(() => chooserSearchRef.current?.focus());
  };

  // Close column chooser on click-outside
  useEffect(() => {
    if (!chooserOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (chooserRef.current?.contains(target)) return;
      if (chooserBtnRef.current?.contains(target)) return;
      setChooserOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [chooserOpen]);

  return {
    columnOrder,
    activeColumns,
    chooser: {
      open: chooserOpen,
      search: chooserSearch,
      setSearch: setChooserSearch,
      pos: chooserPos,
      panelRef: chooserRef,
      btnRef: chooserBtnRef,
      searchRef: chooserSearchRef,
      dragOverCol,
      openChooser,
      toggleColumn,
      setAllVisible,
      invertColumns,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
    },
  };
}
