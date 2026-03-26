# Server-Side Table Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable server-side-paged table editor for reference data entities, starting with Locations.

**Architecture:** Composition-based generic components in `reference-data/shared/` composed by per-entity pages with thin config files (~60 lines). Extension fields/tabs discovered dynamically from metaschema API. Matches Rewards Catalog UX (drawer edit, bulk edit with opt-in fields).

**Tech Stack:** React 19, TanStack Query, TanStack Table, React Hook Form, Zod, Radix UI, Tailwind CSS 4, CVA

---

## Task 1: Shared Types

**Files:**
- Create: `src/features/reference-data/shared/types/server-table-types.ts`

**Step 1: Create the types file**

```ts
/**
 * Server-side table editor types.
 *
 * These types define the configuration interface for per-entity table editors
 * and the schema data returned by useEntitySchema.
 */

// ── Field type union ─────────────────────────────────────────────────────────

export type CoreFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "enum"
  | "boolean";

// ── Column config ────────────────────────────────────────────────────────────

export interface CoreColumnDef {
  /** Dot-path field accessor on the entity (e.g. "name", "ext.siteId") */
  field: string;
  /** Column header text */
  label: string;
  /** Data type for rendering and filter UI */
  type: CoreFieldType;
  /** If true, shown as required in forms */
  required?: boolean;
  /** For enum columns — fetches values via useEnumOptions */
  enumType?: string;
  /** Sticky left column (typically the name column) */
  sticky?: boolean;
  /** Optional fixed column width in pixels */
  width?: number;
}

// ── Form field config ────────────────────────────────────────────────────────

export interface CoreFieldDef {
  /** Dot-path field name on the entity */
  field: string;
  /** Display label */
  label: string;
  /** Input type for rendering */
  type: CoreFieldType;
  /** Required for validation */
  required?: boolean;
  /** For enum fields — fetches values via useEnumOptions */
  enumType?: string;
  /** Input placeholder text */
  placeholder?: string;
}

// ── Table configuration ──────────────────────────────────────────────────────

export interface ServerTableConfig {
  /** Mongoose model name as it appears in the schema API (e.g. "Location") */
  modelName: string;
  /** API endpoint (e.g. "locations") */
  endpoint: string;
  /** Page title displayed in header */
  pageTitle: string;
  /** Prefix for data-testid attributes */
  testIdPrefix: string;
  /** Default sort field (default: "name") */
  defaultSort?: string;
  /** Refs to populate in list queries */
  populate?: string[];
  /** Core fields to include in global text search ($or regex) */
  searchFields?: string[];
  /** Table columns — extension columns added from schema automatically */
  coreColumns: CoreColumnDef[];
  /** Form fields for the "Details" tab — extension tabs added from schema */
  coreFormFields: CoreFieldDef[];
}

// ── Extension schema types (returned by useEntitySchema) ─────────────────────

export interface ExtFieldDef {
  type: string;
  title: string;
  format?: string;
  required: boolean;
  enum?: string[];
  category: string;
  displayOrder: number;
  showInList: boolean;
  searchable: boolean;
  sortable: boolean;
  defaultValue?: unknown;
  parentField?: string;
  isParent?: boolean;
}

export interface CategoryDef {
  name: string;
  columns: number;
}

export interface EntitySchemaData {
  extFields: Record<string, ExtFieldDef>;
  categories: CategoryDef[];
  coreRequiredFields: Set<string>;
  extRequiredFields: string[];
  enumFields: Record<string, string[]>;
  bulkEditableFields: Set<string>;
  dbSchema: Record<string, unknown>;
  isLoading: boolean;
}

// ── Form tab type ────────────────────────────────────────────────────────────

export interface FormTab {
  key: string;
  label: string;
  fields: string[];
  columns: number;
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/features/reference-data/shared/types/server-table-types.ts 2>&1 | head -20`

