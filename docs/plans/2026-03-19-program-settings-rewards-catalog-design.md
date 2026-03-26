# Design: Program Settings — Rewards Catalog Configuration

## Summary

Add a Program Settings page under Settings in the sidebar. First tab is "Rewards Catalog" with two configurable settings that control reward creation defaults and image display.

## Navigation

- New sidebar item: **"Program"** under Settings (icon: `Layers`)
- Route: `/settings/program`
- Tabbed page — first tab: **"Rewards Catalog"** (other tabs added later)

## Storage

Uses Pattern 2 — program-level `_meta` Rule via `useProgramMeta`:

```typescript
interface RewardsCatalogConfig {
  intendedUse: "Reward" | "Offer";  // default: "Reward"
  cardImageField: string;            // field name or "" for none
}
```

Subject: `"Rewards Catalog"`

## Settings UI

### Intended Use
- Select with two options: `Reward`, `Offer`
- Default: `Reward`
- Controls the `intendedUse` field set on new reward policies created in this program

### Card Image Field
- Select populated with:
  - **"None"** (value: `""`)
  - **`url`** — the core URL field on RewardPolicy (label: "URL")
  - **All ext fields** with `type: "url"` or `format: "url"` — discovered dynamically from RewardPolicy schema via `useRewardSchema()`
- Default: first available URL-type ext field, or `""` if none
- Controls which field is used for the image thumbnail in both the card grid and table view

### Save behavior
- React Hook Form + Zod
- Save button calls `useProgramMeta.save()`
- Toast on success

## Where settings take effect

1. **`intendedUse`** — `createDefaultRewardCatalogItem()` in `reward-defaults.ts` currently hardcodes `"Reward"`. The reward catalog page will read the config and pass the value down so new rewards use the configured value.

2. **`cardImageField`** — Two places currently hardcode image field names:
   - `rewards-card-grid.tsx`: `reward.ext.imageListPageUrlDesktopWide || reward.ext.imageListPageUrlDesktopNormal`
   - `reward-cell-renderers.tsx`: `row.ext?.imageListPageUrlDesktopNormal`

   Both will read from the config. If `cardImageField` is `"url"`, read from `reward.url`. If it's an ext field name, read from `reward.ext[fieldName]`. If `""`, show the Gift icon placeholder.

## Data flow

```
Program Settings page
  └─ useProgramMeta("Rewards Catalog") → read/write config
  └─ useRewardSchema() → discover URL-type ext fields for dropdown

Reward Catalog page
  └─ useProgramMeta("Rewards Catalog") → read config
  └─ passes intendedUse to createDefaultRewardCatalogItem()
  └─ passes cardImageField to card grid + cell renderers
```

## Out of Scope

- Other program settings tabs (future)
- Per-user overrides of these settings
- Validation that the selected image field has actual data
