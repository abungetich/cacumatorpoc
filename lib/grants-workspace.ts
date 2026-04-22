import type { GrantApplicationRow, GrantOpportunityRow } from '@/lib/api-types';

export const stageFilters = ['ALL', 'DISCOVERY', 'APPROVAL', 'WRITING', 'SUBMISSION', 'SUBMITTED', 'CLOSED'] as const;
export const sourceTypes = ['TEAM', 'BOARD', 'WEBSITE', 'LINKEDIN', 'EMAIL', 'REFERRAL', 'OTHER'] as const;
export const taskDomains = [
  'LEGAL',
  'OPERATIONS',
  'STATUTORY',
  'TECHNOLOGY',
  'FINANCE',
  'PROGRAM',
  'PARTNERSHIPS',
  'COMMUNICATIONS',
  'MONITORING_EVALUATION',
  'SAFEGUARDING',
  'OTHER',
] as const;
export const scoringRubric = [
  { key: 'timelineScore', title: 'Timeline Fit', weight: 20 },
  { key: 'amountScore', title: 'Amount Fit', weight: 20 },
  { key: 'areaScore', title: 'Strategic Area Fit', weight: 30 },
  { key: 'eligibilityScore', title: 'Eligibility Confidence', weight: 20 },
  { key: 'readinessScore', title: 'Team Readiness', weight: 10 },
] as const;

export function scoreLevelLabel(value: number) {
  if (value <= 1) return 'Very Low';
  if (value === 2) return 'Low';
  if (value === 3) return 'Moderate';
  if (value === 4) return 'High';
  return 'Very High';
}

export function formatEnum(value: string) {
  return value.replaceAll('_', ' ');
}

export function formatMinor(value: string, code: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return `${value} ${code}`;
  return `${parsed.toLocaleString()} ${code}`;
}

