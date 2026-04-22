'use client';

import Link from 'next/link';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/states';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { addMentorNote, fetchMentorDetail, manageMentorVerification, transitionMentorDetail, uploadMentorTrainingEvidence } from '@/lib/people-actions';
import { hasPermission } from '@/lib/permissions';
import { MentorDetailActionModal } from '@/components/people/detail/mentor-detail-action-modal';
import { MentorDetailSections } from '@/components/people/detail/mentor-detail-sections';
import { actionCopy, buildDetailPayload, defaultFormState, type ActionFormState, type DetailTab, type ModalAction, statePill, statusPill, tabOptions } from '@/components/people/detail/mentor-detail-shared';

type TrainingEvidenceState = {
  file: File | null;
  uploadedUrl: string;
  uploadedName: string;
};

function isValidTab(value: string | null | undefined): value is DetailTab {
  return Boolean(value && tabOptions.some((tab) => tab.id === value));
}

export function MentorDetailWorkspace({
  mentorUserId,
  initialTab,
}: {
  mentorUserId: string;
  initialTab?: string | null;
}) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DetailTab>(isValidTab(initialTab) ? initialTab : 'overview');
  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [form, setFormState] = useState<ActionFormState>(defaultFormState);
  const [noteMessage, setNoteMessage] = useState('');
  const [trainingEvidence, setTrainingEvidence] = useState<TrainingEvidenceState>({ file: null, uploadedUrl: '', uploadedName: '' });
  const [isTrainingDragActive, setIsTrainingDragActive] = useState(false);
  const trainingEvidenceInputRef = useRef<HTMLInputElement | null>(null);

  const canAdminMentors = hasPermission(user?.role, 'mentors.approve');

  const detailQuery = useQuery({
    queryKey: ['mentor-detail', mentorUserId],
    queryFn: () => fetchMentorDetail(mentorUserId),
  });

  const mutation = useMutation({
    mutationFn: (input: { action: ModalAction; reason?: string; details?: ReturnType<typeof buildDetailPayload> }) =>
      transitionMentorDetail(mentorUserId, input.action, {
        reason: input.reason,
        details: input.details,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mentor-detail', mentorUserId] });
      await queryClient.invalidateQueries({ queryKey: ['people-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['people-mentors'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const trainingEvidenceMutation = useMutation({
    mutationFn: (file: File) => uploadMentorTrainingEvidence(mentorUserId, file),
  });

  const noteMutation = useMutation({
    mutationFn: (message: string) => addMentorNote(mentorUserId, message),
    onSuccess: async () => {
      setNoteMessage('');
      await queryClient.invalidateQueries({ queryKey: ['mentor-detail', mentorUserId] });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: (action: 'RESEND_EMAIL' | 'GENERATE_LINK') => manageMentorVerification(mentorUserId, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mentor-detail', mentorUserId] });
    },
  });

  const item = detailQuery.data?.item;

  const availableActions = useMemo(() => {
    if (!item) return [] as ModalAction[];
    const actions: ModalAction[] = [];
    if (item.snapshot.backgroundCheckStatus !== 'CLEARED') actions.push('BACKGROUND_CLEAR', 'BACKGROUND_FAIL');
    if (!item.snapshot.trainingCompleted) actions.push('COMPLETE_TRAINING');
    if (!item.snapshot.safeguardingAgreed) actions.push('AGREE_SAFEGUARDING');
    if (item.snapshot.profileStatus === 'PENDING' && item.eligibility.canBeApproved) {
      actions.push('APPROVE', 'REJECT');
    } else if (item.snapshot.profileStatus !== 'APPROVED' && item.eligibility.canBeApproved) {
      actions.push('SUBMIT_FOR_REVIEW');
    }
    if (item.snapshot.profileStatus === 'INACTIVE') actions.push('REACTIVATE');
    else actions.push('DEACTIVATE');
    return actions;
  }, [item]);

  const openModal = (action: ModalAction) => {
    setModalAction(action);
    setFormState({ ...defaultFormState, effectiveAt: new Date() });
  };

  const closeModal = () => {
    setModalAction(null);
    setFormState(defaultFormState);
    setTrainingEvidence({ file: null, uploadedUrl: '', uploadedName: '' });
    setIsTrainingDragActive(false);
    if (trainingEvidenceInputRef.current) trainingEvidenceInputRef.current.value = '';
  };

  const startConsentFollowUp = (entry: NonNullable<typeof item>['onboarding']['declinedConsents'][number]) => {
    const message = [
      `Follow-up on declined consent: ${entry.title}${entry.version ? ` (${entry.version})` : ''}.`,
      entry.reason ? `Mentor reason: ${entry.reason}` : 'Mentor did not provide a decline reason.',
      'Next step: clarify the document, answer questions, and confirm whether a revised assent is expected.',
    ].join(' ');
    setNoteMessage(message);
    setActiveTab('audit');
  };

  const applyTrainingEvidence = (file: File | null) => {
    setTrainingEvidence((current) => ({
      file,
      uploadedUrl: file ? '' : current.uploadedUrl,
      uploadedName: file ? '' : current.uploadedName,
    }));
  };

  const onTrainingFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    applyTrainingEvidence(file);
  };

  const submitAction = async () => {
    if (!modalAction) return;
    const reason = form.reason.trim();
    if (['BACKGROUND_FAIL', 'APPROVE', 'REJECT'].includes(modalAction) && reason.length < 5) {
      pushToast({ title: 'Notes required', description: 'Provide at least 5 characters so the decision is auditable.', variant: 'error' });
      return;
    }

    try {
      let uploadedEvidenceUrl = form.evidenceUrl.trim() || undefined;
      if (modalAction === 'COMPLETE_TRAINING') {
        if (trainingEvidence.file) {
          const selectedFileName = trainingEvidence.file.name;
          const uploadResult = await trainingEvidenceMutation.mutateAsync(trainingEvidence.file);
          uploadedEvidenceUrl = uploadResult.evidenceUrl;
          setTrainingEvidence({
            file: null,
            uploadedUrl: uploadResult.evidenceUrl ?? '',
            uploadedName: uploadResult.evidenceName ?? selectedFileName,
          });
        } else if (trainingEvidence.uploadedUrl) {
          uploadedEvidenceUrl = trainingEvidence.uploadedUrl;
        }
      }

      await mutation.mutateAsync({
        action: modalAction,
        reason: reason || undefined,
        details: {
          ...buildDetailPayload(form),
          evidenceUrl: uploadedEvidenceUrl,
        },
      });
      pushToast({ title: 'Mentor updated', description: `${actionCopy(modalAction).title} completed successfully.`, variant: 'success' });
      closeModal();
    } catch (error) {
      pushToast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
    }
  };

  const selectTab = (tab: DetailTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/people/mentors" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
              <ArrowLeft className="h-4 w-4" />Back to mentor intake
            </Link>
            {detailQuery.isLoading ? (
              <SectionSkeleton rows={2} />
            ) : item ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold text-[var(--text)]">{item.snapshot.fullName}</h1>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statePill(item.snapshot.derivedState)}`}>{item.snapshot.derivedState}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(item.snapshot.profileStatus)}`}>{item.snapshot.profileStatus}</span>
                </div>
                <p className="text-sm text-[var(--muted)]">{item.user.email} {item.user.partnerName ? `· ${item.user.partnerName}` : ''} {item.user.schoolName ? `· ${item.user.schoolName}` : ''}</p>
              </>
            ) : null}
          </div>

          {canAdminMentors && item ? (
            <div className="flex flex-wrap gap-2">
              {availableActions.slice(0, 3).map((action) => (
                <Button key={action} variant={action === 'APPROVE' ? 'primary' : action === 'REJECT' || action === 'BACKGROUND_FAIL' ? 'danger' : 'secondary'} onClick={() => openModal(action)}>
                  {actionCopy(action).title}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {detailQuery.error ? (
        <Card>
          <ErrorState title="Could not load mentor record" description={detailQuery.error.message || 'Try refreshing.'} onRetry={() => {
            void detailQuery.refetch();
          }} />
        </Card>
      ) : null}

      {detailQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={8} />
        </Card>
      ) : null}

      {item ? (
        <>
          <section className="flex flex-wrap gap-2">
            {tabOptions.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'bg-[var(--surface-2)] text-[var(--text)]'}`}
              >
                {tab.label}
              </button>
            ))}
          </section>

          <MentorDetailSections
            activeTab={activeTab}
            item={item}
            availableActions={availableActions}
            canAdminMentors={canAdminMentors}
            openModal={openModal}
            startConsentFollowUp={startConsentFollowUp}
            noteMessage={noteMessage}
            setNoteMessage={setNoteMessage}
            postNote={() => {
              const message = noteMessage.trim();
              if (message.length < 3) {
                pushToast({ title: 'Note required', description: 'Enter at least 3 characters before posting.', variant: 'error' });
                return;
              }
              void noteMutation.mutateAsync(message).then(() => {
                pushToast({ title: 'Note added', description: 'The message has been added to the mentor thread.', variant: 'success' });
              }).catch((error) => {
                pushToast({ title: 'Could not add note', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
              });
            }}
            notePending={noteMutation.isPending}
            verificationPending={verificationMutation.isPending}
            resendVerification={() => {
              void verificationMutation.mutateAsync('RESEND_EMAIL').then(() => {
                pushToast({ title: 'Verification email resent', description: 'A fresh verification email was issued for this mentor.', variant: 'success' });
              }).catch((error) => {
                pushToast({ title: 'Could not resend verification email', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
              });
            }}
            copyVerificationLink={() => {
              void verificationMutation.mutateAsync('GENERATE_LINK').then(async (result) => {
                await navigator.clipboard.writeText(result.verificationUrl);
                pushToast({ title: 'Verification link copied', description: 'A fresh verification link was copied to your clipboard.', variant: 'success' });
              }).catch((error) => {
                pushToast({ title: 'Could not generate verification link', description: error instanceof Error ? error.message : 'Request failed.', variant: 'error' });
              });
            }}
          />
        </>
      ) : null}

      {!detailQuery.isLoading && !detailQuery.error && !item ? (
        <Card>
          <EmptyState title="Mentor record is unavailable" description="The mentor detail payload did not load correctly. Refresh the page or reopen the mentor record from intake." />
        </Card>
      ) : null}

      <MentorDetailActionModal
        modalAction={modalAction}
        closeModal={closeModal}
        form={form}
        setForm={(updater) => setFormState(updater)}
        trainingEvidence={trainingEvidence}
        applyTrainingEvidence={applyTrainingEvidence}
        trainingEvidenceInputRef={trainingEvidenceInputRef}
        isTrainingDragActive={isTrainingDragActive}
        setIsTrainingDragActive={setIsTrainingDragActive}
        onTrainingFileChange={onTrainingFileChange}
        submitAction={() => {
          void submitAction();
        }}
        pending={mutation.isPending || trainingEvidenceMutation.isPending}
      />
    </div>
  );
}