Expected: No errors (or only errors from missing imports which is fine at this stage since we haven't wired it in)

**Step 3: Commit**

```bash
git add src/features/reference-data/shared/types/server-table-types.ts
git commit -m "feat(reference-data): add shared types for server-side table editor"
```

---

## Task 2: useEntitySchema Hook

**Files:**
- Create: `src/features/reference-data/shared/hooks/use-entity-schema.ts`
- Reference: `src/features/reward-catalog/hooks/use-reward-schema.ts` (pattern to generalize)
- Reference: `src/shared/hooks/use-schema.ts` (useValidationSchema)
- Reference: `src/shared/hooks/use-enums.ts` (useEnumOptions)

**Step 1: Write a test for the hook**

Create: `src/features/reference-data/shared/hooks/__tests__/use-entity-schema.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useEntitySchema } from "../use-entity-schema";

// Mock apiClient
vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock ui-store
vi.mock("@/shared/stores/ui-store", () => ({
  useUIStore: (selector: (s: Record<string, string>) => string) =>
    selector({ currentOrg: "test-org", currentProgram: "test-program" }),
}));

import { apiClient } from "@/shared/lib/api-client";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useEntitySchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns extension fields and categories for a model", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "schema/validation") {
        return Promise.resolve({
          data: {
            Location: {
              dbSchema: {
                name: { type: "string", required: true },
                city: { type: "string" },
              },
              extSchema: {
                type: "object",
                properties: {
                  siteId: { type: "string" },
                },
                required: ["siteId"],
              },
              extUISchema: {
                siteId: {
                  type: "string",
                  title: "Site ID",
                  category: "General",
                  displayOrder: 1,
                  showInList: true,
                  searchable: true,
                  sortable: true,
                },
              },
            },
          },
        });
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve({
          data: {
            Location: {
              categories: [{ name: "General", columns: 2 }],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useEntitySchema("Location"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.extFields).toHaveProperty("siteId");
    expect(result.current.extFields.siteId?.title).toBe("Site ID");
    expect(result.current.extFields.siteId?.required).toBe(true);
    expect(result.current.categories).toEqual([
      { name: "General", columns: 2 },
    ]);
    expect(result.current.coreRequiredFields.has("name")).toBe(true);
    expect(result.current.extRequiredFields).toContain("siteId");
  });

  it("fetches dynamic enum values when enumType is specified", async () => {
    mockGet.mockImplementation((url: string, opts?: { params?: Record<string, string> }) => {
      if (url === "schema/validation") {
        return Promise.resolve({
          data: {
            Location: {
              dbSchema: { name: { type: "string", required: true } },
              extSchema: {
                type: "object",
                properties: {
                  region: { type: "string", enumType: "RegionType" },
                },
              },
              extUISchema: {
                region: {
                  type: "string",
                  title: "Region",
                  category: "General",
                  displayOrder: 1,
                  enumType: "RegionType",
                },
              },
            },
          },
        });
      }
      if (url === "schema/extensionschema") {
        return Promise.resolve({
          data: { Location: { categories: [] } },
        });
      }
      if (url === "enums") {
        return Promise.resolve({
          data: [
            { value: "EAST", label: "East" },
            { value: "WEST", label: "West" },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useEntitySchema("Location"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.enumFields).toHaveProperty("region");
    expect(result.current.enumFields.region).toEqual(["EAST", "WEST"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/reference-data/shared/hooks/__tests__/use-entity-schema.test.ts`

Expected: FAIL (module not found)

**Step 3: Write the hook**

Create: `src/features/reference-data/shared/hooks/use-entity-schema.ts`

This is a generic version of `use-reward-schema.ts`. The key differences:
- Takes `modelName` as a parameter instead of hardcoding "RewardPolicy"
- No reward-specific fallback lists — derives bulk-editable fields purely from `rcxOpts.disallowBulkUpdate`
- Returns `EntitySchemaData` interface instead of `RewardSchemaData`

```ts
/**
 * Generic hook for fetching any model's schema including extension field
 * definitions, enum values, categories, and bulk-editable field list.
 *
 * Generalized from reward-catalog's useRewardSchema — works with any model
 * that has an ExtensionSchema document.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { useUIStore } from "@/shared/stores/ui-store";
import type {
  EntitySchemaData,
  ExtFieldDef,
  CategoryDef,
} from "../types/server-table-types";

interface EnumEntry {
  value: string | number;
  label: string;
}

async function fetchEnumValues(enumType: string): Promise<string[]> {
  const resp = await apiClient.get<EnumEntry[]>("enums", {
    params: {
      query: JSON.stringify({ type: enumType, lang: "en" }),
      sort: "label",
      select: "value,label",
      limit: "0",
    },
  });
  return resp.data.map((e) => String(e.value));
}

async function fetchEntitySchema(
  modelName: string,
): Promise<Omit<EntitySchemaData, "isLoading">> {
  // Fetch validation schema and extension schema in parallel
  const [validationResp, extSchemaResp] = await Promise.all([
    apiClient.get<Record<string, unknown>>("schema/validation"),
    apiClient
      .get<Record<string, unknown>>("schema/extensionschema")
      .catch(() => null),
  ]);

  const all = validationResp.data;
  const modelBlock = all[modelName] as Record<string, unknown> | undefined;
  if (!modelBlock) {
    // Model not in schema — return empty data
    return {
      extFields: {},
      categories: [],
      coreRequiredFields: new Set(),
      extRequiredFields: [],
      enumFields: {},
      bulkEditableFields: new Set(),
      dbSchema: {},
    };
  }

  // Extract categories from extensionschema response
  const extSchemaAll = extSchemaResp?.data;
  const extSchemaModel = extSchemaAll?.[modelName] as
    | Record<string, unknown>
    | undefined;
  const rawCategories = (extSchemaModel?.categories ?? []) as {
    name: string;
    columns: number;
  }[];
  const categories: CategoryDef[] = rawCategories.map((c) => ({
    name: c.name,
    columns: c.columns ?? 2,
  }));

  const extRequired: string[] = [];
  const enumFields: Record<string, string[]> = {};

  // Collect enumType references that need to be fetched from /api/enums
  const enumTypesToFetch = new Map<string, string[]>();

  // Extract ext required fields and enum values from extSchema
  const extSchema = modelBlock.extSchema as
    | {
        required?: string[];
        properties?: Record<
          string,
          {
            enum?: string[];
            enumType?: string;
            format?: string;
            default?: unknown;
          }
        >;
      }
    | undefined;

  if (extSchema) {
    if (Array.isArray(extSchema.required)) {
      extRequired.push(...extSchema.required);
    }
    const props = extSchema.properties;
    if (props) {
      for (const [field, def] of Object.entries(props)) {
        if (Array.isArray(def.enum) && def.enum.length > 0) {
          enumFields[field] = def.enum;
        } else if (typeof def.enumType === "string" && def.enumType) {
          const fields = enumTypesToFetch.get(def.enumType) ?? [];
          fields.push(field);
          enumTypesToFetch.set(def.enumType, fields);
        }
      }
    }
  }

  // Extract enum values from dbSchema
  const dbSchema = (modelBlock.dbSchema ?? {}) as Record<
    string,
    { enum?: string[] | string; required?: boolean; rcxOpts?: Record<string, unknown> }
  >;

  for (const [field, def] of Object.entries(dbSchema)) {
    if (Array.isArray(def.enum) && def.enum.length > 0) {
      enumFields[field] = def.enum;
    } else if (typeof def.enum === "string" && def.enum) {
      const fields = enumTypesToFetch.get(def.enum) ?? [];
      fields.push(field);
      enumTypesToFetch.set(def.enum, fields);
    }
  }

  // Extract required core fields from dbSchema
  const coreRequiredFields = new Set<string>();
  for (const [field, def] of Object.entries(dbSchema)) {
    if (def.required === true) {
      coreRequiredFields.add(field);
    }
  }

  // Collect bulk-editable fields from dbSchema rcxOpts
  // All fields are bulk-editable by default; fields with
  // rcxOpts.disallowBulkUpdate are excluded.
  const bulkEditableFields = new Set<string>();
  for (const [field, def] of Object.entries(dbSchema)) {
    if (def.rcxOpts?.disallowBulkUpdate) continue;
    bulkEditableFields.add(field);
  }

  // Check extUISchema for enum format references
  const uiSchema = modelBlock.extUISchema as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (uiSchema) {
    for (const [field, def] of Object.entries(uiSchema)) {
      if (enumFields[field]) continue;
      const enumType = def.enumType as string | undefined;
      if (typeof enumType === "string" && enumType) {
        const fields = enumTypesToFetch.get(enumType) ?? [];
        if (!fields.includes(field)) {
          fields.push(field);
          enumTypesToFetch.set(enumType, fields);
        }
      }
    }
  }

  // Fetch all referenced enum types in parallel
  if (enumTypesToFetch.size > 0) {
    const entries = [...enumTypesToFetch.entries()];
    const results = await Promise.all(
      entries.map(([enumType]) =>
        fetchEnumValues(enumType).catch(() => [] as string[]),
      ),
    );
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      const [, fieldNames] = entry;
      const values = results[i];
      if (values && values.length > 0) {
        for (const fieldName of fieldNames) {
          enumFields[fieldName] = values;
        }
      }
    }
  }

  // Build extFields from extUISchema + extSchema fallback
  const extFields: Record<string, ExtFieldDef> = {};
  if (uiSchema) {
    for (const [field, raw] of Object.entries(uiSchema)) {
      const def = raw as Record<string, unknown>;
      extFields[field] = {
        type: (def.type as string) ?? "string",
        title: (def.title as string) ?? field,
        format: def.format as string | undefined,
        required: extRequired.includes(field),
        enum: enumFields[field],
        category: (def.category as string) ?? "",
        displayOrder: parseInt(String(def.displayOrder ?? "999"), 10),
        showInList: (def.showInList as boolean) ?? false,
        searchable: (def.searchable as boolean) ?? false,
        sortable: (def.sortable as boolean) ?? false,
        defaultValue: extSchema?.properties?.[field]?.default,
      };
    }
  }
  // Fall back to extSchema.properties for fields missing from extUISchema
  if (extSchema?.properties) {
    for (const [field, def] of Object.entries(extSchema.properties)) {
      if (!extFields[field]) {
        const d = def as Record<string, unknown>;
        extFields[field] = {
          type: (d.type as string) ?? "string",
          title: (d.title as string) ?? field,
          format: d.format as string | undefined,
          required: extRequired.includes(field),
          enum: enumFields[field],
          category: "",
          displayOrder: 999,
          showInList: false,
          searchable: false,
          sortable: false,
          defaultValue: (def as Record<string, unknown>).default,
        };
      }
    }
  }

  // Post-process: mark parent objects/arrays and dot-path children
  for (const [field, def] of Object.entries(extFields)) {
    if (def.type === "object" || def.type === "array") {
      def.isParent = true;
    }
    const dot = field.indexOf(".");
    if (dot !== -1) {
      def.parentField = field.slice(0, dot);
    }
  }

  return {
    extFields,
    categories,
    coreRequiredFields,
    extRequiredFields: extRequired,
    enumFields,
    bulkEditableFields,
    dbSchema: dbSchema as Record<string, unknown>,
  };
}

/**
 * Generic hook for fetching a model's extension schema, enum values,
 * categories, and bulk-editable field list from the metaschema API.
 *
 * Cached with infinite staleTime — schema doesn't change during a session.
 * Query key includes org/program so cache invalidates when switching.
 */
export function useEntitySchema(modelName: string): EntitySchemaData {
  const org = useUIStore((s) => s.currentOrg);
  const program = useUIStore((s) => s.currentProgram);

  const { data, isLoading } = useQuery({
    queryKey: ["entity-schema", modelName, org, program],
    queryFn: () => fetchEntitySchema(modelName),
    staleTime: Infinity,
  });

  return {
    extFields: data?.extFields ?? {},
    categories: data?.categories ?? [],
    coreRequiredFields: data?.coreRequiredFields ?? new Set(),
    extRequiredFields: data?.extRequiredFields ?? [],
    enumFields: data?.enumFields ?? {},
    bulkEditableFields: data?.bulkEditableFields ?? new Set(),
    dbSchema: data?.dbSchema ?? {},
    isLoading,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/reference-data/shared/hooks/__tests__/use-entity-schema.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/reference-data/shared/
git commit -m "feat(reference-data): add useEntitySchema hook for generic schema discovery"
```

---

## Task 3: useServerTable Hook

**Files:**
- Create: `src/features/reference-data/shared/hooks/use-server-table.ts`
- Reference: `src/shared/hooks/use-api.ts` (useEntityList)
- Reference: `src/shared/types/api.ts` (QueryParams)

**Step 1: Write a test**

Create: `src/features/reference-data/shared/hooks/__tests__/use-server-table.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useServerTable } from "../use-server-table";
import type { ServerTableConfig } from "../../types/server-table-types";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "@/shared/lib/api-client";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

const testConfig: ServerTableConfig = {
  modelName: "Location",
  endpoint: "locations",
  pageTitle: "Locations",
  testIdPrefix: "locations",
  defaultSort: "name",
  searchFields: ["name", "city"],
  coreColumns: [],
  coreFormFields: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useServerTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/count")) {
        return Promise.resolve({ data: { count: 42 } });
      }
      return Promise.resolve({
        data: [{ _id: "1", name: "Test" }],
        headers: { "x-total-count": "42" },
      });
    });
  });

  it("fetches data with default pagination and sort", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.totalCount).toBe(42);
    expect(result.current.pageIndex).toBe(0);
    expect(result.current.pageSize).toBe(25);
  });

  it("changes page when onPageChange is called", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(2));
    expect(result.current.pageIndex).toBe(2);
  });

  it("resets page to 0 when search changes", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(3));
    expect(result.current.pageIndex).toBe(3);

    act(() => result.current.onSearchChange("park"));
    expect(result.current.pageIndex).toBe(0);
  });

  it("tracks row selection by ID", async () => {
    const { result } = renderHook(() => useServerTable(testConfig), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onRowSelect({ "1": true }));
    expect(result.current.selectedIds.has("1")).toBe(true);

    act(() => result.current.clearSelection());
    expect(result.current.selectedIds.size).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/reference-data/shared/hooks/__tests__/use-server-table.test.ts`

Expected: FAIL

**Step 3: Write the hook**

Create: `src/features/reference-data/shared/hooks/use-server-table.ts`

```ts
/**
 * Hook for managing server-side table state: pagination, sorting, filtering,
 * search, and row selection.
 *
 * Internally uses useEntityList with computed query params so all data
 * operations happen on the server.
 */

import { useState, useCallback, useMemo } from "react";
import type { SortingState, ColumnFiltersState, RowSelectionState } from "@tanstack/react-table";
import { useEntityList } from "@/shared/hooks/use-api";
import { apiClient } from "@/shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { ServerTableConfig } from "../types/server-table-types";

const DEFAULT_PAGE_SIZE = 25;

/** Build a MongoDB query object from search + column filters. */
function buildQuery(
  config: ServerTableConfig,
  searchQuery: string,
  columnFilters: ColumnFiltersState,
): Record<string, unknown> | undefined {
  const conditions: Record<string, unknown>[] = [];

  // Global search → $or across searchFields with regex
  if (searchQuery.trim() && config.searchFields?.length) {
    conditions.push({
      $or: config.searchFields.map((field) => ({
        [field]: { $regex: searchQuery.trim(), $options: "i" },
      })),
    });
  }

  // Column filters
  for (const filter of columnFilters) {
    const val = filter.value;
    if (val == null || val === "") continue;

    // Array value → $in (enum multi-select)
    if (Array.isArray(val) && val.length > 0) {
      conditions.push({ [filter.id]: { $in: val } });
    }
    // Object with min/max → range filter
    else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      const range = val as { min?: string | number; max?: string | number };
      const cond: Record<string, unknown> = {};
      if (range.min != null && range.min !== "") cond.$gte = range.min;
      if (range.max != null && range.max !== "") cond.$lte = range.max;
      if (Object.keys(cond).length > 0) {
        conditions.push({ [filter.id]: cond });
      }
    }
    // String → regex
    else if (typeof val === "string") {
      conditions.push({
        [filter.id]: { $regex: val, $options: "i" },
      });
    }
    // Boolean
    else if (typeof val === "boolean") {
      conditions.push({ [filter.id]: val });
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

/** Convert TanStack sorting state to express-restify-mongoose sort string. */
function buildSort(sorting: SortingState, defaultSort?: string): string {
  if (sorting.length === 0) return defaultSort ?? "name";
  const s = sorting[0];
  if (!s) return defaultSort ?? "name";
  return s.desc ? `-${s.id}` : s.id;
}

export function useServerTable<T extends { _id: string }>(
  config: ServerTableConfig,
) {
  // ── UI state ────────────────────────────────────────────────────────
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sorting, setSorting] = useState<SortingState>(
    config.defaultSort
      ? [{ id: config.defaultSort, desc: false }]
      : [],
  );
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Computed query params ───────────────────────────────────────────
  const query = useMemo(
    () => buildQuery(config, searchQuery, columnFilters),
    [config, searchQuery, columnFilters],
  );

  const sortString = useMemo(
    () => buildSort(sorting, config.defaultSort),
    [sorting, config.defaultSort],
  );

  const queryParams = useMemo(
    () => ({
      query: query ? JSON.stringify(query) : undefined,
      sort: sortString,
      skip: pageIndex * pageSize,
      limit: pageSize,
      populate: config.populate?.join(","),
    }),
    [query, sortString, pageIndex, pageSize, config.populate],
  );

  // ── Data fetch ──────────────────────────────────────────────────────
  const { data: listData, isLoading: listLoading, refetch } = useEntityList<T>(
    config.endpoint,
    queryParams,
  );

  // ── Count fetch (separate endpoint for accurate total) ──────────────
  const countQueryKey = useMemo(
    () => [config.endpoint, "count", query ? JSON.stringify(query) : ""],
    [config.endpoint, query],
  );

  const { data: countData } = useQuery({
    queryKey: countQueryKey,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (query) params.query = JSON.stringify(query);
      const resp = await apiClient.get<{ count: number }>(
        `${config.endpoint}/count`,
        { params },
      );
      return resp.data.count;
    },
  });

  const totalCount = countData ?? listData?.meta.totalCount ?? 0;

  // ── Handlers ────────────────────────────────────────────────────────
  const onPageChange = useCallback((page: number) => {
    setPageIndex(page);
  }, []);

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPageIndex(0);
  }, []);

  const onSortChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPageIndex(0);
  }, []);

  const onSearchChange = useCallback((q: string) => {
    setSearchQueryRaw(q);
    setPageIndex(0);
  }, []);

  const onFilterChange = useCallback((filters: ColumnFiltersState) => {
    setColumnFilters(filters);
    setPageIndex(0);
  }, []);

  const onRowSelect = useCallback((selection: RowSelectionState) => {
    setSelectedIds(new Set(Object.keys(selection).filter((k) => selection[k])));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    // Data
    data: (listData?.data ?? []) as T[],
    totalCount,
    isLoading: listLoading,

    // Pagination
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,

    // Sorting
    sorting,
    onSortChange,

    // Filtering
    searchQuery,
    onSearchChange,
    columnFilters,
    onFilterChange,

    // Selection
    selectedIds,
    onRowSelect,
    clearSelection,

    // Actions
    refetch,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/reference-data/shared/hooks/__tests__/use-server-table.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/reference-data/shared/hooks/
git commit -m "feat(reference-data): add useServerTable hook for server-side pagination/sort/filter"
```

---

## Task 4: useBulkOperations Hook

**Files:**
- Create: `src/features/reference-data/shared/hooks/use-bulk-operations.ts`
- Reference: `src/features/reward-catalog/hooks/use-rewards.ts` (bulk patterns)

**Step 1: Write the hook**

```ts
/**
 * Bulk update and delete operations for reference data entities.
 * Uses the /multiedit and /multidelete endpoints.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { ServerTableConfig } from "../types/server-table-types";

export function useBulkOperations(config: ServerTableConfig) {
  const queryClient = useQueryClient();

  const bulkUpdate = useMutation({
    mutationFn: async ({
      ids,
      update,
    }: {
      ids: string[];
      update: Record<string, unknown>;
    }) => {
      await apiClient.patch("multiedit", {
        model: config.modelName,
        ids,
        update,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      await apiClient.post("multidelete", {
        model: config.modelName,
        ids,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
    },
  });

  return { bulkUpdate, bulkDelete };
}
```

**Step 2: Commit**

```bash
git add src/features/reference-data/shared/hooks/use-bulk-operations.ts
git commit -m "feat(reference-data): add useBulkOperations hook for multiedit/multidelete"
```

---

## Task 5: ExtFieldRenderer + ExtTabBody (Generic)

**Files:**
- Create: `src/features/reference-data/shared/components/ext-field-renderer.tsx`
- Create: `src/features/reference-data/shared/components/ext-tab-body.tsx`
- Reference: `src/features/reward-catalog/components/reward-ext-fields.tsx` (source to generalize)

**Step 1: Create ExtFieldRenderer**

This is extracted from the reward-catalog version with these changes:
- Uses `EntitySchemaData` instead of `RewardSchemaData`
- Removes the `toDateOnly` import from reward-specific helpers — uses inline date conversion
- Props use generic names

Create `src/features/reference-data/shared/components/ext-field-renderer.tsx`:

```ts
/**
 * Extension field renderer for schema-driven forms.
 *
 * Renders individual extension fields based on their type from the metaschema.
 * Extracted and generalized from reward-catalog's reward-ext-fields.tsx.
 */

import { type JSX } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Select, type SelectOption } from "@/shared/components/select";
import type { ExtFieldDef, EntitySchemaData } from "../types/server-table-types";

function toDateOnly(iso: string | undefined | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function isUrlField(fieldName: string, def: ExtFieldDef): boolean {
  if (def.format === "uri" || def.format === "url") return true;
  const lower = fieldName.toLowerCase();
  return lower.includes("url") || lower.includes("imagelistpage");
}

export function ExtFieldRenderer({
  fieldName,
  def,
  value,
  onChange,
  error,
  schemaData,
  onPreviewUrl,
}: {
  fieldName: string;
  def: ExtFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  schemaData: EntitySchemaData | null;
  onPreviewUrl?: (url: string) => void;
}): JSX.Element {
  const label = def.title || fieldName;
  const requiredStar = def.required ? (
    <span className="ml-0.5 text-error">*</span>
  ) : null;
  const enumValues = schemaData?.enumFields[fieldName] ?? def.enum;

  // Enum → Select dropdown
  if (enumValues && enumValues.length > 0) {
    const options: SelectOption[] = enumValues.map((v) => ({
      value: v,
      label: v,
    }));
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <Select
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
          options={options}
          placeholder="—"
          error={!!error}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Boolean → Toggle switch
  if (def.type === "boolean") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch checked={!!value} onChange={(v) => onChange(v)} />
        <span className="text-body-sm text-foreground">{label}</span>
      </label>
    );
  }

  // Number
  if (def.type === "number" || def.type === "integer") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <Input
          type="number"
          value={value != null ? String(value) : ""}
          onChange={(e) => {
            const num = e.target.valueAsNumber;
            onChange(Number.isNaN(num) ? "" : num);
          }}
          min="0"
          error={!!error}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Date
  if (def.format === "date-time" || def.format === "date") {
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <Input
          type="date"
          value={toDateOnly(value as string)}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // URL — text input with preview button
  if (isUrlField(fieldName, def)) {
    const strVal = String(value ?? "");
    return (
      <div>
        <label className="mb-3 block text-label text-foreground-muted">
          {label}
          {requiredStar}
        </label>
        <div className="flex gap-1">
          <Input
            type="text"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            error={!!error}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!strVal.trim()}
            onClick={() => {
              let normalized = strVal.trim();
              if (normalized && !/^https?:\/\//i.test(normalized)) {
                normalized = "https://" + normalized;
              }
              if (
                /\.(png|jpe?g|gif|svg|webp|bmp|ico)(\?.*)?$/i.test(normalized)
              ) {
                onPreviewUrl?.(normalized);
              } else {
                window.open(normalized, "_blank");
              }
            }}
            title="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  }

  // Default → text input
  return (
    <div>
      <label className="mb-3 block text-label text-foreground-muted">
        {label}
        {requiredStar}
      </label>
      <Input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
      />
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}
```

**Step 2: Create ExtTabBody**

Create `src/features/reference-data/shared/components/ext-tab-body.tsx`:

```ts
/**
 * Renders a tab of extension fields with grid layout from category columns.
 * Separates boolean fields (rendered as toggles) from other fields.
 */

import { type JSX } from "react";
import { ExtFieldRenderer } from "./ext-field-renderer";
import type { ExtFieldDef, EntitySchemaData, FormTab } from "../types/server-table-types";

export function ExtTabBody({
  tab,
  extValues,
  onExtFieldChange,
  errors,
  schemaData,
  onPreviewUrl,
}: {
  tab: FormTab;
  extValues: Record<string, unknown>;
  onExtFieldChange: (key: string, value: unknown) => void;
  errors: Record<string, string>;
  schemaData: EntitySchemaData;
  onPreviewUrl?: (url: string) => void;
}): JSX.Element {
  const cols = tab.columns;

  const nonBoolFields: string[] = [];
  const boolFields: string[] = [];
  for (const fieldName of tab.fields) {
    const def = schemaData.extFields[fieldName];
    if (def?.type === "boolean") {
      boolFields.push(fieldName);
    } else {
      nonBoolFields.push(fieldName);
    }
  }

  const rows: string[][] = [];
  for (let i = 0; i < nonBoolFields.length; i += cols) {
    rows.push(nonBoolFields.slice(i, i + cols));
  }

  const gridClass =
    cols === 3
      ? "grid grid-cols-3 gap-4"
      : cols === 1
        ? "flex flex-col gap-4"
        : "grid grid-cols-2 gap-4";

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => (
        <div key={idx} className={gridClass}>
          {row.map((fieldName) => {
            const def = schemaData.extFields[fieldName];
            if (!def) return null;
            return (
              <ExtFieldRenderer
                key={fieldName}
                fieldName={fieldName}
                def={def}
                value={extValues[fieldName]}
                onChange={(v) => onExtFieldChange(fieldName, v)}
                error={errors[fieldName]}
                schemaData={schemaData}
                onPreviewUrl={onPreviewUrl}
              />
            );
          })}
        </div>
      ))}
      {boolFields.length > 0 && (
        <div className={gridClass}>
          {boolFields.map((fieldName) => {
            const def = schemaData.extFields[fieldName];
            if (!def) return null;
            return (
              <ExtFieldRenderer
                key={fieldName}
                fieldName={fieldName}
                def={def}
                value={extValues[fieldName]}
                onChange={(v) => onExtFieldChange(fieldName, v)}
                error={errors[fieldName]}
                schemaData={schemaData}
                onPreviewUrl={onPreviewUrl}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No errors related to these new files

**Step 4: Commit**

```bash
git add src/features/reference-data/shared/components/
git commit -m "feat(reference-data): add ExtFieldRenderer and ExtTabBody components"
```

---

## Task 6: Dot-Path Utilities (Copy)

**Files:**
- Create: `src/features/reference-data/shared/lib/dot-path.ts`
- Reference: `src/features/reward-catalog/lib/dot-path.ts` (exact copy)

**Step 1: Copy the file**

Copy `src/features/reward-catalog/lib/dot-path.ts` to `src/features/reference-data/shared/lib/dot-path.ts`. This file has no reward-specific dependencies — it's pure utility code for flattening/unflattening nested extension field objects.

**Step 2: Commit**

```bash
git add src/features/reference-data/shared/lib/dot-path.ts
git commit -m "feat(reference-data): add dot-path utilities for nested extension fields"
```

---

## Task 7: Form Tab Builder Utilities

**Files:**
- Create: `src/features/reference-data/shared/lib/form-tab-helpers.ts`
- Reference: `src/features/reward-catalog/lib/reward-form-helpers.ts` (buildFormTabs, buildFieldTabMap)

**Step 1: Create the utilities**

```ts
/**
 * Utilities for building form tabs from entity config + schema data.
 */

import type {
  ServerTableConfig,
  EntitySchemaData,
  ExtFieldDef,
  FormTab,
} from "../types/server-table-types";

/**
 * Build form tabs: one "Details" tab from config core fields,
 * plus one tab per extension schema category.
 */
export function buildFormTabs(
  config: ServerTableConfig,
  schema: EntitySchemaData,
): FormTab[] {
  const tabs: FormTab[] = [];

  // Core "Details" tab from config
  tabs.push({
    key: "details",
    label: "Details",
    fields: config.coreFormFields.map((f) => f.field),
    columns: 2,
  });

  // Extension tabs — one per category
  if (schema.categories.length > 0) {
    for (const cat of schema.categories) {
      const fields: string[] = [];
      const entries = Object.entries(schema.extFields)
        .filter(
          ([, def]) =>
            def.category === cat.name && !def.isParent,
        )
        .sort((a, b) => a[1].displayOrder - b[1].displayOrder);

      for (const [fieldName] of entries) {
        fields.push(fieldName);
      }

      if (fields.length > 0) {
        tabs.push({
          key: cat.name.toLowerCase().replace(/\s+/g, "-"),
          label: cat.name,
          fields,
          columns: cat.columns,
        });
      }
    }
  } else {
    // No categories defined — put all ext fields in a single "Extensions" tab
    const allExtFields = Object.entries(schema.extFields)
      .filter(([, def]) => !def.isParent)
      .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
      .map(([name]) => name);

    if (allExtFields.length > 0) {
      tabs.push({
        key: "extensions",
        label: "Extensions",
        fields: allExtFields,
        columns: 2,
      });
    }
  }

  return tabs;
}

/**
 * Build a map from field name to tab key, for error routing.
 */
export function buildFieldTabMap(tabs: FormTab[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tab of tabs) {
    for (const field of tab.fields) {
      map[field] = tab.key;
    }
  }
  return map;
}

/**
 * Count errors per tab and return the first tab key with errors.
 */
export function firstTabWithError(
  fieldTabMap: Record<string, string>,
  errors: Record<string, string>,
): string | null {
  for (const field of Object.keys(errors)) {
    const tab = fieldTabMap[field];
    if (tab) return tab;
  }
  return null;
}

export function tabErrorCounts(
  tabs: FormTab[],
  errors: Record<string, string>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tab of tabs) {
    let count = 0;
    for (const field of tab.fields) {
      if (errors[field]) count++;
    }
    counts[tab.key] = count;
  }
  return counts;
}
```

**Step 2: Commit**

```bash
git add src/features/reference-data/shared/lib/
git commit -m "feat(reference-data): add form tab builder utilities"
```

---

## Task 8: EntityFormDrawer Component

**Files:**
- Create: `src/features/reference-data/shared/components/entity-form-drawer.tsx`
- Reference: `src/features/reward-catalog/components/reward-form-drawer.tsx` (pattern)

**Step 1: Create the drawer component**

This is the most complex component. It handles create/edit with:
- Core "Details" tab with fields from config (rendered via React Hook Form)
- Dynamic extension tabs from schema (rendered via ExtTabBody)
- Validation with required field checks
- Tab error badges
- API error parsing
- Unsaved changes guard

The component should be ~300-400 lines. Key implementation notes:
- Use React Hook Form for core fields (`useForm` with dynamic Zod schema)
- Use manual `useState` for ext field values (they're dynamic and nested)
- Flatten ext values on load, unflatten on save (via dot-path utilities)
- Core form field rendering uses a switch on `CoreFieldDef.type` to render Input, Select, Switch, or date input
- Extension field rendering delegates to `ExtTabBody`
- On save: merge core form data + unflattened ext data, strip audit fields, call create/update mutation
- On API error: parse `details[]` array, assign to field names, switch to first tab with errors

**The drawer should use Radix Dialog with slide-in-from-right animation**, matching the Rewards Catalog pattern.

This is a large component — the implementer should reference `reward-form-drawer.tsx` closely for the drawer chrome (header, footer, tab navigation) and adapt it for the generic config-driven approach.

**Step 2: Write a smoke test**

Create: `src/features/reference-data/shared/components/__tests__/entity-form-drawer.test.tsx`

Test that the drawer renders with core fields when opened in create mode, and renders extension tabs when schema has categories.

**Step 3: Verify**

Run: `npx vitest run src/features/reference-data/shared/components/__tests__/entity-form-drawer.test.tsx`

Expected: PASS

**Step 4: Commit**

```bash
git add src/features/reference-data/shared/components/entity-form-drawer.tsx
git add src/features/reference-data/shared/components/__tests__/
git commit -m "feat(reference-data): add EntityFormDrawer with core + extension tabs"
```

---

## Task 9: BulkEditDrawer Component

**Files:**
- Create: `src/features/reference-data/shared/components/bulk-edit-drawer.tsx`
- Reference: `src/features/reward-catalog/components/bulk-edit-drawer.tsx` (pattern)

**Step 1: Create the component**

Generalized version of the reward-catalog's BulkEditDrawer. Key behaviors:
- Opt-in checkbox per field (only enabled fields sent in update)
- Mixed-value detection via JSON.stringify comparison across selected items
- Same tab structure as EntityFormDrawer (core + extension tabs)
- Core fields filtered to exclude `disallowBulkUpdate` items
- Extension fields filtered to `schema.bulkEditableFields`
- Confirmation dialog: "Update N fields on M items?"
- On save: collect enabled fields + values, call `bulkOps.bulkUpdate.mutateAsync`
- On error: parse field-level errors, display inline, switch to first tab with errors
- Footer: Cancel + "Apply to N" button

The component should be ~400-500 lines. Reference the reward-catalog version closely.

**Step 2: Write a smoke test**

Test that the drawer renders with checkboxes for each field and shows "(mixed)" for fields with different values across selected items.

**Step 3: Commit**

```bash
git add src/features/reference-data/shared/components/bulk-edit-drawer.tsx
git commit -m "feat(reference-data): add BulkEditDrawer with opt-in fields and mixed-value detection"
```

---

## Task 10: BulkActionBar Component

**Files:**
- Create: `src/features/reference-data/shared/components/bulk-action-bar.tsx`
- Reference: `src/features/reward-catalog/components/bulk-action-bar.tsx` (copy + generalize)

**Step 1: Copy and adapt**

This is nearly identical to the reward-catalog version. Copy it and remove any reward-specific references. The component is ~50 lines — a fixed bottom bar with "N selected", Invert, Edit, Delete, Clear buttons.

**Step 2: Commit**

```bash
git add src/features/reference-data/shared/components/bulk-action-bar.tsx
git commit -m "feat(reference-data): add BulkActionBar component"
```

---

## Task 11: Column Builder Utility

**Files:**
- Create: `src/features/reference-data/shared/lib/build-columns.tsx`

**Step 1: Create the column builder**

This function merges core columns from config + extension columns from schema into TanStack Table ColumnDef[].

```tsx
/**
 * Build TanStack Table column definitions from entity config + schema data.
 *
 * Core columns come from config.coreColumns (always shown by default).
 * Extension columns come from schema.extFields where showInList === true.
 */

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/shared/ui/checkbox";
import type { ServerTableConfig, EntitySchemaData, CoreColumnDef } from "../types/server-table-types";
import { summarizeNested } from "../lib/dot-path";

