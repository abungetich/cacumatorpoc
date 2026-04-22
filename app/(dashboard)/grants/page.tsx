'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { GrantsModals } from '@/components/grants/grants-modals';
import { GrantsOverview } from '@/components/grants/grants-overview';
import { GrantsWorkspace } from '@/components/grants/grants-workspace';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  createGrantApplicationRequest,
  createGrantOpportunityRequest,
  createGrantTaskRequest,
  deleteGrantTaskRequest,
  fetchGrantTaskAssignees,
  fetchGrantWorkspace,
  reviewGrantTaskRequest,
  scoreGrantOpportunityRequest,
  submitGrantApplicationRequest,
  updateGrantTaskDetailsRequest,
  updateGrantTaskRequest,
  uploadGrantTaskEvidenceRequest,
  upsertGrantApprovalRequest,
} from '@/lib/grants-actions';
import {
  compareOpportunitiesByPriority,
  computeMatrixScore,
  emptyApplication,
  emptyApproval,
  emptyEditTask,
  emptyOpportunity,
  emptyScoreForm,
  emptySubmit,
  emptyTask,
  emptyTaskEvidence,
  emptyTaskReview,
  getNextPendingApprovalType,
  type ApprovalForm,
  type ApplicationForm,
  type EditTaskForm,
  type OpportunityForm,
  type ScoreForm,
  type SubmitForm,
  type TaskEvidenceForm,
  type TaskForm,
  type TaskReviewForm,
} from '@/lib/grants-workspace';

