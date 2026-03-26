/**
 * Column chooser dropdown — portal-rendered panel with search,
 * All/None/Invert buttons, and draggable checkbox list.
 *
 * Receives the `chooser` state object from useColumnChooser.
 */

import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import type { ChooserState, ChooserColumn } from "@/shared/hooks/use-column-chooser";

interface ColumnChooserDropdownProps {
  chooser: ChooserState;
  columnOrder: { key: string; visible: boolean }[];
  columnMap: Map<string, ChooserColumn>;
}

export function ColumnChooserDropdown({
  chooser,
  columnOrder,
  columnMap,
}: ColumnChooserDropdownProps) {
  if (!chooser.open || !chooser.pos) return null;

  return createPortal(
    <div
      ref={chooser.panelRef}
      className="fixed z-[var(--z-dropdown)] w-60 bg-card border border-border rounded-[var(--input-radius)] shadow-dropdown p-2 flex flex-col"
      style={{ top: chooser.pos.top, left: chooser.pos.left }}
    >
      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-tertiary" />
        <input
          ref={chooser.searchRef}
          type="text"
          data-testid="column-chooser-search"
          aria-label="Search columns"
          className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--input-radius)] pl-7 pr-2 py-1 text-body-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Search columns..."
          value={chooser.search}
          onChange={(e) => chooser.setSearch(e.target.value)}
        />
      </div>

      {/* Action buttons: All / None / Invert */}
      <div className="flex items-center gap-0.5 pb-1.5 mb-1 border-b border-border">
        <button
          data-testid="column-chooser-select-all"
          aria-label="Select all columns"
          className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground-muted bg-transparent hover:bg-subtle hover:text-foreground transition-all duration-100 cursor-pointer"
          onClick={() => chooser.setAllVisible(true)}
        >
          All
        </button>
        <button
          data-testid="column-chooser-select-none"
          aria-label="Deselect all columns"
          className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground-muted bg-transparent hover:bg-subtle hover:text-foreground transition-all duration-100 cursor-pointer"
          onClick={() => chooser.setAllVisible(false)}
        >
          None
        </button>
        <button
          data-testid="column-chooser-invert"
          aria-label="Invert column selection"
          className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground-muted bg-transparent hover:bg-subtle hover:text-foreground transition-all duration-100 cursor-pointer"
          onClick={chooser.invertColumns}
        >
          Invert
        </button>
        <span className="ml-auto text-[11px] text-foreground-tertiary">
          {columnOrder.filter((c) => c.visible).length}/{columnOrder.length}
        </span>
      </div>

      {/* Checkbox list with search filtering, sorted alphabetically */}
      <div className="max-h-80 overflow-y-auto space-y-0.5">
        {[...columnOrder]
          .filter((col) => {
            if (!chooser.search.trim()) return true;
            const def = columnMap.get(col.key);
            return def?.label.toLowerCase().includes(chooser.search.trim().toLowerCase());
          })
          .sort((a, b) => {
            const labelA = columnMap.get(a.key)?.label ?? a.key;
            const labelB = columnMap.get(b.key)?.label ?? b.key;
            return labelA.localeCompare(labelB);
          })
          .map((col) => {
            const def = columnMap.get(col.key);
            if (!def) return null;
            return (
              <label
                key={col.key}
                className="flex items-center gap-2 px-1 py-0.5 rounded-sm hover:bg-subtle cursor-pointer text-body-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  data-testid={`column-chooser-col-${col.key}`}
                  aria-label={`Toggle ${def.label}`}
                  onChange={() => chooser.toggleColumn(col.key)}
                  className="h-3.5 w-3.5 rounded-sm border-border-strong accent-brand cursor-pointer"
                />
                <span>{def.label}</span>
              </label>
            );
          })}
      </div>
    </div>,
    document.body,
  );
}
