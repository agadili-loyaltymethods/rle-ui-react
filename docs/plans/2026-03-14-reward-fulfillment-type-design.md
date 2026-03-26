# Design: Reward Fulfillment Type

## Summary

Add a "Fulfillment" tab to the reward form drawer with a fulfillment type selector and conditional fields for External Fulfillment configuration.

## Storage

Inline `ext._meta` on the RewardPolicy document (Pattern 1 — atomic save with the object):

- `ext._meta.fulfillmentType` — string enum: `Discount`, `Points`, `Tier Status`, `External Fulfillment`
- `ext._meta.fulfillmentPartner` — string (Partner ObjectId), conditional on External Fulfillment
- `ext._meta.fulfillmentDeliveryMethod` — string enum: `Event-Based`, `Batch`, conditional on External Fulfillment

## UI

- New "Fulfillment" core tab in the reward form drawer
- **Fulfillment Type**: single select (required), default: `Discount`
- **Conditional fields** (visible only when "External Fulfillment" is selected):
  - **Partner**: searchable select, loaded from Partners entity via `useEntityList`
  - **Delivery Method**: select with fixed options: `Event-Based`, `Batch`
- Saved atomically with the reward — no separate API call

## Data Flow

- Read: `reward.ext._meta.fulfillmentType`, `reward.ext._meta.fulfillmentPartner`, `reward.ext._meta.fulfillmentDeliveryMethod`
- Write: included in `ext._meta` in the save payload

## Out of Scope

- Fulfillment status/message tracking on individual reward instances
- Fulfillment lifecycle management (event triggers, batch processing, status logs)
- Bulk edit support for fulfillment fields
