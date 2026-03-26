import {
  ChevronDown,
  ChevronRight,
  Wallet,
  Pencil,
  Trash2,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Globe,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { formatDate, toDateOnly, todayDateOnly } from "@/shared/lib/date-utils";
import { formatNumber } from "@/shared/lib/format-utils";
import type { PursePolicy } from "@/shared/types/policy";
import type { PurseDisplayEntry } from "../utils/group-purse-policies";

function isPeriodPast(p: PursePolicy): boolean {
  return !!p.periodEndDate && toDateOnly(p.periodEndDate) < todayDateOnly();
}

interface PurseGroupedCardsProps {
  entries: PurseDisplayEntry[];
  expandedGroups: Set<string>;
  onToggleGroup: (groupName: string) => void;
  onEdit?: (policy: PursePolicy) => void;
  onDelete?: (policy: PursePolicy) => void;
}

export function PurseGroupedCards({
  entries,
  expandedGroups,
  onToggleGroup,
  onEdit,
  onDelete,
}: PurseGroupedCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => {
        if (entry.type === "group") {
          return (
            <GroupCard
              key={`group-${entry.groupName}`}
              groupName={entry.groupName}
              policies={entry.policies}
              isExpanded={expandedGroups.has(entry.groupName)}
              onToggle={() => onToggleGroup(entry.groupName)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        }
        return (
          <StandaloneCard
            key={entry.policy._id}
            policy={entry.policy}
            onEdit={onEdit ? () => onEdit(entry.policy) : undefined}
            onDelete={onDelete ? () => onDelete(entry.policy) : undefined}
          />
        );
      })}
    </div>
  );
}

function GroupCard({
  groupName,
  policies,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  groupName: string;
  policies: PursePolicy[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (p: PursePolicy) => void;
  onDelete?: (p: PursePolicy) => void;
}) {
  const rep = policies[0]!;
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <Card hover data-testid={`purse-group-card-${groupName}`} className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-sky-light text-accent-sky">
              <Wallet className="h-4 w-4" />
            </div>
            <CardTitle className="text-body font-medium">{groupName}</CardTitle>
          </div>
          <button
            onClick={onToggle}
            className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
            aria-label={isExpanded ? `Collapse ${groupName}` : `Expand ${groupName}`}
            data-testid={`purse-group-toggle-${groupName}`}
          >
            <Chevron className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1 ml-10">
          <Badge variant="info">Qualifying</Badge>
          <Badge variant="secondary">
            {policies.length} period{policies.length !== 1 ? "s" : ""}
          </Badge>
          {rep.primary && <Badge variant="success">Primary</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2 text-body-sm">
          <div className="flex items-center gap-2 text-foreground-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Pt Multiplier: <span className="text-foreground">{formatNumber(rep.ptMultiplier, 1)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground-muted">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Overdraft: <span className="text-foreground">{formatNumber(rep.overdraftLimit)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground-muted">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(rep.effectiveDate)} &rarr; {formatDate(rep.expirationDate)}</span>
          </div>
        </div>

        {/* Expanded periods */}
        {isExpanded && (
          <div className="mt-4 border-t border-border pt-3 space-y-2">
            <p className="text-caption font-medium text-foreground-muted uppercase tracking-wide">Periods</p>
            {policies.map((p) => {
              const past = isPeriodPast(p);
              return (
              <div
                key={p._id}
                className="flex items-center justify-between rounded-md bg-subtle/50 px-3 py-2"
                data-testid={`purse-period-card-${p._id}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-body-sm font-medium truncate ${past ? "text-foreground-muted" : "text-foreground"}`}>{p.name}</p>
                      <Badge variant={past ? "secondary" : "success"} className="w-12 justify-center text-caption-xs shrink-0">
                        {past ? "Closed" : "Open"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-foreground-muted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(p.periodStartDate)} &rarr; {formatDate(p.periodEndDate)}
                      </span>
                      {p.periodCloseDate && (
                        <span>Close: {formatDate(p.periodCloseDate)}</span>
                      )}
                      {p.periodTimezone && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {p.periodTimezone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {onEdit && (
                      <button
                        data-testid={`purse-period-edit-${p._id}`}
                        aria-label={past ? `View ${p.name}` : `Edit ${p.name}`}
                        title={past ? "View" : "Edit"}
                        className="cursor-pointer rounded p-1 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
                        onClick={() => onEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && !past && (
                      <button
                        data-testid={`purse-period-delete-${p._id}`}
                        aria-label={`Delete ${p.name}`}
                        title="Delete"
                        className="cursor-pointer rounded p-1 text-foreground-muted hover:bg-error/5 hover:text-error transition-colors"
                        onClick={() => onDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StandaloneCard({
  policy,
  onEdit,
  onDelete,
}: {
  policy: PursePolicy;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card hover data-testid={`purse-card-${policy._id}`} className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-amber-light)] text-[var(--color-accent-amber)]">
              <Wallet className="h-4 w-4" />
            </div>
            <CardTitle className="text-body font-medium">{policy.name}</CardTitle>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors"
                  onClick={onEdit}
                  title="Edit"
                  aria-label={`Edit ${policy.name}`}
                  data-testid={`purse-card-edit-${policy._id}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  className="cursor-pointer rounded p-1.5 text-foreground-muted hover:bg-error/5 hover:text-error transition-colors"
                  onClick={onDelete}
                  title="Delete"
                  aria-label={`Delete ${policy.name}`}
                  data-testid={`purse-card-delete-${policy._id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1 ml-10">
          <Badge variant="secondary">Non-qualifying</Badge>
          {policy.primary && <Badge variant="success">Primary</Badge>}
          {policy.expirationType && policy.expirationType !== "None" && (
            <Badge variant="info">{policy.expirationType}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2 text-body-sm">
          <div className="flex items-center gap-2 text-foreground-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Pt Multiplier: <span className="text-foreground">{formatNumber(policy.ptMultiplier, 1)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground-muted">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Overdraft: <span className="text-foreground">{formatNumber(policy.overdraftLimit)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground-muted">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(policy.effectiveDate)} &rarr; {formatDate(policy.expirationDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
