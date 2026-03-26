import { useNavigate } from "react-router";
import { Wallet, Layers, Activity, BookOpen, GitBranch, BarChart3, SlidersHorizontal } from "lucide-react";
import { useUIStore } from "@/shared/stores/ui-store";
import { NoProgramBanner } from "@/shared/components/no-program-banner";
import { PageHeader } from "@/shared/components/page-header";
import { usePolicyCounts } from "../hooks/use-policies";
import { useActivityTemplateCount } from "../hooks/use-activity-templates";
import { ElementCard } from "../components/element-card";

export default function ProgramElementsPage() {
  const navigate = useNavigate();
  const currentProgram = useUIStore((s) => s.currentProgram);
  const currentProgramName = useUIStore((s) => s.currentProgramName);
  const { pursePolicyCount, tierPolicyCount, isLoading } = usePolicyCounts(currentProgram ?? undefined);
  const { count: activityTemplateCount, isLoading: activityTemplateLoading } = useActivityTemplateCount(currentProgram ?? undefined);

  if (!currentProgram) {
    return (
      <NoProgramBanner
        context="program elements"
        data-testid="program-elements-no-program"
      />
    );
  }

  return (
    <div data-testid="program-elements-page">
      <PageHeader
        title="Program Elements"
        description={currentProgramName ?? undefined}
        icon={SlidersHorizontal}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ElementCard
          icon={Wallet}
          title="Purse Policies"
          description="Manage point purses, multipliers, expiration, and escrow settings"
          count={isLoading ? undefined : pursePolicyCount}
          onClick={() => navigate("/program/purse-policies")}
          testId="element-card-purse"
          iconColor="var(--color-accent-amber)"
          iconBg="var(--color-accent-amber-light)"
        />
        <ElementCard
          icon={Layers}
          title="Tier Groups"
          description="Define tier levels, thresholds, and tier-based benefits"
          count={isLoading ? undefined : tierPolicyCount}
          onClick={() => navigate("/program/tier-groups")}
          testId="element-card-tier"
          iconColor="var(--color-accent-indigo)"
          iconBg="var(--color-accent-indigo-light)"
        />
        <ElementCard
          icon={Activity}
          title="Activity Templates"
          description="Define how you will recognize, validate, and enrich signals from your customers"
          count={activityTemplateLoading ? undefined : activityTemplateCount}
          onClick={() => navigate("/program/activity-templates")}
          testId="element-card-activity-templates"
          iconColor="var(--color-accent-rose)"
          iconBg="var(--color-accent-rose-light)"
        />
        <ElementCard
          icon={BookOpen}
          title="Rules"
          description="Configure loyalty rules and conditions"
          onClick={() => {}}
          disabled
          testId="element-card-rules"
          iconColor="var(--color-accent-teal)"
          iconBg="var(--color-accent-teal-light)"
        />
        <ElementCard
          icon={GitBranch}
          title="Program Flow"
          description="Design transaction processing flow"
          onClick={() => {}}
          disabled
          testId="element-card-flow"
          iconColor="var(--color-accent-sky)"
          iconBg="var(--color-accent-sky-light)"
        />
        <ElementCard
          icon={BarChart3}
          title="Aggregates"
          description="Define aggregate tracking and reporting"
          onClick={() => {}}
          disabled
          testId="element-card-aggregate"
          iconColor="var(--color-accent-violet)"
          iconBg="var(--color-accent-violet-light)"
        />
      </div>
    </div>
  );
}
