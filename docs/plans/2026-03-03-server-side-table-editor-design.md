# Server-Side Table Editor Design

Date: 2026-03-03

## Goal

Build a reusable, server-side-paged table editor for reference data entities (Locations, Segments, Products, Enumerations). The editor must:

- Page, sort, and filter on the server (no loading all data into memory)
- Discover extension fields dynamically from the metaschema API
- Render extension tabs matching uiDefs categories from ExtensionSchema
- Match the Rewards Catalog experience (drawer-based create/edit, bulk edit with opt-in fields and mixed-value detection)
- Be reusable across entities with minimal per-entity config (~60 lines)

## Architecture: Composition-Based Generic Components

Reusable hooks and components live in `reference-data/shared/`. Each entity gets its own subdirectory with a page component and config file that compose the generic pieces. Entity pages can override or extend behavior as needed.

### File Structure

```
src/features/reference-data/
  shared/
    components/
      server-table-page.tsx      # Layout: toolbar + DataTable + bulk action bar + drawers
      entity-form-drawer.tsx     # Create/edit drawer: core tab + extension tabs (React Hook Form)
      bulk-edit-drawer.tsx       # Bulk edit: opt-in checkboxes, mixed values, tab organization
      ext-field-renderer.tsx     # Extension field renderer by type (text, enum, boolean, date, number, URL)
      ext-tab-body.tsx           # Extension tab body with grid layout from category columns
    hooks/
      use-server-table.ts        # Server-side pagination, sort, filter, search state management
      use-entity-schema.ts       # Generic schema + extension field discovery from metaschema
      use-bulk-operations.ts     # Bulk update (/multiedit) and bulk delete (/multidelete)
    types/
      server-table-types.ts      # Shared types: ServerTableConfig, CoreColumnDef, CoreFieldDef, etc.
  locations/
    pages/
      locations-page.tsx         # Composes generic components with Location config
    config/
      location-config.ts         # Core columns, core form fields, endpoint, model name
  segments/                      # Same structure
  products/                      # Same structure
  enums/                         # Same structure
```

## Config Interface

Each entity provides a `ServerTableConfig` (~60 lines):

```ts
interface ServerTableConfig {
  modelName: string;             // "Location", "Segment", etc.
  endpoint: string;              // "locations", "segments", etc.
  pageTitle: string;             // Display name for page header
  testIdPrefix: string;          // For data-testid attributes
  defaultSort?: string;          // Initial sort field (default: "name")
  populate?: string[];           // Refs to populate in API queries
  searchFields?: string[];       // Core fields for global text search ($or regex)

  coreColumns: CoreColumnDef[];  // Table columns (extension columns added from schema)
  coreFormFields: CoreFieldDef[];// Form fields for the "Details" tab (extension tabs from schema)
}

interface CoreColumnDef {
  field: string;                 // Dot-path field accessor
  label: string;                 // Column header text
  type: "text" | "number" | "date" | "enum" | "boolean";
  required?: boolean;
  enumType?: string;             // For enum columns, fetches values via useEnumOptions
  sticky?: boolean;              // Sticky left column (e.g., name)
  width?: number;                // Optional column width
}

interface CoreFieldDef {
  field: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "enum" | "boolean";
  required?: boolean;
  enumType?: string;
  placeholder?: string;
}
```

Core fields are explicit in config (types, labels, enum references). Extension fields, tabs, enums, required flags, and bulk-edit eligibility come from the metaschema at runtime.

## Hook: useServerTable

Manages all server-side state and returns DataTable-ready props.

```ts
function useServerTable<T>(config: ServerTableConfig): {
  // Data
  data: T[];
  totalCount: number;
  isLoading: boolean;

  // Pagination (server-side)
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // Sorting (server-side)
  sorting: SortingState;
  onSortChange: (sorting: SortingState) => void;

  // Filtering (server-side)
  searchQuery: string;
  onSearchChange: (query: string) => void;  // debounced 300ms
  columnFilters: ColumnFiltersState;
  onFilterChange: (filters: ColumnFiltersState) => void;

  // Selection (client-side, tracks IDs)
  selectedIds: Set<string>;
  onRowSelect: (selection: RowSelectionState) => void;
  clearSelection: () => void;

  // Refresh
  refetch: () => void;
}
```

### Query Building

1. **Search**: `searchQuery` becomes `$or` across `config.searchFields` with case-insensitive regex.
2. **Column filters**: Each column filter adds to the query. Enum = exact match. Text = regex. Date = `$gte/$lte` range. Number = `$gte/$lte` range.
3. **Sort**: Maps TanStack SortingState to express-restify-mongoose format (`"name"` or `"-name"`).
4. **Pagination**: Maps to `skip` and `limit` params.
5. **Count**: Separate GET to `/{endpoint}/count` with same query (no skip/limit) for `totalCount`.

Internally uses `useEntityList` with computed query params.

## Hook: useEntitySchema

Generic version of `useRewardSchema()`. Fetches and parses the metaschema for any model.

