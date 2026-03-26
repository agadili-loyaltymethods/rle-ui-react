import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Sidebar } from "@/shared/components/sidebar";
import { Header } from "@/shared/components/header";
import { BreadcrumbProvider } from "@/shared/components/breadcrumb-context";
import { Button } from "@/shared/ui/button";

function getErrorInfo(error: unknown): { title: string; message: string } {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: "Page not found",
        message: "The page you're looking for doesn't exist or has been moved.",
      };
    }
    return {
      title: `${error.status} ${error.statusText}`,
      message: error.data?.message ?? "An unexpected error occurred.",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Something went wrong",
      message: import.meta.env.DEV ? error.message : "An unexpected error occurred. Please try again.",
    };
  }

  return {
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
  };
}

function ErrorContent({ title, message }: { title: string; message: string }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-1 items-center justify-center p-xl"
      data-testid="error-page"
    >
      <div className="w-full max-w-[var(--width-form-max)] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-light">
          <AlertTriangle className="h-8 w-8 text-on-error" aria-hidden="true" />
        </div>
        <h1 className="mt-md text-h3 text-foreground">{title}</h1>
        <p className="mt-sm text-body-sm text-foreground-muted">{message}</p>
        <div className="mt-lg flex justify-center gap-sm">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            data-testid="error-go-back"
            aria-label="Go back to previous page"
          >
            Go back
          </Button>
          <Button
            onClick={() => navigate("/overview", { replace: true })}
            data-testid="error-go-home"
            aria-label="Go to home page"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Error boundary for routes inside AppLayout (authenticated users). */
export function AuthenticatedErrorPage() {
  const error = useRouteError();
  const { title, message } = getErrorInfo(error);

  return (
    <BreadcrumbProvider>
      <div className="flex h-screen overflow-hidden bg-page">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex flex-1 overflow-y-auto">
            <ErrorContent title={title} message={message} />
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}

/** Error boundary for unauthenticated routes (login, oidc). */
export function AnonymousErrorPage() {
  const error = useRouteError();
  const { title, message } = getErrorInfo(error);

  return (
    <div className="flex min-h-screen" data-testid="error-page-anonymous">
      {/* Left panel — brand (mirrors login page) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col bg-dark-surface px-14 py-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand/5 blur-3xl" />

        <div className="relative">
          <img
            alt="ReactorCX logo"
            src="/rcx-logo-trimmed.png"
            className="h-10 w-auto brightness-0 invert"
          />
        </div>

        <div className="relative flex flex-1 flex-col justify-center">
          <h2 className="text-display">
            Drive Engagement
            <br />
            and Growth with
            <br />
            the Power of{" "}
            <span className="text-brand">ReactorCX</span>
          </h2>
        </div>

        <p className="relative mt-8 text-caption text-white/30">
          &copy; {new Date().getFullYear()} ReactorCX
        </p>
      </div>

      {/* Right panel — error message */}
      <div className="flex flex-1 items-center justify-center bg-page px-6">
        <div className="w-full max-w-[var(--width-auth-card)] text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-light">
            <AlertTriangle className="h-8 w-8 text-on-error" aria-hidden="true" />
          </div>
          <h1 className="mt-md text-h3 text-foreground">{title}</h1>
          <p className="mt-sm text-body-sm text-foreground-muted">{message}</p>
          <div className="mt-lg">
            <Button
              onClick={() => { window.location.href = "/login"; }}
              data-testid="error-go-login"
              aria-label="Go to login page"
            >
              Go to login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Root-level error boundary that picks the right UI based on auth state.
 * Used as the top-level errorElement to catch errors outside of any layout.
 */
export function RootErrorBoundary() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <AuthenticatedErrorPage />;
  }

  return <AnonymousErrorPage />;
}