export function stagePill(stage: GrantApplicationRow['stage']) {
  if (stage === 'DISCOVERY') return 'bg-slate-100 text-slate-700';
  if (stage === 'APPROVAL') return 'bg-amber-100 text-amber-800';
  if (stage === 'WRITING') return 'bg-sky-100 text-sky-800';
  if (stage === 'SUBMISSION') return 'bg-indigo-100 text-indigo-800';
  if (stage === 'SUBMITTED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-rose-100 text-rose-800';
}

export function opportunityPill(status: GrantOpportunityRow['status']) {
  if (status === 'DISCOVERED') return 'bg-slate-100 text-slate-700';
  if (status === 'QUALIFYING') return 'bg-amber-100 text-amber-800';
  if (status === 'PURSUING') return 'bg-emerald-100 text-emerald-800';
  return 'bg-rose-100 text-rose-800';
}

export function computeMatrixScore(input: {
  timelineScore: number;
  amountScore: number;
  areaScore: number;
  eligibilityScore: number;
  readinessScore: number;
}) {
  const weightedTotal =
    input.timelineScore * 20 +
    input.amountScore * 20 +
    input.areaScore * 30 +
    input.eligibilityScore * 20 +
    input.readinessScore * 10;

  return Math.round(weightedTotal / 5);
}

export function fitBand(score: number | null) {
  if (score === null) {
    return { label: 'Not Scored', className: 'bg-slate-100 text-slate-700' };
  }
  if (score >= 80) {
    return { label: `${score}/100 · High`, className: 'bg-emerald-100 text-emerald-800' };
  }
  if (score >= 60) {
    return { label: `${score}/100 · Medium`, className: 'bg-amber-100 text-amber-800' };
  }
  return { label: `${score}/100 · Low`, className: 'bg-rose-100 text-rose-800' };
}

export function formatDate(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function daysUntil(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function deadlineBadgeMeta(deadline: string) {
  const days = daysUntil(deadline);
  if (days === null) {
    return { label: 'No deadline', className: 'bg-slate-100 text-slate-700' };
  }
  if (days < 0) {
    return { label: `${Math.abs(days)}d overdue`, className: 'bg-rose-100 text-rose-800' };
  }
  if (days <= 7) {
    return { label: `${days}d left`, className: 'bg-amber-100 text-amber-800' };
  }
  return { label: `${days}d left`, className: 'bg-sky-100 text-sky-800' };
}

export function scorePillClass(score: number) {
  if (score >= 4) return 'bg-emerald-100 text-emerald-800';
  if (score === 3) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

export function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function taskStatusMeta(task: GrantApplicationRow['tasks'][number]) {
  if (task.status === 'DONE') {
    if (task.reviewStatus === 'APPROVED' || task.reviewStatus === null) {
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' };
    }
    if (!task.evidenceUrl) {
      return { label: 'Evidence Needed', className: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'Awaiting Review', className: 'bg-sky-100 text-sky-800' };
  }
  if (task.reviewStatus === 'REWORK_REQUIRED') {
    return { label: 'Rework Required', className: 'bg-rose-100 text-rose-800' };
  }
  if (task.status === 'IN_PROGRESS') {
    return { label: 'In Progress', className: 'bg-indigo-100 text-indigo-800' };
  }
  return { label: 'Awaiting Acknowledgment', className: 'bg-slate-100 text-slate-700' };
}

export function getNextPendingApprovalType(application: GrantApplicationRow) {
  const queue: Array<{ type: ApprovalForm['approvalType']; status: GrantApplicationRow['approvals']['pursue'] }> = [
    { type: 'PURSUE', status: application.approvals.pursue },
    { type: 'BUDGET', status: application.approvals.budget },
    { type: 'FINAL_SUBMISSION', status: application.approvals.finalSubmission },
  ];
  const pending = queue.find((item) => item.status === 'MISSING' || item.status === 'PENDING');
  return pending?.type ?? null;
}

export function sortableDateMs(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return parsed.getTime();
}

export function compareOpportunitiesByPriority(a: GrantOpportunityRow, b: GrantOpportunityRow) {
  const fitA = a.fitScore ?? -1;
  const fitB = b.fitScore ?? -1;
  if (fitA !== fitB) return fitB - fitA;

  const deadlineA = sortableDateMs(a.deadline);
  const deadlineB = sortableDateMs(b.deadline);
  if (deadlineA !== deadlineB) return deadlineA - deadlineB;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export type OpportunityForm = {
  title: string;
  funderName: string;
  description: string;
  sourceType: (typeof sourceTypes)[number] | '';
  sourceReference: string;
  sourceUrl: string;
  attachment: File | null;
  deadline: string;
  status: 'DISCOVERED' | 'QUALIFYING' | 'PURSUING' | 'ARCHIVED';
  country: string;
  currencyCode: string;
  amountMinor: string;
};

export const emptyOpportunity: OpportunityForm = {
  title: '',
  funderName: '',
  description: '',
  sourceType: '',
  sourceReference: '',
  sourceUrl: '',
  attachment: null,
  deadline: '',
  status: 'DISCOVERED',
  country: '',
  currencyCode: 'USD',
  amountMinor: '',
};

export type ScoreForm = {
  opportunityId: string;
  title: string;
  timelineScore: number;
  amountScore: number;
  areaScore: number;
  eligibilityScore: number;
  readinessScore: number;
  notes: string;
};

export const emptyScoreForm: ScoreForm = {
  opportunityId: '',
  title: '',
  timelineScore: 3,
  amountScore: 3,
  areaScore: 3,
  eligibilityScore: 3,
  readinessScore: 3,
  notes: '',
};

export type ApplicationForm = {
  opportunityId: string;
  title: string;
  currencyCode: string;
  amountRequestedMinor: string;
};

export const emptyApplication: ApplicationForm = {
  opportunityId: '',
  title: '',
  currencyCode: 'USD',
  amountRequestedMinor: '',
};

export type TaskForm = {
  applicationId: string;
  title: string;
  description: string;
  section: string;
  assigneeId: string;
  dueDate: string;
};

export const emptyTask: TaskForm = {
  applicationId: '',
  title: '',
  description: '',
  section: '',
  assigneeId: '',
  dueDate: '',
};

export type EditTaskForm = {
  taskId: string;
  title: string;
  description: string;
  section: string;
  assigneeId: string;
  dueDate: string;
};

export const emptyEditTask: EditTaskForm = {
  taskId: '',
  title: '',
  description: '',
  section: '',
  assigneeId: '',
  dueDate: '',
};

export type TaskEvidenceForm = {
  taskId: string;
  title: string;
  file: File | null;
};

export const emptyTaskEvidence: TaskEvidenceForm = {
  taskId: '',
  title: '',
  file: null,
};

export type TaskReviewForm = {
  taskId: string;
  title: string;
  decision: 'APPROVE' | 'REWORK';
  notes: string;
};

export const emptyTaskReview: TaskReviewForm = {
  taskId: '',
  title: '',
  decision: 'APPROVE',
  notes: '',
};

export type ApprovalForm = {
  applicationId: string;
  approvalType: 'PURSUE' | 'BUDGET' | 'FINAL_SUBMISSION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string;
};

export const emptyApproval: ApprovalForm = {
  applicationId: '',
  approvalType: 'PURSUE',
  status: 'PENDING',
  notes: '',
};

export type SubmitForm = {
  applicationId: string;
  confirmationReference: string;
  proofUrl: string;
  packageVersion: string;
  notes: string;
};

export const emptySubmit: SubmitForm = {
  applicationId: '',
  confirmationReference: '',
  proofUrl: '',
  packageVersion: '',
  notes: '',
};

export type GrantsStats = {
  opportunities: number;
  applications: number;
  pendingApprovals: number;
  submitted: number;
  writing: number;
};