```ts
function useEntitySchema(modelName: string): {
  extFields: Record<string, ExtFieldDef>;       // Extension field metadata
  categories: CategoryDef[];                      // Tab layout (name + columns)
  coreRequiredFields: Set<string>;               // Required core fields from dbSchema
  extRequiredFields: string[];                    // Required extension fields from extSchema
  enumFields: Record<string, string[]>;           // Field -> enum values
  bulkEditableFields: Set<string>;               // Fields not excluded by disallowBulkUpdate
  dbSchema: Record<string, unknown>;             // Raw dbSchema for advanced use
  isLoading: boolean;
}
```

### Data Sources

| Source | What We Extract |
|--------|----------------|
| `GET /api/schema/validation` -> `dbSchema` | Core field types, required flags, inline enums, `rcxOpts.disallowBulkUpdate` |
| `GET /api/schema/validation` -> `extSchema` | Extension field types, required array, inline enums, `enumType` refs |
| `GET /api/schema/validation` -> `extUISchema` | `category`, `displayOrder`, `showInList`, `searchable`, `sortable`, `title` |
| `GET /api/schema/extensionschema` | `categories[]` (name + columns for tab grid layout), `enumPath` |
| `GET /api/enums?query={"type":"<enumType>"}` | Dynamic enum values (via existing `useEnumOptions`) |

## Hook: useBulkOperations

Wraps the `/multiedit` and `/multidelete` endpoints.

```ts
function useBulkOperations(config: ServerTableConfig): {
  bulkUpdate: UseMutationResult<void, Error, { ids: string[]; update: Record<string, unknown> }>;
  bulkDelete: UseMutationResult<void, Error, { ids: string[] }>;
}
```

Uses:
- `PATCH /api/multiedit` with `{ model: config.modelName, ids, update }`
- `POST /api/multidelete` with `{ model: config.modelName, ids }`

Invalidates the endpoint's query key on success.

## Component: ServerTablePage

Layout wrapper that composes the toolbar, DataTable, bulk action bar, and drawers.

```tsx
interface ServerTablePageProps {
  config: ServerTableConfig;
  schema: ReturnType<typeof useEntitySchema>;
  table: ReturnType<typeof useServerTable>;
  columns: ColumnDef[];
  bulkOps: ReturnType<typeof useBulkOperations>;
  toolbarActions?: React.ReactNode;  // Per-entity custom toolbar buttons
}
```

Renders:
- Page header with title and "Add New" button
- Toolbar with search bar and column filter controls
- DataTable with server-side pagination/sort/filter via props
- Bulk action bar (fixed bottom) when items are selected: Edit, Delete, Clear
- EntityFormDrawer for create/edit
- BulkEditDrawer for bulk editing
- DeleteConfirmDialog for single and bulk delete

## Component: EntityFormDrawer

Right-side slide-in drawer for creating and editing entities.

### Layout

```
+---------------------------------------------+
|  Create/Edit {Entity}           X            |
+---------------------------------------------+
|  [Details] [General] [Custom Tab...]         |
+---------------------------------------------+
|                                              |
|  Field Label *      [____________]           |
|  Another Field      [____________]           |
|  Enum Field         [v Select... ]           |
|                                              |
+---------------------------------------------+
|               [Cancel]  [Save]               |
+---------------------------------------------+
```

### Tabs
- **Details tab**: Core form fields from `config.coreFormFields`
- **Extension tabs**: One per category from `schema.categories`, fields from `schema.extFields` filtered by category

### Form State
- React Hook Form with dynamic field registration
- Zod schema built dynamically from core config + extension schema required fields
- RHF natively supports dot-path field names for nested extension fields (e.g., `ext.pricing.basePrice`)

### Behaviors
- Required fields marked with red asterisk (from config `required` + schema `extRequiredFields`)
- Tab error badges (red dot on tabs with validation errors)
- API field-level errors parsed from `error.details[]` and assigned to correct tab + field
- Audit fields stripped before save (`_id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`)
- On success: close drawer, refetch table data
- On error: show field errors inline, switch to first tab with errors

## Component: BulkEditDrawer

Generic version of Rewards Catalog's bulk edit pattern.

### Layout

```
+---------------------------------------------+
|  Bulk Edit (N selected)         X            |
+---------------------------------------------+
|  [Details] [General] [Custom Tab...]         |
+---------------------------------------------+
|                                              |
|  [ ] City          [____________] (mixed)    |
|  [ ] State         [____________]            |
|  [x] Status        [v Active    ]            |
|  [ ] Time Zone     [v Select... ] (mixed)    |
|                                              |
+---------------------------------------------+
|               [Cancel]  [Apply to N]         |
+---------------------------------------------+
```

### Behaviors
- Opt-in checkbox per field (only checked fields included in update payload)
- Mixed-value detection: JSON.stringify comparison across selected items; shows "(mixed)" indicator
- Fields with `disallowBulkUpdate` from dbSchema excluded
- Same tab structure as EntityFormDrawer (core + extension tabs)
- Confirmation dialog before applying: "Update N fields on M items?"
- API errors parsed and surfaced per-field with tab error badges

## Component: ExtFieldRenderer

Extracted from Rewards Catalog's `reward-ext-fields.tsx`, made generic.

