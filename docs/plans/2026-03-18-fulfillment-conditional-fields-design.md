# Design: Fulfillment Type Conditional Fields

## Summary

Expand the Fulfillment tab with conditional fields for Points and Tier Status fulfillment types. Rename all fulfillment `ext._meta` fields to use `ffmnt` prefix.

## Storage

All fields stored inline on `ext._meta` of the RewardPolicy (Pattern 1 — atomic save).

### Field Rename (existing)

- `fulfillmentType` → `ffmntType`
- `fulfillmentPartner` → `ffmntPartner`
- `fulfillmentDeliveryMethod` → `ffmntDeliveryMethod`

### New Fields

**Points (visible when ffmntType === "Points"):**
- `ffmntCurrency` — string (purse policy ID), required. Searchable select from non-qualifying purse policies.
- `ffmntPoints` — integer, required. Number of points to award.
- `ffmntExpirationType` — string: `None` | `Custom` | `Activity-Based`. Auto-populated from purse policy on first currency selection.
- `ffmntExpiryValue` — number. Visible when expirationType is `Custom`.
- `ffmntExpiryUnit` — string: `Days` | `Hours` | `Months` | `Years`. Visible when expirationType is `Custom`.
- `ffmntExpirationSnapTo` — string (SnapTo enum). Visible when expirationType is `Custom`.
- `ffmntInactiveDays` — number. Visible when expirationType is `Activity-Based`.
- `ffmntEscrowValue` — number. Auto-populated from purse policy on first currency selection.
- `ffmntEscrowUnit` — string: `None` | `Days` | `Hours` | `Months` | `Years`. Auto-populated from purse policy.
- `ffmntEscrowSnapTo` — string (SnapTo enum). Auto-populated from purse policy.
- No warning days — only at purse policy level.

**Tier Status (visible when ffmntType === "Tier Status"):**
- `ffmntTierPolicy` — string (tier policy ID), required.
- `ffmntTierLevel` — string (level name), required. Populated from levels of selected tier policy.
- `ffmntTierDurationValue` — number, required.
- `ffmntTierDurationUnit` — string: `Days` | `Months` | `Years`. Required.

## UX Layout (Fulfillment tab)

1. Fulfillment Type selector (always visible)
2. Conditional section based on type:
   - **Discount**: no additional fields
   - **Points**: Currency → Points → Expiration section → Escrow section
   - **Tier Status**: Tier Policy → Tier Level → Duration (value + unit)
   - **External Fulfillment**: Partner → Delivery Method (already implemented)

## Auto-populate Behavior (Points)

When a currency (purse policy) is selected for the first time, auto-populate expiration and escrow fields from the purse policy's defaults. Subsequent edits by the user are preserved.

## Data Sources

- Non-qualifying purse policies: `useEntityList("pursepolicies", { query: { group: { $exists: false } }, select: "name,expirationType,expiryValue,expiryUnit,expirationSnapTo,inactiveDays,escrowValue,escrowUnit,escrowSnapTo" })`
- Tier policies: `useTierPolicyOptions()` (already exists)
- SnapTo enum: `useEnumOptions("SnapTo")` or hardcoded
- Partners: `useEntityList("partners", ...)` (already implemented)

## Out of Scope

- Warning days (only at purse policy level)
- Bulk edit support for fulfillment fields
