/**
 * Limits tab — extracted from reward-form-drawer.tsx.
 * Renders inventory, rate limits, usage limits, and show-in-preview toggle.
 */

import { useState, useMemo } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import {
  type RewardFormValues,
  flattenRhfErrors,
} from "../../lib/reward-form-helpers";
import type { RewardCatalogItem } from "../../types/reward-policy";

interface LimitsTabProps {
  reward: RewardCatalogItem | null;
}

export function LimitsTab({ reward }: LimitsTabProps): React.JSX.Element {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors: rhfErrors },
  } = useFormContext<RewardFormValues>();

  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  const [unlimitedInventory, setUnlimitedInventory] = useState(
    () => !reward || (watch("countLimit") === 0),
  );

  return (
    <div className="space-y-4">
      {/* Inventory group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="block text-label font-medium text-foreground">Inventory</span>
          <label
            className="flex items-center gap-2 cursor-pointer"
            data-testid="reward-unlimited-inventory-toggle"
            aria-label="Unlimited inventory"
          >
            <span className="text-caption text-foreground-muted">Unlimited</span>
            <Switch
              checked={unlimitedInventory}
              onChange={(checked) => {
                setUnlimitedInventory(checked);
                setValue("countLimit", checked ? 0 : 1, { shouldDirty: true });
              }}
              data-testid="reward-unlimited-inventory-switch"
              aria-label="Toggle unlimited inventory"
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Starting Inventory
            </label>
            <Input
              type="number"
              name="countLimit"
              value={unlimitedInventory ? "" : (watch("countLimit") || "")}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                setValue("countLimit", isNaN(val) ? 0 : val, { shouldDirty: true });
              }}
              min="1"
              disabled={unlimitedInventory}
              error={!!errors.countLimit}
              data-testid="reward-count-limit"
              aria-label="Starting inventory"
            />
            {errors.countLimit && (
              <p className="text-caption text-error">
                {errors.countLimit}
              </p>
            )}
          </div>
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Available Inventory
            </label>
            <Input
              type="number"
              value={
                unlimitedInventory
                  ? ""
                  : Math.max(
                      0,
                      (parseInt(String(watch("countLimit")), 10) || 0) -
                        (reward?.redemptions ?? 0),
                    )
              }
              placeholder={unlimitedInventory ? "∞" : undefined}
              readOnly
              tabIndex={-1}
              disabled={unlimitedInventory}
              className="opacity-60"
            />
          </div>
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Redemptions
            </label>
            <Input
              type="number"
              value={reward?.redemptions ?? 0}
              readOnly
              tabIndex={-1}
              className="opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Rate limits group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <span className="block text-label font-medium text-foreground">Rate Limits</span>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Per-Day Limit
            </label>
            <Input
              type="number"
              {...register("perDayLimit", { valueAsNumber: true })}
              min="0"
              placeholder="0 = unlimited"
              error={!!errors.perDayLimit}
            />
            {errors.perDayLimit && (
              <p className="text-caption text-error">
                {errors.perDayLimit}
              </p>
            )}
          </div>
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Per-Week Limit
            </label>
            <Input
              type="number"
              {...register("perWeekLimit", { valueAsNumber: true })}
              min="0"
              placeholder="0 = unlimited"
              error={!!errors.perWeekLimit}
            />
            {errors.perWeekLimit && (
              <p className="text-caption text-error">
                {errors.perWeekLimit}
              </p>
            )}
          </div>
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Per-Offer Limit
            </label>
            <Input
              type="number"
              {...register("perOfferLimit", { valueAsNumber: true })}
              min="0"
              placeholder="0 = unlimited"
              error={!!errors.perOfferLimit}
            />
            {errors.perOfferLimit && (
              <p className="text-caption text-error">
                {errors.perOfferLimit}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Cool-Off Period (minutes)
            </label>
            <Input
              type="number"
              {...register("coolOffPeriod", { valueAsNumber: true })}
              min="0"
              placeholder="0 = none"
              error={!!errors.coolOffPeriod}
            />
            {errors.coolOffPeriod && (
              <p className="text-caption text-error">
                {errors.coolOffPeriod}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Usage limits group */}
      <div className="rounded-lg border border-border bg-page p-4 space-y-4">
        <span className="block text-label font-medium text-foreground">Usage</span>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Per-Transaction Usage Limit
            </label>
            <Input
              type="number"
              {...register("transactionLimit", { valueAsNumber: true })}
              min="0"
              placeholder="0 = unlimited"
              error={!!errors.transactionLimit}
            />
            {errors.transactionLimit && (
              <p className="text-caption text-error">
                {errors.transactionLimit}
              </p>
            )}
          </div>
          <div>
            <label className="mb-3 block text-label text-foreground-muted">
              Uses Per Issuance
            </label>
            <Input
              type="number"
              {...register("numUses", { valueAsNumber: true })}
              min="1"
              error={!!errors.numUses}
            />
            {errors.numUses && (
              <p className="text-caption text-error">
                {errors.numUses}
              </p>
            )}
          </div>
        </div>
      </div>

      <Controller
        control={control}
        name="canPreview"
        render={({ field }) => (
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={field.value}
              onChange={field.onChange}
            />
            <span className="text-body-sm text-foreground">
              Show in Preview
            </span>
          </label>
        )}
      />
    </div>
  );
}