Renders individual extension fields based on type:
- Enum -> Select dropdown (values from `schema.enumFields`)
- Boolean -> Toggle switch
- Number/Integer -> Number input
- Date -> Date input (ISO format)
- URL (detected by format or field name) -> Text input + preview button
- String (default) -> Text input

## Component: ExtTabBody

Renders all fields in an extension tab with grid layout.

- Columns count from `category.columns` (1, 2, or 3)
- Non-boolean fields arranged in grid rows
- Boolean fields displayed separately at bottom
- Uses ExtFieldRenderer for each field

## Dynamic Column Building

```ts
function buildColumns(config: ServerTableConfig, schema: EntitySchemaData): ColumnDef[] {
  // 1. Selection checkbox column
  // 2. Core columns from config.coreColumns
  //    - Enum columns render as badges, text columns as plain text, etc.
  // 3. Extension columns from schema.extFields where showInList === true
  //    - Sorted by displayOrder
  //    - Cell renderer chosen by ExtFieldDef.type
  // 4. Actions column (edit, delete) - sticky right
}
```

Extension columns are generated at runtime from the schema. Users can show/hide columns via DataTable's built-in column visibility dropdown.

## Server-Side Column Filtering

Column filters are translated to MongoDB query conditions:

| Column Type | Filter UI | MongoDB Query |
|-------------|-----------|---------------|
| Text | Text input | `{ field: { $regex: value, $options: "i" } }` |
| Enum | Multi-select dropdown | `{ field: { $in: selectedValues } }` |
| Date | Date range picker | `{ field: { $gte: start, $lte: end } }` |
| Number | Min/max inputs | `{ field: { $gte: min, $lte: max } }` |
| Boolean | Checkbox | `{ field: true/false }` |

All column filters are combined with the global search query into a single `$and` condition.

## Location Config Example

```ts
// src/features/reference-data/locations/config/location-config.ts
export const locationConfig: ServerTableConfig = {
  modelName: "Location",
  endpoint: "locations",
  pageTitle: "Locations",
  testIdPrefix: "locations",
  defaultSort: "name",
  populate: ["org", "createdBy", "updatedBy"],
  searchFields: ["name", "city", "state", "country", "number"],

  coreColumns: [
    { field: "name",     label: "Name",      type: "text", required: true, sticky: true },
    { field: "number",   label: "Number",    type: "text" },
    { field: "city",     label: "City",      type: "text" },
    { field: "state",    label: "State",     type: "text" },
    { field: "country",  label: "Country",   type: "text" },
    { field: "zipCode",  label: "Zip Code",  type: "text" },
    { field: "timeZone", label: "Time Zone", type: "enum", enumType: "timeZone" },
    { field: "status",   label: "Status",    type: "enum", enumType: "LocationStatusType" },
  ],

  coreFormFields: [
    { field: "name",     label: "Name",        type: "text",     required: true },
    { field: "number",   label: "Number",      type: "text" },
    { field: "desc",     label: "Description", type: "textarea" },
    { field: "city",     label: "City",        type: "text" },
    { field: "state",    label: "State",       type: "text" },
    { field: "country",  label: "Country",     type: "text" },
    { field: "zipCode",  label: "Zip Code",    type: "text" },
    { field: "timeZone", label: "Time Zone",   type: "enum", enumType: "timeZone" },
    { field: "status",   label: "Status",      type: "enum", enumType: "LocationStatusType" },
  ],
};
```

```tsx
// src/features/reference-data/locations/pages/locations-page.tsx
export default function LocationsPage() {
  const schema = useEntitySchema("Location");
  const table = useServerTable(locationConfig);
  const bulkOps = useBulkOperations(locationConfig);
  const columns = buildColumns(locationConfig, schema);

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

## Future Entity Customization

Per-entity pages can add custom behavior without modifying shared components:

```tsx
// Enums: add "Clear Cache" button
<ServerTablePage
  config={enumConfig}
  schema={schema}
  table={table}
  columns={columns}
  bulkOps={bulkOps}
  toolbarActions={<Button onClick={handleClearCache}>Clear Cache</Button>}
/>
```

## Shared Infrastructure Reuse

| Existing Component | How We Use It |
|-------------------|---------------|
| `DataTable` (shared) | Core table with manual pagination/sort/filter props |
| `useEntityList` (shared) | Internal to `useServerTable` for data fetching |
| `useCreateEntity`, `useUpdateEntity`, `useDeleteEntity` (shared) | CRUD in EntityFormDrawer |
| `useEnumOptions` (shared) | Enum value resolution for both config enumTypes and schema enumTypes |
| `useValidationSchema` (shared) | Internal to `useEntitySchema` for dbSchema/extSchema/extUISchema |
| `DeleteConfirmDialog` (shared) | Single and bulk delete confirmation |
| `UnsavedChangesDialog` (shared) | Form drawer unsaved changes guard |
| `apiClient` (shared) | HTTP client for bulk operations |

## Not In Scope

- Inline cell editing (all edits via drawer)
- CSV import/export
- Card/grid view mode (table only)
- Column drag-reorder or preference persistence (can be added later)
- GeoPoint map visualization for Locations
