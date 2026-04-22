import { BadgeCheck, ClipboardList, Send, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { GrantApplicationRow } from '@/lib/api-types';
import {
  deadlineBadgeMeta,
  emptyApproval,
  emptySubmit,
  formatEnum,
  formatMinor,
  getNextPendingApprovalType,
  stagePill,
  type ApprovalForm,
  type SubmitForm,
  type TaskForm,
} from '@/lib/grants-workspace';

type GrantsApplicationsTableProps = {
  displayedApplications: GrantApplicationRow[];
  pendingOnly: boolean;
  onPendingOnlyChange: (next: boolean | ((prev: boolean) => boolean)) => void;
  defaultTaskAssigneeId: string;
  onOpenTaskManager: (payload: TaskForm) => void;
  onOpenApprovalModal: (payload: ApprovalForm) => void;
  onOpenSubmitModal: (payload: SubmitForm) => void;
};

export function GrantsApplicationsTable({
  displayedApplications,
  pendingOnly,
  onPendingOnlyChange,
  defaultTaskAssigneeId,
  onOpenTaskManager,
  onOpenApprovalModal,
  onOpenSubmitModal,
}: GrantsApplicationsTableProps) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">Applications Pipeline</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {pendingOnly ? 'Pending queue only' : 'All applications'}
          </span>
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => onPendingOnlyChange((prev) => !prev)}>
            {pendingOnly ? 'Show All' : 'Show Pending'}
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="max-h-[42vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3 font-semibold">Application</th>
                <th className="px-3 py-3 font-semibold">Stage</th>
                <th className="px-3 py-3 font-semibold">Tasks</th>
                <th className="px-3 py-3 font-semibold">Approvals</th>
                <th className="px-3 py-3 font-semibold">Submission</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedApplications.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--muted)]" colSpan={6}>
                    {pendingOnly ? 'No pending approvals right now.' : 'No applications yet.'}
                  </td>
                </tr>
              ) : (
                displayedApplications.map((item) => {
                  const nextPendingApprovalType = getNextPendingApprovalType(item);
                  return (
                    <tr key={item.id} className="border-t border-[var(--border)] align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[var(--text)]">{item.title}</p>
                        <p className="text-xs text-[var(--muted)]">{item.opportunity.funderName}</p>
                        <p className="text-xs text-[var(--muted)]">{formatMinor(item.amountRequestedMinor, item.currencyCode)}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${deadlineBadgeMeta(item.opportunity.deadline).className}`}>
                            {deadlineBadgeMeta(item.opportunity.deadline).label}
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">{item.opportunity.deadline}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${stagePill(item.stage)}`}>
                          {formatEnum(item.stage)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        {item.progress.tasksDone}/{item.progress.tasksTotal} done
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p>Pursue: {formatEnum(item.approvals.pursue)}</p>
                        <p>Budget: {formatEnum(item.approvals.budget)}</p>
                        <p>Final: {formatEnum(item.approvals.finalSubmission)}</p>
                        <p className="mt-1 text-[var(--text)]">Next: {nextPendingApprovalType ? formatEnum(nextPendingApprovalType) : 'None'}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        {item.submission.submitted ? (
                          <div>
                            <p className="text-emerald-700">Submitted</p>
                            {item.submission.confirmationReference ? <p>{item.submission.confirmationReference}</p> : null}
                          </div>
                        ) : (
                          'Not submitted'
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            title="Task splitting and completion"
                            aria-label="Task splitting and completion"
                            onClick={() =>
                              onOpenTaskManager({
                                applicationId: item.id,
                                title: '',
                                description: '',
                                section: '',
                                assigneeId: defaultTaskAssigneeId,
                                dueDate: '',
                              })
                            }
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            title="Approval update"
                            aria-label="Approval update"
                            onClick={() =>
                              onOpenApprovalModal({
                                ...emptyApproval,
                                applicationId: item.id,
                                approvalType: nextPendingApprovalType ?? 'PURSUE',
                              })
                            }
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </Button>
                          {nextPendingApprovalType ? (
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={`Next pending: ${formatEnum(nextPendingApprovalType)}`}
                              aria-label={`Next pending: ${formatEnum(nextPendingApprovalType)}`}
                              onClick={() =>
                                onOpenApprovalModal({
                                  ...emptyApproval,
                                  applicationId: item.id,
                                  approvalType: nextPendingApprovalType,
                                })
                              }
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Submit application"
                            aria-label="Submit application"
                            onClick={() => onOpenSubmitModal({ ...emptySubmit, applicationId: item.id })}
                            disabled={item.stage === 'SUBMITTED' || item.submission.submitted}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
