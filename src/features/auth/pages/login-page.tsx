import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useLogin } from "@/shared/hooks/use-auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const loginMutation = useLogin();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => navigate("/overview", { replace: true }),
        onError: (err) => {
          const message =
            typeof err === "object" && err !== null && "message" in err
              ? (err as { message: string }).message
              : "Invalid credentials. Please try again.";
          setError(message);
        },
      },
    );
  }

  const loading = loginMutation.isPending;

  return (
    <div className="flex min-h-screen" data-testid="page-login">
      {/* Left panel — brand / decorative */}
      <div className="hidden lg:flex lg:w-[45%] flex-col bg-dark-surface px-14 py-12 text-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute top-1/2 right-12 h-40 w-40 rounded-full bg-white/[0.02] blur-2xl" />

        {/* Logo */}
        <div className="relative">
          <img alt="ReactorCX logo"
            src="/rcx-logo-trimmed.png"
            className="h-10 w-auto brightness-0 invert"
          />
        </div>

        {/* Hero text — centered in remaining space */}
        <div className="relative flex flex-1 flex-col justify-center">
          <h2 className="text-display">
            Drive Engagement
            <br />
            and Growth with
            <br />
            the Power of{" "}
            <span className="text-brand">ReactorCX</span>
          </h2>
          <p className="mt-8 max-w-[var(--width-auth-hero-text)] text-body-lg leading-relaxed text-white/50">
            Leverage the platform that runs some of the largest and most successful loyalty programs in the world.
          </p>
        </div>

        {/* Stats row — pinned to bottom */}
        <div className="relative flex gap-10">
          <div>
            <p className="text-h3 font-bold">500M+</p>
            <p className="mt-1 text-body-sm text-white/40">Memberships</p>
          </div>
          <div className="h-14 w-px bg-white/10" />
          <div>
            <p className="text-h3 font-bold">5B+</p>
            <p className="mt-1 text-body-sm text-white/40">Historical transactions</p>
          </div>
          <div className="h-14 w-px bg-white/10" />
          <div>
            <p className="text-h3 font-bold">50M+</p>
            <p className="mt-1 text-body-sm text-white/40">Daily transactions</p>
          </div>
        </div>

        <p className="relative mt-8 text-caption text-white/30">&copy; {new Date().getFullYear()} ReactorCX</p>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-page)] px-6">
        <div className="w-full max-w-[var(--width-auth-card)]">
          {/* Mobile brand (hidden on lg+) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img alt="ReactorCX logo"
              src="/rcx-logo-trimmed.png"
              className="h-10 w-auto"
            />
          </div>

          <h1 className="text-h3 text-[var(--color-text-primary)]">Sign in</h1>
          <p className="mt-1 mb-6 text-body-sm text-[var(--color-text-muted)]">
            Enter your credentials to access your account
          </p>

          {/* Card */}
          <div className="rounded-[var(--card-radius)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-lg shadow-[var(--shadow-card)]">
            <form aria-label="Login form" data-testid="login-form" onSubmit={handleSubmit} className="flex flex-col gap-md">
              {/* Error */}
              {error && (
                <div
                  className="rounded-md bg-error-light px-3 py-2 text-body-sm text-on-error"
                  data-testid="login-error"
                >
                  {error}
                </div>
              )}

              {/* Username */}
              <div className="flex flex-col gap-xs">
                <label htmlFor="login-username" className="text-body-sm font-medium text-[var(--color-text-primary)]">
                  Username
                </label>
                <input
                  data-testid="login-username-input"
                  id="login-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="org/username"
                  autoComplete="username"
                  className="w-full h-[var(--input-height)] rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-[var(--input-padding-x)] text-body-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-[var(--input-focus-border)] transition-colors"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-xs">
                <label htmlFor="login-password" className="text-body-sm font-medium text-[var(--color-text-primary)]">
                  Password
                </label>
                <input
                  data-testid="login-password-input"
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full h-[var(--input-height)] rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-[var(--input-padding-x)] text-body-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--input-focus-border)] focus:outline-none focus:ring-1 focus:ring-[var(--input-focus-border)] transition-colors"
                />
              </div>

              {/* Sign In button */}
              <button
                aria-label="Sign in"
                data-testid="login-submit-button"
                type="submit"
                disabled={loading}
                className="flex h-[var(--button-height)] items-center justify-center rounded-[var(--button-radius)] bg-brand px-[var(--button-padding-x)] text-body-sm font-semibold text-foreground-inverse hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-[var(--color-border-light)]" />
                <span className="text-caption text-[var(--color-text-muted)]">or</span>
                <div className="flex-1 border-t border-[var(--color-border-light)]" />
              </div>

              {/* SSO button */}
              <button
                aria-label="Sign in with OIDC SSO"
                data-testid="login-sso-button"
                type="button"
                onClick={() => { window.location.href = "/oidc/login"; }}
                className="flex h-[var(--button-height)] items-center justify-center rounded-[var(--button-radius)] border border-[var(--color-border-medium)] bg-[var(--color-bg-card)] px-[var(--button-padding-x)] text-body-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                Sign in with OIDC SSO
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
