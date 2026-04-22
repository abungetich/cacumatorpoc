"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, BookOpen, ClipboardCheck, Compass, Layers2, Target, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { hasPermission } from "@/lib/permissions";
import { fetchMentorProgramApplicationsWorkspace } from "@/lib/program-discovery-actions";
import { fetchProgramsWorkspace } from "@/lib/programs-actions";

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProgramsOverviewPage() {
  const { user } = useAuth();

  const canManagePrograms = hasPermission(user?.role, "programs.manage");

  const workspaceQuery = useQuery({
    queryKey: ["programs-overview-workspace"],
    queryFn: () => fetchProgramsWorkspace(),
    enabled: canManagePrograms,
  });

  const enrollmentQuery = useQuery({
    queryKey: ["programs-overview-enrollment"],
    queryFn: () => fetchMentorProgramApplicationsWorkspace({ status: "PENDING" }),
    enabled: canManagePrograms,
  });

  const programs = useMemo(() => workspaceQuery.data?.items ?? [], [workspaceQuery.data?.items]);
  const pendingApplications = useMemo(() => enrollmentQuery.data?.items ?? [], [enrollmentQuery.data?.items]);

  const stats = useMemo(() => {
    const total = programs.length;
    const enrollmentOpen = programs.filter((item) => item.programStatus === "ENROLLMENT_OPEN").length;
    const active = programs.filter((item) => item.programStatus === "ACTIVE").length;
    const rolling = programs.filter((item) => item.rollingProgram).length;
    return { total, enrollmentOpen, active, rolling };
  }, [programs]);

  if (!canManagePrograms) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Use the mentor discovery workspace to browse and apply to programs." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_13%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Programs Module</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Overview</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Manage program structure, mentor enrollment, and analytics from dedicated workspaces instead of a single mixed screen.
        </p>
      </section>

      {workspaceQuery.isLoading || enrollmentQuery.isLoading ? <SectionSkeleton rows={6} /> : null}
      {workspaceQuery.error ? (
        <ErrorState
          title="Could not load program overview"
          description={workspaceQuery.error.message || "Try again."}
          onRetry={() => void workspaceQuery.refetch()}
        />
      ) : null}

      {!workspaceQuery.isLoading && !workspaceQuery.error ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Programs" value={stats.total} icon={BookOpen} />
            <MetricCard label="Enrollment Open" value={stats.enrollmentOpen} icon={Target} />
            <MetricCard label="Active Delivery" value={stats.active} icon={Users} />
            <MetricCard label="Rolling Models" value={stats.rolling} icon={Layers2} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <OverviewLinkCard
              href="/programs/catalog"
              title="Catalog"
              description="Create, edit, classify, and publish mentorship programs."
              icon={BookOpen}
              delayMs={0}
              meta={`${stats.total} programs across ${
                new Set(
                  programs.flatMap((item) => [
                    ...(item.school?.id ? [item.school.id] : []),
                    ...item.targetSchools.map((school) => school.id),
                  ]),
                ).size
              } schools`}
            />
            <OverviewLinkCard
              href="/programs/enrollment"
              title="Enrollment"
              description="Review mentor applications and move approved mentors into program pools."
              icon={ClipboardCheck}
              delayMs={140}
              meta={`${pendingApplications.length} pending mentor application${pendingApplications.length === 1 ? "" : "s"}`}
            />
            <OverviewLinkCard
              href="/programs/analytics"
              title="Analytics"
              description="Track lifecycle distribution, enrollment health, and delivery readiness."
              icon={BarChart3}
              delayMs={280}
              meta={`${programs.filter((item) => item.programStatus === "ACTIVE").length} active programs`}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Card className="space-y-4 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Enrollment Open</p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Programs currently accepting mentors</h2>
                </div>
                <Link href="/programs/catalog" className="text-sm font-medium text-[var(--primary)]">
                  Open catalog
                </Link>
              </div>
              <div className="space-y-3">
                {programs.filter((item) => item.programStatus === "ENROLLMENT_OPEN").slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="font-semibold text-[var(--text)]">{item.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.school?.name ?? (item.targetSchools.map((school) => school.name).join(", ") || "Open program")}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {formatEnum(item.category)} • {formatEnum(item.programFormat)} • {item.durationMonths} months
                    </p>
                  </div>
                ))}
                {programs.filter((item) => item.programStatus === "ENROLLMENT_OPEN").length === 0 ? (
                  <EmptyState title="No open programs" description="Move a program into Enrollment Open from the catalog." />
                ) : null}
              </div>
            </Card>

            <Card className="space-y-4 rounded-2xl p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Pending Review</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Mentor pool queue</h2>
              </div>
              <div className="space-y-3">
                {pendingApplications.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="font-semibold text-[var(--text)]">{item.mentor.name}</p>
                    <p className="text-sm text-[var(--muted)]">{item.program.name}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {item.commitmentHoursPerMonth} hrs/month • {item.interestAreas.join(", ")}
                    </p>
                  </div>
                ))}
                {pendingApplications.length === 0 ? (
                  <EmptyState title="Queue is clear" description="No mentor applications are waiting for review." />
                ) : null}
              </div>
            </Card>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-5 w-5 text-[var(--primary)]" />
              <div>
                <p className="font-semibold text-[var(--text)]">Mentor discovery is live.</p>
                <p className="text-sm text-[var(--muted)]">
                  Mentors now use `/programs/discover` to browse published programs and apply into program-specific mentor pools.
                </p>
              </div>
            </div>
          </section>
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
  icon: typeof BookOpen;
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

function OverviewLinkCard({
  href,
  title,
  description,
  icon: Icon,
  meta,
  delayMs = 0,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  meta: string;
  delayMs?: number;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),color-mix(in_oklab,var(--surface)_84%,var(--surface-2)))] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)] transition group-hover:-translate-y-0.5 group-hover:border-[color-mix(in_oklab,var(--primary)_24%,var(--border))] group-hover:shadow-[0_18px_36px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <span
            className="program-card-icon-orb inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-[color-mix(in_oklab,var(--primary)_14%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,white)] text-[var(--primary)]"
            style={{ animationDelay: `${delayMs}ms` }}
          >
            <Icon className="program-card-icon-float relative z-10 h-5 w-5" style={{ animationDelay: `${delayMs}ms` }} />
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--muted)] transition group-hover:text-[var(--primary)]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <p className="mt-4 text-xs font-medium text-[var(--muted)]">{meta}</p>
      </Card>
    </Link>
  );
}
