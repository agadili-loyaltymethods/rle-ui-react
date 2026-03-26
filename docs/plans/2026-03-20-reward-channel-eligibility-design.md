# Reward Channel Eligibility — Design

## Problem

Rewards currently have no way to restrict which channels they can be obtained through (e.g., mobile-only rewards). We need a channel eligibility field on rewards.

## Storage

Store `eligibleChannels: string[]` under `ext._meta` on the RewardPolicy document, following the existing `_meta` metadata pattern. An empty array means "all channels" (no restriction).

## UI

### Form Drawer — Eligibility Tab

- **Field**: Multi-select labeled "Channels"
- **Description**: "Restrict which channels this reward can be obtained through. Leave empty for all channels."
- **Options**: Loaded via `useEnumOptions("Channel")`
- **Placement**: On the Eligibility tab, alongside segments and tier levels

### Table — New Column

- **Column**: "Channels" in the server table column config
- **Display**: Comma-separated channel labels when set, "All" when empty/unset
- **Sortable**: No (array field)

### Cards — Channel Badges

- **Display**: Individual channel badges on the reward card
- **Empty state**: "All" badge or no badge (channels unrestricted)

## Data Flow

1. Form reads `ext._meta.eligibleChannels` from the reward policy on load
2. User selects channels via multi-select on the Eligibility tab
3. On save, writes back to `ext._meta.eligibleChannels`
4. Table and card views read from the same `ext._meta.eligibleChannels` field
