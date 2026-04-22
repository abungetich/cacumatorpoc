"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Flatpickr from "react-flatpickr";
import { ArrowLeft, BarChart3, BookOpenCheck, Clock3, Filter, RotateCcw, ShieldCheck, Users2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorState, SectionSkeleton } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { RenderedRichText } from "@/components/ui/rendered-rich-text";
import { fetchMentorTrainingModuleDetail } from "@/lib/mentor-starter-pack-actions";

function formatRelativeDate(value: string | null) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  const diffMinutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");

  const diffMonths = Math.round(diffDays / 30);
  return rtf.format(diffMonths, "month");
}

function tone(active: boolean) {
  return active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700";
}

function requirementTone(required: boolean) {
  return required ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-[24px] p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{value}</p>
          <p className="text-xs text-[var(--muted)]">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) return null;
  const index = (sortedValues.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function buildBoxPlot(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: percentile(sorted, 0.25) ?? sorted[0],
    median: percentile(sorted, 0.5) ?? sorted[0],
    q3: percentile(sorted, 0.75) ?? sorted[sorted.length - 1],
    max: sorted[sorted.length - 1],
  };
}

function BoxPlotCard({
  title,
  description,
  values,
  maxValue,
  suffix = "",
}: {
  title: string;
  description: string;
  values: number[];
  maxValue: number;
  suffix?: string;
}) {
  const stats = buildBoxPlot(values);
  if (!stats) {
    return (
      <Card className="rounded-[26px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{title}</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">No distribution yet</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </Card>
    );
  }

  const scale = (value: number) => `${Math.max((value / Math.max(maxValue, 1)) * 100, 0)}%`;

  return (
    <Card className="rounded-[26px] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{title}</p>
      <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Distribution snapshot</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>

      <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-5">
        <div className="relative h-16">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border)]" />
          <div className="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-[var(--primary)]" style={{ left: scale(stats.min) }} />
          <div className="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-[var(--primary)]" style={{ left: scale(stats.max) }} />
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-[var(--primary)]"
            style={{ left: scale(stats.min), width: `calc(${scale(stats.max)} - ${scale(stats.min)})` }}
          />
          <div
            className="absolute top-1/2 h-10 -translate-y-1/2 rounded-xl border border-[var(--primary)]/30 bg-[color-mix(in_srgb,var(--primary)_14%,white)]"
            style={{ left: scale(stats.q1), width: `calc(${scale(stats.q3)} - ${scale(stats.q1)})` }}
          />
          <div className="absolute top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-[var(--primary)]" style={{ left: scale(stats.median) }} />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 text-xs text-[var(--muted)]">
          <div>Min<br /><span className="font-semibold text-[var(--text)]">{Math.round(stats.min)}{suffix}</span></div>
          <div>Q1<br /><span className="font-semibold text-[var(--text)]">{Math.round(stats.q1)}{suffix}</span></div>
          <div>Median<br /><span className="font-semibold text-[var(--text)]">{Math.round(stats.median)}{suffix}</span></div>
          <div>Q3<br /><span className="font-semibold text-[var(--text)]">{Math.round(stats.q3)}{suffix}</span></div>
          <div>Max<br /><span className="font-semibold text-[var(--text)]">{Math.round(stats.max)}{suffix}</span></div>
        </div>
      </div>
    </Card>
  );
}

