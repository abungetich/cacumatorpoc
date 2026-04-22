'use client';

import { ArrowRight, CalendarClock, CheckCircle2, ChevronRight, ExternalLink, FileBadge2, FileDown, UploadCloud } from 'lucide-react';
import Link from 'next/link';

import { MentorOnboardingBanner } from '@/components/mentors/mentor-onboarding-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MentorOnboardingWorkspaceResponse } from '@/lib/api-types';
import { formatRelativeWithAbsolute, ReviewLink, statusTone, stepIcon } from '@/components/mentors/onboarding/mentor-onboarding-shared';

type Item = MentorOnboardingWorkspaceResponse['item'];

type Props = {
  item: Item;
  userStatus: string | undefined;
  completedCount: number;
  trainingPending: number;
  consentPending: number;
  openBackgroundModal: () => void;
  openTrainingModal: (item: Item['trainingModules'][number]) => void;
  openConsentModal: (item: Item['consentItems'][number]) => void;
};

export function MentorOnboardingContent({
  item,
  userStatus,
  completedCount,
  trainingPending,
  consentPending,
  openBackgroundModal,
  openTrainingModal,
  openConsentModal,
}: Props) {
  const isRecordMode = userStatus === 'active';
  const checklist = item.checklist;
  const pendingChecklist = checklist.filter((entry) => !entry.complete);
  const backgroundAge = formatRelativeWithAbsolute(item.backgroundCheck.checkedOn ?? null);
  const checklistAgeById = {
    email: null,
    profile: null,
    training: item.trainingModules.filter((entry) => entry.completedAt).map((entry) => entry.completedAt).sort().slice(-1)[0] ?? null,
    consents: item.consentItems.filter((entry) => entry.agreedAt).map((entry) => entry.agreedAt).sort().slice(-1)[0] ?? null,
    safeguarding: item.consentItems.filter((entry) => entry.consentType === 'SAFEGUARDING' && entry.agreedAt).map((entry) => entry.agreedAt).sort().slice(-1)[0] ?? null,
    background: item.backgroundCheck.checkedOn ?? null,
  } as const;
  const activeReviewSummary = [
    `${item.trainingModules.filter((entry) => entry.completed).length} training modules completed`,
    `${item.consentItems.filter((entry) => entry.completed).length} signed documents on file`,
    item.backgroundCheck.status === 'CLEARED' ? 'Background check cleared' : `Background check ${item.backgroundCheck.status.toLowerCase()}`,
  ];

  return (
    <>
      <MentorOnboardingBanner
        title={
          isRecordMode
            ? 'Your mentor starter pack is complete and now serves as your signed record.'
            : 'Complete your mentor starter pack before your account moves into review.'
        }
        description={
          isRecordMode
            ? 'Review what you completed, inspect the signed documents on file, and download your record packet for your own reference.'
            : 'This workspace tracks exactly what is done, what is still pending, and what the review team needs from you next.'
        }
        ctaHref="/profile"
        ctaLabel="Open account"
      />

      <section className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_16%,white),var(--surface)_58%,color-mix(in_oklab,var(--primary)_8%,white))] p-6 lg:p-7">
        <div className="absolute inset-y-0 right-0 hidden w-64 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{isRecordMode ? 'Mentor Records' : 'Mentor Onboarding'}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">{isRecordMode ? 'Your signed starter-pack record' : 'Your readiness workspace'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {isRecordMode
                  ? 'Your account is approved. This page now shows the record of what you completed, what was signed, and what is on file.'
                  : 'Move through profile completion, training, terms, safeguarding, and background verification in a controlled sequence.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Progress" value={`${item.progressPercentage}%`} sublabel="Checklist completion across required gates." progress={item.progressPercentage} />
              <MetricCard label="Completed" value={`${completedCount}/${item.totalCount}`} sublabel="Core requirements satisfied." />
              <MetricCard label="Current stage" value={item.currentStage ?? 'Not started'} sublabel={isRecordMode ? 'Recorded from your approved mentor account.' : 'Derived from your real readiness.'} />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/60 bg-white/80 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Focus now</p>
            <div className="mt-4 space-y-3">
              {(isRecordMode
                ? [
                    {
                      id: 'packet',
                      title: 'Download your records packet',
                      description: 'Export a PDF of your signed documents, completed modules, and compliance snapshot for your own review.',
                    },
                    {
                      id: 'docs',
                      title: 'Signed items on file',
                      description: activeReviewSummary.join(' • '),
                    },
                  ]
                : item.focus.length > 0
                  ? item.focus
                  : [{ id: 'review', title: 'Ready for review', description: 'All visible onboarding items are complete. The admin team can now review your account.' }]).map((focusItem) => (
                <div key={focusItem.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{focusItem.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{focusItem.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              {isRecordMode ? (
                <a href="/api/protected/mentor-onboarding/records-pdf" className="inline-flex">
                  <Button className="w-full gap-2">
                    <FileDown className="h-4 w-4" />
                    Download signed records PDF
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[28px] border border-[var(--border)] p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Checklist</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Readiness gates</h2>
            </div>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text)]">{pendingChecklist.length} pending</span>
          </div>
          <div className="mt-5 space-y-3">
            {checklist.map((entry, index) => {
              const Icon = stepIcon(entry.id);
              const checklistAge = formatRelativeWithAbsolute(checklistAgeById[entry.id]);
              return (
                <div key={entry.id} className="relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <span className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl', entry.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--surface-2)] text-[var(--primary)]')}>
                        {entry.complete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </span>
                      {index < checklist.length - 1 ? <span className="absolute left-1/2 top-11 h-8 w-px -translate-x-1/2 bg-[var(--border)]" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text)]">{entry.label}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(entry.complete)}`}>{entry.complete ? 'Complete' : 'Pending'}</span>
                        {entry.complete && checklistAge?.relative ? (
                          <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]" title={checklistAge.absolute ?? undefined}>
                            {checklistAge.relative}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{entry.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[28px] border border-[var(--border)] p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Account</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{isRecordMode ? 'Account details on file' : 'Complete your account details'}</h2>
              </div>
              <Link href="/profile">
                <Button className="gap-2">
                  {isRecordMode ? 'Review account' : 'Open account'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This page is for your account identity, contact details, timezone, password, and photo. Your mentor readiness and fit are assessed from the mentor starter pack, training, consent, and compliance records.
            </p>
          </Card>

          <Card className="rounded-[28px] border border-[var(--border)] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Background Check</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Submit your document</h2>
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', item.backgroundCheck.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-800' : item.backgroundCheck.submitted ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}>
                {item.backgroundCheck.status === 'CLEARED' ? 'Cleared' : item.backgroundCheck.submitted ? 'Submitted' : 'Not submitted'}
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="space-y-2">
                <p className="text-sm leading-6 text-[var(--muted)]">Upload the background check so the platform team can verify it. Submission does not clear the check automatically; it creates the review record.</p>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1.5"><FileBadge2 className="h-3.5 w-3.5" />PDF, DOC, DOCX, JPG, PNG, WEBP</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Max 10MB</span>
                </div>
                {item.backgroundCheck.documentUrl ? (
                  <a href={item.backgroundCheck.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                    Open submitted document
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                {backgroundAge?.relative ? (
                  <p className="text-xs text-[var(--muted)]" title={backgroundAge.absolute}>Recorded {backgroundAge.relative}</p>
                ) : null}
              </div>
              {isRecordMode && item.backgroundCheck.status === 'CLEARED' ? null : (
                <Button onClick={openBackgroundModal} className="gap-2">
                  <UploadCloud className="h-4 w-4" />
                  {item.backgroundCheck.documentUrl ? 'Replace submission' : 'Submit document'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[28px] border border-[var(--border)] p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Training Pack</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{isRecordMode ? 'Completed modules and acknowledgements' : 'Required modules'}</h2>
            </div>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text)]">{isRecordMode ? `${item.trainingModules.filter((entry) => entry.completed).length} on file` : `${trainingPending} pending`}</span>
          </div>
          <div className="mt-4 space-y-3">
            {item.trainingModules.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">No training modules have been configured yet.</div>
            ) : (
              item.trainingModules.map((module) => {
                const completedAge = formatRelativeWithAbsolute(module.completedAt);
                return (
                  <div key={module.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text)]">{module.title}</p>
                          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">{module.version}</span>
                          {module.required ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Required</span> : null}
                          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">{module.questionCount} questions</span>
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">{module.passingScore}% to pass</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{module.description}</p>
                        <p className="mt-2 text-xs text-[var(--muted)]">{module.estimatedMinutes ? `${module.estimatedMinutes} mins` : 'No estimate'} • {module.completed ? completedAge?.relative ?? 'Completed' : 'Not completed'}</p>
                        {module.maxAttempts ? <p className="mt-2 text-xs text-[var(--muted)]">Attempt limit: {module.attemptsCount}/{module.maxAttempts} used</p> : null}
                        {module.latestAttempt ? <p className="mt-2 text-xs text-[var(--muted)]">Latest attempt: {module.latestAttempt.score}% • {module.latestAttempt.passed ? 'Passed' : 'Below threshold'} • {formatRelativeWithAbsolute(module.latestAttempt.submittedAt)?.relative}</p> : null}
                        {module.completed ? (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                            <ReviewLink href={`/api/protected/mentor-onboarding/training/${encodeURIComponent(module.id)}/pdf`} label="Download certificate" icon={<FileDown className="h-3.5 w-3.5" />} />
                            {module.completionRecordId ? <ReviewLink href={`/verify/training/${encodeURIComponent(module.completionRecordId)}`} label="Public verification" icon={<ExternalLink className="h-3.5 w-3.5" />} /> : null}
                            {completedAge?.absolute ? <span>{completedAge.absolute}</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <Button variant={module.completed ? 'secondary' : 'primary'} onClick={() => openTrainingModal(module)} disabled={!module.completed && Boolean(module.maxAttempts && module.attemptsCount >= module.maxAttempts)}>
                        {module.completed ? 'Review' : module.maxAttempts && module.attemptsCount >= module.maxAttempts ? 'Attempt limit reached' : 'Open module'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="rounded-[28px] border border-[var(--border)] p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Consent Pack</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{isRecordMode ? 'Signed documents on file' : 'Current documents'}</h2>
            </div>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text)]">{isRecordMode ? `${item.consentItems.filter((entry) => entry.completed).length} signed` : `${consentPending} pending`}</span>
          </div>
          <div className="mt-4 space-y-3">
            {item.consentItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">No mentor terms or consent items have been configured yet.</div>
            ) : (
              item.consentItems.map((entry) => {
                const agreedAge = formatRelativeWithAbsolute(entry.agreedAt);
                const declinedAge = formatRelativeWithAbsolute(entry.declinedAt);
                return (
                  <div key={entry.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text)]">{entry.title}</p>
                          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">{entry.version}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', entry.consentType === 'SAFEGUARDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}>
                            {entry.consentType.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{entry.summary}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                          <ReviewLink href={entry.documentUrl} label="Open document" icon={<ExternalLink className="h-3.5 w-3.5" />} />
                          <span title={agreedAge?.absolute ?? undefined}>{entry.completed ? `Assented ${agreedAge?.relative ?? ''}`.trim() : entry.declinedAt ? `Declined ${declinedAge?.relative ?? ''}`.trim() : 'Not yet assented'}</span>
                          {!entry.completed && entry.declineReason ? <span>Reason: {entry.declineReason}</span> : null}
                          {entry.evidenceUrl ? <ReviewLink href={entry.evidenceUrl} label="Signed evidence" icon={<ExternalLink className="h-3.5 w-3.5" />} /> : null}
                          {entry.completed ? <ReviewLink href={`/api/protected/mentor-onboarding/consents/${encodeURIComponent(entry.id)}/pdf`} label="Download signed PDF" icon={<FileDown className="h-3.5 w-3.5" />} /> : null}
                          {entry.completed && entry.consentRecordId ? <ReviewLink href={`/verify/consents/${encodeURIComponent(entry.consentRecordId)}`} label="Public verification" icon={<ExternalLink className="h-3.5 w-3.5" />} /> : null}
                          {entry.completed && agreedAge?.absolute ? <span>{agreedAge.absolute}</span> : null}
                        </div>
                      </div>
                      <Button variant={entry.completed ? 'secondary' : 'primary'} onClick={() => openConsentModal(entry)}>
                        {entry.completed ? 'Review' : 'Open document'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>
    </>
  );
}

function MetricCard({ label, value, sublabel, progress }: { label: string; value: string; sublabel: string; progress?: number }) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/80 p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--text)]">{value}</p>
      {typeof progress === 'number' ? (
        <div className="mt-3 h-2 rounded-full bg-[var(--surface-2)]">
          <div className="h-2 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <p className="mt-2 text-xs text-[var(--muted)]">{sublabel}</p>
    </div>
  );
}
