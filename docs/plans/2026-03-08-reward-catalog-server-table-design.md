# Reward Catalog → ServerTable Migration Design

## Goal

Migrate the reward catalog from client-side chunked data fetching + custom table rendering to the ServerTable framework with server-side pagination, sorting, and filtering. Preserve all reward-specific UI (card grid view, custom drawers, stats bar, quick search, fullscreen mode).

## Approach: Extract ServerTable Primitives + Compose

Break the 842-line `ServerTablePage` into reusable primitives. The reward catalog composes these primitives with its own custom components. `ServerTablePage` becomes a thin convenience wrapper — Locations/Products pages continue using it unchanged.

## Architecture

### Primitive Extraction from ServerTablePage

**`ServerTable`** (~400 lines) — new shared component at `src/shared/components/server-table.tsx`:
- Column headers with sort indicators and click handlers
- Column filter row (per-column text/select inputs)
- Row rendering with cell formatting
- Selection checkboxes (header select-all + per-row)
- Shift/Ctrl+click multi-select
- Skeleton loading rows
- Empty state
- `cellRenderers` prop: `Record<string, (value: unknown, row: T) => ReactNode>` — keys match `cellRenderer` hints on column descriptors

Already-extracted primitives (no changes needed):
- `ColumnChooserDropdown`
- `BulkActionBar`
- `TablePagination`

**`ServerTablePage`** becomes a ~100-line wrapper composing these primitives with `PageHeader`, error banners, and generic `EntityFormDrawer`/`BulkEditDrawer`. Zero breaking changes for existing consumers.

### useServerTable Enhancement

Add `additionalQuery` parameter — an optional `Record<string, unknown>` merged into the MongoDB query alongside search and column filters. Pagination resets to page 0 when it changes.

```typescript
useServerTable({ endpoint, defaultSort, searchFields, populate, additionalQuery })
```

The reward catalog builds `additionalQuery` from its status and date range filter state. The `buildQuery` function merges it into the `$and` array.

### Reward Catalog Page Composition

```
RewardCatalogPage
  ├── PageHeader (title, search, refresh, add, view toggle)
  ├── RewardsToolbar (status filter, date range filter) → emits additionalQuery
  ├── StatsBar — fed from server count queries
  ├── if list view:
  │     ├── BulkActionBar
  │     ├── ServerTable (with custom cellRenderers)
  │     └── TablePagination
  ├── if grid view:
  │     ├── RewardsCardGrid — fed paginated server data
  │     └── TablePagination
  ├── RewardFormDrawer — kept as-is (custom RHF form)
  ├── BulkEditDrawer — kept as-is (custom RHF bulk edit)
  └── QuickSearch, DeleteConfirmDialog, etc.
```

### Custom Cell Renderers

Defined in `src/features/reward-catalog/lib/reward-cell-renderers.tsx`:
- `"image"` — thumbnail from ext URL or Gift icon placeholder
- `"reward-name"` — name + description subtitle
- `"status"` — computed active/expired/future Badge
- `"points"` — number with "pts" suffix, tabular-nums

### Schema

Replace `useRewardSchema` with `useEntitySchema`. The reward-specific hook is nearly identical to the generic one. Delete `useRewardSchema`.

### Filter Migration

Status and date range filters translate to server-side MongoDB queries via `additionalQuery`:
- `active` → `{ effectiveDate: { $lte: now }, expirationDate: { $gte: now } }`
- `expired` → `{ expirationDate: { $lt: now } }`
- `future` → `{ effectiveDate: { $gt: now } }`
- Date range presets → `effectiveDate`/`expirationDate` range conditions

Column-level filters (text columns) handled by `useServerTable` as-is. Status becomes a column filter dropdown instead of a toolbar toggle.

### Preferences

Switch from `useRewardPreferences` to `useEntityPreferences` for column layout and tab order. Keep reward-specific filter preferences (date range) in a small custom hook.

## Files

### New
- `src/shared/components/server-table.tsx` — extracted table primitive
- `src/features/reward-catalog/lib/reward-cell-renderers.tsx` — custom cell renderers
- `src/features/reward-catalog/config/reward-config.ts` — ServerTableConfig for rewards

### Modified
- `src/features/reference-data/shared/components/server-table-page.tsx` — thin wrapper over ServerTable
- `src/features/reference-data/shared/hooks/use-server-table.ts` — add `additionalQuery`
- `src/features/reward-catalog/pages/reward-catalog-page.tsx` — rewrite to compose primitives
- `src/features/reward-catalog/components/rewards-toolbar.tsx` — emit query objects
- `src/features/reward-catalog/components/stats-bar.tsx` — use server count data
- `src/features/reward-catalog/hooks/use-reward-catalog-store.ts` — slim down
- `src/features/reward-catalog/hooks/use-reward-preferences.ts` — simplify or replace

### Deleted
- `src/features/reward-catalog/components/rewards-table.tsx` (~750 lines)
- `src/features/reward-catalog/hooks/use-rewards.ts` (chunked fetch)
- `src/features/reward-catalog/hooks/use-reward-schema.ts` (replaced by useEntitySchema)

### Unchanged
- `src/features/reward-catalog/components/reward-form-drawer.tsx`
- `src/features/reward-catalog/components/bulk-edit-drawer.tsx`
- `src/features/reward-catalog/components/rewards-card-grid.tsx`
- `src/features/reward-catalog/components/quick-search.tsx`
- All Locations/Products pages

### Tests
- Update e2e tests (24 reward catalog + locations) — same behavior, selectors may change
- Add `additionalQuery` test cases to `use-server-table.test.ts`
- Delete tests for `use-rewards.ts` and `use-reward-schema.ts`

## Net Impact

~750 lines of custom table code removed, ~200 lines of composition code added. ServerTablePage drops from ~842 to ~100 lines.
