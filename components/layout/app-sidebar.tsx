"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  Shield,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { getNavItemsForRole, type AppNavItem, type AppNavChild } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  branding: {
    platformName: string;
    logoUrl: string | null;
  };
};

function matchesRoute(pathname: string, item: Pick<AppNavItem, "href"> | AppNavChild) {
  if (pathname !== item.href && !pathname.startsWith(`${item.href}/`)) {
    return false;
  }
  return true;
}

function isExactRoute(pathname: string, item: Pick<AppNavItem, "href"> | AppNavChild) {
  return pathname === item.href;
}

function matchesChildRoute(
  pathname: string,
  parent: Pick<AppNavItem, "href">,
  child: AppNavChild,
) {
  if (child.href === parent.href) {
    return isExactRoute(pathname, child);
  }

  return matchesRoute(pathname, child);
}

export function AppSidebar({ collapsed, onToggleCollapse, branding }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const resolvedNavItems = getNavItemsForRole(user?.role, user?.status);
  const [flyoutHref, setFlyoutHref] = useState<string | null>(null);
  const flyoutCloseTimer = useRef<number | null>(null);

  const clearFlyoutTimer = () => {
    if (flyoutCloseTimer.current) {
      window.clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };

  const openFlyout = (href: string) => {
    clearFlyoutTimer();
    setFlyoutHref(href);
  };

  const scheduleFlyoutClose = () => {
    clearFlyoutTimer();
    flyoutCloseTimer.current = window.setTimeout(() => {
      setFlyoutHref(null);
      flyoutCloseTimer.current = null;
    }, 120);
  };

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-300 md:flex md:flex-col",
        collapsed ? "w-24" : "w-72",
      )}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3",
            collapsed ? "w-full justify-center px-0" : "flex-1",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)]">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={`${branding.platformName} logo`} className="h-full w-full object-cover" />
            ) : (
              <Shield className="h-5 w-5" />
            )}
          </div>
          {!collapsed ? (
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{branding.platformName}</p>
              <p className="text-xs text-[var(--muted)]">Safeguarding First</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] md:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
        {resolvedNavItems.map((item) => {
          const Icon = item.icon;
          const active = isExactRoute(pathname, item);
          const hasActiveChild =
            item.children?.some((child) => matchesChildRoute(pathname, item, child)) ?? false;
          const expanded = !collapsed && (active || hasActiveChild);
          const flyoutOpen = collapsed && flyoutHref === item.href && Boolean(item.children?.length);
          return (
            <div
              key={item.href}
              className="relative space-y-1"
              onMouseEnter={() => {
                if (collapsed && item.children?.length) {
                  openFlyout(item.href);
                }
              }}
              onMouseLeave={() => {
                if (collapsed && item.children?.length) {
                  scheduleFlyoutClose();
                }
              }}
            >
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                onFocus={() => {
                  if (collapsed && item.children?.length) {
                    openFlyout(item.href);
                  }
                }}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm transition",
                  collapsed ? "justify-center" : "justify-between gap-3",
                  active || hasActiveChild
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "text-[var(--text)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                  <Icon className="h-4 w-4" />
                  {!collapsed ? item.label : null}
                </span>
                {item.children?.length && !collapsed ? (
                  <ChevronDown className={cn("h-4 w-4 transition-transform", expanded ? "rotate-180" : "")} />
                ) : null}
              </Link>

              {item.children?.length && expanded ? (
                <div className="ml-4 space-y-1 border-l border-[var(--border)] pl-3">
                  {item.children.map((child) => {
                    const childActive = matchesChildRoute(pathname, item, child);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-xs font-medium transition",
                          childActive
                            ? "bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface-2))] text-[var(--primary)] ring-1 ring-[color-mix(in_oklab,var(--primary)_18%,transparent)]"
                            : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {flyoutOpen ? (
                <div
                  className="absolute left-[calc(100%+0.75rem)] top-0 z-50 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                  onMouseEnter={clearFlyoutTimer}
                  onMouseLeave={scheduleFlyoutClose}
                >
                  <div className="mb-2 border-b border-[var(--border)] pb-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{item.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Open a child workspace</p>
                  </div>
                  <div className="space-y-1">
                    {item.children?.map((child) => {
                      const childActive = matchesChildRoute(pathname, item, child);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setFlyoutHref(null)}
                          className={cn(
                            "block rounded-xl px-3 py-2 text-sm transition",
                            childActive
                              ? "bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface-2))] text-[var(--primary)] ring-1 ring-[color-mix(in_oklab,var(--primary)_18%,transparent)]"
                              : "text-[var(--text)] hover:bg-[var(--surface-2)]",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="p-4 pt-0">
        {user ? (
          <div
            className={cn(
              "rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--muted)]",
              collapsed ? "p-2 text-center" : "p-3",
            )}
          >
            {!collapsed ? (
              <>
                <p className="font-medium text-[var(--text)]">Signed in as</p>
                <p>{user.role.replaceAll("_", " ")}</p>
                <p className="truncate">{user.email}</p>
              </>
            ) : (
              <p className="font-medium text-[var(--text)]" title={user.role.replaceAll("_", " ")}>
                {user.role.slice(0, 2)}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
