import Link from 'next/link';
import { Building2, GraduationCap, ShieldCheck, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/schools/schools-shared';

export function SchoolsOverview({
  canOnboard,
  onAddSchool,
  stats,
}: {
  canOnboard: boolean;
  onAddSchool: () => void;
  stats: {
    totalSchools: number;
    totalStudents: number;
    totalAdmins: number;
    avgStudents: number;
  };
}) {
  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Operations</p>
            <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Schools</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Manage institutions, leadership contacts, partners, and student capacity from one professional control surface.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canOnboard ? (
              <Button className="gap-2" onClick={onAddSchool}>
                <Building2 className="h-4 w-4" />
                Add School
              </Button>
            ) : null}
            <Link href="/configs">
              <Button variant="secondary" className="gap-2">
                <Upload className="h-4 w-4" />
                Master Uploads
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Total Schools" value={stats.totalSchools} />
        <MetricCard icon={Users} label="Total Students" value={stats.totalStudents} />
        <MetricCard icon={ShieldCheck} label="Total Admins" value={stats.totalAdmins} />
        <MetricCard icon={GraduationCap} label="Avg Students/School" value={stats.avgStudents} />
      </section>
    </>
  );
}

export function SchoolsAccessRestricted() {
  return (
    <Card>
      <div className="p-6">
        <p className="text-base font-semibold text-[var(--text)]">Access Restricted</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Only platform, partner, or school admins can view the schools management page.
        </p>
      </div>
    </Card>
  );
}
