import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/states';
import { Input } from '@/components/ui/input';
import type { RelationshipOverviewItem } from '@/lib/api-types';
import { dateLabel, formatEnum, initials, isUpcomingWithin7Days, statusPill, type MilestoneFocus, riskFilters, statusFilters } from '@/lib/relationships-workspace';

export function RelationshipsTable({
  search,
  setSearch,
  status,
  setStatus,
  risk,
  setRisk,
  isFetching,
  isLoading,
  error,
  rows,
  onRefresh,
  onOpenMilestone,
  onLogSession,
  onSubmitReview,
  onTransition,
}: {
  search: string;
  setSearch: (value: string) => void;
  status: (typeof statusFilters)[number];
  setStatus: (value: (typeof statusFilters)[number]) => void;
  risk: (typeof riskFilters)[number];
  setRisk: (value: (typeof riskFilters)[number]) => void;
  isFetching: boolean;
  isLoading: boolean;
  error: Error | null;
  rows: RelationshipOverviewItem[];
  onRefresh: () => void;
  onOpenMilestone: (item: RelationshipOverviewItem, focus: MilestoneFocus) => void;
  onLogSession: (item: RelationshipOverviewItem) => void;
  onSubmitReview: (item: RelationshipOverviewItem) => void;
  onTransition: (item: RelationshipOverviewItem, action: 'PAUSE' | 'RESUME' | 'COMPLETE' | 'TERMINATE') => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="relative md:col-span-3">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <Input className="pl-9" placeholder="Search mentor, mentee, program, school" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <select className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={status} onChange={(event) => setStatus(event.target.value as (typeof statusFilters)[number])}>
          {statusFilters.map((option) => (
            <option key={option} value={option}>{option === 'ALL' ? 'All Statuses' : formatEnum(option)}</option>
          ))}
        </select>

        <select className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={risk} onChange={(event) => setRisk(event.target.value as (typeof riskFilters)[number])}>
          {riskFilters.map((option) => (
            <option key={option} value={option}>{option === 'ALL' ? 'All Risk Views' : formatEnum(option)}</option>
          ))}
        </select>

        <Button variant="secondary" className="gap-2" onClick={onRefresh} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {isLoading ? <SectionSkeleton rows={8} /> : null}
      {error ? <ErrorState title="Could not load relationships" description={error.message || 'Try refreshing.'} onRetry={onRefresh} /> : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="max-h-[62vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Pair</th>
                  <th className="px-3 py-3 font-semibold">Program</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Cadence</th>
                  <th className="px-3 py-3 font-semibold">Milestones</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-5 text-[var(--muted)]" colSpan={6}>No relationships match the current filters.</td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.mentorshipId} className="align-top transition hover:bg-[var(--surface-2)]/70">
                      <td className="px-3 py-3">
                        <div className="space-y-2">
                          <PersonPill name={item.mentor.name} role="Mentor" bgClass="bg-cyan-100 text-cyan-700" />
                          <PersonPill name={item.mentee.name} role="Mentee" bgClass="bg-violet-100 text-violet-700" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[var(--text)]">{item.program.name}</p>
                        <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">{item.program.schoolName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusPill(item.status)}`}>{formatEnum(item.status)}</span>
                        {item.atRisk ? <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-700">At risk</p> : null}
                        {item.reviewDue ? <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700">Review due</p> : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p className="font-semibold text-[var(--text)]">{formatEnum(item.checkInFrequency)}</p>
                        <p className="mt-1">Started: {dateLabel(item.startedAt)}</p>
                        <p className="mt-1">Scheduled end: {dateLabel(item.scheduledEndDate)}</p>
                        <p className="mt-1">Last session: {dateLabel(item.lastSessionDate)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <MilestoneChip label={`${item.sessionsLogged} sessions`} tone="neutral" onClick={() => onOpenMilestone(item, 'ACTIVITY')} />
                          <MilestoneChip label={`${item.feedbackCount} reviews`} tone="neutral" onClick={() => onOpenMilestone(item, 'ACTIVITY')} />
                          <MilestoneChip label={item.nextScheduledSession ? `Next ${dateLabel(item.nextScheduledSession)}` : 'No next session'} tone={isUpcomingWithin7Days(item.nextScheduledSession) ? 'primary' : 'neutral'} onClick={() => onOpenMilestone(item, 'NEXT_SESSION')} />
                          {item.atRisk ? <MilestoneChip label="At risk" tone="danger" onClick={() => onOpenMilestone(item, 'AT_RISK')} /> : null}
                          {item.reviewDue ? <MilestoneChip label="Review due" tone="warning" onClick={() => onOpenMilestone(item, 'REVIEW_DUE')} /> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.permissions.canLogSession ? <ActionChip label="Log session" onClick={() => onLogSession(item)} tone="primary" /> : null}
                          {item.permissions.canSubmitReview ? <ActionChip label="Submit review" onClick={() => onSubmitReview(item)} tone="info" /> : null}
                          {item.permissions.canPause ? <ActionChip label="Pause" onClick={() => onTransition(item, 'PAUSE')} tone="warning" /> : null}
                          {item.permissions.canResume ? <ActionChip label="Resume" onClick={() => onTransition(item, 'RESUME')} tone="info" /> : null}
                          {item.permissions.canComplete ? <ActionChip label="Complete" onClick={() => onTransition(item, 'COMPLETE')} tone="success" /> : null}
                          {item.permissions.canTerminate ? <ActionChip label="Terminate" onClick={() => onTransition(item, 'TERMINATE')} tone="danger" /> : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!isLoading && !error && rows.length === 0 ? <EmptyState title="No Relationships" description="Relationships will appear here once proposals are accepted and activated." /> : null}
    </Card>
  );
}

function PersonPill({ name, role, bgClass }: { name: string; role: string; bgClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${bgClass}`}>{initials(name)}</span>
      <div>
        <p className="font-semibold text-[var(--text)]">{name}</p>
        <p className="text-[11px] text-[var(--muted)]">{role}</p>
      </div>
    </div>
  );
}

function MilestoneChip({ label, tone, onClick }: { label: string; tone: 'neutral' | 'primary' | 'warning' | 'danger'; onClick: () => void }) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
        : tone === 'primary'
          ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]';

  return (
    <button type="button" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${toneClass}`} onClick={onClick} title="Open milestone details">
      {label}
    </button>
  );
}

function ActionChip({ label, tone, onClick }: { label: string; tone: 'primary' | 'info' | 'success' | 'warning' | 'danger'; onClick: () => void }) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : tone === 'info'
            ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
            : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100';
  return <Button type="button" size="sm" variant="secondary" className={`h-8 rounded-lg border px-3 ${toneClass}`} onClick={onClick}>{label}</Button>;
}
