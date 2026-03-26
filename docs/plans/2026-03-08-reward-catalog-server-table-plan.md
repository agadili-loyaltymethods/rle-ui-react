# Reward Catalog → ServerTable Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the reward catalog from client-side chunked data fetching + custom table rendering to the ServerTable framework with server-side pagination, sorting, and filtering.

**Architecture:** Extract the 842-line `ServerTablePage` into a reusable `ServerTable` primitive. Add `additionalQuery` support to `useServerTable`. Rewrite `RewardCatalogPage` to compose these primitives with its custom drawers, toolbar, grid view, and cell renderers. Delete the 754-line `RewardsTable`, `use-rewards.ts`, and `use-reward-schema.ts`.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, Zustand, Zod, Tailwind CSS 4

**Design doc:** `docs/plans/2026-03-08-reward-catalog-server-table-design.md`

---

### Task 1: Add `additionalQuery` to `useServerTable` + `buildQuery`

**Files:**
- Modify: `src/features/reference-data/shared/hooks/use-server-table.ts`
- Test: `src/features/reference-data/shared/hooks/__tests__/build-query.test.ts`
- Test: `src/features/reference-data/shared/hooks/__tests__/use-server-table.test.ts`

**Step 1: Write failing tests for `buildQuery` with `additionalQuery`**

Add to `build-query.test.ts`:

```typescript
it("merges additionalQuery into conditions", () => {
  const additional = { "ext._meta.subType": "RewardsCatalog" };
  const result = buildQuery(testConfig, "", [], additional);
  expect(result).toEqual({ "ext._meta.subType": "RewardsCatalog" });
});

it("additionalQuery merges with search via $and", () => {
  const additional = { status: "active" };
  const result = buildQuery(testConfig, "test", [], additional);
  expect(result).toEqual({
    $and: [
      {
        $or: [
          { name: { $regex: "test", $options: "i" } },
          { description: { $regex: "test", $options: "i" } },
        ],
      },
      { status: "active" },
    ],
  });
});

it("additionalQuery with multiple keys adds one condition per key", () => {
  const additional = {
    effectiveDate: { $lte: "2026-01-01" },
    expirationDate: { $gte: "2025-01-01" },
  };
  const result = buildQuery(testConfig, "", [], additional);
  expect(result).toEqual({
    $and: [
      { effectiveDate: { $lte: "2026-01-01" } },
      { expirationDate: { $gte: "2025-01-01" } },
    ],
  });
});

it("empty additionalQuery is ignored", () => {
  expect(buildQuery(testConfig, "", [], {})).toBeUndefined();
  expect(buildQuery(testConfig, "", [], undefined)).toBeUndefined();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/reference-data/shared/hooks/__tests__/build-query.test.ts`
Expected: FAIL — `buildQuery` doesn't accept a 4th argument yet.

**Step 3: Update `buildQuery` signature and implementation**

In `src/features/reference-data/shared/hooks/use-server-table.ts`, change `buildQuery`:

```typescript
export function buildQuery(
  config: ServerTableConfig,
  searchQuery: string,
  columnFilters: ColumnFiltersState,
  additionalQuery?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const conditions: Record<string, unknown>[] = [];

  // Global search → $or across searchFields with regex
  if (searchQuery.trim() && config.searchFields?.length) {
    conditions.push({
      $or: config.searchFields.map((field) => ({
        [field]: { $regex: escapeRegex(searchQuery.trim()), $options: "i" },
      })),
    });
  }

  // Column filters (existing code unchanged)
  for (const filter of columnFilters) {
    // ... existing filter logic ...
  }

  // Additional query — one condition per key
  if (additionalQuery) {
    for (const [key, value] of Object.entries(additionalQuery)) {
      if (value != null) {
        conditions.push({ [key]: value });
      }
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}
```

**Step 4: Update `useServerTable` to accept and pass `additionalQuery`**

Add an optional `additionalQuery` field to the hook's config parameter. The simplest approach: add it as a second argument to `useServerTable` so `ServerTableConfig` doesn't change.

```typescript
export function useServerTable<T extends { _id: string }>(
  config: ServerTableConfig,
  additionalQuery?: Record<string, unknown>,
) {
  // ... existing state ...

  const query = useMemo(
    () => buildQuery(config, debouncedSearch, columnFilters, additionalQuery),
    [config, debouncedSearch, columnFilters, additionalQuery],
  );

  // ... rest unchanged ...
}
```

