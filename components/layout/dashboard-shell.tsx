"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth } from "@/context/auth-context";

const SIDEBAR_STORAGE_KEY = "cacumator:sidebar-collapsed";

type DashboardShellProps = {
  children: React.ReactNode;
  branding: {
    platformName: string;
    logoUrl: string | null;
  };
};

export function DashboardShell({ children, branding }: DashboardShellProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!storedValue) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(storedValue === "true");
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    const handleScroll = () => {
      setIsScrolled(node.scrollTop > 12);
    };

    handleScroll();
    node.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      node.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const content = isLoading ? (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
        Loading workspace...
      </div>
    </div>
  ) : user ? (
    children
  ) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <AppSidebar branding={branding} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader isScrolled={isScrolled} />
        <main
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-6 md:pb-8"
        >
          {content}
        </main>
      </div>
    </div>
  );
}
