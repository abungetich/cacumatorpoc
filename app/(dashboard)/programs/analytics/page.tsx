"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BookOpen, ClipboardCheck, Layers2, Target, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { hasPermission } from "@/lib/permissions";
import { fetchMentorProgramApplicationsWorkspace } from "@/lib/program-discovery-actions";
import { fetchProgramsWorkspace } from "@/lib/programs-actions";
import { programStatuses } from "@/lib/programs-config";

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProgramAnalyticsPage() {
  const { user } = useAuth();

  const canManagePrograms = hasPermission(user?.role, "programs.manage");

  const workspaceQuery = useQuery({
    queryKey: ["program-analytics-workspace"],
    queryFn: () => fetchProgramsWorkspace(),
    enabled: canManagePrograms,
  });

  const enrollmentQuery = useQuery({
    queryKey: ["program-analytics-enrollment"],
    queryFn: () => fetchMentorProgramApplicationsWorkspace({ status: "ALL" }),
    enabled: canManagePrograms,
  });

  const programs = useMemo(() => workspaceQuery.data?.items ?? [], [workspaceQuery.data?.items]);
  const applications = useMemo(() => enrollmentQuery.data?.items ?? [], [enrollmentQuery.data?.items]);

  const stats = useMemo(() => {
    const activePrograms = programs.filter((item) => item.programStatus === "ACTIVE").length;
    const enrollmentOpen = programs.filter((item) => item.programStatus === "ENROLLMENT_OPEN").length;
    const approvedApplications = applications.filter((item) => item.status === "APPROVED").length;
    const pendingApplications = applications.filter((item) => item.status === "PENDING").length;
    const matchingReadyPrograms = programs.filter((item) => item.programStatus === "ACTIVE" || item.programStatus === "ENROLLMENT_OPEN").length;
    const mentorships = programs.reduce((sum, item) => sum + item.mentorshipCount, 0);

    return {
      activePrograms,
      enrollmentOpen,
      approvedApplications,
      pendingApplications,
      matchingReadyPrograms,
      mentorships,
    };
  }, [applications, programs]);

  const lifecycleRows = useMemo(
    () =>
      programStatuses.map((status) => ({
        status,
        count: programs.filter((item) => item.programStatus === status).length,
      })),
    [programs],
  );

  const categoryRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const program of programs) {
      counts.set(program.category, (counts.get(program.category) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [programs]);

  const topPrograms = useMemo(
    () =>
      [...programs]
        .sort((a, b) => b.mentorshipCount - a.mentorshipCount)
        .slice(0, 5),
    [programs],
  );

  if (!canManagePrograms) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only admin roles can access program analytics." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Program Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Track delivery health and enrollment momentum.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Review lifecycle distribution, mentor pool flow, and the programs that are actually converting into active mentorships.
        </p>
      </section>

      {workspaceQuery.isLoading || enrollmentQuery.isLoading ? <SectionSkeleton rows={6} /> : null}
      {workspaceQuery.error ? (
        <ErrorState
          title="Could not load analytics"
          description={workspaceQuery.error.message || "Try again."}
          onRetry={() => void workspaceQuery.refetch()}
        />
      ) : null}

      {!workspaceQuery.isLoading && !workspaceQuery.error ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Active Programs" value={stats.activePrograms} icon={BookOpen} />
            <MetricCard label="Enrollment Open" value={stats.enrollmentOpen} icon={Target} />
            <MetricCard label="Pending Applications" value={stats.pendingApplications} icon={ClipboardCheck} />
            <MetricCard label="Approved Applications" value={stats.approvedApplications} icon={Users} />
            <MetricCard label="Matching Ready" value={stats.matchingReadyPrograms} icon={TrendingUp} />
            <MetricCard label="Linked Mentorships" value={stats.mentorships} icon={Layers2} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="space-y-4 rounded-2xl p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Lifecycle Distribution</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Program status mix</h2>
              </div>
              <div className="space-y-3">
                {lifecycleRows.map((row) => (
                  <div key={row.status} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--text)]">{formatEnum(row.status)}</p>
                      <p className="text-xl font-semibold text-[var(--text)]">{row.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4 rounded-2xl p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Category Mix</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Program classification spread</h2>
              </div>
              <div className="space-y-3">
                {categoryRows.map((row) => (
                  <div key={row.category} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--text)]">{formatEnum(row.category)}</p>
                      <p className="text-xl font-semibold text-[var(--text)]">{row.count}</p>
                    </div>
                  </div>
                ))}
                {categoryRows.length === 0 ? <EmptyState title="No data yet" description="Create some programs to populate category analytics." /> : null}
              </div>
            </Card>
          </section>

          <Card className="space-y-4 rounded-2xl p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Top Programs</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Programs driving the most mentorships</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Program</th>
                    <th className="px-3 py-3 font-semibold">School</th>
                    <th className="px-3 py-3 font-semibold">Lifecycle</th>
                    <th className="px-3 py-3 font-semibold">Mentorships</th>
                  </tr>
                </thead>
                <tbody>
                  {topPrograms.length === 0 ? (
                    <tr>
                      <td className="px-3 py-5 text-[var(--muted)]" colSpan={4}>
                        No program data available.
                      </td>
                    </tr>
                  ) : (
                    topPrograms.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[var(--text)]">{item.name}</p>
                          <p className="text-xs text-[var(--muted)]">{formatEnum(item.category)}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--muted)]">
                          {item.school?.name ?? (item.targetSchools.map((school) => school.name).join(", ") || "Open program")}
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatEnum(item.programStatus)}</td>
                        <td className="px-3 py-3 text-xs font-semibold text-[var(--text)]">{item.mentorshipCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof BarChart3;
}) {
  return (
    <Card className="rounded-2xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
