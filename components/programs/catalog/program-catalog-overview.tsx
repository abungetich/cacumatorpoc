import type { ComponentType } from 'react';
import { BookOpen, Briefcase, Layers2, MapPinned, Power, ShieldCheck, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatEnumLabel } from '@/lib/programs-catalog';

type Stats = {
  total: number;
  active: number;
  enrollmentOpen: number;
  rolling: number;
  linkedMentorships: number;
};

export function ProgramCatalogOverview({
  stats,
  lifecycleBreakdown,
  onCreate,
}: {
  stats: Stats;
  lifecycleBreakdown: Array<{ status: string; count: number }>;
  onCreate: () => void;
}) {
  return (
    <>
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Program Catalog</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Build and manage the full program catalog.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Create, edit, classify, and publish mentorship programs with lifecycle, targeting, mentor requirements, and delivery structure in one workspace.
            </p>
          </div>
          <Button className="gap-2" onClick={onCreate}>
            <BookOpen className="h-4 w-4" />
            New Program
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Programs" value={stats.total} icon={BookOpen} />
        <MetricCard label="Enrollment Open" value={stats.enrollmentOpen} icon={Target} />
        <MetricCard label="Active Delivery" value={stats.active} icon={Power} />
        <MetricCard label="Rolling Models" value={stats.rolling} icon={Layers2} />
        <MetricCard label="Linked Mentorships" value={stats.linkedMentorships} icon={Users} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Lifecycle</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Program states</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {lifecycleBreakdown.map((item) => (
              <MetricTile key={item.status} label={formatEnumLabel(item.status)} value={item.count} />
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Discovery Rules</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Mentor-facing shape</h2>
          </div>
          <div className="grid gap-3">
            <DiscoveryRule icon={Briefcase} title="Category and theme" description="Mentors filter by category, themes, and purpose area before they apply." />
            <DiscoveryRule icon={MapPinned} title="Target geography" description="County, region, and country targeting narrow discovery to valid program scope." />
            <DiscoveryRule icon={ShieldCheck} title="Eligibility controls" description="Background checks, safeguarding, alumni-only, and experience thresholds gate enrollment." />
          </div>
        </Card>
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
    <Card className="rounded-2xl border-[var(--border)] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function DiscoveryRule({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-[var(--text)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