export default function SettingsTrainingDetailPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = use(params);
  const [search, setSearch] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [schoolFilter, setSchoolFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const detailQuery = useQuery({
    queryKey: ["mentor-training-settings", moduleId, organizationFilter, schoolFilter, dateFrom, dateTo],
    queryFn: () =>
      fetchMentorTrainingModuleDetail(moduleId, {
        organizationId: organizationFilter === "ALL" ? undefined : organizationFilter,
        schoolId: schoolFilter === "ALL" ? undefined : schoolFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const item = detailQuery.data?.item;

  const filteredParticipation = useMemo(() => {
    const rows = item?.participation ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      return [row.name, row.email, row.acknowledgedName, row.notes ?? ""].some((value) => value.toLowerCase().includes(query));
    });
  }, [item?.participation, search]);

  const filteredAttempts = useMemo(() => {
    const rows = item?.attempts ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      return [row.name, row.email, row.acknowledgedName, String(row.score), row.passed ? "passed" : "failed"].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [item?.attempts, search]);

  const scoreBandDistribution = useMemo(() => {
    const bands = [
      { label: "0-49", min: 0, max: 49, count: 0 },
      { label: "50-69", min: 50, max: 69, count: 0 },
      { label: "70-84", min: 70, max: 84, count: 0 },
      { label: "85-99", min: 85, max: 99, count: 0 },
      { label: "100", min: 100, max: 100, count: 0 },
    ];
    for (const attempt of item?.attempts ?? []) {
      const band = bands.find((entry) => attempt.score >= entry.min && attempt.score <= entry.max);
      if (band) band.count += 1;
    }
    return bands;
  }, [item?.attempts]);

  const scoreValues = useMemo(() => (item?.attempts ?? []).map((attempt) => attempt.score), [item?.attempts]);

  const attemptsPerMentor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const attempt of item?.attempts ?? []) {
      counts.set(attempt.userId, (counts.get(attempt.userId) ?? 0) + 1);
    }
    return Array.from(counts.values());
  }, [item?.attempts]);

  const selectedQuestion = useMemo(
    () => item?.questionAnalytics.find((question) => question.questionId === selectedQuestionId) ?? item?.questionAnalytics[0] ?? null,
    [item?.questionAnalytics, selectedQuestionId],
  );

  const hasActiveCohortFilters = organizationFilter !== "ALL" || schoolFilter !== "ALL" || Boolean(dateFrom) || Boolean(dateTo);

  const cohortSummary = (() => {
    const parts = [];
    if (organizationFilter !== "ALL") {
      parts.push(item?.filters.organizations.find((entry) => entry.id === organizationFilter)?.name ?? "Selected organization");
    }
    if (schoolFilter !== "ALL") {
      parts.push(item?.filters.schools.find((entry) => entry.id === schoolFilter)?.name ?? "Selected school");
    }
    if (dateFrom || dateTo) {
      parts.push(`${dateFrom || "start"} to ${dateTo || "today"}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "All cohorts";
  })();

  function resetCohortFilters() {
    setOrganizationFilter("ALL");
    setSchoolFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link href="/settings/training" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)]">
              <ArrowLeft className="h-4 w-4" />
              Back to training registry
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${requirementTone(item?.required ?? false)}`}>
                {item?.required ? "Required" : "Optional"}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(item?.isActive ?? false)}`}>
                {item?.isActive ? "Active" : "Inactive"}
              </span>
              {item?.version ? (
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{item.version}</span>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Training Module</p>
              <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">{item?.title ?? "Module detail"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {item?.description ?? "Inspect module uptake, recorded acknowledgements, and completion activity here."}
              </p>
            </div>
          </div>

          <Card className="max-w-md rounded-[24px] border border-[var(--border)] bg-white/80 p-4 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Placement</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text)]">
              Module definitions can stay in Settings while the platform is stabilizing. Long term, runtime analytics and module operations belong in a top-level
              {" "}
              <span className="font-semibold text-[var(--primary)]">Training</span>
              {" "}
              workspace.
            </p>
          </Card>
        </div>
      </section>

      {detailQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={8} />
        </Card>
      ) : null}

      {detailQuery.error ? (
        <Card>
          <ErrorState
            title="Could not load training module"
            description={detailQuery.error.message || "Try refreshing."}
            onRetry={() => void detailQuery.refetch()}
          />
        </Card>
      ) : null}

      {item ? (
        <>
          <Card className="rounded-[26px] p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                  <Filter className="h-3.5 w-3.5" />
                  Cohort Slice
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text)]">Compare this module across cohorts</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Filter attempts, participation, and question performance by organization, school, and completion window.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">Active slice</span>
                <span>{cohortSummary}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_1fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Organization</span>
                <select
                  value={organizationFilter}
                  onChange={(event) => setOrganizationFilter(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
                >
                  <option value="ALL">All organizations</option>
                  {item.filters.organizations.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">School</span>
                <select
                  value={schoolFilter}
                  onChange={(event) => setSchoolFilter(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
                >
                  <option value="ALL">All schools</option>
                  {item.filters.schools.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">From</span>
                <Flatpickr
                  value={dateFrom || undefined}
                  options={{ dateFormat: "Y-m-d" }}
                  onChange={(dates) => setDateFrom(dates[0] ? dates[0].toISOString().slice(0, 10) : "")}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
                  placeholder="Start date"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">To</span>
                <Flatpickr
                  value={dateTo || undefined}
                  options={{ dateFormat: "Y-m-d" }}
                  onChange={(dates) => setDateTo(dates[0] ? dates[0].toISOString().slice(0, 10) : "")}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
                  placeholder="End date"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetCohortFilters}
                  disabled={!hasActiveCohortFilters}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </Card>

          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              icon={<Users2 className="h-5 w-5" />}
              label="Participants"
              value={String(item.participantsCount)}
              detail="Distinct mentors with a recorded completion."
            />
            <MetricCard
              icon={<BookOpenCheck className="h-5 w-5" />}
              label="Attempts"
              value={String(item.analytics.totalAttempts)}
              detail={`${item.questionCount} questions • ${item.passingScore}% pass mark${item.maxAttempts ? ` • max ${item.maxAttempts}` : ""}`}
            />
            <MetricCard
              icon={<Clock3 className="h-5 w-5" />}
              label="Average Score"
              value={item.analytics.averageScore !== null ? `${item.analytics.averageScore}%` : "-"}
              detail={
                item.analytics.passRate !== null
                  ? `${item.analytics.passRate}% pass rate across recorded attempts`
                  : "No scored attempts recorded yet."
              }
            />
            <MetricCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Last Completion"
              value={formatRelativeDate(item.lastCompletedAt)}
              detail={item.lastCompletedAt ? new Date(item.lastCompletedAt).toLocaleString() : "No completion recorded yet."}
            />
            <MetricCard
              icon={<BookOpenCheck className="h-5 w-5" />}
              label="First Pass"
              value={item.analytics.firstAttemptPassRate !== null ? `${item.analytics.firstAttemptPassRate}%` : "-"}
              detail="Mentors who passed on their first try."
            />
            <MetricCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Median Attempts"
              value={item.analytics.medianAttemptsToPass !== null ? String(item.analytics.medianAttemptsToPass) : "-"}
              detail="Typical number of tries before passing."
            />
            <MetricCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Exhausted Limits"
              value={String(item.analytics.maxAttemptExhaustedCount)}
              detail="Mentors who used all allowed attempts without passing."
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-[26px] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Activity</p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Attempt trend</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    This module now tracks scored attempts. Use this to inspect actual assessment activity instead of relying only on completions.
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <BarChart3 className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {item.analytics.recentAttempts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">
                    No quiz attempts recorded yet for this module.
                  </div>
                ) : (
                  item.analytics.recentAttempts.map((entry) => {
                    const maxCount = Math.max(...item.analytics.recentAttempts.map((row) => row.count), 1);
                    const width = `${Math.max((entry.count / maxCount) * 100, 8)}%`;

                    return (
                      <div key={entry.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-[var(--text)]">{entry.label}</p>
                          <p className="text-xs text-[var(--muted)]">{entry.count} attempts</p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),color-mix(in_srgb,var(--primary)_55%,white))]" style={{ width }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="rounded-[26px] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Module Note</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Assessment structure</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.activityNote}</p>

              <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Definition snapshot</p>
                <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
                  <p>Pass mark: <span className="font-semibold">{item.passingScore}%</span></p>
                  <p>Question bank: <span className="font-semibold">{item.questionCount} active questions</span></p>
                  <p>Attempts: <span className="font-semibold">{item.maxAttempts ? `max ${item.maxAttempts}` : "Unlimited"}</span></p>
                  <p>Estimated duration: <span className="font-semibold">{item.estimatedMinutes ? `${item.estimatedMinutes} mins` : "Not set"}</span></p>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <BoxPlotCard
              title="Score Distribution"
              description="Box plot of recorded quiz scores. Use this to spot spread, clustering, and whether most mentors are only barely passing."
              values={scoreValues}
              maxValue={100}
              suffix="%"
            />

            <Card className="rounded-[26px] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Score Bands</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Where scores are landing</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Quick distribution view across low, moderate, high, and perfect scores.
              </p>
              <div className="mt-6 space-y-4">
                {scoreBandDistribution.map((band) => {
                  const maxCount = Math.max(...scoreBandDistribution.map((entry) => entry.count), 1);
                  const width = `${Math.max((band.count / maxCount) * 100, band.count > 0 ? 8 : 0)}%`;
                  return (
                    <div key={band.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--text)]">{band.label}</p>
                        <p className="text-xs text-[var(--muted)]">{band.count} attempts</p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),color-mix(in_srgb,var(--primary)_55%,white))]" style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <BoxPlotCard
              title="Attempts Per Mentor"
              description="Box plot of how many tries mentors are using before they finish or pass. This helps identify modules that need remediation."
              values={attemptsPerMentor}
              maxValue={Math.max(...attemptsPerMentor, 1)}
            />

            <Card className="rounded-[26px] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Pass Snapshot</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Pass vs remediation</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                High failure rates here usually mean the module body, question wording, or pass threshold needs review.
              </p>
              <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="h-4 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${item.analytics.passRate ?? 0}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Pass Rate</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-900">{item.analytics.passRate ?? 0}%</p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-700">Needs Retry</p>
                    <p className="mt-1 text-2xl font-semibold text-rose-900">{item.analytics.passRate !== null ? 100 - item.analytics.passRate : 0}%</p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[26px] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Module Body</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Authored content</h2>
              </div>
              <div className="mt-4 max-h-[420px] overflow-y-auto rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <RenderedRichText html={item.moduleBody} />
              </div>
            </Card>

            <Card className="rounded-[26px] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Question Bank</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Scored questions</h2>
              </div>
              <div className="mt-4 space-y-3">
                {item.questions.map((question, index) => (
                  <div key={question.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text)]">Question {index + 1}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">
                        {question.questionType === "MULTI_CHOICE" ? "Multi choice" : "Single choice"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text)]">{question.prompt}</p>
                    {question.imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-[20px] border border-[var(--border)] bg-white p-3">
                        <Image src={question.imageUrl} alt={`Question ${index + 1}`} width={1200} height={720} className="max-h-72 w-full object-contain" />
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.options.map((option) => (
                        <span
                          key={`${question.id}-${option}`}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            question.correctAnswers.includes(option) ? "bg-emerald-100 text-emerald-800" : "bg-white text-[var(--text)]"
                          }`}
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                    {question.explanation ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{question.explanation}</p> : null}
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden rounded-[26px] p-0">
              <div className="border-b border-[var(--border)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Question Performance</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Difficulty and distractors</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Use this table to identify hard questions, weak distractors, and where mentors are skipping or guessing.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Question</th>
                      <th className="px-4 py-3 font-medium">Difficulty</th>
                      <th className="px-4 py-3 font-medium">Correct</th>
                      <th className="px-4 py-3 font-medium">Skipped</th>
                      <th className="px-4 py-3 font-medium">Top Wrong</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.questionAnalytics.map((question, index) => (
                      <tr
                        key={question.questionId}
                        className={`cursor-pointer border-t border-[var(--border)] align-top transition hover:bg-[var(--surface-2)] ${selectedQuestion?.questionId === question.questionId ? "bg-[var(--surface-2)]" : ""}`}
                        onClick={() => setSelectedQuestionId(question.questionId)}
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[var(--text)]">Question {index + 1}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{question.prompt}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              question.difficultyLabel === "Easy"
                                ? "bg-emerald-100 text-emerald-800"
                                : question.difficultyLabel === "Balanced"
                                  ? "bg-amber-100 text-amber-800"
                                  : question.difficultyLabel === "Hard"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {question.difficultyLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[var(--text)]">{question.correctRate ?? 0}%</td>
                        <td className="px-4 py-4 text-[var(--text)]">{question.skippedCount}</td>
                        <td className="px-4 py-4 text-[var(--muted)]">{question.topWrongAnswer ?? "No wrong answers yet"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="rounded-[26px] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Question Drilldown</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
                {selectedQuestion ? "Selected question" : "Choose a question"}
              </h2>
              {selectedQuestion ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
                      {selectedQuestion.questionType === "MULTI_CHOICE" ? "Multi choice" : "Single choice"}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
                      {selectedQuestion.responseCount} responses
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
                      {selectedQuestion.skippedCount} skipped
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--text)]">{selectedQuestion.prompt}</p>
                  <div className="mt-4 grid gap-3">
                    {selectedQuestion.optionBreakdown.map((option) => {
                      const maxCount = Math.max(...selectedQuestion.optionBreakdown.map((entry) => entry.count), 1);
                      const width = `${Math.max((option.count / maxCount) * 100, 6)}%`;
                      const isCorrect = selectedQuestion.correctAnswers.includes(option.option);
                      return (
                        <div key={`${selectedQuestion.questionId}-${option.option}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`text-sm ${isCorrect ? "font-semibold text-emerald-700" : "text-[var(--text)]"}`}>{option.option}</p>
                            <span className="text-xs text-[var(--muted)]">{option.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white">
                            <div className={`h-2 rounded-full ${isCorrect ? "bg-emerald-500" : "bg-[var(--primary)]"}`} style={{ width }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text)]">
                    <p>
                      Difficulty: <span className="font-semibold">{selectedQuestion.difficultyLabel}</span>
                    </p>
                    <p className="mt-2">
                      Top wrong answer: <span className="font-semibold">{selectedQuestion.topWrongAnswer ?? "No wrong answer pattern yet"}</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">
                  Select a question from the performance table to inspect response patterns.
                </div>
              )}
            </Card>
          </section>

          <Card className="overflow-hidden rounded-[26px] p-0">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Attempts</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Scored quiz submissions</h2>
              </div>
              <div className="w-full lg:max-w-sm">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mentors, scores, or outcome..." />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mentor</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Acknowledged As</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                        No attempt records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--border)] align-top">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-[var(--text)]">{row.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">{row.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {row.score}% {row.passed ? "Passed" : "Below threshold"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[var(--text)]">{formatRelativeDate(row.submittedAt)}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{new Date(row.submittedAt).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-4 text-[var(--text)]">{row.acknowledgedName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[26px] p-0">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Participation</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Recorded acknowledgements</h2>
              </div>
              <div className="w-full lg:max-w-sm">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by mentor, email, or acknowledgement..." />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mentor</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium">Acknowledged As</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipation.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                        No participation records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipation.map((row) => (
                      <tr key={`${row.userId}-${row.completedAt}`} className="border-t border-[var(--border)] align-top">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-[var(--text)]">{row.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">{row.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[var(--text)]">{formatRelativeDate(row.completedAt)}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{new Date(row.completedAt).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-4 text-[var(--text)]">{row.acknowledgedName}</td>
                        <td className="px-4 py-4">
                          {row.notes ? (
                            <span className="text-[var(--text)]">{row.notes}</span>
                          ) : (
                            <span className="text-[var(--muted)]">No notes attached</span>
                          )}
                        </td>
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
