---
name: metadata-storage
description: How to persist net new UI-specific metadata in rle-api using ext._meta extension fields. Use when working with ext._meta, ExtensionSchema, storing UI metadata on API objects, or creating _meta folder rules for program-level configuration.
allowed-tools: Read, Grep, Glob, Bash
---

# RCX UX Metadata Storage Patterns

rle-api's data model doesn't always capture associations or configuration that rcx-ui needs. Two patterns exist for persisting UI-specific metadata, both using the `ext._meta` extension field.

Choose the pattern based on **where the metadata belongs**:

| Pattern | When to Use | Atomicity |
|---------|------------|-----------|
| **Inline ext._meta** | Metadata pertains to a specific object (e.g., a TierPolicy's qualifying purse) | Atomic — saved with the object itself |
| **_meta Folder Rules** | Cross-cutting config, net-new associations, or data that spans multiple objects | Separate save — requires its own API call |

---

## Pattern 1: Inline `ext._meta` on Individual Objects

### When to Use
- The metadata **belongs to a single object** and describes a property of that object
- You want **atomic saves** — the metadata is persisted in the same PATCH/POST as the object itself
- Example: storing `qualifyingPurseName` on a TierPolicy (Tier Group)

### How It Works
- The `ext` field is available on any model that has `ExtPlugin` applied (most models)
- `ExtValidator` validates `ext` against a registered `ExtensionSchema` for that model+org
- Store rcx-ui metadata under `ext._meta` to namespace it away from other extension data

### Setup
1. Ensure an `ExtensionSchema` exists for the target model in the org:
   ```
   GET /api/extensionschemas?query={"model":"<ModelName>","org":"<orgId>"}
   ```
2. If not found, create one with a schema that permits `_meta` as a Mixed/object type

### Usage
```
// Read: metadata comes with the object itself
GET /api/<model>/<id>
→ response.ext._meta.qualifyingPurseName  // "Points"

// Write: metadata saved atomically with the object
PATCH /api/<model>/<id>
{ "ext": { "_meta": { "qualifyingPurseName": "Points" } } }
```

### Example: Tier Group Qualifying Currency
Store directly on the TierPolicy:
```json
{
  "name": "Gold Tier",
  "ext": {
    "_meta": {
      "qualifyingPurseName": "Points"
    }
  }
}
```
Saved/loaded atomically with the tier group — no separate API call needed.

### Key Points
- Prefer this pattern when metadata pertains to **one specific object**
- Saves are atomic — no coordination between multiple API calls
- The metadata travels with the object (no orphan risk if the object is deleted)
- Namespace all rcx-ui metadata under `ext._meta` to avoid conflicts

---

## Pattern 2: `_meta` Folder Rules (Program-Level Configuration)

### When to Use
- The metadata is **cross-cutting** — it spans multiple objects or describes program-level config
- The metadata is **net-new configuration** that doesn't naturally belong to any single existing object
- You need a dedicated store for arbitrary configuration (e.g., UI layout preferences, display mappings)

### How It Works
- Each piece of metadata is stored as a **Rule** named `_meta <Subject>` within the program
- Rule names are unique within a program
- The Rule's `ext._meta` extension field contains arbitrary JSON payload
- These rules do NOT participate in the program's transaction processing flow — purely a storage mechanism

### Naming Convention
- Rule naming: `_meta <Subject>` (e.g., `_meta Dashboard Config`, `_meta Display Mappings`)

### Extension Schema Requirement
- The `ext` field on Rules is added by `ExtPlugin` (as `Schema.Types.Mixed`)
- `ExtValidator` validates `ext` against a registered `ExtensionSchema` for the Rule model in the org
- Before first write, ensure an `ExtensionSchema` record exists:
  ```
  GET /api/extensionschemas?query={"model":"Rule","org":"<orgId>"}
  ```
- If not found, create one with a permissive schema allowing `_meta` as an object

### API Access
```
// Find or create the metadata rule
GET  /api/rules?query={"program":"<id>","name":"_meta <Subject>"}

// Read
rule.ext._meta → JSON payload

// Write (update existing)
PATCH /api/rules/<ruleId> { "ext": { "_meta": <payload> } }

// Write (create new)
POST /api/rules {
  name: "_meta <Subject>",
  program: "<programId>",
  effectiveFrom: "2000-01-01",
  ext: { "_meta": <payload> }
}
```

### Example: Program-Level Display Config
```json
{
  "name": "_meta Dashboard Config",
  "program": "<programId>",
  "ext": {
    "_meta": {
      "defaultView": "card",
      "pinnedMetrics": ["totalMembers", "activeMembers"]
    }
  }
}
```

### Key Points
- Rule names are unique per program — no folder needed
- Multiple `_meta *` rules per program, each for a different metadata subject
- `ext._meta` is the standard extension field path for all metadata
- These rules are hidden from the normal program flow UI
- This is a convention — rle-api treats these as normal rules
- Implemented via `useProgramMeta` hook in `src/features/programs/hooks/use-program-meta.ts`

---

## Decision Guide

**Ask: "Does this metadata describe a single existing object?"**

- **Yes** → Use **Pattern 1** (inline `ext._meta` on the object). Examples:
  - A TierPolicy's qualifying purse name
  - A PursePolicy's display color
  - A Segment's UI sort order

- **No** → Use **Pattern 2** (`_meta` folder rule). Examples:
  - Program-wide dashboard configuration
  - Cross-object display mappings
  - Net-new configuration categories with no natural home object
