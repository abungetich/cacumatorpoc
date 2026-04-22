'use client';

import { School2, ShieldCheck, Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MenteeDetailAction } from '@/lib/api-types';
import type { MenteeDetailItem, MenteeDetailTab } from '@/components/people/detail/mentee-detail-shared';
import { actionCopy, DataRow, formatAge, formatDate, MetricCard, stagePill, statusPill, Tag } from '@/components/people/detail/mentee-detail-shared';

function readAuditSummary(value: Record<string, unknown> | null) {
  if (!value) return null;
  if (typeof value.reason === 'string' && value.reason.trim()) return value.reason.trim();
  if (typeof value.status === 'string' && value.status.trim()) return `Status: ${value.status}`;
  return null;
}

export function MenteeDetailSections({
  activeTab,
  item,
  canOperate,
  openAction,
}: {
  activeTab: MenteeDetailTab;
  item: MenteeDetailItem;
  canOperate: boolean;
  openAction: (action: MenteeDetailAction) => void;
}) {
  if (activeTab === 'overview') {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard icon={Users} label="Intake Stage" value={item.snapshot.intakeStage.replace(/_/g, ' ')} hint={`Updated ${formatAge(item.snapshot.updatedAt)}`} />
        <MetricCard icon={ShieldCheck} label="Consent Status" value={item.snapshot.requiresConsent ? (item.snapshot.hasConsent ? 'Received' : 'Missing') : 'Not required'} />
        <MetricCard icon={School2} label="School" value={item.snapshot.schoolName} hint={item.snapshot.partnerName ?? 'Independent school'} />
        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--text)]">Readiness blockers</p>
          <div className="mt-4 space-y-3 text-sm">
            {item.matching.blockers.length ? item.matching.blockers.map((entry) => (
              <div key={entry} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">{entry}</div>
            )) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">No blocking issues are recorded for this learner right now.</div>
            )}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Current relationship</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Mentor" value={item.matching.activeMentorship?.mentorName ?? 'Unassigned'} />
            <DataRow label="Program" value={item.matching.activeMentorship?.programName ?? 'Not linked'} />
            <DataRow label="Next session" value={formatDate(item.matching.activeMentorship?.nextScheduledSession ?? null)} />
            <DataRow label="Last session" value={formatDate(item.matching.activeMentorship?.lastSessionDate ?? null)} />
          </dl>
        </Card>
      </section>
    );
  }

  if (activeTab === 'support') {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Interests</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.learnerSupport.interests.length ? item.learnerSupport.interests.map((entry) => <Tag key={entry} value={entry} />) : <p className="text-sm text-[var(--muted)]">No interests recorded yet.</p>}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Declared goals</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.learnerSupport.declaredGoals.length ? item.learnerSupport.declaredGoals.map((entry) => <Tag key={entry} value={entry} />) : <p className="text-sm text-[var(--muted)]">No learner goals recorded in intake yet.</p>}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Specific challenges</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{item.learnerSupport.specificChallenges || 'No specific challenges captured.'}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Special requirements</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{item.learnerSupport.specialRequirements || 'No special requirements captured.'}</p>
        </Card>
        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--text)]">Emergency contact</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Name" value={item.learnerSupport.emergencyContactName} />
            <DataRow label="Phone" value={item.learnerSupport.emergencyContactPhone} />
          </dl>
        </Card>
      </section>
    );
  }

  if (activeTab === 'school') {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">School identity</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="School" value={item.schoolContext.name} />
            <DataRow label="Type" value={item.schoolContext.type.replace(/_/g, ' ')} />
            <DataRow label="Partner" value={item.schoolContext.partnerName ?? 'Independent'} />
            <DataRow label="Address" value={item.schoolContext.address} />
          </dl>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">School contacts</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="School phone" value={item.schoolContext.phone} />
            <DataRow label="School email" value={item.schoolContext.email} />
            <DataRow label="Principal" value={item.schoolContext.principalName} />
            <DataRow label="Principal email" value={item.schoolContext.principalEmail} />
          </dl>
        </Card>
      </section>
    );
  }

  if (activeTab === 'guardian') {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Guardian contact</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Parent / guardian" value={item.guardian.parentGuardianName ?? 'Not recorded'} />
            <DataRow label="Contact" value={item.guardian.parentGuardianContact ?? 'Not recorded'} />
            <DataRow label="Email" value={item.guardian.parentGuardianEmail ?? 'Not recorded'} />
            <DataRow label="Consent" value={item.guardian.parentGuardianConsent === null ? 'Not recorded' : item.guardian.parentGuardianConsent ? 'Received' : 'Declined'} />
            <DataRow label="Consent date" value={formatDate(item.guardian.parentGuardianConsentDate)} />
          </dl>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Guardian account</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Account holder" value={item.guardian.guardianAccountName ?? 'No linked guardian account'} />
            <DataRow label="Account email" value={item.guardian.guardianAccountEmail ?? 'No linked guardian account'} />
          </dl>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Recorded consent documents</p>
            <div className="mt-3 space-y-2">
              {item.guardian.activeConsents.length ? item.guardian.activeConsents.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                  <p className="font-medium text-[var(--text)]">{entry.consentType.replace(/_/g, ' ')}</p>
                  <p className="text-[var(--muted)]">v{entry.version} · {formatDate(entry.agreedAt)}</p>
                </div>
              )) : <p className="text-sm text-[var(--muted)]">No platform consent records are attached to this learner yet.</p>}
            </div>
          </div>
        </Card>
      </section>
    );
  }

  if (activeTab === 'goals') {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Mentorship goals</p>
          <div className="mt-4 space-y-3">
            {item.goals.active.length ? item.goals.active.map((goal) => (
              <div key={goal.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text)]">{goal.title}</p>
                    <p className="text-sm text-[var(--muted)]">Target {formatDate(goal.targetDate)}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{goal.progressPercentage}%</span>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">{goal.status.replace(/_/g, ' ')}</p>
                {goal.notes ? <p className="mt-3 text-sm leading-6 text-[var(--text)]">{goal.notes}</p> : null}
              </div>
            )) : <p className="text-sm text-[var(--muted)]">No active mentorship goals have been recorded yet.</p>}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Declared intake goals</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.learnerSupport.declaredGoals.length ? item.learnerSupport.declaredGoals.map((entry) => <Tag key={entry} value={entry} />) : <p className="text-sm text-[var(--muted)]">No intake goals were captured.</p>}
          </div>
        </Card>
      </section>
    );
  }

  if (activeTab === 'matching') {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Matching readiness</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Move the learner through the matching lifecycle from this record instead of the intake table.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stagePill(item.snapshot.intakeStage)}`}>{item.snapshot.intakeStage}</span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(item.snapshot.status)}`}>{item.snapshot.status}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {item.matching.blockers.length ? item.matching.blockers.map((entry) => (
              <div key={entry} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{entry}</div>
            )) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">No blockers are currently preventing this learner from moving forward.</div>
            )}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Actions</p>
          <div className="mt-4 space-y-3">
            {item.matching.availableActions.length ? item.matching.availableActions.map((action) => (
              <Button key={action} variant={action === 'DEACTIVATE' ? 'danger' : 'secondary'} className="w-full justify-start" onClick={() => openAction(action)} disabled={!canOperate}>
                {actionCopy(action).title}
              </Button>
            )) : <p className="text-sm text-[var(--muted)]">No matching actions are available in the current state.</p>}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <p className="text-sm font-semibold text-[var(--text)]">Recent session footprint</p>
          <div className="mt-4 space-y-3">
            {item.matching.recentSessions.length ? item.matching.recentSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-[var(--text)]">{session.attendanceStatus.replace(/_/g, ' ')} · {session.format.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-[var(--muted)]">{formatDate(session.actualDate ?? session.scheduledDate)}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{session.durationMinutes} mins</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.topics.length ? session.topics.map((topic) => <Tag key={topic} value={topic} />) : <span className="text-sm text-[var(--muted)]">No topics logged.</span>}
                </div>
              </div>
            )) : <p className="text-sm text-[var(--muted)]">No session activity has been recorded for this learner yet.</p>}
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border)]" />
      <div className="space-y-5">
        {item.audit.length ? item.audit.map((entry) => (
          <div key={entry.id} className="relative">
            <span className="absolute -left-6 top-6 inline-flex h-5 w-5 items-center justify-center rounded-full border-4 border-[var(--surface)] bg-[var(--surface-2)]" />
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--text)]">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{entry.actor} · {formatAge(entry.timestamp)}</p>
                  <p className="text-xs text-[var(--muted)]">{formatDate(entry.timestamp)}</p>
                </div>
                {readAuditSummary(entry.details) || entry.comment ? (
                  <div className="max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
                    {readAuditSummary(entry.details) ?? entry.comment}
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        )) : <Card><p className="text-sm text-[var(--muted)]">No mentee audit events are recorded yet.</p></Card>}
      </div>
    </section>
  );
}