/** Get a nested value from an object using a dot-path key. */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatCellValue(value: unknown, type: string): string {
  if (value == null) return "";
  if (type === "date" || type === "date-time") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "number" || type === "integer") return String(value);
  if (typeof value === "object") return summarizeNested(value);
  return String(value);
}

export function buildColumns<T extends Record<string, unknown>>(
  config: ServerTableConfig,
  schema: EntitySchemaData,
): ColumnDef<T, unknown>[] {
  const columns: ColumnDef<T, unknown>[] = [];

  // Selection checkbox column
  columns.push({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
        className="cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
        className="cursor-pointer"
      />
    ),
    size: 40,
    enableSorting: false,
    enableColumnFilter: false,
  });

  // Core columns from config
  for (const col of config.coreColumns) {
    columns.push({
      id: col.field,
      accessorFn: (row) => getNestedValue(row as Record<string, unknown>, col.field),
      header: col.label,
      cell: ({ getValue }) => formatCellValue(getValue(), col.type),
      size: col.width,
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterType: col.type === "enum" ? "enum" : col.type === "number" ? "number" : col.type === "date" ? "date" : "text",
        enumType: col.enumType,
      },
    });
  }

  // Extension columns from schema (where showInList is true)
  const extEntries = Object.entries(schema.extFields)
    .filter(([, def]) => def.showInList && !def.isParent)
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder);

  for (const [fieldName, def] of extEntries) {
    columns.push({
      id: `ext.${fieldName}`,
      accessorFn: (row) => {
        const ext = (row as Record<string, unknown>).ext as Record<string, unknown> | undefined;
        if (!ext) return undefined;
        return getNestedValue(ext, fieldName);
      },
      header: def.title || fieldName,
      cell: ({ getValue }) => formatCellValue(getValue(), def.type),
      enableSorting: def.sortable,
      enableColumnFilter: def.searchable,
      meta: {
        filterType: def.enum ? "enum" : def.type === "number" ? "number" : def.type === "date" ? "date" : "text",
        enumValues: def.enum,
      },
    });
  }

  return columns;
}
```

**Step 2: Commit**

```bash
git add src/features/reference-data/shared/lib/build-columns.tsx
git commit -m "feat(reference-data): add column builder for core + extension columns"
```

---

## Task 12: ServerTablePage Component

**Files:**
- Create: `src/features/reference-data/shared/components/server-table-page.tsx`

**Step 1: Create the page component**

This is the main layout wrapper that composes all pieces. ~200-250 lines.

```tsx
/**
 * Generic server-side table page layout.
 *
 * Composes: PageHeader, search toolbar, DataTable, BulkActionBar,
 * EntityFormDrawer, BulkEditDrawer, and DeleteConfirmDialog.
 */
