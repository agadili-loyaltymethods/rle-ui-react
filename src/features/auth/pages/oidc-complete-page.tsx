import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuthStore } from "@/shared/stores/auth-store";
import { apiClient } from "@/shared/lib/api-client";
import type { MyAccountResponse } from "@/shared/types/auth";

/**
 * OIDC callback landing page. The Express server redirects here after
 * exchanging the auth code with Okta and calling oidcsync. URL params:
 * - token + username → successful login
 * - error → display error message
 */
export default function OidcCompletePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
      return;
    }

    const token = searchParams.get("token");
    const username = searchParams.get("username");

    if (!token || !username) {
      setError("Missing authentication data.");
      return;
    }

    // Fetch full user profile with the token
    async function completeLogin(token: string) {
      try {
        // Set the token first so the interceptor picks it up
        useAuthStore.getState().login(token, {
          id: "",
          login: username!,
          email: "",
        });

        // Fetch the user profile to get full user data
        const res = await apiClient.get<MyAccountResponse>("/myaccount");
        login(token, {
          id: res.data.id,
          login: res.data.login,
          email: res.data.email,
          division: res.data.division?._id,
          possibleDivisions: res.data.possibleDivisions?.map((d) => d._id),
        });

        navigate("/overview", { replace: true });
      } catch {
        // If /me fails, still log in with basic info
        login(token, {
          id: "",
          login: username!,
          email: "",
        });
        navigate("/overview", { replace: true });
      }
    }

    completeLogin(token);
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
        <div className="w-full max-w-[24rem] rounded-[var(--card-radius)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-lg shadow-[var(--shadow-card)]">
          <h1 className="text-h3 text-[var(--color-text-primary)]">
            Authentication Error
          </h1>
          <p className="mt-2 text-body-sm text-[var(--color-error)]">{error}</p>
          <button
            aria-label="Back to login"
            data-testid="oidc-back-to-login-button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-4 flex h-[var(--button-height)] w-full items-center justify-center rounded-[var(--button-radius)] bg-[#F47A20] px-[var(--button-padding-x)] text-body-sm font-semibold text-white hover:bg-[#D86514] transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-body-sm text-[var(--color-text-muted)]">
          Completing sign-in...
        </p>
      </div>
    </div>
  );
}
