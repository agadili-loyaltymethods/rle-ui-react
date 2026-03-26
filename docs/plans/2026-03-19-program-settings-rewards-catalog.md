# Program Settings — Rewards Catalog Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Program Settings page under Settings with a Rewards Catalog tab that configures `intendedUse` and `cardImageField`, stored via `useProgramMeta`, and wire those settings into the reward catalog's create flow and image rendering.

**Architecture:** New route `/settings/program` with a tabbed page. Settings stored as a `_meta Rewards Catalog` Rule per program via the existing `useProgramMeta` hook. The reward catalog page reads the config and passes values to `createDefaultRewardCatalogItem()`, card grid, and cell renderers.

**Tech Stack:** React Hook Form + Zod, `useProgramMeta`, `useRewardSchema`, existing sidebar/router patterns

---

### Task 1: Add Program Settings route and sidebar entry

**Files:**
- Create: `src/features/settings/pages/program-settings-page.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/shared/components/sidebar.tsx`

**Step 1: Create stub page**

```tsx
import { type JSX } from "react";
import { PageHeader } from "@/shared/components/page-header";

export default function ProgramSettingsPage(): JSX.Element {
  return (
    <div data-testid="page-program-settings">
      <PageHeader title="Program Settings" />
      <p className="text-body-sm text-foreground-muted">Coming soon</p>
    </div>
  );
}
```

**Step 2: Add route in router.tsx**

After the existing settings routes (around line 110), add:

```tsx
{ path: "settings/program", element: <SuspenseWrapper><ProgramSettingsPage /></SuspenseWrapper> },
```

With the lazy import at the top:

```tsx
const ProgramSettingsPage = lazy(() => import("@/features/settings/pages/program-settings-page"));
```

**Step 3: Add sidebar entry**

In `sidebar.tsx`, in the Settings children array, add:

```tsx
{ label: "Program", path: "/settings/program", testId: "program", icon: Layers },
```

Import `Layers` from `lucide-react`.

**Step 4: Run type check**
Run: `npx tsc --noEmit`

**Step 5: Commit**
```bash
git commit -m "feat: add Program Settings page stub with route and sidebar entry"
```

---

### Task 2: Build the Rewards Catalog settings tab UI

**Files:**
- Modify: `src/features/settings/pages/program-settings-page.tsx`

**Step 1: Implement the full page with Rewards Catalog tab**

The page uses `useProgramMeta` to read/write config and `useRewardSchema` to discover URL-type ext fields for the Card Image dropdown.

