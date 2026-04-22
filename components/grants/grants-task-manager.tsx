import { BadgeCheck, Check, CheckCheck, Paperclip, PencilLine, Trash2, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GrantApplicationRow, GrantTaskAssigneeRow } from '@/lib/api-types';
import {
  formatDate,
  formatEnum,
  taskDomains,
  taskStatusMeta,
  type EditTaskForm,
  type TaskEvidenceForm,
  type TaskForm,
  type TaskReviewForm,
} from '@/lib/grants-workspace';

type GrantsTaskManagerProps = {
  activeTaskApp: GrantApplicationRow | null;
  currentUserId?: string;
  taskAssignees: GrantTaskAssigneeRow[];
  taskForm: TaskForm;
  onTaskFormChange: (updater: TaskForm | ((prev: TaskForm) => TaskForm)) => void;
  onCreateTask: () => Promise<void>;
  creatingTask: boolean;
  onClose: () => void;
  onAcknowledgeTask: (taskId: string) => Promise<void>;
  acknowledgingTask: boolean;
  onCompleteTask: (taskId: string) => Promise<void>;
  completingTask: boolean;
  onOpenTaskEvidenceModal: (payload: TaskEvidenceForm) => void;
  uploadingTaskEvidence: boolean;
  onOpenTaskReviewModal: (payload: TaskReviewForm) => void;
  reviewingTask: boolean;
  onOpenEditTaskModal: (payload: EditTaskForm) => void;
  onOpenDeleteTaskModal: (payload: { id: string; title: string }) => void;
  updatingTaskDetails: boolean;
  deletingTask: boolean;
};

export function GrantsTaskManager({
  activeTaskApp,
  currentUserId,
  taskAssignees,
  taskForm,
  onTaskFormChange,
  onCreateTask,
  creatingTask,
  onClose,
  onAcknowledgeTask,
  acknowledgingTask,
  onCompleteTask,
  completingTask,
  onOpenTaskEvidenceModal,
  uploadingTaskEvidence,
  onOpenTaskReviewModal,
  reviewingTask,
  onOpenEditTaskModal,
  onOpenDeleteTaskModal,
  updatingTaskDetails,
  deletingTask,
}: GrantsTaskManagerProps) {
  if (!activeTaskApp) return null;

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Task Splitting & Completion</p>
          <p className="text-xs text-[var(--muted)]">
            {activeTaskApp.title} • {activeTaskApp.progress.tasksDone}/{activeTaskApp.progress.tasksTotal} complete
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Task</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Evidence</th>
              <th className="px-3 py-2 font-semibold">Due</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {activeTaskApp.tasks.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--muted)]" colSpan={5}>
                  No tasks yet.
                </td>
              </tr>
            ) : (
              activeTaskApp.tasks.map((task) => (
                <tr key={task.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">
                    <p className="font-medium text-[var(--text)]">{task.title}</p>
                    {task.description ? <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{task.description}</p> : null}
                    {task.section ? <p className="mt-0.5 text-[11px] font-semibold text-[var(--primary)]">{formatEnum(task.section)}</p> : null}
                    <p className="text-xs text-[var(--muted)]">{task.assigneeName ?? 'Unassigned'}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--muted)]">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${taskStatusMeta(task).className}`}>
                      {taskStatusMeta(task).label}
                    </span>
                    {task.reviewedAt ? (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        Reviewed by {task.reviewedByName ?? 'Reviewer'} on {formatDate(task.reviewedAt)}
                      </p>
                    ) : null}
                    {task.reviewNotes ? <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">{task.reviewNotes}</p> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--muted)]">
                    {task.evidenceUrl && task.evidenceName ? (
                      <div className="space-y-1">
                        <a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="max-w-[220px] truncate">{task.evidenceName}</span>
                        </a>
                        {task.evidenceSize ? <p className="text-[11px]">{task.evidenceSize}</p> : null}
                      </div>
                    ) : (
                      'No evidence'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--muted)]">{task.dueDate ?? '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        disabled={task.status !== 'TODO' || acknowledgingTask || !currentUserId || task.assigneeId !== currentUserId}
                        title={task.assigneeId && task.assigneeId !== currentUserId ? 'Only the assigned user can acknowledge' : 'Acknowledge task'}
                        aria-label="Acknowledge task"
                        onClick={() => void onAcknowledgeTask(task.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={task.status !== 'IN_PROGRESS' || completingTask || !currentUserId || task.assigneeId !== currentUserId}
                        title={task.assigneeId && task.assigneeId !== currentUserId ? 'Only the assigned user can complete' : 'Mark task done'}
                        aria-label="Mark task done"
                        onClick={() => void onCompleteTask(task.id)}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        disabled={task.status !== 'DONE' || uploadingTaskEvidence || !currentUserId || task.assigneeId !== currentUserId || task.reviewStatus === 'APPROVED'}
                        title={task.assigneeId && task.assigneeId !== currentUserId ? 'Only the assigned user can upload evidence' : 'Upload evidence'}
                        aria-label="Upload evidence"
                        onClick={() => onOpenTaskEvidenceModal({ taskId: task.id, title: task.title, file: null })}
                      >
                        <UploadCloud className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={reviewingTask || task.status !== 'DONE' || task.reviewStatus === 'APPROVED' || !task.evidenceUrl || !currentUserId || task.assigneeId === currentUserId}
                        title={task.assigneeId === currentUserId ? 'Assigned user cannot self-review' : !task.evidenceUrl ? 'Upload evidence before review' : 'Review completed task'}
                        aria-label="Review completed task"
                        onClick={() => onOpenTaskReviewModal({ taskId: task.id, title: task.title, decision: 'APPROVE', notes: '' })}
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        title="Edit task"
                        aria-label="Edit task"
                        disabled={updatingTaskDetails || deletingTask}
                        onClick={() =>
                          onOpenEditTaskModal({
                            taskId: task.id,
                            title: task.title,
                            description: task.description ?? '',
                            section: task.section ?? '',
                            assigneeId: task.assigneeId ?? '',
                            dueDate: task.dueDate ?? '',
                          })
                        }
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="h-8 w-8 p-0"
                        title="Delete task"
                        aria-label="Delete task"
                        disabled={updatingTaskDetails || deletingTask}
                        onClick={() => onOpenDeleteTaskModal({ id: task.id, title: task.title })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreateTask();
        }}
      >
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Task Title *</span>
          <Input required value={taskForm.title} onChange={(event) => onTaskFormChange((prev) => ({ ...prev, title: event.target.value }))} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Section</span>
          <select
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            value={taskForm.section}
            onChange={(event) => onTaskFormChange((prev) => ({ ...prev, section: event.target.value }))}
          >
            <option value="">Select domain</option>
            {taskDomains.map((domain) => (
              <option key={domain} value={domain}>
                {formatEnum(domain)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Assignee *</span>
          <select
            required
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            value={taskForm.assigneeId}
            onChange={(event) => onTaskFormChange((prev) => ({ ...prev, assigneeId: event.target.value }))}
          >
            <option value="">Select assignee</option>
            {taskAssignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.fullName} ({formatEnum(assignee.role)})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Due Date</span>
          <Input type="date" value={taskForm.dueDate} onChange={(event) => onTaskFormChange((prev) => ({ ...prev, dueDate: event.target.value }))} />
        </label>
        <div className="md:col-span-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Description</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={taskForm.description}
              onChange={(event) => onTaskFormChange((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" disabled={creatingTask}>
            {creatingTask ? 'Saving...' : 'Add Task'}
          </Button>
        </div>
      </form>
    </section>
  );
}
