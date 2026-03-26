# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

rcx-ui is a React 19 frontend for the ReactorCX loyalty platform, replacing a legacy AngularJS app (rle-ui). The backend (rle-api) is a Node/Express/MongoDB API using express-restify-mongoose for auto-generated CRUD endpoints. Both rle-api and rle-ui live in sibling directories and are READ-ONLY references.

- Migration spec: `docs/MIGRATION_SPEC.md`
- Design tokens: `docs/design2.json`
- Backend reference: `/home/rcxdev/rle-api` (READ-ONLY)
- Legacy frontend reference: `/home/rcxdev/rle-ui` (READ-ONLY)
- Mongoose model definitions: `/home/rcxdev/rle-api/node_modules/@lm-org/model-defs/` (~91 models, 80 in scope)
- Generated types: `src/shared/types/` (9 files, re-exported from `index.ts`)

## Development Environment

This project runs via Docker Compose. The dev compose file mounts source code for Vite HMR.

- **Start**: `docker compose -f docker-compose.dev.yml up -d`
- **App (rcx-ui)**: `http://localhost:4000`
- **Backend (rle-api)**: `http://localhost:3000`
- **Vite proxy**: `/api` requests are proxied to `http://localhost:3000`
- No need to manually start the dev server, backend, or database

## Commands

```bash
npm run build        # Type-check (tsc -b) then build with Vite
npm run lint         # ESLint on src/
npm run format       # Prettier on src/
npm test             # Vitest run (single pass)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright e2e tests (chromium, starts dev server automatically)
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Tech Stack

React 19, Vite 6, TypeScript 5 (strict, noUncheckedIndexedAccess), Tailwind CSS 4 (@tailwindcss/vite plugin, `@theme` blocks in CSS).

- **State**: TanStack Query (server state) + Zustand (client state)
- **Tables**: TanStack Table + TanStack Virtual
- **Forms**: React Hook Form + Zod
- **UI primitives**: Radix UI, class-variance-authority (CVA), Lucide icons, cmdk, sonner (toasts)
- **Routing**: React Router 7, all routes lazy-loaded
- **i18n**: react-i18next, namespace-based lazy loading, languages: `en` + `ja`

## CSS & Styling Standards

**Always invoke `/ui-standards` before creating a new UI component or modifying styles on an existing one.** That skill contains the full rules (color tokens, sizing tokens, typography, inline style exceptions, border radius, CVA, Tailwind 4 gotchas).

**Pointer cursor rule**: Every clickable element (buttons, links, toggles, clickable rows, tabs, etc.) must show `cursor: pointer` on hover. Use `cursor-pointer` in Tailwind. Never leave an interactive element with the default arrow cursor.

**Exception — login page** (`src/features/auth/pages/login-page.tsx`): This is a unique marketing/brand surface and is exempt from the standard CSS rules. Raw Tailwind classes, arbitrary values, and one-off spacing are acceptable here.

## Architecture

### Path Alias

`@/` maps to `src/` (configured in both `tsconfig.app.json` and `vite.config.ts`).

### Source Layout

```
src/
  app/            # App shell: root component, providers, router, layout
  features/       # Feature modules (vertical slices)
    {feature}/
      pages/      # Route-level page components (default exports for lazy loading)
      components/ # Feature-specific components
      hooks/      # Feature-specific data hooks
      config/     # EntityEditPage config objects
  shared/
    components/   # Shared components: data-table/, entity-edit-page, form-modal,
                  #   unsaved-changes-dialog, delete-confirm-dialog, no-program-banner,
                  #   page-header, search-bar, breadcrumb-context, field-renderer
    hooks/        # Generic API hooks (useEntityList, useEntity, useCreateEntity, etc.)
    lib/          # Utilities: api-client (axios), cn(), i18n setup, query-client, format-utils
    stores/       # Zustand stores: auth-store, ui-store
    types/        # TypeScript types organized by domain (9 files, re-exported from index.ts)
    ui/           # Base UI primitives: Button, Input, Badge, Card, Skeleton, Select