```tsx
import { useState, useMemo, useEffect, type JSX } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/ui/button";
import { Select, type SelectOption } from "@/shared/components/select";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";
import { useProgramMeta } from "@/features/programs/hooks/use-program-meta";
import { useRewardSchema } from "@/features/reward-catalog/hooks/use-reward-schema";

interface RewardsCatalogConfig {
  intendedUse: "Reward" | "Offer";
  cardImageField: string;
}

const schema = z.object({
  intendedUse: z.enum(["Reward", "Offer"]),
  cardImageField: z.string(),
});

const INTENDED_USE_OPTIONS: SelectOption[] = [
  { value: "Reward", label: "Reward" },
  { value: "Offer", label: "Offer" },
];

const TAB_KEYS = ["rewards-catalog"] as const;
const TABS = [{ key: "rewards-catalog", label: "Rewards Catalog" }];

export default function ProgramSettingsPage(): JSX.Element {
  const currentProgram = useUIStore((s) => s.currentProgram);
  const [activeTab, setActiveTab] = useState<string>("rewards-catalog");

  const { data: config, isLoading: configLoading, save } =
    useProgramMeta<RewardsCatalogConfig>(currentProgram ?? undefined, "Rewards Catalog");

  const { data: schemaData } = useRewardSchema();

  // Build card image field options from schema
  const cardImageOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: "", label: "None" }];
    // Core url field
    opts.push({ value: "url", label: "URL (core field)" });
    // Ext fields with url type/format
    if (schemaData?.extFields) {
      for (const [name, def] of Object.entries(schemaData.extFields)) {
        if (def.type === "url" || def.format === "url") {
          opts.push({ value: name, label: def.title || name });
        }
      }
    }
    return opts;
  }, [schemaData]);

  const defaultImageField = cardImageOptions.length > 1 ? cardImageOptions[1]!.value : "";

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      intendedUse: config?.intendedUse ?? "Reward",
      cardImageField: config?.cardImageField ?? defaultImageField,
    },
  });

  // Reset form when config loads
  useEffect(() => {
    if (config) {
      reset({
        intendedUse: config.intendedUse ?? "Reward",
        cardImageField: config.cardImageField ?? defaultImageField,
      });
    }
  }, [config, reset, defaultImageField]);

  const [saving, setSaving] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      await save(data as RewardsCatalogConfig);
      toast.success("Settings saved");
      reset(data);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  });

  if (!currentProgram) {
    return (
      <div data-testid="page-program-settings">
        <PageHeader title="Program Settings" />
        <NoProgramBanner context="program settings" data-testid="program-settings-no-program" />
      </div>
    );
  }

  return (
    <div data-testid="page-program-settings">
      <PageHeader title="Program Settings" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={cn(
              "px-4 py-2 text-body-sm transition-colors cursor-pointer border-b-2 -mb-px",
              activeTab === t.key
                ? "border-brand text-brand font-medium"
                : "border-transparent text-foreground-muted hover:text-foreground",
            )}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rewards Catalog tab */}
      {activeTab === "rewards-catalog" && (
        <form onSubmit={onSubmit} className="max-w-lg space-y-6">
          {configLoading ? (
            <p className="text-body-sm text-foreground-muted">Loading...</p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Intended Use
                </label>
                <p className="mb-3 text-caption text-foreground-muted">
                  Controls the intended use value set on new rewards created in this program.
                </p>
                <Controller
                  control={control}
                  name="intendedUse"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      options={INTENDED_USE_OPTIONS}
                      testIdPrefix="program-intended-use"
                    />
                  )}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Card Image Field
                </label>
                <p className="mb-3 text-caption text-foreground-muted">
                  Which field to use for the reward image in the card grid and table thumbnail.
                </p>
                <Controller
                  control={control}
                  name="cardImageField"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      options={cardImageOptions}
                      testIdPrefix="program-card-image"
                    />
                  )}
                />
              </div>

              <Button type="submit" disabled={!isDirty || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
```

**Step 2: Run type check**
Run: `npx tsc --noEmit`

**Step 3: Commit**
```bash
git commit -m "feat: build Rewards Catalog settings tab with intendedUse and cardImageField"
```

---

### Task 3: Create a shared hook to read rewards catalog config

**Files:**
- Create: `src/features/reward-catalog/hooks/use-catalog-config.ts`

**Step 1: Create the hook**

This hook wraps `useProgramMeta` with the correct type and subject so consumers don't need to know the storage details.

```tsx
import { useProgramMeta } from "@/features/programs/hooks/use-program-meta";
import { useUIStore } from "@/shared/stores/ui-store";

export interface RewardsCatalogConfig {
  intendedUse: "Reward" | "Offer";
  cardImageField: string;
}

const DEFAULTS: RewardsCatalogConfig = {
  intendedUse: "Reward",
  cardImageField: "imageListPageUrlDesktopNormal",
};

export function useCatalogConfig() {
  const currentProgram = useUIStore((s) => s.currentProgram);
  const { data, isLoading } = useProgramMeta<RewardsCatalogConfig>(
    currentProgram ?? undefined,
    "Rewards Catalog",
  );

  return {
    config: data ?? DEFAULTS,
    isLoading,
  };
}
```

**Step 2: Update the Program Settings page to import `RewardsCatalogConfig` from this hook**

In `program-settings-page.tsx`, replace the local `RewardsCatalogConfig` interface with:

```tsx
import { type RewardsCatalogConfig } from "@/features/reward-catalog/hooks/use-catalog-config";
```

Remove the local `interface RewardsCatalogConfig` declaration.

**Step 3: Run type check**
Run: `npx tsc --noEmit`

**Step 4: Commit**
```bash
git commit -m "feat: add useCatalogConfig hook for reading rewards catalog settings"
```

---

### Task 4: Wire intendedUse into reward creation

**Files:**
- Modify: `src/features/reward-catalog/lib/reward-defaults.ts`
- Modify: `src/features/reward-catalog/pages/reward-catalog-page.tsx`
- Modify: `src/features/reward-catalog/components/reward-form-drawer.tsx`