Also reset `pageIndex` to 0 when `additionalQuery` changes. Add an effect:

```typescript
const prevAdditionalQuery = useRef(additionalQuery);
useEffect(() => {
  if (prevAdditionalQuery.current !== additionalQuery) {
    prevAdditionalQuery.current = additionalQuery;
    setPageIndex(0);
  }
}, [additionalQuery]);
```

**Step 5: Add a hook-level test for `additionalQuery`**

Add to `use-server-table.test.ts`:

```typescript
it("passes additionalQuery to the API call", async () => {
  const additional = { "ext._meta.subType": "RewardsCatalog" };
  const { result } = renderHook(
    () => useServerTable(testConfig, additional),
    { wrapper },
  );

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  // Verify the query param includes our additional filter
  const call = mockGet.mock.calls.find((c: string[]) => !c[0].includes("/count"));
  expect(call).toBeDefined();
  const params = call![1]?.params;
  const parsedQuery = JSON.parse(params.query);
  expect(parsedQuery).toEqual({ "ext._meta.subType": "RewardsCatalog" });
});
```

**Step 6: Run all tests**

Run: `npx vitest run src/features/reference-data/shared/hooks/__tests__/`
Expected: ALL PASS

**Step 7: Verify Locations/Products pages still work (no breaking change)**

Run: `npm run build`
Expected: Build succeeds — `additionalQuery` is optional, existing callers are unchanged.

**Step 8: Commit**

```bash
git add src/features/reference-data/shared/hooks/
git commit -m "feat: add additionalQuery support to useServerTable and buildQuery"
```

---

### Task 2: Extract `ServerTable` primitive from `ServerTablePage`

**Files:**
- Create: `src/shared/components/server-table.tsx`
- Modify: `src/features/reference-data/shared/components/server-table-page.tsx`

**Step 1: Create `ServerTable` component**

Extract the table rendering logic (lines 437-722 of `server-table-page.tsx`) into `src/shared/components/server-table.tsx`. This component handles:
- Column headers with sort indicators, drag-to-reorder
- Column filter row
- Row rendering with cell formatting
- Selection checkboxes (header + per-row)
- Shift/Ctrl+click multi-select
- Skeleton loading
- Empty state

Props interface:

```typescript
import type { ReactNode, JSX } from "react";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";
import type { ColumnDescriptor } from "@/features/reference-data/shared/lib/build-columns";
import type { useColumnChooser } from "@/shared/hooks/use-column-chooser";

export interface ServerTableProps<T extends { _id: string }> {
  data: T[];
  activeColumns: ColumnDescriptor[];
  /** Sorting state from useServerTable */
  sorting: SortingState;
  onSortChange: (sorting: SortingState) => void;
  /** Column filters from useServerTable */
  columnFilters: ColumnFiltersState;
  onFilterChange: (filters: ColumnFiltersState) => void;
  /** Selection state from useServerTable */
  selectedIds: Set<string>;
  onRowSelect: (selection: Record<string, boolean>) => void;
  /** Row click handler (e.g. open edit drawer) */
  onRowClick?: (entity: T) => void;
  /** Row action buttons (edit/delete) — if omitted, uses default edit+delete */
  renderRowActions?: (entity: T) => ReactNode;
  /** Default row actions callbacks (used when renderRowActions is omitted) */
  onEdit?: (entity: T) => void;
  onDelete?: (id: string) => void;
  /** Custom cell renderers keyed by cellRenderer hint */
  cellRenderers?: Record<string, (value: unknown, row: T) => ReactNode>;
  /** Column chooser state from useColumnChooser */
  chooser: ReturnType<typeof useColumnChooser>["chooser"];
  /** Loading state */
  isLoading?: boolean;
  /** Fetching state (for refetch opacity) */
  isFetching?: boolean;
  /** Empty state message override */
  emptyMessage?: string;
  /** Empty state action */
  emptyAction?: ReactNode;
  /** data-testid prefix */
  testIdPrefix?: string;
}
```

