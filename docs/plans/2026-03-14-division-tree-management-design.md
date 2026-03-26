# Division Tree Management — Design

**Date:** 2026-03-14
**Branch:** feature-division-tree
**Status:** Approved

## Overview

A split-view page at `/settings/divisions` for managing the division hierarchy as a parent/child tree with inline editing and drag-and-drop reparenting. Each division has CRUD permissions (read/update/create/delete) as boolean toggles.

## Decisions

- **Split-view layout:** tree panel (left ~40%) + detail/edit panel (right ~60%)
- **Inline editing** in the right panel (no drawers or modals for create/edit)
- **Parent assignment:** dropdown select in detail panel + drag-and-drop in tree
- **Permissions:** four boolean toggles matching the API model directly (no client-side inheritance)
- **No bulk operations** for v1 — single-node operations only
- **No _meta metadata** for v1 — can be layered in later
- **Native HTML5 drag-and-drop** — no library needed for the expected tree size (<100 nodes)

## Page Layout

```
┌─────────────────────────┬──────────────────────────────┐
│  Division Tree (left)   │  Detail Panel (right)        │
│                         │                              │
│  [+ New Division]       │  Division Name               │
│  [Search...]            │  ─────────────────           │
│                         │  Name:        [________]     │
│  ▼ Root Division A      │  Description: [________]     │
│    ├─ Child B           │  Parent:      [dropdown___]  │
│    │  └─ Grandchild D   │  Active:      [toggle]       │
│    └─ Child C           │                              │
│  ▼ Root Division E      │  Permissions                 │
│    └─ Child F           │  ─────────────────           │
│                         │  Read:   [✓]  Update: [✗]    │
│                         │  Create: [✗]  Delete: [✗]    │
│                         │                              │
│                         │  [Save]  [Delete]            │
└─────────────────────────┴──────────────────────────────┘
```

### Left Panel — Division Tree
- "New Division" button at top
- Search input to filter nodes by name (shows matching nodes + ancestors)
- Collapsible tree with chevrons, indent per depth level
- Selected node highlighted
- Drag-and-drop: grab a node to reparent onto another node or to root
- Drop target visual feedback (border/background highlight)
- Client-side cycle detection on drag-over (reject invalid drops)

### Right Panel — Detail/Edit Form
- Empty state: "Select a division or create a new one"
- Create mode: blank form when "New Division" clicked
- Edit mode: form populated from selected division
- React Hook Form + Zod for all form state
- Save and Delete buttons at bottom

## Data Flow

### Fetching
- Single `useEntityList<Division>("divisions", { limit: 0, sort: "name", populate: "parent" })` to load all divisions
- Client-side tree construction from flat array using `parent` field

### Tree State (local component state)
- `selectedDivisionId: string | null`
- `expandedNodes: Set<string>`
- `searchQuery: string`

### Form State (React Hook Form)
- Zod schema: name (required, max 250), description (optional), isActive (boolean), parent (optional string), permissions (4 booleans)
- `formState.isDirty` drives save button and unsaved changes guard
- Form resets when selection changes

### CRUD
- **Create:** `useCreateEntity("divisions")` → POST, invalidate list, auto-select new node
- **Update:** `useUpdateEntity("divisions")` → PATCH, invalidate list
- **Delete:** `useDeleteEntity("divisions")` → DELETE with `DeleteConfirmDialog`, invalidate list, clear selection
- **Reparent (DnD):** PATCH with `{ parent: targetId | null }`, toast on success/error

### Unsaved Changes
- Switching selection with dirty form → `UnsavedChangesDialog`
- Discard → reset form, switch; Cancel → stay on current node

## Tree Construction

Utility `buildDivisionTree(divisions)` converts flat array to nested `TreeNode[]`:
```typescript
interface TreeNode {
  division: Division
  children: TreeNode[]
}
```
- Root nodes: `parent` is null/undefined
- Children sorted alphabetically at each level
- Search filter shows matching nodes + ancestors

## Error Handling

| Error | Handling |
|-------|----------|
| Circular dependency (2160) | Toast: "Cannot create circular parent relationship" |
| Deactivation constraint (2152) | Toast explaining referencing entities |
| Division not found (2158) | Remove from tree, clear selection |
| Delete with children | Warning: "Delete children first or reassign them" |
| All others | Generic API error toast |

### Parent Dropdown Filtering
- Excludes the current division (can't be own parent)
- Excludes all descendants (prevents cycles client-side)

### Empty States
- No divisions: "No divisions yet. Create your first division to get started."
- No search results: "No divisions match your search."

## File Structure

```
src/features/settings/divisions/
  pages/
    divisions-page.tsx          # Main split-view page (replace stub)
  components/
    division-tree.tsx           # Left panel: tree with DnD
    division-tree-node.tsx      # Individual tree node (recursive)
    division-detail-panel.tsx   # Right panel: form + actions
  hooks/
    use-division-tree.ts        # Tree construction, expand/collapse, search, DnD logic
  lib/
    division-tree-utils.ts      # buildDivisionTree(), findDescendants(), cycle detection
```

### Existing Code Reused
- **Types:** `Division`, `DivisionPermissions` from `src/shared/types/settings.ts`
- **CRUD hooks:** `useEntityList`, `useCreateEntity`, `useUpdateEntity`, `useDeleteEntity`
- **Dialogs:** `UnsavedChangesDialog`, `DeleteConfirmDialog`
- **UI primitives:** Button, Input, Select, Switch, Badge
- **Route:** `/settings/divisions` already wired in router
- **Sidebar:** Division menu item already present

## Division Model Reference (rle-api)

```
name: String (required, max 250, disallowBulkUpdate)
description: String
isActive: Boolean (default: false)
org: ObjectId → Org (required)
parent: ObjectId → Division (optional, self-ref)
permissions: { read: true, update: false, create: false, delete: false }
```

Server enforces: circular dependency validation, deactivation constraints, ACL, org-scoping.
