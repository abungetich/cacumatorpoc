import type { FormEvent, ReactNode } from 'react';
import { CalendarClock, CheckCircle2, ClipboardCheck, MessageSquare, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { RelationshipOverviewItem } from '@/lib/api-types';
import { attendanceStatuses, dateLabel, formatEnum, milestoneFocusDescription, milestoneFocusLabel, nextSessionDisplay, reviewTypes, sessionFormats, type CompletionFormState, type MilestoneFocus, type ReviewFormState, type SessionFormState, type StatusTransitionFormState } from '@/lib/relationships-workspace';

export function RelationshipMilestoneModal({
  milestoneModal,
  transitionPending,
  onClose,
  onOpenSession,
  onOpenReview,
  onTransition,
}: {
  milestoneModal: { item: RelationshipOverviewItem; focus: MilestoneFocus } | null;
  transitionPending: boolean;
  onClose: () => void;
  onOpenSession: () => void;
  onOpenReview: () => void;
  onTransition: (action: 'PAUSE' | 'RESUME' | 'COMPLETE' | 'TERMINATE') => void;
}) {
  return (
    <Modal open={Boolean(milestoneModal)} onClose={onClose} title="Milestone Details" description="Click milestone chips to inspect risk, cadence, and operational actions." size="lg" icon={<CalendarClock className="h-4 w-4" />}>
      {milestoneModal ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{milestoneFocusLabel(milestoneModal.focus)}</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text)]">{milestoneModal.item.mentor.name} + {milestoneModal.item.mentee.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{milestoneModal.item.program.name} · {milestoneModal.item.program.schoolName}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoPill label="Status" value={formatEnum(milestoneModal.item.status)} />
            <InfoPill label="Check-in" value={formatEnum(milestoneModal.item.checkInFrequency)} />
            <InfoPill label="Next session" value={nextSessionDisplay(milestoneModal.item.nextScheduledSession)} />
            <InfoPill label="Last review" value={dateLabel(milestoneModal.item.lastFeedbackAt)} />
          </div>

          <div className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text)]">
            {milestoneFocusDescription(milestoneModal.focus, milestoneModal.item)}
          </div>

          <div className="flex flex-wrap gap-2">
            {milestoneModal.item.permissions.canLogSession ? <Button variant="secondary" className="gap-2" onClick={onOpenSession}><MessageSquare className="h-4 w-4" />Log Session</Button> : null}
            {milestoneModal.item.permissions.canSubmitReview ? <Button variant="secondary" className="gap-2" onClick={onOpenReview}><ClipboardCheck className="h-4 w-4" />Submit Review</Button> : null}
            {milestoneModal.item.permissions.canPause ? <Button variant="secondary" className="gap-2" onClick={() => onTransition('PAUSE')} disabled={transitionPending}><PauseCircle className="h-4 w-4" />Pause</Button> : null}
            {milestoneModal.item.permissions.canResume ? <Button variant="secondary" className="gap-2" onClick={() => onTransition('RESUME')} disabled={transitionPending}><PlayCircle className="h-4 w-4" />Resume</Button> : null}
            {milestoneModal.item.permissions.canComplete ? <Button className="gap-2" onClick={() => onTransition('COMPLETE')} disabled={transitionPending}><CheckCircle2 className="h-4 w-4" />Complete</Button> : null}
            {milestoneModal.item.permissions.canTerminate ? <Button variant="danger" className="gap-2" onClick={() => onTransition('TERMINATE')} disabled={transitionPending}><XCircle className="h-4 w-4" />Terminate</Button> : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function RelationshipStatusTransitionModal({
  open,
  form,
  transitionPending,
  onClose,
  setReason,
  onSubmit,
}: {
  open: boolean;
  form: StatusTransitionFormState;
  transitionPending: boolean;
  onClose: () => void;
  setReason: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={form.action === 'TERMINATE' ? 'Terminate relationship' : form.action === 'RESUME' ? 'Resume relationship' : 'Pause relationship'} description={form.action === 'TERMINATE' ? 'Reason is required for safeguarding and audit.' : form.action === 'RESUME' ? 'Resume this relationship and optionally record context.' : 'Pause this relationship and optionally record context.'} size="md" icon={form.action === 'TERMINATE' ? <XCircle className="h-4 w-4" /> : form.action === 'RESUME' ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <RelationshipContextCard relationshipLabel={form.relationshipLabel} />
        <LabeledField label={form.action === 'TERMINATE' ? 'Termination Reason' : form.action === 'RESUME' ? 'Resume Note' : 'Pause Reason'} required={form.action === 'TERMINATE'}>
          <textarea className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" value={form.reason} placeholder={form.action === 'TERMINATE' ? 'Required (minimum 5 characters)' : form.action === 'RESUME' ? 'Optional context for why this relationship is resuming' : 'Optional context for why this relationship is paused'} onChange={(event) => setReason(event.target.value)} />
        </LabeledField>
        <ModalFooter pending={transitionPending} submitLabel="Continue" onClose={onClose} />
      </form>
    </Modal>
  );
}

export function RelationshipCompletionModal({
  open,
  form,
  transitionPending,
  onClose,
  setOutcome,
  setNotes,
  onSubmit,
}: {
  open: boolean;
  form: CompletionFormState;
  transitionPending: boolean;
  onClose: () => void;
  setOutcome: (value: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL') => void;
  setNotes: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Complete relationship" description="Select the closure outcome." size="md" icon={<CheckCircle2 className="h-4 w-4" />}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <RelationshipContextCard relationshipLabel={form.relationshipLabel} />
        <LabeledField label="Closure Outcome" required>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <OutcomeChoice label="Successful" value="SUCCESSFUL" selectedValue={form.outcome} onSelect={setOutcome} />
            <OutcomeChoice label="Partial" value="PARTIAL" selectedValue={form.outcome} onSelect={setOutcome} />
            <OutcomeChoice label="Unsuccessful" value="UNSUCCESSFUL" selectedValue={form.outcome} onSelect={setOutcome} />
          </div>
        </LabeledField>
        <LabeledField label="Completion Notes">
          <textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" value={form.notes} placeholder="Optional closure notes" onChange={(event) => setNotes(event.target.value)} />
        </LabeledField>
        <ModalFooter pending={transitionPending} submitLabel="Continue" onClose={onClose} />
      </form>
    </Modal>
  );
}

export function RelationshipSessionModal({
  open,
  form,
  pending,
  onClose,
  setForm,
  onSubmit,
}: {
  open: boolean;
  form: SessionFormState;
  pending: boolean;
  onClose: () => void;
  setForm: (updater: (prev: SessionFormState) => SessionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Log Session" description="Capture attendance, progress, and next steps for relationship monitoring." size="xl" icon={<MessageSquare className="h-4 w-4" />}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <RelationshipContextCard relationshipLabel={form.relationshipLabel} />
        <div className="grid gap-3 md:grid-cols-2">
          <LabeledField label="Scheduled Date" required><Input type="date" required value={form.scheduledDate} onChange={(event) => setForm((prev) => ({ ...prev, scheduledDate: event.target.value }))} /></LabeledField>
          <LabeledField label="Actual Date"><Input type="date" value={form.actualDate} onChange={(event) => setForm((prev) => ({ ...prev, actualDate: event.target.value }))} /></LabeledField>
          <LabeledField label="Duration (minutes)" required><Input type="number" min={15} max={240} required value={form.durationMinutes} onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))} /></LabeledField>
          <LabeledField label="Attendance" required>
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={form.attendanceStatus} onChange={(event) => setForm((prev) => ({ ...prev, attendanceStatus: event.target.value as (typeof attendanceStatuses)[number] }))}>
              {attendanceStatuses.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Format" required>
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={form.format} onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value as (typeof sessionFormats)[number] }))}>
              {sessionFormats.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Next Scheduled Session"><Input type="date" value={form.nextScheduledSession} onChange={(event) => setForm((prev) => ({ ...prev, nextScheduledSession: event.target.value }))} /></LabeledField>
          <LabeledField label="Location"><Input placeholder="Required for in-person" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} /></LabeledField>
          <LabeledField label="Meeting Link"><Input placeholder="Required for online" value={form.meetingLink} onChange={(event) => setForm((prev) => ({ ...prev, meetingLink: event.target.value }))} /></LabeledField>
          <div className="md:col-span-2"><LabeledField label="Topics Covered (comma separated)" required><Input required placeholder="Career planning, goal setting" value={form.topicsCovered} onChange={(event) => setForm((prev) => ({ ...prev, topicsCovered: event.target.value }))} /></LabeledField></div>
          <div className="md:col-span-2"><LabeledField label="Session Notes" required><textarea className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" required value={form.sessionNotes} onChange={(event) => setForm((prev) => ({ ...prev, sessionNotes: event.target.value }))} /></LabeledField></div>
        </div>
        <ModalFooter pending={pending} submitLabel="Save Session" onClose={onClose} />
      </form>
    </Modal>
  );
}

