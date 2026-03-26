/**
 * Details tab — extracted from reward-form-drawer.tsx.
 * Renders name, description, cost, divisions, dates, and metadata fields.
 */

import { useMemo } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { MultiSelect } from "@/shared/components/multi-select";
import type { SelectOption } from "@/shared/components/select";
import type { EntitySchemaData } from "@/shared/types/ext-field-def";
import {
  type RewardFormValues,
  flattenRhfErrors,
} from "../../lib/reward-form-helpers";
import type { RewardCatalogItem } from "../../types/reward-policy";
import { getUserDisplayName } from "../../types/reward-policy";

interface DetailsTabProps {
  reward: RewardCatalogItem | null;
  isEditing: boolean;
  divisionOptions: SelectOption[];
  schemaData: EntitySchemaData | null;
}

export function DetailsTab({
  reward,
  isEditing,
  divisionOptions,
  schemaData,
}: DetailsTabProps): React.JSX.Element {
  const {
    register,
    control,
    formState: { errors: rhfErrors },
  } = useFormContext<RewardFormValues>();

  const errors = useMemo(() => flattenRhfErrors(rhfErrors), [rhfErrors]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="reward-name" className="mb-3 block text-label text-foreground-muted">
          Name{schemaData?.coreRequiredFields.has("name") && <span className="ml-0.5 text-error">*</span>}
        </label>
        <Input
          id="reward-name"
          type="text"
          {...register("name")}
          error={!!errors.name}
          required
        />
        {errors.name && (
          <p className="text-caption text-error">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reward-desc" className="mb-3 block text-label text-foreground-muted">
          Description
        </label>
        <textarea
          data-testid="reward-form-desc"
          id="reward-desc"
          className={cn(
            "flex w-full bg-[var(--input-bg)] text-foreground text-[14px]",
            "rounded-[var(--input-radius)] px-[var(--input-padding-x)] py-2",
            "border border-[var(--input-border)]",
            "transition-colors duration-[var(--duration-fast)]",
            "placeholder:text-foreground-muted",
            "focus-visible:outline-none focus-visible:border-[var(--input-focus-border)] focus-visible:ring-1 focus-visible:ring-brand",
            "resize-y min-h-[60px]",
            errors.desc &&
              "border-error focus-visible:border-error focus-visible:ring-error",
          )}
          {...register("desc")}
          rows={2}
        />
        {errors.desc && (
          <p className="text-caption text-error">
            {errors.desc}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="reward-cost" className="mb-3 block text-label text-foreground-muted">
            Cost
          </label>
          <Input
            id="reward-cost"
            type="number"
            min={0}
            step="any"
            {...register("cost", { valueAsNumber: true })}
            data-testid="reward-form-cost"
            error={!!errors.cost}
          />
          {errors.cost && (
            <p className="text-caption text-error">
              {errors.cost}
            </p>
          )}
        </div>
        <div>
          <label className="mb-3 block text-label text-foreground-muted">
            Divisions
          </label>
          <Controller
            control={control}
            name="divisions"
            render={({ field }) => (
              <MultiSelect
                value={field.value}
                onChange={field.onChange}
                options={divisionOptions}
                placeholder="Select divisions..."
                searchable
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="reward-effectiveDate" className="mb-3 block text-label text-foreground-muted">
            Effective Date{schemaData?.coreRequiredFields.has("effectiveDate") && <span className="ml-0.5 text-error">*</span>}
          </label>
          <Input
            id="reward-effectiveDate"
            type="date"
            {...register("effectiveDate")}
            error={!!errors.effectiveDate}
          />
          {errors.effectiveDate && (
            <p className="text-caption text-error">
              {errors.effectiveDate}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reward-expirationDate" className="mb-3 block text-label text-foreground-muted">
            Expiration Date{schemaData?.coreRequiredFields.has("expirationDate") && <span className="ml-0.5 text-error">*</span>}
          </label>
          <Input
            id="reward-expirationDate"
            type="date"
            {...register("expirationDate")}
            error={!!errors.expirationDate}
          />
          {errors.expirationDate && (
            <p className="text-caption text-error">
              {errors.expirationDate}
            </p>
          )}
        </div>
      </div>

      {isEditing &&
        (reward?.createdAt || reward?.updatedAt) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-3 block text-label text-foreground-muted">
                Created
              </span>
              <Input
                type="text"
                readOnly
                tabIndex={-1}
                value={
                  reward?.createdAt
                    ? `${new Date(reward.createdAt).toLocaleString()} by ${getUserDisplayName(reward.createdBy) || "\u2014"}`
                    : "\u2014"
                }
                className="opacity-60"
              />
            </div>
            <div>
              <span className="mb-3 block text-label text-foreground-muted">
                Last Updated
              </span>
              <Input
                type="text"
                readOnly
                tabIndex={-1}
                value={
                  reward?.updatedAt
                    ? `${new Date(reward.updatedAt).toLocaleString()} by ${getUserDisplayName(reward.updatedBy) || "\u2014"}`
                    : "\u2014"
                }
                className="opacity-60"
              />
            </div>
          </div>
        )}
    </div>
  );
}