The component body is a straight extraction of the `<table>` element from `ServerTablePage` (lines 450-710), with the following changes:
- Replace inline `handleSelectRow`/`handleToggleSort` with similar local implementations using the props
- Replace `formatCellValue`/`getColumnValue` usage with a local render path that checks `cellRenderers[col.cellRenderer]` first, then falls back to the existing `formatCellValue` logic
- Replace `config.testIdPrefix` with `testIdPrefix` prop
- The filter row state (`filtersVisible`) stays local to `ServerTable`
- Status badge rendering stays as a built-in fallback (checks `cellRenderer === "status-badge"`)

Key rendering logic for cells:

```typescript
{activeColumns.map((col) => {
  const value = getColumnValue(entity, col);
  // Check custom renderer first
  if (col.cellRenderer && cellRenderers?.[col.cellRenderer]) {
    return (
      <td key={col.key} className={cellClasses}>
        {cellRenderers[col.cellRenderer](value, entity)}
      </td>
    );
  }
  // Built-in status badge
  if (col.cellRenderer === "status-badge" && value != null) {
    return (
      <td key={col.key} className={cellClasses}>
        <Badge variant={getStatusVariant(String(value))}>{String(value)}</Badge>
      </td>
    );
  }
  // Generic fallback
  return (
    <td key={col.key} className={cellClasses}>
      {formatCellValue(value, col.type)}
    </td>
  );
})}
```

**Step 2: Refactor `ServerTablePage` to use `ServerTable`**

Replace the inline table markup in `ServerTablePage` with:

```tsx
<ServerTable
  data={table.data}
  activeColumns={activeColumns}
  sorting={table.sorting}
  onSortChange={table.onSortChange}
  columnFilters={table.columnFilters}
  onFilterChange={table.onFilterChange}
  selectedIds={table.selectedIds}
  onRowSelect={table.onRowSelect}
  onRowClick={handleEdit}
  onEdit={handleEdit}
  onDelete={(id) => setDeleteTarget({ id, name: String(table.data.find(e => e._id === id)?.name ?? id) })}
  chooser={chooser}
  isLoading={table.isLoading || schema.isLoading}
  isFetching={table.isFetching && !table.isLoading}
  emptyMessage={`No ${config.pageTitle.toLowerCase()} found`}
  emptyAction={<Button variant="outline" size="sm" className="mt-2 cursor-pointer" onClick={handleCreate}>Add {singularTitle}</Button>}
  testIdPrefix={config.testIdPrefix}
/>
```

This should reduce `ServerTablePage` from ~842 lines to ~200 lines.

**Step 3: Run full build + tests**

Run: `npm run build && npm test`
Expected: Build succeeds, all 139 tests pass.

**Step 4: Run e2e tests**

Run: `npm run test:e2e`
Expected: All 24 e2e tests pass — no visible behavior change.

**Step 5: Commit**

```bash
git add src/shared/components/server-table.tsx src/features/reference-data/shared/components/server-table-page.tsx
git commit -m "refactor: extract ServerTable primitive from ServerTablePage"
```

---

### Task 3: Create reward-specific config and cell renderers

**Files:**
- Create: `src/features/reward-catalog/config/reward-config.ts`
- Create: `src/features/reward-catalog/lib/reward-cell-renderers.tsx`

**Step 1: Create `reward-config.ts`**

```typescript
import { Gift } from "lucide-react";
import type { ServerTableConfig } from "@/features/reference-data/shared/types/server-table-types";

export const rewardConfig: ServerTableConfig = {
  modelName: "RewardPolicy",
  endpoint: "rewardpolicies",
  pageTitle: "Rewards Catalog",
  singularTitle: "Reward",
  pageIcon: Gift,
  testIdPrefix: "rewards",
  defaultSort: "name",
  populate: ["createdBy:login empName", "updatedBy:login empName"],
  searchFields: ["name", "desc", "ext.rewardType", "ext.programCode"],
  coreColumns: [
    { field: "image", label: "Image", type: "text", cellRenderer: "image", width: 56, defaultVisible: true },
    { field: "name", label: "Reward", type: "text", cellRenderer: "reward-name", defaultVisible: true },
    { field: "status", label: "Status", type: "text", cellRenderer: "reward-status", defaultVisible: true },
    { field: "effectiveDate", label: "Start Date", type: "date" },
    { field: "expirationDate", label: "End Date", type: "date" },
    { field: "redemptions", label: "Redemptions", type: "number" },
    { field: "countLimit", label: "Total Cap", type: "number" },
    { field: "perDayLimit", label: "Per-Day Limit", type: "number" },
    { field: "perWeekLimit", label: "Per-Week Limit", type: "number" },
    { field: "perOfferLimit", label: "Per-Offer Limit", type: "number" },
    { field: "transactionLimit", label: "Transaction Limit", type: "number" },
    { field: "coolOffPeriod", label: "Cool-Off (hrs)", type: "number" },
    { field: "numUses", label: "Uses/Redemption", type: "number" },
    { field: "canPreview", label: "Previewable", type: "boolean" },
    { field: "createdAt", label: "Created At", type: "date" },
    { field: "updatedAt", label: "Updated At", type: "date" },
    { field: "createdBy", label: "Created By", type: "text", cellRenderer: "user" },
    { field: "updatedBy", label: "Updated By", type: "text", cellRenderer: "user" },
  ],
  coreFormFields: [],  // Reward uses custom RewardFormDrawer, not EntityFormDrawer
};
```

