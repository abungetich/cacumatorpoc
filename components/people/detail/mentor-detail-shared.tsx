'use client';

import type { ReactNode } from 'react';
import { BookOpenCheck, CheckCircle2, CircleAlert, ClipboardCheck, FileCheck2, Hourglass, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { MentorDetailResponse, MentorTransitionDetailPayload } from '@/lib/api-types';

export type MentorDetailItem = MentorDetailResponse['item'];
export type DetailTab = 'overview' | 'profile' | 'compliance' | 'actions' | 'audit';
export type ModalAction = 'BACKGROUND_CLEAR' | 'BACKGROUND_FAIL' | 'COMPLETE_TRAINING' | 'AGREE_SAFEGUARDING' | 'SUBMIT_FOR_REVIEW' | 'APPROVE' | 'REJECT' | 'DEACTIVATE' | 'REACTIVATE';

export type ActionFormState = {
  reason: string;
  effectiveAt: Date | null;
  expiryDate: Date | null;
  evidenceUrl: string;
  agreementVersion: string;
  trainingName: string;
};

export const defaultFormState: ActionFormState = {
  reason: '',
  effectiveAt: new Date(),
  expiryDate: null,
  evidenceUrl: '',
  agreementVersion: '',
  trainingName: '',
};

export const tabOptions: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'actions', label: 'Actions' },
  { id: 'audit', label: 'Notes & Audit' },
];

export function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function formatAge(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return parsed.toLocaleDateString();
}

export function toIso(value: Date | null) {
  return value ? value.toISOString() : undefined;
}

export function statePill(value: string) {
  if (value === 'MATCHABLE' || value === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (value === 'PENDING_ADMIN_REVIEW') return 'bg-amber-100 text-amber-800';
  if (value === 'PENDING_BACKGROUND_CHECK' || value === 'PENDING_TRAINING') return 'bg-orange-100 text-orange-800';
  if (value === 'REJECTED') return 'bg-rose-100 text-rose-800';
  if (value === 'INACTIVE') return 'bg-slate-200 text-slate-700';
  return 'bg-sky-100 text-sky-800';
}

export function statusPill(value: string) {
  if (value === 'APPROVED' || value === 'CLEARED') return 'bg-emerald-100 text-emerald-800';
  if (value === 'PENDING') return 'bg-amber-100 text-amber-800';
  if (value === 'FAILED' || value === 'REJECTED') return 'bg-rose-100 text-rose-800';
  if (value === 'EXPIRED') return 'bg-purple-100 text-purple-800';
  return 'bg-slate-100 text-slate-700';
}

export function actionCopy(action: ModalAction) {
  switch (action) {
    case 'BACKGROUND_CLEAR':
      return { title: 'Clear background check', description: 'Record the clearance date, expiry, evidence link, and review notes for this mentor.' };
    case 'BACKGROUND_FAIL':
      return { title: 'Mark background check failed', description: 'Record why this mentor cannot pass screening. This will move the mentor out of the approval path.' };
    case 'COMPLETE_TRAINING':
      return { title: 'Record training completion', description: 'Capture the training name, completion date, evidence link, and reviewer notes.' };
    case 'AGREE_SAFEGUARDING':
      return { title: 'Record safeguarding assent', description: 'Capture the agreement date, document version, evidence link, and reviewer notes.' };
    case 'SUBMIT_FOR_REVIEW':
      return { title: 'Submit for review', description: 'Move the mentor into the admin review queue once compliance gates are complete.' };
    case 'APPROVE':
      return { title: 'Approve mentor', description: 'Approval requires notes so the decision is visible in the mentor record and audit trail.' };
    case 'REJECT':
      return { title: 'Return mentor from review', description: 'Record the review notes clearly so the mentor record shows what blocked approval.' };
    case 'DEACTIVATE':
      return { title: 'Deactivate mentor', description: 'Use this when a mentor should no longer participate operationally.' };
    case 'REACTIVATE':
      return { title: 'Reactivate mentor', description: 'Return the mentor to the workflow. Approval state will be recalculated from current readiness.' };
  }
}

export function buildDetailPayload(form: ActionFormState): MentorTransitionDetailPayload {
  return {
    effectiveAt: toIso(form.effectiveAt),
    expiryDate: toIso(form.expiryDate),
    evidenceUrl: form.evidenceUrl.trim() || undefined,
    agreementVersion: form.agreementVersion.trim() || undefined,
    trainingName: form.trainingName.trim() || undefined,
  };
}

export function summarizeAuditAction(action: string) {
  return action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isLikelyLink(value: unknown) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/uploads/'));
}

export function verificationContextLabel(value: 'REGISTRATION' | 'PUBLIC_RESEND' | 'ADMIN_RESEND' | 'UNKNOWN') {
  switch (value) {
    case 'REGISTRATION':
      return 'Initial send';
    case 'PUBLIC_RESEND':
      return 'Self resend';
    case 'ADMIN_RESEND':
      return 'Admin resend';
    default:
      return 'Unknown';
  }
}

export function MetricCard({ icon: Icon, label, value }: { icon: typeof Hourglass; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{value}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export function GateRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
      <span className="text-[var(--text)]">{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${value ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {value ? 'Ready' : 'Blocked'}
      </span>
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="min-w-0 text-[var(--muted)]">{label}</dt>
      <dd className="text-right text-[var(--text)]">{value}</dd>
    </div>
  );
}

export function Tag({ value }: { value: string }) {
  return <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text)]">{value}</span>;
}

export function MutedText({ value }: { value: string }) {
  return <p className="text-sm text-[var(--muted)]">{value}</p>;
}

export function ComplianceCard({ icon: Icon, title, status, rows }: { icon: typeof ShieldCheck; title: string; status: string; rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(status)}`}>{status}</span>
      </div>
      <p className="mt-4 font-semibold text-[var(--text)]">{title}</p>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map((row) => (
          <DataRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </Card>
  );
}

export function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
        {icon ? <span className="text-[var(--primary)]">{icon}</span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

export function actionIcon(action: ModalAction) {
  switch (action) {
    case 'APPROVE': return <CheckCircle2 className="h-5 w-5" />;
    case 'REJECT': return <XCircle className="h-5 w-5" />;
    case 'BACKGROUND_CLEAR': return <FileCheck2 className="h-5 w-5" />;
    case 'BACKGROUND_FAIL': return <ShieldAlert className="h-5 w-5" />;
    case 'COMPLETE_TRAINING': return <BookOpenCheck className="h-5 w-5" />;
    case 'AGREE_SAFEGUARDING': return <ShieldCheck className="h-5 w-5" />;
    case 'SUBMIT_FOR_REVIEW': return <ClipboardCheck className="h-5 w-5" />;
    case 'DEACTIVATE': return <CircleAlert className="h-5 w-5" />;
    case 'REACTIVATE': return <CheckCircle2 className="h-5 w-5" />;
  }
}