```

Always put png images you are generating as screenshots for development/debugging into the screenshots folder.

### Shared Dialog Components

Three reusable dialog components live in `src/shared/components/`:
- **`UnsavedChangesDialog`** — standard "you have unsaved changes" prompt. Props: `open`, `onCancel`, `onDiscard`, optional `description`.
- **`DeleteConfirmDialog`** — confirms entity deletion. Props: `open`, `onClose`, `onConfirm`, optional `title`, `description`, `itemName`, `isPending`, `confirmLabel`.
- **`NoProgramBanner`** — empty state when no program is selected. Props: `context` (string, used in the message), `data-testid`.

Never create inline one-off versions of these dialogs. Import from `@/shared/components/`.

### Entity Edit Pattern

`EntityEditPage` in `src/shared/components/entity-edit-page.tsx` provides a fully-featured edit page with tabs, unsaved changes guards, lock banners, breadcrumb registration, and validation error surfacing. Feature pages configure it via an `EntityEditConfig` object (see `src/features/programs/config/`).

Custom edit pages (e.g. `activity-template-edit-page.tsx`) replicate the same patterns manually when the data model is too complex for the config-driven approach.

### API Pattern

The backend uses express-restify-mongoose. All API endpoints follow this pattern:

- **Base URL**: `/api/`
- **Endpoints**: Lowercase pluralized Mongoose model names (e.g., `members`, `programs`, `segments`)
- **Query format**: `?query=<JSON>&sort=<field>&skip=<N>&limit=<N>&select=<fields>&populate=<refs>`
- **Count**: `GET /api/{model}/count?query=<JSON>` returns `{ count: N }`. Use this dedicated endpoint instead of the `x-total-count` header (not exposed via CORS).
- **Auth headers**: `Authorization: Bearer <token>`, `x-org`, `x-division` (set by api-client interceptor)

Generic CRUD hooks in `src/shared/hooks/use-api.ts` (`useEntityList`, `useEntity`, `useCreateEntity`, `useUpdateEntity`, `useDeleteEntity`) wrap TanStack Query and handle this pattern. Feature hooks in `src/features/*/hooks/` call these generics with the correct endpoint name.

### State Management

- **Auth**: `useAuthStore` (Zustand) — JWT token + user in sessionStorage, keys prefixed `rcx.auth.*`
- **UI**: `useUIStore` (Zustand) — sidebar, theme, current org/program in localStorage, keys prefixed `rcx.ui.*`
- **Server data**: TanStack Query with query keys following `[endpoint, "list"|"detail", params]` convention

### i18n

Translation files live in `public/locales/{en,ja}/{namespace}.json`. Namespaces: `common`, `members`, `programs`, `reference-data`, `analytics`, `settings`. Default namespace is `common`. Language preference stored in localStorage under `rcx.language`.

### Routing

All routes are lazy-loaded in `src/app/router.tsx`. Page components must use default exports. The `AppLayout` wrapper in `layout.tsx` handles auth gating (redirects to `/login` if not authenticated) and renders the sidebar + header chrome.

### Testing

- **Unit/component tests**: Vitest + jsdom + @testing-library/react. Setup file: `src/test-setup.ts`
- **E2E tests**: Playwright in `e2e/` directory, chromium only, base URL `http://localhost:3000`

### Login

Login uses org/username format (e.g., `gap/esarkissian`), not email-based. No org selector in the UI.

### ACL / Permissions

Every page that performs CRUD operations **must** gate UI elements behind the `usePermissions(endpoint)` hook from `@/shared/hooks/use-permissions`. Returns `{ canRead, canCreate, canUpdate, canDelete, isLoading }`.

**How it works:** All permissions are fetched in a single `GET /api/acl/permissions` call immediately after login (and on page refresh if already authenticated). The response contains PascalCase model names (e.g. `PursePolicy`) mapped to `{ create, read, update, delete }` booleans. These are stored in an in-memory singleton Map keyed by lowercase plural endpoint names (e.g. `pursepolicies`). The cache is cleared on logout. Fail-closed: if the fetch fails, all endpoints are denied.

**Required gates for every view:**

| Permission | What to gate |
|---|---|
| `canCreate` | Add/Create buttons, empty-state "Add" actions |
| `canRead` | If false, show a "no access" message instead of the data view |
| `canUpdate` | Edit (pencil) icons, row click-to-edit, Save button, bulk edit, `onEdit` handlers |
| `canDelete` | Delete (trash) icons, bulk delete, `onDelete` handlers |
| `canUpdate \|\| canDelete` | Row selection checkboxes (`selectable` prop), `BulkActionBar` rendering |

**Pattern for `ServerTablePage`** (covers all reference-data pages):
```tsx
const permissions = usePermissions(config.endpoint);
// Add button: permissions.canCreate
// onEdit/onRowClick: permissions.canUpdate ? handler : undefined
// onDelete: permissions.canDelete ? handler : undefined
// selectable: permissions.canUpdate || permissions.canDelete
// BulkActionBar: only render when canUpdate || canDelete
// emptyAction (Add button): permissions.canCreate
```

**Pattern for `EntityEditPage`**:
```tsx
const permissions = usePermissions(config.endpoint);
// Save/Create button: (isCreate && permissions.canCreate) || (!isCreate && permissions.canUpdate)
```

**Testing:** Mock `usePermissions` in component tests that render pages using it. Use the shared helper from `test-utils/mocks.ts`:
```tsx
import { mockFullPermissions } from "@/test-utils";
vi.mock("@/shared/hooks/use-permissions", mockFullPermissions);
```
Or inline (must include `isLoading: false`):
```tsx
vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canDelete: true, isLoading: false }),
}));
```

## UI/UX Conventions

See `.claude/skills/ux-conventions/SKILL.md` for the full conventions reference covering: save buttons, field editability, unsaved changes guards, empty states, form validation across tabs, breadcrumbs, select/dropdown styling, number formatting, refresh buttons, and more.

## Testability Standards (Mandatory)

**Every interactive element (`<button>`, `<input>`, `<select>`, `<textarea>`, `<form>`, `<a>`) MUST have `data-testid` + at least one other stable attribute (`aria-label`, `id`, `name`) at the time of implementation — not as a post-hoc fix.**

Invoke `/check-testability` for the full rules. The key requirements:
1. `data-testid` + second stable attribute on every interactive element
2. Business-oriented naming: `{prefix}-{action/element}` (e.g. `purse-add`, `tier-tab-general`)
3. No index-based or fragile selectors — use business IDs for repeated elements
4. Dynamic `data-testid` for list items: `` data-testid={`${prefix}-row-${item._id}`} ``
5. Icon-only buttons need `aria-label` AND `title`
6. No duplicate `data-testid` values across the codebase

**After completing any component, verify with:** `node scripts/check-testability.mjs --dir src/features/{feature}`

A component is NOT done until the script reports 0 issues for changed files.

## Anti-Patterns to Avoid

- **Using manual `useState` for form state** — ALL forms MUST use React Hook Form + Zod. No exceptions. Use `useForm` with `zodResolver`, `Controller`/`watch`/`setValue` for field binding, and `formState.isDirty` for dirty tracking. Build Zod schemas dynamically from API schema data when fields are dynamic. The shared `buildExtZodSchema()` handles extension fields; `buildEntityFormZodSchema()` handles full entity forms. Never use manual validation loops, `JSON.stringify` dirty comparisons, or `useState` for form values/errors.
- Duplicating `UnsavedChangesDialog`, `DeleteConfirmDialog`, `NoProgramBanner`, or `ConfirmDialog` inline
- Using `crypto.randomUUID()` — use `generateObjectId()` from `@/shared/lib/format-utils`
- Hardcoding enum options — load from API via `useEnumOptions()`
- **Rendering CRUD actions without permission checks** — Every Add, Edit, Delete button and row action MUST be gated behind `usePermissions(endpoint)`. Never unconditionally render edit/delete icons or create buttons. See the ACL / Permissions section above.

## Skills

Project-specific skills live in `.claude/skills/` and are auto-invoked when relevant:

- **`/ui-standards`** — CSS and styling standards for rcx-ui — color tokens, sizing tokens, typography utilities, inline style exceptions, border radius, CVA variants, class merging with `cn()`, and Tailwind 4 gotchas. Use when creating a new UI component or modifying styles on an existing one.
- **`/ux-conventions`** — UI/UX patterns: save buttons, field editability, enum selects, unsaved changes guards, form transforms, list views, tables, modals, empty states, number formatting
- **`/metadata-storage`** — How to persist UI-specific metadata in rle-api using `ext._meta` (inline on objects or via `_meta` folder rules)
- **`/use-rcx-metaschema-api`** — Runtime schema discovery: model field definitions, extension schemas, enum values, and expression trees from rle-api's schema endpoints
- **`/check-testability`** — Testability standards enforced during implementation. Every interactive element needs `data-testid` + second stable attribute, business-oriented naming, no fragile selectors. Run `node scripts/check-testability.mjs` to verify. **Must be applied while writing code, not after.**