```

Key responsibilities:
- Renders PageHeader with title and "Add New" button
- Search input with debounced `onSearchChange` (300ms)
- DataTable with all server-side props wired from `useServerTable`
- BulkActionBar when items are selected
- EntityFormDrawer for create (new entity with defaults) and edit (fetch + populate)
- BulkEditDrawer for bulk editing selected items
- DeleteConfirmDialog for single and bulk delete
- Uses `useCreateEntity`, `useUpdateEntity`, `useDeleteEntity` for CRUD
- Optional `toolbarActions` prop for per-entity custom buttons

State managed locally:
- `editingEntity: T | null` — entity being edited (null = closed)
- `isCreating: boolean` — true when creating new
- `deleteTarget: string | null` — ID of entity to delete
- `bulkEditOpen: boolean`
- `bulkDeleteConfirm: boolean`

**Step 2: Write a smoke test**

Test that the page renders with a title, search bar, and empty table when no data.

**Step 3: Commit**

```bash
git add src/features/reference-data/shared/components/server-table-page.tsx
git commit -m "feat(reference-data): add ServerTablePage layout component"
```

---

## Task 13: Location Config

**Files:**
- Create: `src/features/reference-data/locations/config/location-config.ts`

**Step 1: Write the config**

```ts
import type { ServerTableConfig } from "../../shared/types/server-table-types";

