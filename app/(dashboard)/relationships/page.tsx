'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RelationshipOverviewItem } from '@/lib/api-types';
import { useToast } from '@/context/toast-context';
import { fetchRelationshipsOverview, logRelationshipSessionRequest, submitRelationshipReviewRequest, transitionRelationshipStatusRequest } from '@/lib/relationships-actions';
import { RelationshipCompletionModal, RelationshipMilestoneModal, RelationshipReviewModal, RelationshipSessionModal, RelationshipStatusTransitionModal } from '@/components/relationships/relationship-modals';
import { RelationshipsOverview } from '@/components/relationships/relationships-overview';
import { RelationshipsTable } from '@/components/relationships/relationships-table';
import {
  buildCompletionForm,
  buildReviewForm,
  buildSessionForm,
  buildStats,
  buildStatusTransitionForm,
  emptyCompletionForm,
  emptyReviewForm,
  emptySessionForm,
  emptyStatusTransitionForm,
  formatEnum,
  relationshipMetricIcons,
  type CompletionFormState,
  type MilestoneFocus,
  type ReviewFormState,
  type SessionFormState,
  type StatusTransitionFormState,
} from '@/lib/relationships-workspace';

export default function RelationshipsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'TERMINATED'>('ALL');
  const [risk, setRisk] = useState<'ALL' | 'AT_RISK' | 'ON_TRACK' | 'REVIEW_DUE'>('ALL');
  const [sessionForm, setSessionForm] = useState<SessionFormState>(emptySessionForm);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(emptyReviewForm);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [completionForm, setCompletionForm] = useState<CompletionFormState>(emptyCompletionForm);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [statusTransitionForm, setStatusTransitionForm] = useState<StatusTransitionFormState>(emptyStatusTransitionForm);
  const [isStatusTransitionModalOpen, setIsStatusTransitionModalOpen] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<{ item: RelationshipOverviewItem; focus: MilestoneFocus } | null>(null);

  const relationshipsQuery = useQuery({
    queryKey: ['relationships-overview', search, status, risk],
    queryFn: () => fetchRelationshipsOverview({ search, status, risk }),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['relationships-overview'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
  };

  const logSessionMutation = useMutation({
    mutationFn: (payload: SessionFormState) => {
      const topics = payload.topicsCovered.split(',').map((item) => item.trim()).filter(Boolean);
      return logRelationshipSessionRequest(payload.mentorshipId, {
        scheduledDate: payload.scheduledDate,
        actualDate: payload.actualDate || undefined,
        durationMinutes: Number(payload.durationMinutes),
        format: payload.format,
        location: payload.location || undefined,
        meetingLink: payload.meetingLink || undefined,
        topicsCovered: topics,
        sessionNotes: payload.sessionNotes,
        attendanceStatus: payload.attendanceStatus,
        nextScheduledSession: payload.nextScheduledSession || undefined,
      });
    },
    onSuccess: refresh,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ mentorshipId, action, reason, outcome }: { mentorshipId: string; action: 'PAUSE' | 'RESUME' | 'COMPLETE' | 'TERMINATE'; reason?: string; outcome?: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL' }) =>
      transitionRelationshipStatusRequest(mentorshipId, { action, reason, outcome }),
    onSuccess: refresh,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: ReviewFormState) =>
      submitRelationshipReviewRequest(payload.mentorshipId, {
        type: payload.type,
        rating: Number(payload.rating),
        strengths: payload.strengths || undefined,
        areasForImprovement: payload.areasForImprovement || undefined,
        comments: payload.comments || undefined,
        isAnonymous: payload.isAnonymous,
      }),
    onSuccess: refresh,
  });

  const rows = useMemo(() => relationshipsQuery.data?.items ?? [], [relationshipsQuery.data?.items]);
  const stats = useMemo(() => buildStats(rows), [rows]);

  const openSessionModal = (item: RelationshipOverviewItem) => {
    setSessionForm(buildSessionForm(item));
    setIsSessionModalOpen(true);
  };

  const openReviewModal = (item: RelationshipOverviewItem) => {
    setReviewForm(buildReviewForm(item));
    setIsReviewModalOpen(true);
  };

  const handleTransition = async (item: RelationshipOverviewItem, action: 'PAUSE' | 'RESUME' | 'COMPLETE' | 'TERMINATE') => {
    if (action === 'PAUSE' || action === 'RESUME' || action === 'TERMINATE') {
      setStatusTransitionForm(buildStatusTransitionForm(item, action));
      setIsStatusTransitionModalOpen(true);
      return;
    }

    if (action === 'COMPLETE') {
      setCompletionForm(buildCompletionForm(item));
      setIsCompletionModalOpen(true);
    }
  };

  const executeTransition = async ({ mentorshipId, action, reason, outcome, successDescription }: { mentorshipId: string; action: 'PAUSE' | 'RESUME' | 'COMPLETE' | 'TERMINATE'; reason?: string; outcome?: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL'; successDescription?: string }) => {
    try {
      await transitionMutation.mutateAsync({ mentorshipId, action, reason, outcome });
      pushToast({ title: 'Status Updated', description: successDescription ?? `${formatEnum(action)} applied successfully.`, variant: 'success' });
      return true;
    } catch (error) {
      pushToast({ title: 'Status Update Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
      return false;
    }
  };

  const submitCompletionTransition = async () => {
    if (!completionForm.mentorshipId) return;
    const ok = await executeTransition({
      mentorshipId: completionForm.mentorshipId,
      action: 'COMPLETE',
      outcome: completionForm.outcome,
      reason: completionForm.notes.trim() || undefined,
      successDescription: 'COMPLETE transition completed successfully.',
    });
    if (ok) {
      setIsCompletionModalOpen(false);
      setCompletionForm(emptyCompletionForm);
    }
  };

  const submitStatusTransition = async () => {
    if (!statusTransitionForm.mentorshipId) return;
    const trimmedReason = statusTransitionForm.reason.trim();
    if (statusTransitionForm.action === 'TERMINATE' && trimmedReason.length < 5) {
      pushToast({ title: 'Reason Required', description: 'Provide at least 5 characters for termination reason.', variant: 'error' });
      return;
    }
    const ok = await executeTransition({ mentorshipId: statusTransitionForm.mentorshipId, action: statusTransitionForm.action, reason: trimmedReason || undefined });
    if (ok) {
      setIsStatusTransitionModalOpen(false);
      setStatusTransitionForm(emptyStatusTransitionForm);
    }
  };

  return (
    <div className="space-y-6">
      <RelationshipsOverview stats={stats} icons={relationshipMetricIcons} />

      <RelationshipsTable
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        risk={risk}
        setRisk={setRisk}
        isFetching={relationshipsQuery.isFetching}
        isLoading={relationshipsQuery.isLoading}
        error={relationshipsQuery.error instanceof Error ? relationshipsQuery.error : null}
        rows={rows}
        onRefresh={() => void relationshipsQuery.refetch()}
        onOpenMilestone={(item, focus) => setMilestoneModal({ item, focus })}
        onLogSession={openSessionModal}
        onSubmitReview={openReviewModal}
        onTransition={(item, action) => {
          void handleTransition(item, action);
        }}
      />

      <RelationshipMilestoneModal
        milestoneModal={milestoneModal}
        transitionPending={transitionMutation.isPending}
        onClose={() => setMilestoneModal(null)}
        onOpenSession={() => {
          if (!milestoneModal) return;
          const selected = milestoneModal.item;
          setMilestoneModal(null);
          openSessionModal(selected);
        }}
        onOpenReview={() => {
          if (!milestoneModal) return;
          const selected = milestoneModal.item;
          setMilestoneModal(null);
          openReviewModal(selected);
        }}
        onTransition={(action) => {
          if (!milestoneModal) return;
          const selected = milestoneModal.item;
          setMilestoneModal(null);
          void handleTransition(selected, action);
        }}
      />

      <RelationshipStatusTransitionModal
        open={isStatusTransitionModalOpen}
        form={statusTransitionForm}
        transitionPending={transitionMutation.isPending}
        onClose={() => {
          setIsStatusTransitionModalOpen(false);
          setStatusTransitionForm(emptyStatusTransitionForm);
        }}
        setReason={(value) => setStatusTransitionForm((prev) => ({ ...prev, reason: value }))}
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          await submitStatusTransition();
        }}
      />

      <RelationshipCompletionModal
        open={isCompletionModalOpen}
        form={completionForm}
        transitionPending={transitionMutation.isPending}
        onClose={() => {
          setIsCompletionModalOpen(false);
          setCompletionForm(emptyCompletionForm);
        }}
        setOutcome={(value) => setCompletionForm((prev) => ({ ...prev, outcome: value }))}
        setNotes={(value) => setCompletionForm((prev) => ({ ...prev, notes: value }))}
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          await submitCompletionTransition();
        }}
      />

      <RelationshipSessionModal
        open={isSessionModalOpen}
        form={sessionForm}
        pending={logSessionMutation.isPending}
        onClose={() => {
          setIsSessionModalOpen(false);
          setSessionForm(emptySessionForm);
        }}
        setForm={(updater) => setSessionForm((prev) => updater(prev))}
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          try {
            await logSessionMutation.mutateAsync(sessionForm);
            pushToast({ title: 'Session Logged', description: 'Relationship session entry has been saved.', variant: 'success' });
            setIsSessionModalOpen(false);
            setSessionForm(emptySessionForm);
          } catch (error) {
            pushToast({ title: 'Session Log Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
      />

      <RelationshipReviewModal
        open={isReviewModalOpen}
        form={reviewForm}
        pending={reviewMutation.isPending}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewForm(emptyReviewForm);
        }}
        setForm={(updater) => setReviewForm((prev) => updater(prev))}
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          try {
            await reviewMutation.mutateAsync(reviewForm);
            pushToast({ title: 'Review Submitted', description: 'Relationship review saved successfully.', variant: 'success' });
            setIsReviewModalOpen(false);
            setReviewForm(emptyReviewForm);
          } catch (error) {
            pushToast({ title: 'Review Failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
          }
        }}
      />
    </div>
  );
}
