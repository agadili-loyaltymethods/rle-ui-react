import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { AppLayout } from "./layout";
import { AuthenticatedErrorPage, AnonymousErrorPage, RootErrorBoundary } from "./error-page";

// Lazy-loaded route components
const Overview = lazy(() => import("@/features/overview/pages/overview-page"));
const ProgramElementsPage = lazy(() => import("@/features/programs/pages/program-elements-page"));
const PursePoliciesPage = lazy(() => import("@/features/programs/pages/purse-policies-page"));
const TierGroupsPage = lazy(() => import("@/features/programs/pages/tier-groups-page"));
const PursePolicyEditPage = lazy(() => import("@/features/programs/pages/purse-policy-edit-page"));
const TierGroupEditPage = lazy(() => import("@/features/programs/pages/tier-group-edit-page"));
const ActivityTemplatesPage = lazy(() => import("@/features/programs/pages/activity-templates-page"));
const ActivityTemplateEditPage = lazy(() => import("@/features/programs/pages/activity-template-edit-page"));
const PromotionsPage = lazy(() => import("@/features/promotions/pages/promotions-page"));
const DiscountsPage = lazy(() => import("@/features/discounts/pages/discounts-page"));
const RewardCatalogPage = lazy(() => import("@/features/reward-catalog/pages/reward-catalog-page"));
const MemberList = lazy(() => import("@/features/members/pages/member-list-page"));
const MemberDetail = lazy(() => import("@/features/members/pages/member-detail-page"));
const ProgramList = lazy(() => import("@/features/programs/pages/program-list-page"));
const ProgramDetail = lazy(() => import("@/features/programs/pages/program-detail-page"));
const RulesPage = lazy(() => import("@/features/programs/pages/rules-page"));
const FlowPage = lazy(() => import("@/features/programs/pages/flow-page"));
const SegmentsPage = lazy(() => import("@/features/reference-data/segments/pages/segments-page"));
const LocationsPage = lazy(() => import("@/features/reference-data/locations/pages/locations-page"));
const ProductsPage = lazy(() => import("@/features/reference-data/products/pages/products-page"));
const EnumsPage = lazy(() => import("@/features/reference-data/enums/pages/enums-page"));
const NamedListsPage = lazy(() => import("@/features/reference-data/named-lists/pages/named-lists-page"));
const AnalyticsPage = lazy(() => import("@/features/analytics/pages/analytics-page"));
const UsersPage = lazy(() => import("@/features/settings/users/pages/users-page"));
const SecurityPage = lazy(() => import("@/features/settings/acl/pages/security-page"));
const ExtensionsPage = lazy(() => import("@/features/settings/extensions/pages/extensions-page"));
const LimitsPage = lazy(() => import("@/features/settings/limits/pages/limits-page"));
const DivisionsPage = lazy(() => import("@/features/settings/divisions/pages/divisions-page"));
const AccountPage = lazy(() => import("@/features/settings/account/pages/account-page"));
const ProgramSettingsPage = lazy(() => import("@/features/settings/program/pages/program-settings-page"));
const LoginPage = lazy(() => import("@/features/auth/pages/login-page"));
const AuditLogsPage = lazy(() => import("@/features/audit-logs/pages/audit-logs-page"));
const OidcCompletePage = lazy(() => import("@/features/auth/pages/oidc-complete-page"));