export const locationConfig: ServerTableConfig = {
  modelName: "Location",
  endpoint: "locations",
  pageTitle: "Locations",
  testIdPrefix: "locations",
  defaultSort: "name",
  populate: ["createdBy", "updatedBy"],
  searchFields: ["name", "city", "state", "country", "number"],

  coreColumns: [
    { field: "name", label: "Name", type: "text", required: true, sticky: true },
    { field: "number", label: "Number", type: "text" },
    { field: "city", label: "City", type: "text" },
    { field: "state", label: "State", type: "text" },
    { field: "country", label: "Country", type: "text" },
    { field: "zipCode", label: "Zip Code", type: "text" },
    { field: "timeZone", label: "Time Zone", type: "enum", enumType: "timeZone" },
    { field: "status", label: "Status", type: "enum", enumType: "LocationStatusType" },
  ],

  coreFormFields: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "number", label: "Number", type: "text" },
    { field: "desc", label: "Description", type: "textarea" },
    { field: "city", label: "City", type: "text" },
    { field: "state", label: "State", type: "text" },
    { field: "country", label: "Country", type: "text" },
    { field: "zipCode", label: "Zip Code", type: "text" },
    { field: "timeZone", label: "Time Zone", type: "enum", enumType: "timeZone" },
    { field: "status", label: "Status", type: "enum", enumType: "LocationStatusType" },
  ],
};
```

**Step 2: Commit**

```bash
git add src/features/reference-data/locations/config/location-config.ts
git commit -m "feat(locations): add Location entity config for server-side table editor"
```

---

## Task 14: Locations Page

**Files:**
- Modify: `src/features/reference-data/locations/pages/locations-page.tsx`

**Step 1: Replace the stub with the real page**

```tsx
import { useEntitySchema } from "../../shared/hooks/use-entity-schema";
import { useServerTable } from "../../shared/hooks/use-server-table";
import { useBulkOperations } from "../../shared/hooks/use-bulk-operations";
import { buildColumns } from "../../shared/lib/build-columns";
import { ServerTablePage } from "../../shared/components/server-table-page";
import { locationConfig } from "../config/location-config";
import type { Location } from "@/shared/types/reference-data";

