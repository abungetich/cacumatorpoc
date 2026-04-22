'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function PublicHeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--text)]"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_90%,white)] px-4 py-2.5 text-sm font-medium text-[var(--text)]"
      >
        Register as mentor
      </Link>
      <Link
        href="/register/organization"
        className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"
      >
        Register organization
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
