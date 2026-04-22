'use client';

import type { ReactNode } from 'react';
import { BookHeart, CheckCircle2, GraduationCap, Handshake, School2, ShieldCheck, UserSquare2, XCircle } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { MenteeDetailAction, MenteeDetailResponse } from '@/lib/api-types';

export type MenteeDetailItem = MenteeDetailResponse['item'];
export type MenteeDetailTab = 'overview' | 'support' | 'school' | 'guardian' | 'goals' | 'matching' | 'audit';

export const menteeDetailTabs: Array<{ id: MenteeDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'support', label: 'Learner Support' },
  { id: 'school', label: 'School Context' },
  { id: 'guardian', label: 'Guardian & Consent' },
  { id: 'goals', label: 'Goals' },
  { id: 'matching', label: 'Matching Readiness' },
  { id: 'audit', label: 'Notes & Audit' },
];

export function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function formatAge(value: string | null) {
  if (!value) return 'Not recorded';
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
  return `${weeks}w ago`;
}

export function stagePill(value: string) {
  if (value === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (value === 'MATCHED') return 'bg-sky-100 text-sky-800';
  if (value === 'CONSENT_REQUIRED') return 'bg-amber-100 text-amber-800';
  if (value === 'AWAITING_MATCHING') return 'bg-violet-100 text-violet-800';
  return 'bg-slate-200 text-slate-700';
}

export function statusPill(value: string) {
  if (value === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (value === 'MATCHED' || value === 'WAITING') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-200 text-slate-700';
}

export function actionCopy(action: MenteeDetailAction) {
  switch (action) {
    case 'MARK_MATCHED':
      return { title: 'Mark matched', description: 'Record that this learner has been paired and is ready to move into the matched state.', icon: Handshake };
    case 'ACTIVATE':
      return { title: 'Activate mentee', description: 'Move this learner into active delivery once the relationship is ready to begin.', icon: CheckCircle2 };
    case 'DEACTIVATE':
      return { title: 'Deactivate mentee', description: 'Pause this learner out of the operational queue and record the context.', icon: XCircle };
    case 'REOPEN_WAITING':
      return { title: 'Reopen waiting', description: 'Return this learner to the waiting pool so matching can resume.', icon: UserSquare2 };
  }
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

export function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof School2; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{value}</p>
          {hint ? <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p> : null}
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export const tabIcons = {
  overview: GraduationCap,
  support: BookHeart,
  school: School2,
  guardian: ShieldCheck,
  goals: CheckCircle2,
  matching: Handshake,
  audit: UserSquare2,
} satisfies Record<MenteeDetailTab, typeof School2>;
