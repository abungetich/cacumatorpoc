import type { ComponentType } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, MessageSquare, PauseCircle, PlayCircle, ShieldAlert, XCircle } from 'lucide-react';
import type { RelationshipOverviewItem } from '@/lib/api-types';

export const statusFilters = ['ALL', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TERMINATED'] as const;
export const riskFilters = ['ALL', 'AT_RISK', 'ON_TRACK', 'REVIEW_DUE'] as const;
export const sessionFormats = ['ONLINE', 'IN_PERSON', 'PHONE'] as const;
export const attendanceStatuses = ['COMPLETED', 'SCHEDULED', 'MISSED', 'CANCELLED'] as const;
export const reviewTypes = ['MONTHLY', 'MID_TERM', 'END_TERM'] as const;
export type MilestoneFocus = 'AT_RISK' | 'REVIEW_DUE' | 'NEXT_SESSION' | 'ACTIVITY';

export type SessionFormState = {
  mentorshipId: string;
  relationshipLabel: string;
  scheduledDate: string;
  actualDate: string;
  durationMinutes: string;
  format: (typeof sessionFormats)[number];
  location: string;
  meetingLink: string;
  topicsCovered: string;
  sessionNotes: string;
  attendanceStatus: (typeof attendanceStatuses)[number];
  nextScheduledSession: string;
};

export type ReviewFormState = {
  mentorshipId: string;
  relationshipLabel: string;
  type: (typeof reviewTypes)[number];
  rating: string;
  strengths: string;
  areasForImprovement: string;
  comments: string;
  isAnonymous: boolean;
};

export type CompletionFormState = {
  mentorshipId: string;
  relationshipLabel: string;
  outcome: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL';
  notes: string;
};

export type StatusTransitionFormState = {
  mentorshipId: string;
  relationshipLabel: string;
  action: 'PAUSE' | 'RESUME' | 'TERMINATE';
  reason: string;
};

export const emptySessionForm: SessionFormState = {
  mentorshipId: '',
  relationshipLabel: '',
  scheduledDate: '',
  actualDate: '',
  durationMinutes: '60',
  format: 'ONLINE',
  location: '',
  meetingLink: 'https://',
  topicsCovered: '',
  sessionNotes: '',
  attendanceStatus: 'COMPLETED',
  nextScheduledSession: '',
};

export const emptyReviewForm: ReviewFormState = {
  mentorshipId: '',
  relationshipLabel: '',
  type: 'MONTHLY',
  rating: '4',
  strengths: '',
  areasForImprovement: '',
  comments: '',
  isAnonymous: false,
};

export const emptyCompletionForm: CompletionFormState = {
  mentorshipId: '',
  relationshipLabel: '',
  outcome: 'SUCCESSFUL',
  notes: '',
};

export const emptyStatusTransitionForm: StatusTransitionFormState = {
  mentorshipId: '',
  relationshipLabel: '',
  action: 'PAUSE',
  reason: '',
};

export function formatEnum(value: string) {
  return value.replaceAll('_', ' ');
}

export function statusPill(status: RelationshipOverviewItem['status']) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'PAUSED') return 'bg-purple-100 text-purple-800';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
  if (status === 'COMPLETED') return 'bg-sky-100 text-sky-800';
  return 'bg-rose-100 text-rose-800';
}

export function dateLabel(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function isUpcomingWithin7Days(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
}

export function nextSessionTimingLabel(value: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays > 0) return `${diffDays} day(s) to go`;
  return `past due by ${Math.abs(diffDays)} day(s)`;
}

export function nextSessionDisplay(value: string | null) {
  const base = dateLabel(value);
  const timing = nextSessionTimingLabel(value);
  if (!timing || base === '-') return base;
  return `${base} (${timing})`;
}

