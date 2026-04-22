"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function toTitle(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const items = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return { href, label: toTitle(segment) };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <Link href="/work-queue" className="hover:text-[var(--text)]">
        Home
      </Link>
      {items.map((item) => (
        <span key={item.href} className="flex items-center gap-2">
          <span>/</span>
          <Link href={item.href} className="hover:text-[var(--text)]">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
