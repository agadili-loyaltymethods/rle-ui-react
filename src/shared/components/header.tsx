import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Menu, Bell, LogOut, User, Moon, Sun } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useUIStore } from "@/shared/stores/ui-store";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";

function UserInitials({ user }: { user: { empName?: string; login: string } }) {
  const parts = user.empName?.trim().split(/\s+/);
  const initials =
    parts && parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : user.login.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-caption font-semibold text-foreground-inverse">
      {initials}
    </div>
  );
}

export function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setSidebarMobileOpen = useUIStore((s) => s.setSidebarMobileOpen);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    navigate("/login");
  }

  function handleToggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <header
      className="flex h-[var(--header-height)] shrink-0 items-center gap-4 border-b border-[var(--color-border-light)] bg-[var(--color-bg-card)] px-4 lg:px-6"
      data-testid="app-header"
    >
      {/* Left — hamburger + breadcrumbs */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <button
          data-testid="header-hamburger"
          aria-label="Open sidebar"
          onClick={() => setSidebarMobileOpen(true)}
          className="lg:hidden flex items-center justify-center rounded-md p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Breadcrumbs />
      </div>

      {/* Right — search + notifications + user */}
      <div className="flex items-center gap-1">
        <CommandPalette navigate={navigate} />

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center rounded-md p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          data-testid="header-notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-error)]" />
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            data-testid="header-user-menu-trigger"
            aria-label="User menu"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center justify-center rounded-md p-1 hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {user ? <UserInitials user={user} /> : <User className="h-5 w-5" />}
          </button>

          {userMenuOpen && (
            <div
              className={cn(
                "absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-card)] py-1",
                "shadow-[var(--shadow-dropdown)] z-[var(--z-dropdown)]",
              )}
              data-testid="header-user-menu"
            >
              {user && (
                <div className="border-b border-[var(--color-border-light)] px-3 py-2">
                  <p className="text-body-sm font-medium text-[var(--color-text-primary)]">
                    {user.empName || user.login}
                  </p>
                  <p className="text-caption text-[var(--color-text-muted)] truncate">{user.email}</p>
                </div>
              )}

              <button
                data-testid="header-user-menu-profile"
                aria-label="Profile"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/settings/account");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </button>

              <button
                onClick={handleToggleTheme}
                className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                data-testid="header-user-menu-theme-toggle"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>

              <div className="my-1 border-t border-[var(--color-border-light)]" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-[var(--color-error)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                data-testid="header-user-menu-logout"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