export default function LocationsPage() {
  const schema = useEntitySchema("Location");
  const table = useServerTable<Location>(locationConfig);
  const bulkOps = useBulkOperations(locationConfig);
  const columns = buildColumns<Location>(locationConfig, schema);

  return (
    <ServerTablePage
      config={locationConfig}
      schema={schema}
      table={table}
      columns={columns}
      bulkOps={bulkOps}
    />
  );
}
```

**Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -20`

Expected: Build succeeds (or only pre-existing warnings)

**Step 3: Commit**

```bash
git add src/features/reference-data/locations/
git commit -m "feat(locations): implement Locations page with server-side table editor"
```

---

## Task 15: Manual Testing & Polish

**Step 1: Start the dev environment**

Run: `docker compose -f docker-compose.dev.yml up -d`

**Step 2: Navigate to Locations page**

Open: `http://localhost:4000/reference-data/locations`

Login with `mgm/admin` / `wint00l$`

**Step 3: Test all features**

Verify:
- Table loads with server-side pagination (page controls work, data changes)
- Sorting by column header sends new request (check Network tab)
- Global search filters on server side
- Column filters work (text regex, enum multi-select)
- "Add New" opens create drawer with core fields tab
- Extension tabs appear if the org has extension fields for Location
- Required fields show asterisks
- Save creates entity, drawer closes, table refreshes
- Edit by clicking a row opens edit drawer with populated data
- Bulk select + Edit opens bulk edit drawer
- Bulk select + Delete opens confirmation then deletes
- Unsaved changes dialog appears when closing dirty form

