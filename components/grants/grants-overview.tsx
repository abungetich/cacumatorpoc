import { BadgeCheck, ClipboardList, FileSpreadsheet, Send, Sparkles } from 'lucide-react';

import type { GrantsStats } from '@/lib/grants-workspace';

import { MetricCard } from '@/components/grants/grants-shared';

export function GrantsOverview({ stats }: { stats: GrantsStats }) {
  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Funding Pipeline</p>
        <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Grants</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Discovery, approvals, writing task splits, completion tracking, and final submission in one workflow.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Opportunities" value={stats.opportunities} icon={Sparkles} />
        <MetricCard label="Applications" value={stats.applications} icon={FileSpreadsheet} />
        <MetricCard label="Writing Stage" value={stats.writing} icon={ClipboardList} />
        <MetricCard label="Pending Approvals" value={stats.pendingApprovals} icon={BadgeCheck} />
        <MetricCard label="Submitted" value={stats.submitted} icon={Send} />
      </section>
    </>
  );
}
