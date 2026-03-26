import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  SlidersHorizontal,
  Megaphone,
  CircleDollarSign,
  Gift,
  Database,
  BarChart3,
  Settings,
  HelpCircle,
  CircleUser,
  ChevronDown,
  CircleChevronLeft,
  CircleChevronRight,
  Users,
  MapPin,
  ShoppingBag,
  ListOrdered,
  ListChecks,
  Shield,
  Puzzle,
  Gauge,
  Building2,
  Layers,
  FileText,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useUIStore } from "@/shared/stores/ui-store";
import { ProgramSelector } from "./program-selector";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  testId: string;
  children?: { label: string; path: string; testId: string; icon?: React.ComponentType<{ className?: string }> }[];
}

const mainNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "/overview", testId: "overview" },
  { label: "Program", icon: SlidersHorizontal, path: "/program", testId: "program" },
  { label: "Promotions", icon: Megaphone, path: "/promotions", testId: "promotions" },
  { label: "Discounts", icon: CircleDollarSign, path: "/discounts", testId: "discounts" },
  { label: "Rewards", icon: Gift, path: "/reward-catalog", testId: "reward-catalog" },
  {
    label: "Reference Data",
    icon: Database,
    testId: "reference-data",
    children: [
      { label: "Segments", path: "/reference-data/segments", testId: "segments", icon: Layers },
      { label: "Locations", path: "/reference-data/locations", testId: "locations", icon: MapPin },
      { label: "Products", path: "/reference-data/products", testId: "products", icon: ShoppingBag },
      { label: "Enumerations", path: "/reference-data/enums", testId: "enums", icon: ListOrdered },
      { label: "Named Lists", path: "/reference-data/named-lists", testId: "named-lists", icon: ListChecks },
    ],
  },
  { label: "Audit Trail", icon: FileText, path: "/audit-trail", testId: "audit-trail" },
  { label: "Analytics", icon: BarChart3, path: "/analytics", testId: "analytics" },
  {
    label: "Settings",
    icon: Settings,
    testId: "settings",
    children: [
      { label: "Users", path: "/settings/users", testId: "users", icon: Users },
      { label: "Security", path: "/settings/security", testId: "security", icon: Shield },
      { label: "Extensions", path: "/settings/extensions", testId: "extensions", icon: Puzzle },
      { label: "Limits", path: "/settings/limits", testId: "limits", icon: Gauge },
      { label: "Divisions", path: "/settings/divisions", testId: "divisions", icon: Building2 },
      { label: "Program", path: "/settings/program", testId: "program-settings", icon: Layers },
    ],
  },
];

const bottomNav: NavItem[] = [
  { label: "Help", icon: HelpCircle, path: "#", testId: "help" },
  { label: "My Account", icon: CircleUser, path: "/settings/account", testId: "my-account" },
];

/**
 * Flyout menu shown on hover when sidebar is collapsed.
 * Renders child nav items in a floating panel to the right of the parent icon.
 * Uses CSS group-hover for activation (parent must have `group/parent` class).
 */
