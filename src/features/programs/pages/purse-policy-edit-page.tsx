import * as React from "react";
import { EntityEditPage } from "@/shared/components/entity-edit-page";
import { buildPursePolicyEditConfig, type PurseEditDynamicOptions } from "../config/purse-policy-config";
import { useCreatePursePolicy, useUpdatePursePolicy } from "../hooks/use-policies";
import { useEnumOptions, useCreateEnum } from "@/shared/hooks/use-enums";
import { useUIStore } from "@/shared/stores/ui-store";
import { useDivisionOptions } from "@/shared/hooks/use-divisions";
import { useProgram } from "../hooks/use-programs";

/**
 * Wraps the standard create mutation to first create a PurseGroup enum entry
 * when the user selects a group value that doesn't already exist.
 */
function useCreatePursePolicyWithGroupEnum(existingGroupValues: string[]) {
  const createPurse = useCreatePursePolicy();
  const createEnum = useCreateEnum();
  const org = useUIStore((s) => s.currentOrg);

  return {
    mutateAsync: async (data: Record<string, unknown>) => {
      const groupValue = data.group as string | undefined;
      if (groupValue && !existingGroupValues.includes(groupValue)) {
        // Create the PurseGroup enum entry before creating the purse
        await createEnum.mutateAsync({
          type: "PurseGroup",
          lang: "en",
          value: groupValue,
          label: groupValue,
          valueType: "String",
          org,
        } as Record<string, unknown>);
      }
      return createPurse.mutateAsync(data);
    },
    isPending: createPurse.isPending || createEnum.isPending,
  };
}

export default function PursePolicyEditPage() {
  const { data: groupOptions } = useEnumOptions("PurseGroup");
  const { data: timezoneOptions } = useEnumOptions("timeZone");
  const { data: aggregateTypeRaw } = useEnumOptions("AggregateType");
  const { data: snapToRaw } = useEnumOptions("SnapTo");
  const currentProgram = useUIStore((s) => s.currentProgram);
  const { data: programData } = useProgram(currentProgram ?? undefined);
  const { options: divisionOptions } = useDivisionOptions({
    programDivisionIds: programData?.divisions,
  });

  const durationOrder: Record<string, number> = {
    Daily: 1, Weekly: 2, Monthly: 3, Quarterly: 4, HalfYearly: 5, Yearly: 6, Lifetime: 7,
  };

  const aggregateTypeOptions = React.useMemo(() => {
    const raw = aggregateTypeRaw ?? [];
    return [...raw].sort((a, b) => (durationOrder[a.value] ?? 99) - (durationOrder[b.value] ?? 99));
  }, [aggregateTypeRaw]);

  const snapToOptions = React.useMemo(() => {
    const raw = snapToRaw ?? [];
    return raw
      .filter((o) => o.value !== "ExpirationDate")
      .map((o) => ({ value: o.value, label: o.label.replace(/\b\w/g, (c) => c.toUpperCase()) }));
  }, [snapToRaw]);

  const dynamicOptions: PurseEditDynamicOptions = React.useMemo(
    () => ({
      groupOptions: groupOptions ?? [],
      timezoneOptions: timezoneOptions ?? [],
      aggregateTypeOptions,
      snapToOptions,
      divisionOptions,
    }),
    [groupOptions, timezoneOptions, aggregateTypeOptions, snapToOptions, divisionOptions],
  );

  const config = React.useMemo(
    () => buildPursePolicyEditConfig(dynamicOptions),
    [dynamicOptions],
  );

  const existingGroupValues = React.useMemo(
    () => (groupOptions ?? []).map((o) => o.value),
    [groupOptions],
  );

  const useCreate = React.useCallback(
    () => useCreatePursePolicyWithGroupEnum(existingGroupValues),
    [existingGroupValues],
  );

  return (
    <EntityEditPage
      config={config}
      useCreate={useCreate}
      useUpdate={useUpdatePursePolicy}
    />
  );
}
