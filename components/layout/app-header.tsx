"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProfileMenu } from "@/components/layout/profile-menu";

const ThemeSwitcher = dynamic(
  () => import("@/components/theme/theme-switcher").then((module) => module.ThemeSwitcher),
  { ssr: false },
);

export function AppHeader({ isScrolled }: { isScrolled: boolean }) {
  return (
    <header
      className={cn(
        "relative z-20 transition-all duration-300",
        isScrolled
          ? "border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] shadow-[0_12px_40px_-24px_var(--shadow)] backdrop-blur"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
