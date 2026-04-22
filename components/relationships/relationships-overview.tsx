import type { ComponentType } from 'react';
import { Card } from '@/components/ui/card';

export function RelationshipsOverview({
  stats,
  icons,
}: {
  stats: { active: number; atRisk: number; reviewDue: number; upcoming: number };
  icons: Record<'active' | 'atRisk' | 'reviewDue' | 'upcoming', ComponentType<{ className?: string }>>;
}) {
  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Lifecycle Operations</p>
        <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Relationships</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Manage live mentorship quality, review milestones, and closure transitions.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active" value={stats.active} icon={icons.active} />
        <MetricCard label="At Risk" value={stats.atRisk} icon={icons.atRisk} />
        <MetricCard label="Review Due" value={stats.reviewDue} icon={icons.reviewDue} />
        <MetricCard label="Upcoming 7 Days" value={stats.upcoming} icon={icons.upcoming} />
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl border-[var(--border)] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
