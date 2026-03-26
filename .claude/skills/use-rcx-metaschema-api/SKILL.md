---
name: use-rcx-metaschema-api
description: How to discover model schemas, field definitions, extension fields, and enum values at runtime from rle-api. Use when building dynamic forms, validating field names and types, understanding model structure, or working with extension schemas.
allowed-tools: Read, Grep, Glob, Bash
---

# RCX Metaschema API — Runtime Schema Discovery

rle-api exposes runtime schema information via dedicated endpoints. These return the live, accurate truth about what models exist, what fields they have, what extension fields are configured, and what enum values are valid — all specific to the current org.

All endpoints require `Authorization: Bearer <token>` and `x-org: <orgName>` headers (same as any other API call).

---

## Endpoints

### 1. `GET /api/schema/validation` — Full Model Schemas

The primary endpoint for runtime schema introspection. Returns every model's field definitions in one payload (~243KB).

**Response shape:**
```json
{
  "<ModelName>": {
    "dbSchema": { ... },
    "extSchema": { ... },
    "extUISchema": { ... }
  },
  ...
}
```

**Sections:**

| Section | What it contains |
|---------|-----------------|
| `dbSchema` | Mongoose field definitions — type, ref, required, enum values |
| `extSchema` | Org-specific custom extension fields (JSON Schema draft-04) |
| `extUISchema` | UI metadata for extension fields — title, category, display order, searchable, sortable, acceptData |

**Example — `dbSchema` for a field:**
```json
{
  "member": { "type": "objectid", "ref": "Member", "required": true },
  "name": { "type": "string", "required": true },
  "status": { "type": "string", "required": true },
  "ext": { "type": "mixed" }
}
```

**Example — `extSchema` (JSON Schema draft-04):**
```json
{
  "$schema": "http://json-schema.org/draft-04/schema",
  "type": "object",
  "properties": {
    "siteId": { "type": "string" },
    "customDate": { "type": "string", "format": "date-time" }
  }
}
```

**Example — `extUISchema` entry:**
```json
{
  "siteId": {
    "acceptData": true,
    "showInList": true,
    "searchable": true,
    "sortable": true,
    "ignoreImport": false,
    "displayOrder": "1",
    "type": "string",
    "title": "Site ID",
    "category": "General"
  }
}
```

**Models included (60):**
AccrualItem, Activity, ActivityHistory, AggregatePolicy, Badge, CustomData, CustomExpression, DMA, DailyAggregate, Division, Enum, ExtensionDef, ExtensionSchema, Flow, Goal, GoalPolicy, HalfYearlyAggregate, LifetimeAggregate, Limit, LineItem, Location, LocationOverride, LoyaltyCard, LoyaltyID, Member, MemberPreference, MemberSegment, MergeHistory, MonthlyAggregate, NamedList, Offer, OfferUsageHistory, Org, Partner, Product, Program, PromoCode, PromoCodeDef, Purse, PurseHistory, PursePolicy, QuarterlyAggregate, RedemptionItem, Referral, Reward, RewardPolicy, RewardUsageHistory, Rule, RuleFolder, Segment, Streak, StreakHistory, StreakPolicy, TenderItem, Tier, TierHistory, TierPolicy, User, WeeklyAggregate, YearlyAggregate

---

### 2. `GET /api/schema/extensionschema` — Extension Fields Only

Returns custom `ext` field definitions per model, joined with `ExtensionDef` for display metadata. Lighter than `schema/validation` when you only need extension info.

**Response shape:**
```json
{
  "<ModelName>": {
    "extSchema": { ... },
    "extUISchema": { ... }
  },
  ...
}
```

Models with extensions depend on org configuration. Typical models: Account, Activity, Enum, LineItem, Location, Member, PursePolicy, Reward, RewardPolicy, Rule.

**Queryable:** `?query={"display":true}` to filter to models with display enabled.

---

### 3. `GET /api/schema/tree/:programId` — Expression Tree

Returns a hierarchical CustomExpression tree for rule/flow building within a specific program.

**Response shape:** Array of 3 top-level groups:
```json
[
  { "name": "Custom", "type": "array", "children": [ ... ] },
  { "name": "Functions", "type": "array", "children": [
    { "name": "Array", "type": "array", "children": [ ... ] },
    { "name": "Date", "type": "array", "children": [ ... ] },
    { "name": "Math", "type": "array", "children": [ ... ] },
    { "name": "String", "type": "array", "children": [ ... ] },
    { "name": "UDF", "type": "array", "children": [ ... ] }
  ]},
  { "name": "Schema", "type": "array", "children": [
    { "name": "Activity", "type": "array", "children": [ ... ] },
    { "name": "Member", "type": "array", "children": [ ... ] },
    ...
  ]}
]
```