function CollapsedFlyout({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (!item.children?.length) return null;

  return (
    <div
      className={cn(
        "absolute left-full top-0 z-[var(--z-dropdown)] pl-5",
        dismissed ? "invisible" : "invisible group-hover/parent:visible",
      )}
      onMouseLeave={() => setDismissed(false)}
    >
      <div className="min-w-44 rounded-md border border-[var(--color-border-medium)] bg-[var(--color-bg-card)] py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.16)]">
        <div className="px-3 py-1.5 text-caption font-semibold text-foreground-muted">
          {item.label}
        </div>
        {item.children!.map((child) => {
          const ChildIcon = child.icon;
          const isActive = location.pathname.startsWith(child.path);
          return (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={() => {
                setDismissed(true);
                onNavigate?.();
              }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-body-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-[var(--sidebar-active-bg)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
              )}
              data-testid={`nav-sidebar-${child.testId}`}
            >
              {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0" />}
              {child.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

function SidebarItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(() => {
    if (!item.children?.length) return false;
    return item.children.some((c) => location.pathname.startsWith(c.path));
  });

  // Auto-expand when navigating to a child route (e.g. via search)
  useEffect(() => {
    if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
      setExpanded(true);
    }
  }, [location.pathname, item.children]);

  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  // For parent items with children and a path (like Programs), check if current location matches
  const isParentActive =
    item.path && !hasChildren
      ? false // handled by NavLink
      : item.path
        ? location.pathname.startsWith(item.path)
        : item.children?.some((c) => location.pathname.startsWith(c.path)) ?? false;

  if (hasChildren) {
    return (
      <div className="group/parent relative">
        <button
          data-testid={`nav-sidebar-${item.testId}`}
          aria-label={collapsed ? item.label : `Toggle ${item.label}`}
          title={collapsed ? item.label : undefined}
          onClick={() => {
            if (collapsed) return;
            setExpanded((e) => !e);
          }}
          className={cn(
            "group relative flex w-full items-center gap-3 rounded-md px-3 transition-colors",
            "h-[var(--sidebar-item-height)]",
            "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
            isParentActive && "bg-[var(--sidebar-active-bg)] text-[var(--color-text-primary)]",
          )}
        >
          {isParentActive && (
            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-active-indicator)]" />
          )}
          <Icon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-body-sm font-medium">{item.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
              />
            </>
          )}
        </button>
        {/* Expanded children (normal sidebar) */}
        {!collapsed && expanded && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border-light)] pl-2">
            {item.children!.map((child) => {
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors",
                      isActive
                        ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
                    )
                  }
                  data-testid={`nav-sidebar-${child.testId}`}
                >
                  {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0" />}
                  <span className="text-body-sm font-medium">{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
        {/* Collapsed flyout menu */}
        {collapsed && (
          <CollapsedFlyout item={item} onNavigate={onNavigate} />
        )}
      </div>
    );
  }

  // Non-routable items (e.g. Help) render as a button
  if (!item.path || item.path === "#") {
    return (
      <button
        onClick={onNavigate}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-md px-3 transition-colors",
          "h-[var(--sidebar-item-height)]",
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
        )}
        data-testid={`nav-sidebar-${item.testId}`}
        aria-label={item.label}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-body-sm font-medium">{item.label}</span>}
      </button>
    );
  }

  // Use startsWith matching for items with sub-routes (e.g. /program)
  const isActivePrefix = item.path ? location.pathname.startsWith(item.path) : false;

  return (
    <NavLink
      to={item.path}
      end={!isActivePrefix || item.path === location.pathname}
      onClick={onNavigate}
      className={() =>
        cn(
          "group relative flex items-center gap-3 rounded-md px-3 transition-colors",
          "h-[var(--sidebar-item-height)]",
          isActivePrefix
            ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--color-text-primary)]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
        )
      }
      data-testid={`nav-sidebar-${item.testId}`}
      title={collapsed ? item.label : undefined}
    >
      {isActivePrefix && (
        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-active-indicator)]" />
      )}
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="text-body-sm font-medium">{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.sidebarMobileOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarMobileOpen = useUIStore((s) => s.setSidebarMobileOpen);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex h-[var(--header-height)] shrink-0 items-center border-b border-[var(--color-border-light)] bg-[var(--color-bg-card)]",
          collapsed ? "justify-center px-2" : "px-5",
        )}
        data-testid="nav-sidebar-brand"
      >
        {collapsed ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-foreground-inverse font-bold text-caption">
            RCX
          </div>
        ) : (
          <div className="flex w-full items-center">
            <img alt="ReactorCX"
              src="/rcx-logo-trimmed.png"
              className="h-8 w-auto shrink-0"
            />
            <span className="ml-5 mr-3 text-[var(--color-border-medium)]">|</span>
            <span className="flex-1 text-center whitespace-nowrap text-body-sm text-[var(--color-text-secondary)]">Admin Console</span>
          </div>
        )}
      </div>

      {/* Program selector */}
      {!collapsed && (
        <div className="shrink-0 border-b border-[var(--color-border-light)] px-2 py-2">
          <ProgramSelector />
        </div>
      )}

      {/* Main navigation */}
      <nav className={cn("flex-1 px-2 py-3", collapsed ? "overflow-visible" : "overflow-y-auto")}>
        <div className="flex flex-col gap-0.5">
          {mainNav.map((item) => (
            <SidebarItem
              key={item.testId}
              item={item}
              collapsed={collapsed}
              onNavigate={() => setSidebarMobileOpen(false)}
            />
          ))}
        </div>
      </nav>

      {/* Separator */}
      <div className="mx-3 border-t border-[var(--color-border-light)]" />

      {/* Bottom navigation */}
      <div className="px-2 py-2">
        <div className="flex flex-col gap-0.5">
          {bottomNav.map((item) => (
            <SidebarItem
              key={item.testId}
              item={item}
              collapsed={collapsed}
              onNavigate={() => setSidebarMobileOpen(false)}
            />
          ))}
        </div>
      </div>

      {/* Collapse toggle — desktop only, positioned at sidebar edge */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-3 z-10 h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] shadow-sm transition-colors"
        data-testid="nav-sidebar-collapse-toggle"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <CircleChevronRight className="h-5 w-5" /> : <CircleChevronLeft className="h-5 w-5" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative hidden lg:flex shrink-0 flex-col overflow-visible border-r border-[var(--color-border-light)] bg-[var(--color-bg-sidebar)] z-[var(--z-dropdown)]",
          "transition-[width] duration-[250ms] ease-in-out",
          collapsed && "z-[var(--z-dropdown)]",
        )}
        style={{ width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)" }}
        data-testid="nav-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[var(--z-modal)] bg-black/40 lg:hidden"
            onClick={() => setSidebarMobileOpen(false)}
            data-testid="nav-sidebar-backdrop"
          />
          {/* Slide-in sidebar */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-[var(--sidebar-width)] flex-col bg-[var(--color-bg-sidebar)] shadow-lg lg:hidden",
              "animate-in slide-in-from-left duration-[250ms]",
            )}
            data-testid="nav-sidebar-mobile"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