Note: The `populate` format needs to match what the API expects. Check `use-rewards.ts` for current format and match it. The `coreFormFields` is empty because the reward form drawer is custom and doesn't use `EntityFormDrawer`.

**Step 2: Create `reward-cell-renderers.tsx`**

```tsx
import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { getRewardStatus, getUserDisplayName } from "../types/reward-policy";
import type { RewardCatalogItem, PopulatedUser, RewardStatus } from "../types/reward-policy";

const STATUS_VARIANT: Record<RewardStatus, "success" | "error" | "info"> = {
  active: "success",
  expired: "error",
  future: "info",
};

export const rewardCellRenderers: Record<string, (value: unknown, row: RewardCatalogItem) => ReactNode> = {
  image: (_value, row) => {
    const url = row.ext?.imageListPageUrlDesktopNormal;
    if (url && typeof url === "string") {
      return (
        <img src={url} alt="" className="h-8 w-11 rounded object-cover block" />
      );
    }
    return (
      <div className="flex h-8 w-11 items-center justify-center rounded bg-subtle">
        <Gift className="h-4 w-4 text-foreground-muted" />
      </div>
    );
  },

  "reward-name": (_value, row) => (
    <div className="flex flex-col gap-px max-w-[280px]">
      <span className="font-semibold text-foreground">{row.name}</span>
      {row.desc && (
        <span className="text-xs text-foreground-muted truncate max-w-[280px]">{row.desc}</span>
      )}
    </div>
  ),

  "reward-status": (_value, row) => {
    const status = getRewardStatus(row);
    return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
  },

  points: (value) => (
    <span className="tabular-nums">
      <span className="text-foreground">{(value as number)?.toLocaleString() ?? "0"}</span>
      <span className="ml-1 text-caption text-foreground-secondary">pts</span>
    </span>
  ),

  user: (_value, row) => {
    // The value from getColumnValue will be the field path, but we need the row
    // to determine which user field to show
    return null; // Placeholder — actual implementation depends on how ServerTable passes context
  },
};
```

Note: The `user` renderer needs access to which field (createdBy vs updatedBy) is being rendered. This will require either passing the column descriptor to the cell renderer or keying the renderers differently (e.g., `"user-createdBy"` and `"user-updatedBy"`). Resolve this during implementation based on how `ServerTable` passes data.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds — these are new standalone files.

**Step 4: Commit**

```bash
git add src/features/reward-catalog/config/reward-config.ts src/features/reward-catalog/lib/reward-cell-renderers.tsx
git commit -m "feat: add reward-specific ServerTable config and cell renderers"
```

---

### Task 4: Rewrite `RewardCatalogPage` to compose ServerTable primitives

**Files:**
- Modify: `src/features/reward-catalog/pages/reward-catalog-page.tsx`
- Modify: `src/features/reward-catalog/hooks/use-reward-catalog-store.ts`
- Modify: `src/features/reward-catalog/components/rewards-toolbar.tsx`
- Modify: `src/features/reward-catalog/components/stats-bar.tsx`

This is the largest task. The page gets rewritten to:

1. Use `useServerTable` + `useEntitySchema` instead of `useRewardPolicies` + `useRewardSchema`
2. Build `additionalQuery` from toolbar filter state (status, date range, `ext._meta.subType`)
3. Use `ServerTable` component in list view with `rewardCellRenderers`
4. Keep `RewardsCardGrid` in grid view, fed server-paginated data
5. Keep custom drawers (`RewardFormDrawer`, `BulkEditDrawer`) unchanged
6. Use `useEntityPreferences` instead of `useRewardPreferences` for column layout + tab order
7. Keep filter preferences (status, date range) in reduced Zustand store

**Step 1: Slim down `use-reward-catalog-store.ts`**

Remove state that's now managed by `useServerTable`:
- Remove: `searchQuery`, `page`, `pageSize`, `setSearch`, `setPage`, `setPageSize`
- Remove: `selectedIds`, `selectReward`, `setSelection`, `selectAll`, `deselectAll`, `invertSelection`
- Keep: `filterStatus`, `viewMode`, `expirationSince`, `customDateRange`, `editingReward`, `isCreating`, `deleteTarget`, `bulkDeleteConfirm`, `bulkEditOpen`, `saving`, `quickSearchOpen`, `fullscreen`

**Step 2: Update `rewards-toolbar.tsx`**

The toolbar's status filter and date range filter stay as custom UI. But the search input should now be wired to `useServerTable.onSearchChange` instead of the Zustand store. Remove the search input from the toolbar (it will be in the `PageHeader` like other ServerTable pages).

If the toolbar currently includes the search bar, move it out. The toolbar keeps: status filter toggles, expiration date presets, view mode toggle, fullscreen controls.

**Step 3: Rewrite `RewardCatalogPage`**

Replace the page body with composition of:

```tsx
import { useServerTable } from "@/features/reference-data/shared/hooks/use-server-table";
import { useEntitySchema } from "@/features/reference-data/shared/hooks/use-entity-schema";
import { useBulkOperations } from "@/features/reference-data/shared/hooks/use-bulk-operations";
import { buildColumns } from "@/features/reference-data/shared/lib/build-columns";
import { ServerTable } from "@/shared/components/server-table";
import { useEntityPreferences, getSavedEntityTableLayout, getSavedEntityFormTabOrder } from "@/features/reference-data/shared/hooks/use-entity-preferences";
import { rewardConfig } from "../config/reward-config";
import { rewardCellRenderers } from "../lib/reward-cell-renderers";
```

Build `additionalQuery` from filter state:

```typescript
const additionalQuery = useMemo(() => {
  const q: Record<string, unknown> = { "ext._meta.subType": "RewardsCatalog" };
  const now = new Date().toISOString();

  // Status filter
  if (store.filterStatus.length > 0 && store.filterStatus.length < 3) {
    const statusConditions: Record<string, unknown>[] = [];
    for (const status of store.filterStatus) {
      if (status === "active") {
        statusConditions.push({ effectiveDate: { $lte: now }, expirationDate: { $gte: now } });
      } else if (status === "expired") {
        statusConditions.push({ expirationDate: { $lt: now } });
      } else if (status === "future") {
        statusConditions.push({ effectiveDate: { $gt: now } });
      }
    }
    if (statusConditions.length === 1) {
      Object.assign(q, statusConditions[0]);
    } else if (statusConditions.length > 1) {
      q.$or = statusConditions;
    }
  }

  // Date range filters
  if (store.expirationSince === "custom") {
    if (store.customDateRange.start) {
      q.expirationDate = { ...(q.expirationDate as object ?? {}), $gte: new Date(store.customDateRange.start).toISOString() };
    }
    if (store.customDateRange.end) {
      q.effectiveDate = { ...(q.effectiveDate as object ?? {}), $lte: new Date(store.customDateRange.end + "T23:59:59.999Z").toISOString() };
    }
  } else {
    const sinceDate = expirationSinceDate(store.expirationSince);
    if (sinceDate) {
      q.effectiveDate = { ...(q.effectiveDate as object ?? {}), $lte: now };
      q.expirationDate = { ...(q.expirationDate as object ?? {}), $gte: sinceDate };
    }
  }

  return q;
}, [store.filterStatus, store.expirationSince, store.customDateRange]);
```

Wire up the table:

```tsx
const schema = useEntitySchema("RewardPolicy", rewardConfig);
const table = useServerTable<RewardCatalogItem & Record<string, unknown>>(rewardConfig, additionalQuery);
const bulkOps = useBulkOperations(rewardConfig);
const columns = useMemo(() => buildColumns(rewardConfig, schema), [schema]);
```