Used for building rule condition/action editors — the Custom group contains program-specific expressions, Functions contains built-in functions, Schema contains data model fields.

---

### 4. `GET /api/schema/metaschema` — JSON Schema Validator

Returns the JSON Schema draft-04 definition used to validate extension schemas. Used by `ExtValidator` to ensure `extSchema` documents are well-formed.

---

## Enum System

The Enum model stores all valid dropdown/select option values. **4,600+ entries** across **~90 distinct types**, duplicated per language (en + ja).

### Fetching enum values
```
GET /api/enums?query={"type":"<EnumTypeName>"}&select=value,label
```

### Listing all enum types
```
GET /api/enums?query={"type":"EnumType"}&select=value,label&limit=200
```

### Key enum types used in rcx-ui

| EnumType | Used for |
|----------|----------|
| `SnapTo` | Expiration/escrow snap-to dates (now, day, week start, month end, etc.) |
| `ExpiryUnit` | Expiry duration units (Days, Hours, Months, Years) |
| `EscrowUnit` | Escrow duration units (Days) |
| `PurseGroup` | Purse category groupings |
| `ActivityType` | Transaction types (Accrual, Redemption, Cancellation, etc.) |
| `MemberStatusType` | Member lifecycle states (Pending, Active, Inactive, etc.) |
| `MemberType` | Individual vs Group |
| `ChannelType` | Source channels (Web, POS, Staff, Mobile, etc.) |
| `timeZone` | Timezone values |
| `Gender` | Gender options |
| `Language` | Supported languages (en, ja) |
| `StreakRuleType` | Streak rule categories |
| `GoalSnapTo` | Goal snap-to options |
| `ExpirationType` | How expiration is calculated |
| `FrequencyType` | Scheduling frequency |

### rcx-ui integration
Enum values are consumed via `useEnumOptions("EnumType")` hook — see `src/features/programs/hooks/use-enum-options.ts`. This already handles fetching, caching (via TanStack Query), and title-casing labels.

---

## ExtensionSchema CRUD

Individual `ExtensionSchema` documents can also be queried/modified directly via the standard REST endpoint:

```
GET    /api/extensionschemas?query={"model":"<ModelName>","org":"<orgId>"}
POST   /api/extensionschemas  { model, org, extSchema, uiDef, categories }
PATCH  /api/extensionschemas/<id>  { extSchema, uiDef }
```

**ExtensionSchema fields:**
- `model` — Model name (e.g., "Member", "PursePolicy")
- `org` — Organization ObjectId
- `extSchema` — JSON string of custom field definitions (JSON Schema draft-04)
- `uiDef` — UI definition JSON string
- `categories` — Array of `{ name: string, columns: number }` for UI grouping
- Indexed uniquely on `{ org, model }`

---

## Implementation Notes

### Source files (rle-api, READ-ONLY reference)
- Route definitions: `/home/rcxdev/rle-api/lib/app/routes/schema.js`
- Controller logic: `/home/rcxdev/rle-api/lib/app/controllers/schema.js`
- Schema parser: `parseSchema()` in the controller — recursively walks Mongoose schema trees, extracts types/refs/enums, filters internal fields
- Validation: `/home/rcxdev/rle-api/lib/utils/validation-utils.js`
- Meta-schema: `/home/rcxdev/rle-api/lib/model-funcs/data/meta-schema.json`

### Caching
- rle-api caches ExtensionSchema docs with 30-min TTL (see `/home/rcxdev/rle-api/lib/utils/cache-utils.js`)
- In rcx-ui, `schema/validation` is large (~243KB) — cache aggressively with TanStack Query (`staleTime: Infinity` or similar, refresh on demand)

### Extension fields are org-specific
Different orgs can have completely different extension fields on the same model. Always fetch with the correct `x-org` header. The `extSchema` and `extUISchema` sections in `schema/validation` already reflect the current org's configuration.

### No Swagger/OpenAPI
rle-api does not generate Swagger or OpenAPI docs. These 4 schema endpoints are the only runtime introspection mechanism.
