import { Search, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, SectionSkeleton } from '@/components/ui/states';
import { Input } from '@/components/ui/input';
import type { GrantApplicationRow, GrantOpportunityRow, GrantTaskAssigneeRow } from '@/lib/api-types';
import {
  formatEnum,
  stageFilters,
  type ApprovalForm,
  type ApplicationForm,
  type EditTaskForm,
  type ScoreForm,
  type SubmitForm,
  type TaskEvidenceForm,
  type TaskForm,
  type TaskReviewForm,
} from '@/lib/grants-workspace';

import { GrantsApplicationsTable } from '@/components/grants/grants-applications-table';
import { GrantsOpportunitiesTable } from '@/components/grants/grants-opportunities-table';
import { GrantsTaskManager } from '@/components/grants/grants-task-manager';

type WorkspaceError = Error | null;

type GrantsWorkspaceProps = {
  search: string;
  onSearchChange: (value: string) => void;
  stage: (typeof stageFilters)[number];
  onStageChange: (value: (typeof stageFilters)[number]) => void;
  autoPriorityEnabled: boolean;
  onAutoPriorityChange: (next: boolean | ((prev: boolean) => boolean)) => void;
  pendingOnly: boolean;
  onPendingOnlyChange: (next: boolean | ((prev: boolean) => boolean)) => void;
  workspaceLoading: boolean;
  workspaceError: WorkspaceError;
  onRetry: () => void;
  opportunities: GrantOpportunityRow[];
  displayedApplications: GrantApplicationRow[];
  activeTaskApp: GrantApplicationRow | null;
  taskAssignees: GrantTaskAssigneeRow[];
  defaultTaskAssigneeId: string;
  currentUserId?: string;
  onOpenOpportunityModal: () => void;
  onOpenScoreModal: (payload: ScoreForm) => void;
  onOpenApplicationModal: (payload: ApplicationForm) => void;
  onOpenTaskManager: (payload: TaskForm) => void;
  onOpenApprovalModal: (payload: ApprovalForm) => void;
  onOpenSubmitModal: (payload: SubmitForm) => void;
  onCloseTaskManager: () => void;
  taskForm: TaskForm;
  onTaskFormChange: (updater: TaskForm | ((prev: TaskForm) => TaskForm)) => void;
  onCreateTask: () => Promise<void>;
  creatingTask: boolean;
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

export function GrantsWorkspace({
  search,
  onSearchChange,
  stage,
  onStageChange,
  autoPriorityEnabled,
  onAutoPriorityChange,
  pendingOnly,
  onPendingOnlyChange,
  workspaceLoading,
  workspaceError,
  onRetry,
  opportunities,
  displayedApplications,
  activeTaskApp,
  taskAssignees,
  defaultTaskAssigneeId,
  currentUserId,
  onOpenOpportunityModal,
  onOpenScoreModal,
  onOpenApplicationModal,
  onOpenTaskManager,
  onOpenApprovalModal,
  onOpenSubmitModal,
  onCloseTaskManager,
  taskForm,
  onTaskFormChange,
  onCreateTask,
  creatingTask,
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
}: GrantsWorkspaceProps) {
  return (
    <Card className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="relative md:col-span-3">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <Input
            className="pl-9"
            placeholder="Search grants by title, funder, stage"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <select
          className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
          value={stage}
          onChange={(event) => onStageChange(event.target.value as (typeof stageFilters)[number])}
        >
          {stageFilters.map((item) => (
            <option key={item} value={item}>
              {item === 'ALL' ? 'All Stages' : formatEnum(item)}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRetry}>
            Refresh
          </Button>
          <Button className="gap-2" onClick={onOpenOpportunityModal}>
            <Target className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {workspaceLoading ? <SectionSkeleton rows={8} /> : null}
      {workspaceError ? (
        <ErrorState
          title="Could not load grant workspace"
          description={workspaceError.message || 'Try refreshing.'}
          onRetry={onRetry}
        />
      ) : null}

      {!workspaceLoading && !workspaceError ? (
        <>
          <GrantsOpportunitiesTable
            opportunities={opportunities}
            autoPriorityEnabled={autoPriorityEnabled}
            onAutoPriorityChange={onAutoPriorityChange}
            onOpenScoreModal={onOpenScoreModal}
            onOpenApplicationModal={onOpenApplicationModal}
          />

          <GrantsApplicationsTable
            displayedApplications={displayedApplications}
            pendingOnly={pendingOnly}
            onPendingOnlyChange={onPendingOnlyChange}
            defaultTaskAssigneeId={defaultTaskAssigneeId}
            onOpenTaskManager={onOpenTaskManager}
            onOpenApprovalModal={onOpenApprovalModal}
            onOpenSubmitModal={onOpenSubmitModal}
          />
        </>
      ) : null}

      <GrantsTaskManager
        activeTaskApp={activeTaskApp}
        currentUserId={currentUserId}
        taskAssignees={taskAssignees}
        taskForm={taskForm}
        onTaskFormChange={onTaskFormChange}
        onCreateTask={onCreateTask}
        creatingTask={creatingTask}
        onClose={onCloseTaskManager}
        onAcknowledgeTask={onAcknowledgeTask}
        acknowledgingTask={acknowledgingTask}
        onCompleteTask={onCompleteTask}
        completingTask={completingTask}
        onOpenTaskEvidenceModal={onOpenTaskEvidenceModal}
        uploadingTaskEvidence={uploadingTaskEvidence}
        onOpenTaskReviewModal={onOpenTaskReviewModal}
        reviewingTask={reviewingTask}
        onOpenEditTaskModal={onOpenEditTaskModal}
        onOpenDeleteTaskModal={onOpenDeleteTaskModal}
        updatingTaskDetails={updatingTaskDetails}
        deletingTask={deletingTask}
      />
    </Card>
  );
}
