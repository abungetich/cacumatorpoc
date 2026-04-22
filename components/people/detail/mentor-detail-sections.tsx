'use client';

import { AlertCircle, ClipboardCheck, FileCheck2, Hourglass, Link2, MessageSquareText, RefreshCcw, StickyNote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import type { DetailTab, MentorDetailItem, ModalAction } from '@/components/people/detail/mentor-detail-shared';
import { actionCopy, actionIcon, ComplianceCard, DataRow, formatAge, formatDate, GateRow, isLikelyLink, MetricCard, MutedText, summarizeAuditAction, Tag, verificationContextLabel } from '@/components/people/detail/mentor-detail-shared';

export function MentorDetailSections({
  activeTab,
  item,
  availableActions,
  canAdminMentors,
  openModal,
  startConsentFollowUp,
  noteMessage,
  setNoteMessage,
  postNote,
  notePending,
  verificationPending,
  resendVerification,
  copyVerificationLink,
}: {
  activeTab: DetailTab;
  item: MentorDetailItem;
  availableActions: ModalAction[];
  canAdminMentors: boolean;
  openModal: (action: ModalAction) => void;
  startConsentFollowUp: (entry: MentorDetailItem['onboarding']['declinedConsents'][number]) => void;
  noteMessage: string;
  setNoteMessage: (value: string) => void;
  postNote: () => void;
  notePending: boolean;
  verificationPending: boolean;
  resendVerification: () => void;
  copyVerificationLink: () => void;
}) {
  if (activeTab === 'overview') {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard icon={Hourglass} label="Onboarding Stage" value={item.onboarding.currentStage ?? 'Not started'} />
        <MetricCard icon={ClipboardCheck} label="Profile Completion" value={`${item.onboarding.profileCompletionPercentage ?? 0}%`} />
        <MetricCard icon={ClipboardCheck} label="Capacity" value={`${item.snapshot.currentMentees}/${item.snapshot.maxMentees}`} />
        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--text)]">Approval Gates</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <GateRow label="User active" value={item.eligibility.checks.userActive} />
            <GateRow label="Background cleared" value={item.eligibility.checks.backgroundCleared} />
            <GateRow label="Training complete" value={item.eligibility.checks.trainingCompleted} />
            <GateRow label="Safeguarding agreed" value={item.eligibility.checks.safeguardingAgreed} />
            <GateRow label="Profile approved" value={item.eligibility.checks.profileApproved} />
            <GateRow label="Capacity available" value={item.eligibility.checks.hasCapacity} />
          </div>
          {item.eligibility.blockers.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Current blockers: {item.eligibility.blockers.join(', ')}</div>
          ) : null}
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Operational Dates</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Registered" value={formatDate(item.user.createdAt)} />
            <DataRow label="Email verified" value={formatDate(item.user.emailVerifiedAt)} />
            <DataRow label="Last login" value={formatDate(item.user.lastLoginAt)} />
            <DataRow label="Approved at" value={formatDate(item.profile.approvedAt)} />
          </dl>
        </Card>
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Email Verification Diagnostics</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Inspect provider readiness, pending verification state, and trigger manual resend or link copy from this mentor record.</p>
            </div>
            {!item.verification.emailVerifiedAt && canAdminMentors ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="gap-2" disabled={verificationPending} onClick={resendVerification}>
                  <RefreshCcw className="h-4 w-4" />Resend email
                </Button>
                <Button variant="secondary" className="gap-2" disabled={verificationPending} onClick={copyVerificationLink}>
                  <Link2 className="h-4 w-4" />Copy link
                </Button>
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <GateRow label="Email confirmed" value={Boolean(item.verification.emailVerifiedAt)} />
            <GateRow label="User active" value={item.verification.userIsActive} />
            <div className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Channel</p>
              <p className="mt-1 font-medium text-[var(--text)]">{item.verification.delivery.activeChannel}</p>
              <p className="text-xs text-[var(--muted)]">{item.verification.delivery.fromAddress ?? 'Sender not configured'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pending tokens</p>
              <p className="mt-1 font-medium text-[var(--text)]">{item.verification.pendingTokenCount}</p>
              <p className="text-xs text-[var(--muted)]">Latest expires {formatDate(item.verification.latestTokenExpiresAt)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
              <p className="font-medium text-[var(--text)]">Reminder policy</p>
              <p className="mt-2 text-[var(--muted)]">Auto reminders: {item.verification.reminderPolicy.autoReminderEnabled ? 'Enabled' : 'Disabled'}. Interval: every {item.verification.reminderPolicy.resendIntervalHours} hours. Max reminders: {item.verification.reminderPolicy.maxReminders}.</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Update this in Settings &gt; Verification.</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
              <p className="font-medium text-[var(--text)]">Diagnostics</p>
              <div className="mt-3 space-y-2 text-[var(--muted)]">
                <p>Zepto configured: {item.verification.delivery.zeptoConfigured ? 'Yes' : 'No'}</p>
                <p>SMTP configured: {item.verification.delivery.smtpConfigured ? 'Yes' : 'No'}</p>
                <p>Latest token issued: {formatDate(item.verification.latestTokenCreatedAt)}</p>
                <p>Latest token verified: {formatDate(item.verification.latestTokenVerifiedAt)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[var(--text)]">Delivery attempts</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Latest verification sends and provider outcomes for this mentor.</p>
              </div>
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">{item.verification.attempts.length} logged</span>
            </div>
            <div className="mt-4 space-y-3">
              {item.verification.attempts.length ? item.verification.attempts.slice(0, 6).map((attempt) => (
                <div key={attempt.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{attempt.status}</span>
                      <span className="inline-flex rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{attempt.channel}</span>
                      <span className="inline-flex rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{verificationContextLabel(attempt.context)}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{formatAge(attempt.timestamp)} · {formatDate(attempt.timestamp)}</p>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                    <p>Actor: <span className="font-medium text-[var(--text)]">{attempt.actor}</span></p>
                    <p>Response code: <span className="font-medium text-[var(--text)]">{attempt.responseCode ?? 'Not returned'}</span></p>
                  </div>
                  {attempt.providerMessage ? <p className="mt-2 text-sm text-[var(--text)]">Provider message: {attempt.providerMessage}</p> : null}
                  {attempt.reason ? <p className="mt-2 text-sm text-rose-700">Failure reason: {attempt.reason}</p> : null}
                  {attempt.providerPayload ? <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950/95 p-3 text-xs leading-5 text-slate-100">{attempt.providerPayload}</pre> : null}
                </div>
              )) : <p className="text-sm text-[var(--muted)]">No verification send attempts have been logged yet.</p>}
            </div>
          </div>
          {!item.verification.emailVerifiedAt ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>This mentor cannot sign in until the verification link is opened and the email address is confirmed.</p>
              </div>
            </div>
          ) : null}
        </Card>
      </section>
    );
  }

  if (activeTab === 'profile') {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Identity</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Email" value={item.user.email} />
            <DataRow label="Phone" value={item.user.phone || 'Pending'} />
            <DataRow label="Date of birth" value={formatDate(item.user.dateOfBirth)} />
            <DataRow label="School" value={item.user.schoolName ?? 'Independent'} />
            <DataRow label="Partner / Organization" value={item.user.partnerName ?? 'Independent'} />
          </dl>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Professional Profile</p>
          <dl className="mt-4 space-y-3 text-sm">
            <DataRow label="Profession" value={item.profile.profession || 'Pending onboarding'} />
            <DataRow label="Employer" value={item.profile.employer || 'Pending onboarding'} />
            <DataRow label="Job title" value={item.profile.jobTitle || 'Pending onboarding'} />
            <DataRow label="Industry" value={item.profile.industry || 'Pending onboarding'} />
            <DataRow label="Experience" value={`${item.profile.yearsExperience || 0} years`} />
            <DataRow label="Hours / month" value={`${item.profile.hoursPerMonth || 0}`} />
          </dl>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Expertise Areas</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.profile.expertiseAreas.length ? item.profile.expertiseAreas.map((entry) => <Tag key={entry} value={entry} />) : <MutedText value="No expertise areas recorded yet." />}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Mentoring Formats & Availability</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.profile.mentoringFormats.length ? item.profile.mentoringFormats.map((entry) => <Tag key={entry} value={entry} />) : <MutedText value="No mentoring formats recorded yet." />}
          </div>
          <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            {item.profile.availabilitySummary.length ? item.profile.availabilitySummary.map((entry) => <p key={entry}>{entry}</p>) : <MutedText value="Availability will appear once onboarding is completed." />}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--text)]">Motivation</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{item.profile.motivation || 'No motivation statement has been submitted yet.'}</p>
        </Card>
      </section>
    );
  }

  if (activeTab === 'compliance') {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        <ComplianceCard icon={FileCheck2} title="Background Check" status={item.snapshot.backgroundCheckStatus} rows={[
          { label: 'Checked on', value: formatDate(item.profile.backgroundCheckDate) },
          { label: 'Expires', value: formatDate(item.profile.backgroundCheckExpiry) },
          { label: 'Evidence', value: item.profile.backgroundCheckDocument ? <a href={item.profile.backgroundCheckDocument} className="text-[var(--primary)] underline" target="_blank" rel="noreferrer">Open evidence</a> : 'Not attached' },
        ]} />
        <ComplianceCard icon={FileCheck2} title="Training" status={item.snapshot.trainingCompleted ? 'COMPLETED' : 'PENDING'} rows={[
          { label: 'Completed', value: item.snapshot.trainingCompleted ? 'Yes' : 'No' },
          { label: 'Recorded on', value: formatDate(item.profile.trainingCompletedDate) },
        ]} />
        <ComplianceCard icon={FileCheck2} title="Safeguarding" status={item.snapshot.safeguardingAgreed ? 'AGREED' : 'PENDING'} rows={[
          { label: 'Agreed', value: item.snapshot.safeguardingAgreed ? 'Yes' : 'No' },
          { label: 'Recorded on', value: formatDate(item.profile.safeguardingAgreedDate) },
        ]} />
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Consent Follow-up</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Unresolved declined consent responses stay visible here until the mentor assents to the active version or an admin resolves the follow-up.</p>
            </div>
            {item.onboarding.declinedConsents.length ? <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">{item.onboarding.declinedConsents.length} open</span> : <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">No open declines</span>}
          </div>
          {item.onboarding.declinedConsents.length ? (
            <div className="mt-4 space-y-3">
              {item.onboarding.declinedConsents.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-rose-950">{entry.title}{entry.version ? <span className="ml-2 text-sm font-normal text-rose-800">v{entry.version}</span> : null}</p>
                      <p className="mt-1 text-xs font-medium text-rose-800">{formatAge(entry.declinedAt)} · {formatDate(entry.declinedAt)}</p>
                    </div>
                    <Button variant="secondary" size="sm" className="gap-2" onClick={() => startConsentFollowUp(entry)}>
                      <StickyNote className="h-4 w-4" />Follow up
                    </Button>
                  </div>
                  {entry.reason ? <p className="mt-2 text-sm leading-6 text-rose-900">Reason: {entry.reason}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">No mentor consent declines require follow-up right now.</div>
          )}
        </Card>
      </section>
    );
  }

  if (activeTab === 'actions') {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {availableActions.map((action) => (
          <Card key={action} className="flex h-full flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">{actionIcon(action)}</div>
              <div>
                <p className="font-semibold text-[var(--text)]">{actionCopy(action).title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{actionCopy(action).description}</p>
              </div>
            </div>
            {canAdminMentors ? <Button variant={action === 'REJECT' || action === 'BACKGROUND_FAIL' ? 'danger' : 'secondary'} onClick={() => openModal(action)}>Open action</Button> : <p className="text-sm text-[var(--muted)]">View only</p>}
          </Card>
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]"><MessageSquareText className="h-5 w-5" /></span>
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-[var(--text)]">Thread</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Add operational notes, review context, and follow-up messages on this mentor record.</p>
            </div>
            <Textarea value={noteMessage} onChange={(event) => setNoteMessage(event.target.value)} placeholder="Add a note to this mentor thread..." className="min-h-[120px]" />
            <div className="flex justify-end">
              <Button className="gap-2" onClick={postNote} disabled={notePending}>
                <StickyNote className="h-4 w-4" />{notePending ? 'Posting...' : 'Post to thread'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {item.audit.length ? (
        <div className="relative pl-6">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border)]" />
          <div className="space-y-5">
            {item.audit.map((entry) => (
              <div key={entry.id} className="relative">
                <span className={`absolute -left-6 top-6 inline-flex h-5 w-5 items-center justify-center rounded-full border-4 border-[var(--surface)] ${entry.action === 'MENTOR_NOTE_ADDED' ? 'bg-[var(--primary)]' : 'bg-[var(--surface-2)]'}`} />
                <Card className={entry.action === 'MENTOR_NOTE_ADDED' ? 'bg-[color-mix(in_oklab,var(--primary)_4%,var(--surface))]' : ''}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{entry.action === 'MENTOR_NOTE_ADDED' ? 'Thread message' : summarizeAuditAction(entry.action)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{entry.actor} · {formatAge(entry.timestamp)}</p>
                      <p className="text-xs text-[var(--muted)]">{formatDate(entry.timestamp)}</p>
                    </div>
                    {entry.comment ? <div className={`max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-6 text-[var(--text)] ${entry.action === 'MENTOR_NOTE_ADDED' ? 'border-[var(--primary)]/20 bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}>{entry.comment}</div> : null}
                  </div>
                  {entry.details && Object.keys(entry.details).length ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {Object.entries(entry.details).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{key}</p>
                          <div className="mt-1 break-all text-[var(--text)]">
                            {isLikelyLink(value) ? <a href={String(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] underline underline-offset-2">Open document<Link2 className="h-3.5 w-3.5" /></a> : String(value ?? '-')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState title="No mentor audit entries yet" description="Compliance actions, approvals, and thread messages will appear here." />
        </Card>
      )}
    </section>
  );
}
