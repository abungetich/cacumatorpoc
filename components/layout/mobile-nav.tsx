"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { getNavItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = getNavItemsForRole(user?.role, user?.status);

  return (
    <div className="md:hidden">
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        onClick={() => setOpen((state) => !state)}
        aria-label="Open menu"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="absolute left-4 right-4 top-14 z-30 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  active ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "hover:bg-[var(--surface-2)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