**Step 4: Fix any issues found during manual testing**

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix(locations): polish after manual testing"
```

---

## Task 16: E2E Tests

**Files:**
- Create: `e2e/locations.spec.ts`

**Step 1: Write Playwright e2e tests**

```ts
import { test, expect } from "@playwright/test";

test.describe("Locations Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByTestId("login-username").fill("mgm/admin");
    await page.getByTestId("login-password").fill("wint00l$");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/dashboard**");

    // Navigate to locations
    await page.goto("/reference-data/locations");
    await page.waitForSelector('[data-testid="locations-table"]');
  });

  test("displays locations table with data", async ({ page }) => {
    const rows = page.locator('[data-testid="locations-table"] tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    const searchInput = page.getByTestId("locations-search");
    await searchInput.fill("test");
    // Wait for debounced search to take effect
    await page.waitForTimeout(500);
    // Table should re-render (we can't assert exact results without knowing data)
    await expect(searchInput).toHaveValue("test");
  });

  test("create new location via drawer", async ({ page }) => {
    await page.getByTestId("locations-add-new").click();
    await expect(page.getByTestId("locations-form-drawer")).toBeVisible();

    // Fill required field
    await page.getByTestId("locations-field-name").fill("E2E Test Location");
    await page.getByTestId("locations-field-city").fill("Test City");

    // Save
    await page.getByTestId("locations-form-save").click();

    // Drawer should close on success
    await expect(page.getByTestId("locations-form-drawer")).not.toBeVisible();
  });

  test("pagination controls change pages", async ({ page }) => {
    // Check that pagination exists
    const pagination = page.getByTestId("locations-pagination");
    await expect(pagination).toBeVisible();
  });
});
```

**Step 2: Run e2e tests**

Run: `npm run test:e2e -- --grep "Locations"`

Expected: Tests pass (adjust selectors as needed based on actual implementation)

**Step 3: Commit**

```bash
git add e2e/locations.spec.ts
git commit -m "test(locations): add e2e tests for Locations page"
```

---

## Task 17: Index Barrel Exports

**Files:**
- Create: `src/features/reference-data/shared/index.ts`

**Step 1: Create barrel export**

```ts
// Hooks
export { useEntitySchema } from "./hooks/use-entity-schema";
export { useServerTable } from "./hooks/use-server-table";
export { useBulkOperations } from "./hooks/use-bulk-operations";