**Step 1: Add intendedUse parameter to createDefaultRewardCatalogItem**

In `reward-defaults.ts`, change the function signature:

```typescript
export function createDefaultRewardCatalogItem(
  programId: string,
  orgId: string,
  sortOrder: number,
  intendedUse: string = "Reward",
): RewardCatalogItem {
```

And in the returned object, change:

```typescript
intendedUse: intendedUse,
```

instead of the hardcoded `intendedUse: "Reward"`.

**Step 2: Pass config from reward-catalog-page.tsx to RewardFormDrawer**

In `reward-catalog-page.tsx`, import and use the config:

```tsx
import { useCatalogConfig } from "../hooks/use-catalog-config";

// Inside the component:
const { config: catalogConfig } = useCatalogConfig();
```

Pass it to the drawer:

```tsx
<RewardFormDrawer
  ...existing props...
  intendedUse={catalogConfig.intendedUse}
/>
```

**Step 3: Accept and use intendedUse in RewardFormDrawer**

Add `intendedUse?: string` to `RewardFormDrawerProps`.

In the `onSubmit` handler where `createDefaultRewardCatalogItem` is called (the `else` branch for new rewards), pass the prop:

```tsx
const base = createDefaultRewardCatalogItem(programId, orgId, nextSortOrder, intendedUse);
```

**Step 4: Run type check and tests**
Run: `npx tsc --noEmit && npx vitest run src/features/reward-catalog/lib/reward-defaults.test.ts`

**Step 5: Commit**
```bash
git commit -m "feat: wire intendedUse from catalog config into reward creation"
```

---

### Task 5: Wire cardImageField into card grid and table image renderer

**Files:**
- Modify: `src/features/reward-catalog/components/rewards-card-grid.tsx`
- Modify: `src/features/reward-catalog/lib/reward-cell-renderers.tsx`
- Modify: `src/features/reward-catalog/pages/reward-catalog-page.tsx`

**Step 1: Add cardImageField prop to rewards-card-grid.tsx**

Add a `cardImageField?: string` prop. Replace the hardcoded image URL logic:

```tsx
// Old:
const imageUrl =
  reward.ext.imageListPageUrlDesktopWide ||
  reward.ext.imageListPageUrlDesktopNormal;

// New:
const imageUrl = cardImageField
  ? cardImageField === "url"
    ? (reward as Record<string, unknown>).url as string | undefined
    : reward.ext?.[cardImageField] as string | undefined
  : undefined;
```

**Step 2: Update reward-cell-renderers.tsx**

Change the `image` renderer to accept a configurable field. Since cell renderers are a static object, add a factory function:

```tsx
export function buildRewardCellRenderers(cardImageField: string): Record<
  string,
  (value: unknown, row: RewardRow) => ReactNode
> {
  return {
    ...rewardCellRenderers,
    image: (_value, row) => {
      const url = cardImageField
        ? cardImageField === "url"
          ? (row as Record<string, unknown>).url as string | undefined
          : row.ext?.[cardImageField] as string | undefined
        : undefined;
      if (url && typeof url === "string") {
        return (
          <img alt={typeof row.name === "string" ? row.name : "Reward image"}
            src={url}
            className="h-8 w-11 rounded object-cover block"
          />
        );
      }
      return (
        <div className="flex h-8 w-11 items-center justify-center rounded bg-subtle">
          <Gift className="h-4 w-4 text-foreground-muted" />
        </div>
      );
    },
  };
}
```

**Step 3: Pass cardImageField from reward-catalog-page.tsx**

Pass to the card grid:
```tsx
<RewardCardGrid ... cardImageField={catalogConfig.cardImageField} />
```

For the table, pass the built renderers:
```tsx
const cellRenderers = useMemo(
  () => buildRewardCellRenderers(catalogConfig.cardImageField),
  [catalogConfig.cardImageField],
);
```

And use `cellRenderers` instead of the static `rewardCellRenderers` import wherever it's passed to the table.

**Step 4: Run type check**
Run: `npx tsc --noEmit`

**Step 5: Commit**
```bash
git commit -m "feat: wire cardImageField config into card grid and table image renderer"
```

---

### Task 6: Final verification

**Step 1: Run full type check and tests**
Run: `npx tsc --noEmit && npx vitest run`

**Step 2: Commit any fixes**