**Step 4: Update `stats-bar.tsx`**

Stats bar currently computes counts from the full in-memory reward array. With server-side pagination, we only have the current page. Options:
- Use `table.totalCount` for "Total Rewards"
- For "Active" count, make a separate count query with status filter
- For "Total Redemptions", either drop it or make a separate aggregation query

Simplest approach: show `table.totalCount` as total, and drop per-status counts from the stats bar (or make them separate count queries). Keep it simple:

```tsx
<StatsBar totalRewards={table.totalCount} />
```

**Step 5: Run full build + tests**

Run: `npm run build && npm test`
Expected: Build succeeds, unit tests pass.

**Step 6: Run e2e tests**

Run: `npm run test:e2e`
Expected: E2e tests may need selector updates — fix any failures.

**Step 7: Commit**

```bash
git add src/features/reward-catalog/ src/shared/components/server-table.tsx
git commit -m "feat: rewrite RewardCatalogPage with ServerTable primitives"
```

---

### Task 5: Delete deprecated files

**Files:**
- Delete: `src/features/reward-catalog/components/rewards-table.tsx`
- Delete: `src/features/reward-catalog/hooks/use-rewards.ts`
- Delete: `src/features/reward-catalog/hooks/use-reward-schema.ts`

**Step 1: Verify no remaining imports**

Run grep for each file's exports to confirm nothing else imports them:

```bash
# Check for any remaining imports of the old files
grep -r "use-rewards" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
grep -r "use-reward-schema" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
grep -r "rewards-table" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
grep -r "useRewardPolicies\|useRewardSchema\|RewardsTable" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
```

Expected: No matches (all imports should have been updated in Task 4).

**Step 2: Delete the files**

```bash
rm src/features/reward-catalog/components/rewards-table.tsx
rm src/features/reward-catalog/hooks/use-rewards.ts
rm src/features/reward-catalog/hooks/use-reward-schema.ts
```

**Step 3: Check if `use-reward-preferences.ts` can be simplified**

Read `use-reward-preferences.ts` and check which parts are still needed. Column layout and tab order should now use `useEntityPreferences`. Filter preferences (status, expirationSince, customDateRange) may still need this hook. If all preferences are now handled elsewhere, delete it too.

**Step 4: Run full build + tests + e2e**

Run: `npm run build && npm test && npm run test:e2e`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete deprecated reward catalog files (rewards-table, use-rewards, use-reward-schema)"
```

---

### Task 6: Update e2e tests

**Files:**
- Modify: `e2e/reward-catalog.spec.ts`

E2e tests may break due to:
1. Changed data-testid attributes (if `ServerTable` uses different test IDs)
2. Different pagination behavior (server-side vs client-side)
3. Changed timing (server responses vs in-memory filtering)
4. Changed element structure (new table component)

**Step 1: Run e2e tests and identify failures**

Run: `npm run test:e2e`
Document each failure.

**Step 2: Fix selectors and assertions**

Common fixes:
- Update `data-testid` selectors if `ServerTable` uses `testIdPrefix` differently than the old `RewardsTable`
- Add `waitFor` calls where the test previously relied on synchronous in-memory data
- Adjust pagination assertions (total count now comes from server)
- Fix filter behavior assertions (status filter now triggers server query, not in-memory filter)

**Step 3: Run e2e tests until all pass**

Run: `npm run test:e2e`
Expected: ALL 24 PASS

**Step 4: Commit**

```bash
git add e2e/
git commit -m "test: update e2e tests for ServerTable migration"
```

---

### Task 7: Final verification and cleanup

**Step 1: Run full test suite**

```bash
npm run build && npm test && npm run test:e2e
```

Expected: ALL PASS

**Step 2: Run linter**

```bash
npm run lint
```

Fix any new lint issues.

**Step 3: Verify reward-specific features work manually**

Start the dev environment and verify:
1. List view with column chooser, sorting, filtering
2. Card grid view with pagination
3. Add/Edit reward form drawer (all tabs, validation)
4. Bulk edit with opt-in fields
5. Status filter + date range filter
6. Quick search (Cmd+K)
7. Fullscreen mode
8. Stats bar

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup after ServerTable migration"
```
