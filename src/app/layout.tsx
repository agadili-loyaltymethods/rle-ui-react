import { Navigate, Outlet } from "react-router";
import { Sidebar } from "@/shared/components/sidebar";
import { Header } from "@/shared/components/header";
import { useAuthStore } from "@/shared/stores/auth-store";
import { BreadcrumbProvider } from "@/shared/components/breadcrumb-context";

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <BreadcrumbProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)]">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-xl">
            <Outlet />
          </main>
        </div>

        {/* Debug branch badge — only in dev */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-brand px-3 py-1 text-[11px] font-mono text-white opacity-70 hover:opacity-100 pointer-events-none select-none">
            {__GIT_BRANCH__}
          </div>
        )}
      </div>
    </BreadcrumbProvider>
  );
}
