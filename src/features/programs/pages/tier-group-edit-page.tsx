import { EntityEditPage } from "@/shared/components/entity-edit-page";
import { tierPolicyEditConfig } from "../config/tier-policy-config";
import { useCreateTierPolicy, useUpdateTierPolicy } from "../hooks/use-policies";

export default function TierGroupEditPage() {
  return (
    <EntityEditPage
      config={tierPolicyEditConfig}
      useCreate={useCreateTierPolicy}
      useUpdate={useUpdateTierPolicy}
    />
  );
}