export function RelationshipReviewModal({
  open,
  form,
  pending,
  onClose,
  setForm,
  onSubmit,
}: {
  open: boolean;
  form: ReviewFormState;
  pending: boolean;
  onClose: () => void;
  setForm: (updater: (prev: ReviewFormState) => ReviewFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Submit Review" description="Capture relationship quality feedback at monthly or milestone checkpoints." size="lg" icon={<ClipboardCheck className="h-4 w-4" />}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <RelationshipContextCard relationshipLabel={form.relationshipLabel} />
        <div className="grid gap-3 md:grid-cols-2">
          <LabeledField label="Review Type" required>
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as (typeof reviewTypes)[number] }))}>
              {reviewTypes.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Rating (1-5)" required><Input type="number" min={1} max={5} required value={form.rating} onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))} /></LabeledField>
          <div className="md:col-span-2"><LabeledField label="Strengths"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" value={form.strengths} onChange={(event) => setForm((prev) => ({ ...prev, strengths: event.target.value }))} /></LabeledField></div>
          <div className="md:col-span-2"><LabeledField label="Areas For Improvement"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" value={form.areasForImprovement} onChange={(event) => setForm((prev) => ({ ...prev, areasForImprovement: event.target.value }))} /></LabeledField></div>
          <div className="md:col-span-2"><LabeledField label="Comments"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" value={form.comments} onChange={(event) => setForm((prev) => ({ ...prev, comments: event.target.value }))} /></LabeledField></div>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)] md:col-span-2"><input type="checkbox" checked={form.isAnonymous} onChange={(event) => setForm((prev) => ({ ...prev, isAnonymous: event.target.checked }))} />Submit as anonymous</label>
        </div>
        <ModalFooter pending={pending} submitLabel="Submit Review" onClose={onClose} />
      </form>
    </Modal>
  );
}

function ModalFooter({ pending, submitLabel, onClose }: { pending: boolean; submitLabel: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={pending}>{pending ? 'Saving...' : submitLabel}</Button>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}

function RelationshipContextCard({ relationshipLabel }: { relationshipLabel: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Relationship</p>
      <p className="mt-1 text-sm font-medium text-[var(--text)]">{relationshipLabel || '-'}</p>
    </div>
  );
}

function LabeledField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function OutcomeChoice({ label, value, selectedValue, onSelect }: { label: string; value: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL'; selectedValue: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL'; onSelect: (value: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL') => void }) {
  const isSelected = selectedValue === value;
  return (
    <button type="button" onClick={() => onSelect(value)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]'}`} aria-pressed={isSelected}>
      {label}
    </button>
  );
}
