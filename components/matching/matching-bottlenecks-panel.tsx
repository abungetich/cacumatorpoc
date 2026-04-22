import { AlertTriangle, ArrowUpRight, Building2, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MatchingOverviewResponse } from "@/lib/api-types";

const toneClasses: Record<MatchingOverviewResponse["insights"]["bottlenecks"][number]["tone"], string> = {
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const iconByKey = {
  mentor_supply: Users,
  consent: ShieldCheck,
  programs: Building2,
  capacity: AlertTriangle,
} as const;

export function MatchingBottlenecksPanel({
  summary,
  insights,
}: {
  summary: MatchingOverviewResponse["summary"];
  insights: MatchingOverviewResponse["insights"];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card className="rounded-2xl border-[var(--border)] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Matching Pressure</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Limiting resources</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              See what is constraining proposal throughput so you know whether to ramp up mentors, runnable programs, or consent follow-up.
            </p>
          </div>
          <div className="grid min-w-56 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 text-sm text-[var(--muted)] sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em]">Ready learners</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.readyForProposal}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em]">Runnable programs</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.runnablePrograms}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em]">Matchable mentors</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.matchableMentors}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em]">Approved for runnable programs</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.approvedMentorsForRunnablePrograms}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-800">
            {insights.severityCounts.high} high priority
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
            {insights.severityCounts.medium} medium priority
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
            {insights.severityCounts.low} healthy
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {insights.bottlenecks.map((item) => {
            const Icon = iconByKey[item.key];
            return (
              <div key={item.key} className={`rounded-2xl border p-4 ${toneClasses[item.tone]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 opacity-90">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl border-[var(--border)] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">What to ramp up</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Key actions</h2>
        <div className="mt-4 space-y-3">
          {insights.recommendations.map((recommendation, index) => (
            <div key={recommendation} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/55 p-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-[var(--text)]">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-[var(--text)]">{recommendation}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/45 px-4 py-3 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2 font-medium text-[var(--text)]">
            <ArrowUpRight className="h-4 w-4 text-[var(--primary)]" />
            This panel updates from live matching intake and persisted mentor readiness.
          </div>
          <p className="mt-1 leading-5">
            Use it to decide whether your next action belongs in mentor approval, consent follow-up, or program publishing instead of guessing from the queue.
          </p>
        </div>
      </Card>
    </section>
  );
}
