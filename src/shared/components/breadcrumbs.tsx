import { Link, useLocation } from "react-router";
import { ChevronRight } from "lucide-react";
import { useBreadcrumbOverrides } from "@/shared/components/breadcrumb-context";

const segmentLabels: Record<string, string> = {
  overview: "Overview",
  program: "Program",
  "program-management": "Program",
  "purse-policies": "Purse Policies",
  "tier-groups": "Tier Groups",
  "activity-templates": "Activity Templates",
  promotions: "Promotions",
  discounts: "Discounts",
  "reward-catalog": "Reward Catalog",
  members: "Members",
  programs: "Programs",
  policies: "Policies",
  rules: "Rules",
  flow: "Flow",
  "reference-data": "Reference Data",
  segments: "Segments",
  locations: "Locations",
  products: "Products",
  enums: "Enumerations",
  "named-lists": "Named Lists",
  analytics: "Analytics",
  settings: "Settings",
  users: "Users",
  security: "Security",
  extensions: "Extensions",
  limits: "Limits",
  divisions: "Divisions",
  account: "My Account",
  new: "New",
};

/** Path segments that are category groupings with no routable page */
const nonLinkableSegments = new Set(["reference-data", "settings"]);

/** Check if a segment looks like a generated ID (MongoDB ObjectId or UUID) */
function isGeneratedId(segment: string): boolean {
  return /^[a-f0-9]{24}$/.test(segment) || /^[a-f0-9-]{36}$/.test(segment);
}

export function Breadcrumbs() {
  const location = useLocation();
  const overrides = useBreadcrumbOverrides();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    // Check overrides first, then static dictionary, then format the segment
    const label = overrides[seg]
      ?? segmentLabels[seg]
      ?? (isGeneratedId(seg) ? (overrides[seg] ?? null) : seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    const isLast = i === segments.length - 1;
    const nonLinkable = nonLinkableSegments.has(seg);

    return { path, label, isLast, nonLinkable, segment: seg };
  });

  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumbs" className="flex items-center gap-1 text-body-sm">
      {crumbs.map((crumb, i) => {
        // Skip ObjectId segments without overrides
        if (isGeneratedId(crumb.segment) && !crumb.label) return null;

        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
            {crumb.isLast ? (
              <span className="text-[var(--color-text-primary)] font-medium" data-testid={`breadcrumb-current`}>
                {crumb.label}
              </span>
            ) : crumb.nonLinkable ? (
              <span className="text-[var(--color-text-muted)]">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                data-testid={`breadcrumb-link-${(crumb.label ?? "").toLowerCase().replace(/\s+/g, "-")}`}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
