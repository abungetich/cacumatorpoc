'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { ErrorState, SectionSkeleton } from '@/components/ui/states';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';
import { DEFAULT_PLATFORM_BRANDING } from '@/lib/platform-branding-defaults';
import {
  assentMentorConsent,
  completeMentorTrainingModule,
  fetchMentorOnboardingWorkspace,
  submitMentorBackgroundCheck,
  uploadMentorConsentEvidence,
} from '@/lib/mentor-starter-pack-actions';
import { getFirstName, type ConsentItem, type ModalState, type TrainingItem } from '@/components/mentors/onboarding/mentor-onboarding-shared';
import { MentorOnboardingContent } from '@/components/mentors/onboarding/mentor-onboarding-content';
import { MentorOnboardingModal } from '@/components/mentors/onboarding/mentor-onboarding-modal';

export default function MentorOnboardingPage() {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const consentFileInputRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);

  const [modalState, setModalState] = useState<ModalState>(null);
  const [acknowledgedName, setAcknowledgedName] = useState(user?.name ?? '');
  const [notes, setNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [consentEvidenceFile, setConsentEvidenceFile] = useState<File | null>(null);
  const [consentDecision, setConsentDecision] = useState<'ASSENT' | 'DECLINE'>('ASSENT');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [checkedOn, setCheckedOn] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [readerReachedEnd, setReaderReachedEnd] = useState(false);
  const [readerScrollProgress, setReaderScrollProgress] = useState(0);

  const workspaceQuery = useQuery({
    queryKey: ['mentor-onboarding-workspace'],
    queryFn: fetchMentorOnboardingWorkspace,
  });

  const trainingMutation = useMutation({
    mutationFn: async (moduleId: string) =>
      completeMentorTrainingModule(moduleId, {
        acknowledgedName: acknowledgedName.trim(),
        confirmed: true,
        reachedEnd: true,
        notes: notes.trim() || undefined,
        answers:
          modalState?.type === 'training'
            ? modalState.item.questions.map((question) => ({
                questionId: question.id,
                selectedOptions: selectedAnswers[question.id] ?? [],
              }))
            : [],
      }),
    onSuccess: async (data) => {
      await queryClient.setQueryData(['mentor-onboarding-workspace'], { item: data.item });
      pushToast({
        title: data.passed ? 'Training module completed' : 'Assessment recorded',
        description: data.passed
          ? `You passed with ${data.score}% and this module is now on file.`
          : `You scored ${data.score}%. The pass mark is ${data.passingScore}%, so this module remains pending.`,
        variant: data.passed ? 'success' : 'error',
      });
      closeModal();
    },
    onError: (error) => {
      pushToast({
        title: 'Could not complete training module',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'error',
      });
    },
  });

  const consentMutation = useMutation({
    mutationFn: async (item: ConsentItem) => {
      const evidenceUpload =
        consentDecision === 'ASSENT' && item.consentType === 'SAFEGUARDING' && consentEvidenceFile
          ? await uploadMentorConsentEvidence(consentEvidenceFile)
          : null;

      return assentMentorConsent(
        item.id,
        consentDecision === 'ASSENT'
          ? {
              action: 'ASSENT',
              acknowledgedName: acknowledgedName.trim(),
              confirmed: true,
              reachedEnd: true,
              evidenceUrl: evidenceUpload?.evidenceUrl,
            }
          : {
              action: 'DECLINE',
              acknowledgedName: acknowledgedName.trim(),
              confirmed: true,
              reachedEnd: true,
              reason: declineReason.trim() || undefined,
            },
      );
    },
    onSuccess: async (data) => {
      await queryClient.setQueryData(['mentor-onboarding-workspace'], data);
      pushToast({
        title: consentDecision === 'ASSENT' ? 'Consent recorded' : 'Decline recorded',
        description:
          consentDecision === 'ASSENT'
            ? 'Your assent has been recorded against the current document version.'
            : 'Your decline has been recorded. This document will remain pending until you assent.',
        variant: consentDecision === 'ASSENT' ? 'success' : 'error',
      });
      closeModal();
    },
    onError: (error) => {
      pushToast({
        title: consentDecision === 'ASSENT' ? 'Could not record assent' : 'Could not record decline',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'error',
      });
    },
  });

  const backgroundMutation = useMutation({
    mutationFn: async () => {
      if (!backgroundFile) {
        throw new Error('Background check document is required');
      }

      return submitMentorBackgroundCheck({
        file: backgroundFile,
        checkedOn,
        expiresAt,
      });
    },
    onSuccess: async (data) => {
      await queryClient.setQueryData(['mentor-onboarding-workspace'], data);
      pushToast({
        title: 'Background check submitted',
        description: 'Your document is now on file for admin review.',
        variant: 'success',
      });
      closeModal();
    },
    onError: (error) => {
      pushToast({
        title: 'Could not submit background check',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'error',
      });
    },
  });

  const item = workspaceQuery.data?.item;
  const completedCount = item?.completedCount ?? 0;
  const trainingPending = useMemo(
    () => item?.trainingModules.filter((entry) => !entry.completed && entry.required).length ?? 0,
    [item?.trainingModules],
  );
  const consentPending = useMemo(
    () => item?.consentItems.filter((entry) => !entry.completed && entry.required).length ?? 0,
    [item?.consentItems],
  );

  const closeModal = () => {
    setModalState(null);
    setAcknowledgedName(user?.name ?? '');
    setNotes('');
    setDeclineReason('');
    setConfirmed(false);
    setBackgroundFile(null);
    setConsentEvidenceFile(null);
    setConsentDecision('ASSENT');
    setCheckedOn('');
    setExpiresAt('');
    setSelectedAnswers({});
    setIsDragging(false);
    setReaderReachedEnd(false);
    setReaderScrollProgress(0);
  };

  const resetModalDraft = () => {
    setAcknowledgedName(user?.name ?? '');
    setNotes('');
    setDeclineReason('');
    setConfirmed(false);
    setConsentEvidenceFile(null);
    setBackgroundFile(null);
    setConsentDecision('ASSENT');
    setCheckedOn('');
    setExpiresAt('');
    setSelectedAnswers({});
    setIsDragging(false);
    setReaderReachedEnd(false);
    setReaderScrollProgress(0);
    if (readerRef.current) {
      readerRef.current.scrollTop = 0;
    }
  };

  const openBackgroundModal = () => {
    resetModalDraft();
    setModalState({ type: 'background' });
  };

  const openTrainingModal = (item: TrainingItem) => {
    resetModalDraft();
    setSelectedAnswers(
      item.questions.reduce<Record<string, string[]>>((acc, question) => {
        acc[question.id] = [];
        return acc;
      }, {}),
    );
    setModalState({ type: 'training', item });
  };

  const openConsentModal = (item: ConsentItem) => {
    resetModalDraft();
    setModalState({ type: 'consent', item });
  };

  const documentRecipient = getFirstName(acknowledgedName.trim() || user?.name);
  const documentFullName = acknowledgedName.trim() || user?.name || 'Mentor';
  const signaturePreview = acknowledgedName.trim() || 'Type your full name';
  const consentRenderVariables = {
    '{{mentor_name}}': documentFullName,
    '{{mentor_email}}': user?.email || '',
    '{{signed_date}}': new Date().toLocaleDateString(),
    '{{platform_name}}': DEFAULT_PLATFORM_BRANDING.platformName,
    '{{document_version}}': modalState?.type === 'consent' ? modalState.item.version : '',
  };

  const handleReaderScroll = () => {
    const node = readerRef.current;
    if (!node) return;
    const maxScroll = Math.max(node.scrollHeight - node.clientHeight, 1);
    const progress = Math.min(100, Math.round((node.scrollTop / maxScroll) * 100));
    const reachedEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 8;
    setReaderScrollProgress(progress);
    if (reachedEnd) {
      setReaderReachedEnd(true);
    }
  };

  const isTrainingReviewOnly = modalState?.type === 'training' && modalState.item.completed;
  const isConsentReviewOnly = modalState?.type === 'consent' && modalState.item.completed;
  const isReadOnlyModal = Boolean(isTrainingReviewOnly || isConsentReviewOnly);
  const unansweredTrainingQuestions =
    modalState?.type === 'training'
      ? modalState.item.questions.filter((question) => (selectedAnswers[question.id] ?? []).length === 0).length
      : 0;

  return (
    <div className="space-y-6">
      {workspaceQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={10} />
        </Card>
      ) : null}

      {workspaceQuery.error ? (
        <Card>
          <ErrorState
            title="Could not load onboarding checklist"
            description={workspaceQuery.error.message || 'Try refreshing.'}
            onRetry={() => {
              void workspaceQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      {item ? (
        <MentorOnboardingContent
          item={item}
          userStatus={user?.status}
          completedCount={completedCount}
          trainingPending={trainingPending}
          consentPending={consentPending}
          openBackgroundModal={openBackgroundModal}
          openTrainingModal={openTrainingModal}
          openConsentModal={openConsentModal}
        />
      ) : null}

      <MentorOnboardingModal
        modalState={modalState}
        closeModal={closeModal}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        backgroundFileInputRef={backgroundFileInputRef}
        consentFileInputRef={consentFileInputRef}
        backgroundFile={backgroundFile}
        setBackgroundFile={setBackgroundFile}
        acknowledgedName={acknowledgedName}
        setAcknowledgedName={setAcknowledgedName}
        signaturePreview={signaturePreview}
        confirmed={confirmed}
        setConfirmed={setConfirmed}
        readerReachedEnd={readerReachedEnd}
        readerScrollProgress={readerScrollProgress}
        readerRef={readerRef}
        handleReaderScroll={handleReaderScroll}
        isReadOnlyModal={isReadOnlyModal}
        notes={notes}
        setNotes={setNotes}
        consentDecision={consentDecision}
        setConsentDecision={setConsentDecision}
        declineReason={declineReason}
        setDeclineReason={setDeclineReason}
        consentEvidenceFile={consentEvidenceFile}
        setConsentEvidenceFile={setConsentEvidenceFile}
        checkedOn={checkedOn}
        setCheckedOn={setCheckedOn}
        expiresAt={expiresAt}
        setExpiresAt={setExpiresAt}
        unansweredTrainingQuestions={unansweredTrainingQuestions}
        selectedAnswers={selectedAnswers}
        setSelectedAnswers={setSelectedAnswers}
        documentRecipient={documentRecipient}
        documentFullName={documentFullName}
        consentRenderVariables={consentRenderVariables}
        trainingPending={trainingMutation.isPending}
        consentPending={consentMutation.isPending}
        backgroundPending={backgroundMutation.isPending}
        onSubmitTraining={() => {
          if (modalState?.type === 'training') {
            trainingMutation.mutate(modalState.item.id);
          }
        }}
        onSubmitConsent={() => {
          if (modalState?.type === 'consent') {
            consentMutation.mutate(modalState.item);
          }
        }}
        onSubmitBackground={() => backgroundMutation.mutate()}
      />
    </div>
  );
}
