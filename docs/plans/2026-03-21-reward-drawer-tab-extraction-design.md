# Reward Form Drawer — Tab Extraction Refactor

## Problem

`reward-form-drawer.tsx` is 2,079 lines. Every `watch()` call (14 total) re-renders the entire component on any field change. The bulk edit drawer (`bulk-edit-drawer.tsx`, 1,594 lines) has the same problem. Both are hard to navigate and maintain.

## Design

### Architecture

Wrap the form in RHF's `<FormProvider>`. Extract each tab's JSX into a standalone component file that calls `useFormContext()` to access form methods. The parent drawer shrinks to ~300 lines: shell, tab bar, footer, submit handler, and reset effects.

### File Structure

```
src/features/reward-catalog/components/
  reward-form-drawer.tsx          # Shell: FormProvider, tab bar, footer, submit, effects (~300 lines)
  tabs/
    details-tab.tsx               # Name, desc, cost, divisions, dates, metadata
    fulfillment-tab.tsx           # Fulfillment type, partner, currency, tier, redemption, advanced
    limits-tab.tsx                # Inventory (w/ unlimited toggle), rate limits, usage, preview toggle
    eligibility-tab.tsx           # Channels, segments, tier levels, availability schedule
    ext-tab-body.tsx              # Moved from reward-ext-fields.tsx (already extracted)
```

### State Ownership

| State | Owner | How tabs access it |
|-------|-------|--------------------|
| Form values (all fields) | Parent (useForm) | `useFormContext()` in each tab |
| `unlimitedInventory` | LimitsTab (local useState) | — |
| `allTimesOverride` | EligibilityTab (local useState) | — |
| `ffmntAdvancedOpen` | FulfillmentTab (local useState) | — |
| `prevCurrencyRef` | FulfillmentTab (local useRef) | — |
| `tab`, `orderedTabs`, drag state | Parent | — |
| `generalError`, `showDiscardConfirm` | Parent | — |
| Preview state | Parent (passed as callback) | `onPreviewUrl` prop |
| Schema data, option lists | Parent (hooks) | Props to each tab |

### Tab Component Interface

Each tab receives non-form dependencies as props. Form access comes from `useFormContext()`.

```tsx
// Example: LimitsTab
interface LimitsTabProps {
  reward: RewardCatalogItem | null;  // for redemptions count
  schemaData: RewardSchemaData | null;
}

function LimitsTab({ reward, schemaData }: LimitsTabProps) {
  const { register, watch, setValue, control, formState: { errors } } = useFormContext<RewardFormValues>();
  const [unlimitedInventory, setUnlimitedInventory] = useState(...);
  // ... tab JSX
}
```

```tsx
// Example: FulfillmentTab
interface FulfillmentTabProps {
  partnerOptions: SelectOption[];
  currencyOptions: SelectOption[];
  snapToOptions: SelectOption[];
  tierPolicyOptions: SelectOption[];
  schemaData: RewardSchemaData | null;
}
```

```tsx
// Example: EligibilityTab
interface EligibilityTabProps {
  channelOptions: SelectOption[];
  segmentOptions: SelectOption[];
  tierPolicyOpts: TierPolicyOption[];
  eligibilityLoading: boolean;
}
```

```tsx
// Example: DetailsTab
interface DetailsTabProps {
  reward: RewardCatalogItem | null;
  isEditing: boolean;
  divisionOptions: SelectOption[];
  schemaData: RewardSchemaData | null;
}
```

### Parent Drawer (after refactor)

```tsx
function RewardFormDrawer(props) {
  // Hook calls (schema, options, etc.)
  // useForm setup
  // Reset effects, keyboard shortcuts
  // Submit handler + error-to-tab routing

  return (
    <DrawerShell ...>
      <FormProvider {...methods}>
        <form ...>
          {/* Error banner */}
          {/* Tab bar */}
          <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-6">
            {tab === "details" && <DetailsTab ... />}
            {tab === "fulfillment" && <FulfillmentTab ... />}
            {tab === "limits" && <LimitsTab ... />}
            {tab === "eligibility" && <EligibilityTab ... />}
            {!isCoreTab && <ExtTabBody ... />}
          </div>
          {/* Footer: Cancel / Save */}
        </form>
      </FormProvider>
    </DrawerShell>
  );
}
```

### Performance Gains

- Each tab only re-renders when fields it watches change (not all 14 watches)
- Inactive tabs don't render at all (conditional rendering preserved)
- `useFormContext()` is stable — it doesn't cause re-renders by itself; only `watch()` calls within each tab trigger that tab's re-render

### Auto-Population Effects

The currency → expiration/escrow auto-pop effect (currently in the parent) moves into `FulfillmentTab` since it only touches fulfillment fields and depends on `ffmntCurrency`. Same for the tier policy auto-selection effects.

### Error Navigation

The parent keeps `firstTabWithError()` and `tabErrorCounts()` since they need the full error map and tab definitions. When validation fails, the parent switches tabs and sets `focusErrorAfterRenderRef` — unchanged from current behavior.

### Bulk Edit Drawer

Apply the same pattern to `bulk-edit-drawer.tsx`. Extract `BulkLimitsTab`, `BulkFulfillmentTab`, `BulkEligibilityTab`, `BulkDetailsTab` into a `bulk-tabs/` folder. The bulk edit tabs share the grouped layout with single edit tabs but wrap fields in `BulkField` components.

### What Does NOT Change

- DrawerShell component
- Zod schema building
- Form default value building
- Tab ordering / drag-and-drop
- ExtTabBody (already extracted)
- Submit payload construction
- API hooks