export function milestoneFocusLabel(focus: MilestoneFocus) {
  if (focus === 'AT_RISK') return 'At Risk';
  if (focus === 'REVIEW_DUE') return 'Review Due';
  if (focus === 'NEXT_SESSION') return 'Next Session';
  return 'Activity';
}

export function milestoneFocusDescription(focus: MilestoneFocus, item: RelationshipOverviewItem) {
  if (focus === 'AT_RISK') {
    return item.daysSinceLastSession === null
      ? 'No recent session is logged. Review cadence and session attendance.'
      : `${item.daysSinceLastSession} day(s) since the last logged session.`;
  }
  if (focus === 'REVIEW_DUE') {
    return `Last review on ${dateLabel(item.lastFeedbackAt)}. Collect new feedback at the next checkpoint.`;
  }
  if (focus === 'NEXT_SESSION') {
    if (!item.nextScheduledSession) {
      return 'No next session is scheduled yet.';
    }
    const timing = nextSessionTimingLabel(item.nextScheduledSession);
    if (!timing) {
      return `Next planned session is ${dateLabel(item.nextScheduledSession)}.`;
    }
    return `Next planned session is ${dateLabel(item.nextScheduledSession)} (${timing}).`;
  }
  return `${item.sessionsLogged} sessions and ${item.feedbackCount} reviews are logged for this relationship.`;
}

export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function buildStats(rows: RelationshipOverviewItem[]) {
  const active = rows.filter((item) => item.status === 'ACTIVE').length;
  const atRisk = rows.filter((item) => item.atRisk).length;
  const reviewDue = rows.filter((item) => item.reviewDue).length;
  const upcoming = rows.filter((item) => isUpcomingWithin7Days(item.nextScheduledSession)).length;
  return { active, atRisk, reviewDue, upcoming };
}

export function buildSessionForm(item: RelationshipOverviewItem): SessionFormState {
  return {
    ...emptySessionForm,
    mentorshipId: item.mentorshipId,
    relationshipLabel: `${item.mentor.name} + ${item.mentee.name}`,
    scheduledDate: item.nextScheduledSession ?? item.lastSessionDate ?? '',
    actualDate: item.nextScheduledSession ?? '',
    format: 'ONLINE',
    meetingLink: 'https://',
    location: '',
    nextScheduledSession: item.nextScheduledSession ?? '',
    sessionNotes: 'Session focused on agreed mentorship goals.',
  };
}

export function buildReviewForm(item: RelationshipOverviewItem): ReviewFormState {
  return {
    ...emptyReviewForm,
    mentorshipId: item.mentorshipId,
    relationshipLabel: `${item.mentor.name} + ${item.mentee.name}`,
    comments: `Review for ${item.mentor.name} and ${item.mentee.name}`,
  };
}

export function buildCompletionForm(item: RelationshipOverviewItem): CompletionFormState {
  return {
    ...emptyCompletionForm,
    mentorshipId: item.mentorshipId,
    relationshipLabel: `${item.mentor.name} + ${item.mentee.name}`,
  };
}

export function buildStatusTransitionForm(item: RelationshipOverviewItem, action: 'PAUSE' | 'RESUME' | 'TERMINATE'): StatusTransitionFormState {
  return {
    ...emptyStatusTransitionForm,
    mentorshipId: item.mentorshipId,
    relationshipLabel: `${item.mentor.name} + ${item.mentee.name}`,
    action,
  };
}

export type MetricIcon = ComponentType<{ className?: string }>;
export const relationshipMetricIcons: Record<'active' | 'atRisk' | 'reviewDue' | 'upcoming', MetricIcon> = {
  active: CheckCircle2,
  atRisk: ShieldAlert,
  reviewDue: ClipboardCheck,
  upcoming: CalendarClock,
};

export const relationshipActionIcons = {
  logSession: MessageSquare,
  submitReview: ClipboardCheck,
  pause: PauseCircle,
  resume: PlayCircle,
  complete: CheckCircle2,
  terminate: XCircle,
  risk: AlertTriangle,
};
