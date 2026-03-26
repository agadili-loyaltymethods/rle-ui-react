# Design: Assign Divisions to Rewards

## Summary

Add a searchable multi-select for divisions on the Details tab of the reward form drawer in the rewards catalog.

## Context

The `divisions` field already exists on the `RewardPolicy` backend model (`string[]` of Division ObjectIds) and in the frontend type (`reward-policy.ts`). It's initialized as `[]` in `reward-defaults.ts`. The field just needs to be wired into the UI form.

## Implementation

- Fetch divisions via `useEntityList<Division>("divisions", { select: "name", sort: "name", limit: 0 })` — same pattern as purse policies and activity templates
- Add a searchable multi-select field to the Details tab in `reward-form-drawer.tsx`
- Add `divisions` to the Zod schema in `reward-form-helpers.ts` (array of strings, optional)
- Map division IDs ↔ display labels using the fetched division list
- Placement: Details tab, after existing fields (name, description, dates)

## Out of Scope

- Bulk edit support for divisions (backend has `disallowBulkUpdate: true`)