export default function GrantsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<'ALL' | 'DISCOVERY' | 'APPROVAL' | 'WRITING' | 'SUBMISSION' | 'SUBMITTED' | 'CLOSED'>('ALL');
  const [autoPriorityEnabled, setAutoPriorityEnabled] = useState(true);
  const [pendingOnly, setPendingOnly] = useState(false);

  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>(emptyOpportunity);
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [isAttachmentDragActive, setIsAttachmentDragActive] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [applicationForm, setApplicationForm] = useState<ApplicationForm>(emptyApplication);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask);
  const [activeTaskAppId, setActiveTaskAppId] = useState<string | null>(null);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState<EditTaskForm>(emptyEditTask);
  const [isTaskEvidenceModalOpen, setIsTaskEvidenceModalOpen] = useState(false);
  const [taskEvidenceForm, setTaskEvidenceForm] = useState<TaskEvidenceForm>(emptyTaskEvidence);
  const [isTaskEvidenceDragActive, setIsTaskEvidenceDragActive] = useState(false);
  const taskEvidenceInputRef = useRef<HTMLInputElement | null>(null);
  const [isTaskReviewModalOpen, setIsTaskReviewModalOpen] = useState(false);
  const [taskReviewForm, setTaskReviewForm] = useState<TaskReviewForm>(emptyTaskReview);
  const [taskPendingDelete, setTaskPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const [approvalForm, setApprovalForm] = useState<ApprovalForm>(emptyApproval);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const [submitForm, setSubmitForm] = useState<SubmitForm>(emptySubmit);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [scoreForm, setScoreForm] = useState<ScoreForm>(emptyScoreForm);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

  const canManageGrants =
    user?.role === 'PLATFORM_ADMIN' || user?.role === 'PARTNER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  const workspaceQuery = useQuery({
    queryKey: ['grants-workspace', search, stage],
    queryFn: () => fetchGrantWorkspace({ search, stage }),
    enabled: canManageGrants,
  });

  const assigneesQuery = useQuery({
    queryKey: ['grant-task-assignees'],
    queryFn: () => fetchGrantTaskAssignees(),
    enabled: canManageGrants,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['grants-workspace'] });
    await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
  };

  const createOpportunityMutation = useMutation({
    mutationFn: (payload: OpportunityForm) =>
      createGrantOpportunityRequest({
        title: payload.title,
        funderName: payload.funderName,
        description: payload.description || undefined,
        sourceType: payload.sourceType || undefined,
        sourceReference: payload.sourceReference || undefined,
        sourceUrl: payload.sourceUrl || undefined,
        attachment: payload.attachment,
        deadline: payload.deadline,
        status: payload.status,
        country: payload.country || undefined,
        currencyCode: payload.currencyCode,
        amountMinor: payload.amountMinor,
      }),
    onSuccess: refresh,
  });

  const scoreOpportunityMutation = useMutation({
    mutationFn: (payload: ScoreForm) =>
      scoreGrantOpportunityRequest(payload.opportunityId, {
        timelineScore: payload.timelineScore,
        amountScore: payload.amountScore,
        areaScore: payload.areaScore,
        eligibilityScore: payload.eligibilityScore,
        readinessScore: payload.readinessScore,
        notes: payload.notes || undefined,
      }),
    onSuccess: refresh,
  });

  const createApplicationMutation = useMutation({
    mutationFn: (payload: ApplicationForm) =>
      createGrantApplicationRequest({
        opportunityId: payload.opportunityId,
        title: payload.title || undefined,
        currencyCode: payload.currencyCode,
        amountRequestedMinor: payload.amountRequestedMinor,
      }),
    onSuccess: refresh,
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: TaskForm) =>
      createGrantTaskRequest(payload.applicationId, {
        title: payload.title,
        description: payload.description || undefined,
        section: payload.section || undefined,
        assigneeId: payload.assigneeId,
        dueDate: payload.dueDate || undefined,
      }),
    onSuccess: refresh,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'TODO' | 'IN_PROGRESS' | 'DONE' }) => updateGrantTaskRequest(taskId, { status }),
    onSuccess: refresh,
  });

  const uploadTaskEvidenceMutation = useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) => uploadGrantTaskEvidenceRequest(taskId, file),
    onSuccess: refresh,
  });

  const reviewTaskMutation = useMutation({
    mutationFn: ({ taskId, decision, notes }: { taskId: string; decision: 'APPROVE' | 'REWORK'; notes?: string }) =>
      reviewGrantTaskRequest(taskId, { decision, notes }),
    onSuccess: refresh,
  });

  const updateTaskDetailsMutation = useMutation({
    mutationFn: (payload: EditTaskForm) =>
      updateGrantTaskDetailsRequest(payload.taskId, {
        title: payload.title,
        description: payload.description || undefined,
        section: payload.section || undefined,
        assigneeId: payload.assigneeId,
        dueDate: payload.dueDate || undefined,
      }),
    onSuccess: refresh,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId }: { taskId: string }) => deleteGrantTaskRequest(taskId),
    onSuccess: refresh,
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: ApprovalForm) =>
      upsertGrantApprovalRequest(payload.applicationId, {
        approvalType: payload.approvalType,
        status: payload.status,
        notes: payload.notes || undefined,
      }),
    onSuccess: refresh,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitForm) =>
      submitGrantApplicationRequest(payload.applicationId, {
        confirmationReference: payload.confirmationReference || undefined,
        proofUrl: payload.proofUrl || undefined,
        packageVersion: payload.packageVersion || undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: refresh,
  });

  const opportunities = useMemo(() => {
    const items = [...(workspaceQuery.data?.opportunities ?? [])];
    if (!autoPriorityEnabled) return items;
    items.sort(compareOpportunitiesByPriority);
    return items;
  }, [autoPriorityEnabled, workspaceQuery.data?.opportunities]);

  const applications = useMemo(() => workspaceQuery.data?.applications ?? [], [workspaceQuery.data?.applications]);
  const displayedApplications = useMemo(() => {
    if (!pendingOnly) return applications;
    return applications.filter((item) => getNextPendingApprovalType(item) !== null);
  }, [applications, pendingOnly]);

  const activeTaskApp = useMemo(() => applications.find((item) => item.id === activeTaskAppId) ?? null, [applications, activeTaskAppId]);
  const taskAssignees = useMemo(() => assigneesQuery.data?.items ?? [], [assigneesQuery.data?.items]);
  const defaultTaskAssigneeId = useMemo(() => {
    if (!taskAssignees.length) return '';
    if (user?.id && taskAssignees.some((item) => item.id === user.id)) return user.id;
    return taskAssignees[0]?.id ?? '';
  }, [taskAssignees, user?.id]);

  const stats = useMemo(() => {
    const pendingApprovals = applications.reduce((sum, item) => sum + item.approvals.pendingCount, 0);
    const submitted = applications.filter((item) => item.stage === 'SUBMITTED').length;
    const writing = applications.filter((item) => item.stage === 'WRITING').length;

    return {
      opportunities: opportunities.length,
      applications: applications.length,
      pendingApprovals,
      submitted,
      writing,
    };
  }, [applications, opportunities]);

  const applyOpportunityAttachment = (file: File | null) => setOpportunityForm((prev) => ({ ...prev, attachment: file }));
  const applyTaskEvidence = (file: File | null) => setTaskEvidenceForm((prev) => ({ ...prev, file }));
  const clearOpportunityAttachment = () => {
    applyOpportunityAttachment(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };
  const clearTaskEvidence = () => {
    applyTaskEvidence(null);
    if (taskEvidenceInputRef.current) taskEvidenceInputRef.current.value = '';
  };

  const openTaskManager = (payload: TaskForm) => {
    setTaskForm({ ...emptyTask, applicationId: payload.applicationId, assigneeId: defaultTaskAssigneeId });
    setActiveTaskAppId(payload.applicationId);
  };

  if (!canManageGrants) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only admin roles can manage grants in phase 1." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <GrantsOverview stats={stats} />

      <GrantsWorkspace
        search={search}
        onSearchChange={setSearch}
        stage={stage}
        onStageChange={setStage}
        autoPriorityEnabled={autoPriorityEnabled}
        onAutoPriorityChange={setAutoPriorityEnabled}
        pendingOnly={pendingOnly}
        onPendingOnlyChange={setPendingOnly}
        workspaceLoading={workspaceQuery.isLoading}
        workspaceError={workspaceQuery.error instanceof Error ? workspaceQuery.error : null}
        onRetry={() => void workspaceQuery.refetch()}
        opportunities={opportunities}
        displayedApplications={displayedApplications}
        activeTaskApp={activeTaskApp}
        taskAssignees={taskAssignees}
        defaultTaskAssigneeId={defaultTaskAssigneeId}
        currentUserId={user?.id}
        onOpenOpportunityModal={() => {
          setOpportunityForm(emptyOpportunity);
          setIsOpportunityModalOpen(true);
        }}
        onOpenScoreModal={(payload) => {
          setScoreForm(payload);
          setIsScoreModalOpen(true);
        }}
        onOpenApplicationModal={(payload) => {
          setApplicationForm(payload);
          setIsApplicationModalOpen(true);
        }}
        onOpenTaskManager={openTaskManager}
        onOpenApprovalModal={(payload) => {
          setApprovalForm(payload);
          setIsApprovalModalOpen(true);
        }}
        onOpenSubmitModal={(payload) => {
          setSubmitForm(payload);
          setIsSubmitModalOpen(true);
        }}
        onCloseTaskManager={() => setActiveTaskAppId(null)}
        taskForm={taskForm}
        onTaskFormChange={setTaskForm}
        onCreateTask={async () => {
          try {
            await createTaskMutation.mutateAsync(taskForm);
            pushToast({ title: 'Task Added', description: 'Writing task created.', variant: 'success' });
            setTaskForm((prev) => ({ ...emptyTask, applicationId: prev.applicationId, assigneeId: defaultTaskAssigneeId }));
          } catch (error) {
            pushToast({ title: 'Could Not Add Task', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        creatingTask={createTaskMutation.isPending}
        onAcknowledgeTask={async (taskId) => {
          try {
            await updateTaskMutation.mutateAsync({ taskId, status: 'IN_PROGRESS' });
            pushToast({ title: 'Task Acknowledged', description: 'Task accepted by assignee.', variant: 'success' });
          } catch (error) {
            pushToast({ title: 'Task Update Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        acknowledgingTask={updateTaskMutation.isPending}
        onCompleteTask={async (taskId) => {
          try {
            await updateTaskMutation.mutateAsync({ taskId, status: 'DONE' });
            pushToast({ title: 'Task Marked Done', description: 'Upload evidence for reviewer approval.', variant: 'success' });
          } catch (error) {
            pushToast({ title: 'Task Update Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        completingTask={updateTaskMutation.isPending}
        onOpenTaskEvidenceModal={(payload) => {
          setTaskEvidenceForm(payload);
          setIsTaskEvidenceModalOpen(true);
        }}
        uploadingTaskEvidence={uploadTaskEvidenceMutation.isPending}
        onOpenTaskReviewModal={(payload) => {
          setTaskReviewForm(payload);
          setIsTaskReviewModalOpen(true);
        }}
        reviewingTask={reviewTaskMutation.isPending}
        onOpenEditTaskModal={(payload) => {
          setEditTaskForm(payload);
          setIsTaskEditModalOpen(true);
        }}
        onOpenDeleteTaskModal={setTaskPendingDelete}
        updatingTaskDetails={updateTaskDetailsMutation.isPending}
        deletingTask={deleteTaskMutation.isPending}
      />

      <GrantsModals
        opportunityForm={opportunityForm}
        setOpportunityForm={setOpportunityForm}
        isOpportunityModalOpen={isOpportunityModalOpen}
        setIsOpportunityModalOpen={setIsOpportunityModalOpen}
        isAttachmentDragActive={isAttachmentDragActive}
        setIsAttachmentDragActive={setIsAttachmentDragActive}
        attachmentInputRef={attachmentInputRef}
        applyOpportunityAttachment={applyOpportunityAttachment}
        clearOpportunityAttachment={clearOpportunityAttachment}
        onCreateOpportunity={async () => {
          try {
            await createOpportunityMutation.mutateAsync(opportunityForm);
            pushToast({ title: 'Opportunity Added', description: 'Discovery record created.', variant: 'success' });
            setIsOpportunityModalOpen(false);
          } catch (error) {
            pushToast({ title: 'Could Not Add Opportunity', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        createOpportunityPending={createOpportunityMutation.isPending}
        scoreForm={scoreForm}
        setScoreForm={setScoreForm}
        isScoreModalOpen={isScoreModalOpen}
        setIsScoreModalOpen={setIsScoreModalOpen}
        onSaveScore={async () => {
          try {
            await scoreOpportunityMutation.mutateAsync(scoreForm);
            const previewFitScore = computeMatrixScore(scoreForm);
            pushToast({ title: 'Opportunity Scored', description: `Fit score updated to ${previewFitScore}/100.`, variant: 'success' });
            setIsScoreModalOpen(false);
          } catch (error) {
            pushToast({ title: 'Could Not Score Opportunity', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        scoreOpportunityPending={scoreOpportunityMutation.isPending}
        opportunities={opportunities}
        applicationForm={applicationForm}
        setApplicationForm={setApplicationForm}
        isApplicationModalOpen={isApplicationModalOpen}
        setIsApplicationModalOpen={setIsApplicationModalOpen}
        onCreateApplication={async () => {
          try {
            await createApplicationMutation.mutateAsync(applicationForm);
            pushToast({ title: 'Application Created', description: 'Writing workflow started.', variant: 'success' });
            setIsApplicationModalOpen(false);
          } catch (error) {
            pushToast({ title: 'Could Not Create Application', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        createApplicationPending={createApplicationMutation.isPending}
        taskEvidenceForm={taskEvidenceForm}
        setTaskEvidenceForm={setTaskEvidenceForm}
        isTaskEvidenceModalOpen={isTaskEvidenceModalOpen}
        setIsTaskEvidenceModalOpen={setIsTaskEvidenceModalOpen}
        isTaskEvidenceDragActive={isTaskEvidenceDragActive}
        setIsTaskEvidenceDragActive={setIsTaskEvidenceDragActive}
        taskEvidenceInputRef={taskEvidenceInputRef}
        applyTaskEvidence={applyTaskEvidence}
        clearTaskEvidence={clearTaskEvidence}
        onUploadTaskEvidence={async () => {
          if (!taskEvidenceForm.file) {
            pushToast({ title: 'Evidence Required', description: 'Attach a file before uploading.', variant: 'error' });
            return;
          }
          try {
            await uploadTaskEvidenceMutation.mutateAsync({ taskId: taskEvidenceForm.taskId, file: taskEvidenceForm.file });
            pushToast({ title: 'Evidence Uploaded', description: 'Task is now ready for review.', variant: 'success' });
            setIsTaskEvidenceModalOpen(false);
            setTaskEvidenceForm(emptyTaskEvidence);
            setIsTaskEvidenceDragActive(false);
            if (taskEvidenceInputRef.current) taskEvidenceInputRef.current.value = '';
          } catch (error) {
            pushToast({ title: 'Could Not Upload Evidence', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        uploadTaskEvidencePending={uploadTaskEvidenceMutation.isPending}
        taskReviewForm={taskReviewForm}
        setTaskReviewForm={setTaskReviewForm}
        isTaskReviewModalOpen={isTaskReviewModalOpen}
        setIsTaskReviewModalOpen={setIsTaskReviewModalOpen}
        onReviewTask={async () => {
          try {
            await reviewTaskMutation.mutateAsync({ taskId: taskReviewForm.taskId, decision: taskReviewForm.decision, notes: taskReviewForm.notes || undefined });
            pushToast({ title: taskReviewForm.decision === 'APPROVE' ? 'Task Approved' : 'Rework Requested', description: taskReviewForm.decision === 'APPROVE' ? 'Task marked complete by reviewer.' : 'Task moved back to in progress for rework.', variant: 'success' });
            setIsTaskReviewModalOpen(false);
            setTaskReviewForm(emptyTaskReview);
          } catch (error) {
            pushToast({ title: 'Review Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        reviewTaskPending={reviewTaskMutation.isPending}
        editTaskForm={editTaskForm}
        setEditTaskForm={setEditTaskForm}
        isTaskEditModalOpen={isTaskEditModalOpen}
        setIsTaskEditModalOpen={setIsTaskEditModalOpen}
        taskAssignees={taskAssignees}
        onUpdateTaskDetails={async () => {
          try {
            await updateTaskDetailsMutation.mutateAsync(editTaskForm);
            pushToast({ title: 'Task Updated', description: 'Task details saved.', variant: 'success' });
            setIsTaskEditModalOpen(false);
          } catch (error) {
            pushToast({ title: 'Could Not Update Task', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        updateTaskDetailsPending={updateTaskDetailsMutation.isPending}
        taskPendingDelete={taskPendingDelete}
        setTaskPendingDelete={setTaskPendingDelete}
        onDeleteTask={async () => {
          if (!taskPendingDelete) return;
          try {
            await deleteTaskMutation.mutateAsync({ taskId: taskPendingDelete.id });
            pushToast({ title: 'Task Deleted', description: 'Task removed successfully.', variant: 'success' });
            setTaskPendingDelete(null);
          } catch (error) {
            pushToast({ title: 'Could Not Delete Task', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        deleteTaskPending={deleteTaskMutation.isPending}
        approvalForm={approvalForm}
        setApprovalForm={setApprovalForm}
        isApprovalModalOpen={isApprovalModalOpen}
        setIsApprovalModalOpen={setIsApprovalModalOpen}
        onSaveApproval={async () => {
          try {
            await approvalMutation.mutateAsync(approvalForm);
            pushToast({ title: 'Approval Updated', description: 'Approval state saved.', variant: 'success' });
            setIsApprovalModalOpen(false);
          } catch (error) {
            pushToast({ title: 'Approval Update Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        approvalPending={approvalMutation.isPending}
        submitForm={submitForm}
        setSubmitForm={setSubmitForm}
        isSubmitModalOpen={isSubmitModalOpen}
        setIsSubmitModalOpen={setIsSubmitModalOpen}
        onSubmitApplication={async () => {
          try {
            await submitMutation.mutateAsync(submitForm);
            pushToast({ title: 'Application Submitted', description: 'Submission recorded successfully.', variant: 'success' });
            setIsSubmitModalOpen(false);
          } catch (error) {
            pushToast({ title: 'Submission Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
        submitPending={submitMutation.isPending}
      />
    </div>
  );
}