function PageSkeleton() {
  return (
    <div className="flex h-full items-center justify-center" data-testid="page-loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
    errorElement: <AnonymousErrorPage />,
  },
  {
    path: "/oidc/complete",
    element: <SuspenseWrapper><OidcCompletePage /></SuspenseWrapper>,
    errorElement: <AnonymousErrorPage />,
  },
  {
    element: <AppLayout />,
    errorElement: <AuthenticatedErrorPage />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <SuspenseWrapper><Overview /></SuspenseWrapper> },

      // Program Elements
      { path: "program", element: <SuspenseWrapper><ProgramElementsPage /></SuspenseWrapper> },
      { path: "program/purse-policies", element: <SuspenseWrapper><PursePoliciesPage /></SuspenseWrapper> },
      { path: "program/purse-policies/:id", element: <SuspenseWrapper><PursePolicyEditPage /></SuspenseWrapper> },
      { path: "program/tier-groups", element: <SuspenseWrapper><TierGroupsPage /></SuspenseWrapper> },
      { path: "program/tier-groups/:id", element: <SuspenseWrapper><TierGroupEditPage /></SuspenseWrapper> },
      { path: "program/activity-templates", element: <SuspenseWrapper><ActivityTemplatesPage /></SuspenseWrapper> },
      { path: "program/activity-templates/new", element: <SuspenseWrapper><ActivityTemplateEditPage /></SuspenseWrapper> },
      { path: "program/activity-templates/:id", element: <SuspenseWrapper><ActivityTemplateEditPage /></SuspenseWrapper> },
      { path: "audit-trail", element: <SuspenseWrapper><AuditLogsPage /></SuspenseWrapper> },

      // Redirect old path
      { path: "program-management", element: <Navigate to="/program" replace /> },

      { path: "promotions", element: <SuspenseWrapper><PromotionsPage /></SuspenseWrapper> },
      { path: "discounts", element: <SuspenseWrapper><DiscountsPage /></SuspenseWrapper> },
      { path: "reward-catalog", element: <SuspenseWrapper><RewardCatalogPage /></SuspenseWrapper> },

      // Members
      { path: "members", element: <SuspenseWrapper><MemberList /></SuspenseWrapper> },
      { path: "members/:id", element: <SuspenseWrapper><MemberDetail /></SuspenseWrapper> },

      // Programs
      { path: "programs", element: <SuspenseWrapper><ProgramList /></SuspenseWrapper> },
      { path: "programs/:id", element: <SuspenseWrapper><ProgramDetail /></SuspenseWrapper> },
      { path: "programs/:id/rules", element: <SuspenseWrapper><RulesPage /></SuspenseWrapper> },
      { path: "programs/:id/flow", element: <SuspenseWrapper><FlowPage /></SuspenseWrapper> },

      // Reference Data
      { path: "reference-data/segments", element: <SuspenseWrapper><SegmentsPage /></SuspenseWrapper> },
      { path: "reference-data/locations", element: <SuspenseWrapper><LocationsPage /></SuspenseWrapper> },
      { path: "reference-data/products", element: <SuspenseWrapper><ProductsPage /></SuspenseWrapper> },
      { path: "reference-data/enums", element: <SuspenseWrapper><EnumsPage /></SuspenseWrapper> },
      { path: "reference-data/named-lists", element: <SuspenseWrapper><NamedListsPage /></SuspenseWrapper> },

      // Analytics
      { path: "analytics", element: <SuspenseWrapper><AnalyticsPage /></SuspenseWrapper> },

      // Settings
      { path: "settings/users", element: <SuspenseWrapper><UsersPage /></SuspenseWrapper> },
      { path: "settings/security", element: <SuspenseWrapper><SecurityPage /></SuspenseWrapper> },
      { path: "settings/extensions", element: <SuspenseWrapper><ExtensionsPage /></SuspenseWrapper> },
      { path: "settings/limits", element: <SuspenseWrapper><LimitsPage /></SuspenseWrapper> },
      { path: "settings/divisions", element: <SuspenseWrapper><DivisionsPage /></SuspenseWrapper> },
      { path: "settings/program", element: <SuspenseWrapper><ProgramSettingsPage /></SuspenseWrapper> },
      { path: "settings/account", element: <SuspenseWrapper><AccountPage /></SuspenseWrapper> },
    ],
  },
  {
    // Root-level catch-all — throws 404 so the error boundary shows "Page not found"
    path: "*",
    loader: () => { throw new Response("Not Found", { status: 404 }); },
    errorElement: <RootErrorBoundary />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