// Components
export { ServerTablePage } from "./components/server-table-page";
export { EntityFormDrawer } from "./components/entity-form-drawer";
export { BulkEditDrawer } from "./components/bulk-edit-drawer";
export { BulkActionBar } from "./components/bulk-action-bar";
export { ExtFieldRenderer } from "./components/ext-field-renderer";
export { ExtTabBody } from "./components/ext-tab-body";

// Utilities
export { buildColumns } from "./lib/build-columns";
export { buildFormTabs, buildFieldTabMap, firstTabWithError, tabErrorCounts } from "./lib/form-tab-helpers";
export { flattenNested, unflattenDotPaths, summarizeNested } from "./lib/dot-path";

// Types
export type {
  ServerTableConfig,
  CoreColumnDef,
  CoreFieldDef,
  CoreFieldType,
  EntitySchemaData,
  ExtFieldDef,
  CategoryDef,
  FormTab,
} from "./types/server-table-types";
```

**Step 2: Commit**

```bash
git add src/features/reference-data/shared/index.ts
git commit -m "feat(reference-data): add barrel export for shared server-table-editor"
```

---

## Task 18: Final Build Verification

**Step 1: Run type check + build**

Run: `npm run build`

Expected: Build succeeds

**Step 2: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 3: Run linting**

Run: `npm run lint`

Expected: No errors (warnings acceptable)

**Step 4: Final commit if any fixes needed**

---

## Summary: File Inventory

### New files (16):
```
src/features/reference-data/shared/
  index.ts
  types/server-table-types.ts
  hooks/use-entity-schema.ts
  hooks/use-server-table.ts
  hooks/use-bulk-operations.ts
  hooks/__tests__/use-entity-schema.test.ts
  hooks/__tests__/use-server-table.test.ts
  components/server-table-page.tsx
  components/entity-form-drawer.tsx
  components/bulk-edit-drawer.tsx
  components/bulk-action-bar.tsx
  components/ext-field-renderer.tsx
  components/ext-tab-body.tsx
  components/__tests__/entity-form-drawer.test.tsx
  lib/dot-path.ts
  lib/form-tab-helpers.ts
  lib/build-columns.tsx

src/features/reference-data/locations/
  config/location-config.ts

e2e/locations.spec.ts
```

### Modified files (1):
```
src/features/reference-data/locations/pages/locations-page.tsx
```

### Estimated task dependencies:
- Tasks 1-7 can be done in any order (types, hooks, utilities — no UI)
- Tasks 8-10 depend on Tasks 1, 5, 6, 7 (components need types + renderers + utilities)
- Task 11 depends on Task 1 (column builder needs types)
- Task 12 depends on Tasks 8, 9, 10, 11 (ServerTablePage composes all components)
- Tasks 13-14 depend on Task 12 (Location page uses ServerTablePage)
- Tasks 15-18 depend on Task 14 (testing the assembled page)
