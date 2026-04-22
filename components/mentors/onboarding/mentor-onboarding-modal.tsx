'use client';

import Image from 'next/image';
import { type Dispatch, type RefObject, type SetStateAction } from 'react';
import {
  BookOpenCheck,
  ExternalLink,
  FileDown,
  FileSignature,
  IdCard,
  UploadCloud,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RenderedRichText } from '@/components/ui/rendered-rich-text';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { buildConsentReaderSections, buildTrainingReaderSections, type ModalState } from '@/components/mentors/onboarding/mentor-onboarding-shared';

type Props = {
  modalState: ModalState;
  closeModal: () => void;
  isDragging: boolean;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  backgroundFileInputRef: RefObject<HTMLInputElement | null>;
  consentFileInputRef: RefObject<HTMLInputElement | null>;
  backgroundFile: File | null;
  setBackgroundFile: Dispatch<SetStateAction<File | null>>;
  acknowledgedName: string;
  setAcknowledgedName: Dispatch<SetStateAction<string>>;
  signaturePreview: string;
  confirmed: boolean;
  setConfirmed: Dispatch<SetStateAction<boolean>>;
  readerReachedEnd: boolean;
  readerScrollProgress: number;
  readerRef: RefObject<HTMLDivElement | null>;
  handleReaderScroll: () => void;
  isReadOnlyModal: boolean;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  consentDecision: 'ASSENT' | 'DECLINE';
  setConsentDecision: Dispatch<SetStateAction<'ASSENT' | 'DECLINE'>>;
  declineReason: string;
  setDeclineReason: Dispatch<SetStateAction<string>>;
  consentEvidenceFile: File | null;
  setConsentEvidenceFile: Dispatch<SetStateAction<File | null>>;
  checkedOn: string;
  setCheckedOn: Dispatch<SetStateAction<string>>;
  expiresAt: string;
  setExpiresAt: Dispatch<SetStateAction<string>>;
  unansweredTrainingQuestions: number;
  selectedAnswers: Record<string, string[]>;
  setSelectedAnswers: Dispatch<SetStateAction<Record<string, string[]>>>;
  documentRecipient: string;
  documentFullName: string;
  consentRenderVariables: Record<string, string>;
  trainingPending: boolean;
  consentPending: boolean;
  backgroundPending: boolean;
  onSubmitTraining: () => void;
  onSubmitConsent: () => void;
  onSubmitBackground: () => void;
};

export function MentorOnboardingModal({
  modalState,
  closeModal,
  isDragging,
  setIsDragging,
  backgroundFileInputRef,
  consentFileInputRef,
  backgroundFile,
  setBackgroundFile,
  acknowledgedName,
  setAcknowledgedName,
  signaturePreview,
  confirmed,
  setConfirmed,
  readerReachedEnd,
  readerScrollProgress,
  readerRef,
  handleReaderScroll,
  isReadOnlyModal,
  notes,
  setNotes,
  consentDecision,
  setConsentDecision,
  declineReason,
  setDeclineReason,
  consentEvidenceFile,
  setConsentEvidenceFile,
  checkedOn,
  setCheckedOn,
  expiresAt,
  setExpiresAt,
  unansweredTrainingQuestions,
  selectedAnswers,
  setSelectedAnswers,
  documentRecipient,
  consentRenderVariables,
  trainingPending,
  consentPending,
  backgroundPending,
  onSubmitTraining,
  onSubmitConsent,
  onSubmitBackground,
}: Props) {
  const isTrainingReviewOnly = modalState?.type === 'training' && modalState.item.completed;
  const isConsentReviewOnly = modalState?.type === 'consent' && modalState.item.completed;

  return (
    <Modal
      open={Boolean(modalState)}
      onClose={closeModal}
      title={
        modalState?.type === 'training'
          ? 'Record training completion'
          : modalState?.type === 'consent'
            ? isConsentReviewOnly
              ? 'Review mentor document response'
              : consentDecision === 'DECLINE'
                ? 'Decline mentor document'
                : 'Respond to mentor document'
            : 'Submit background check'
      }
      description={
        modalState?.type === 'training'
          ? isTrainingReviewOnly
            ? 'This module has already been recorded. Review the acknowledgement details below.'
            : 'Confirm that you have completed this module. The record will be attached to your onboarding checklist.'
          : modalState?.type === 'consent'
            ? isConsentReviewOnly
              ? 'This document has already been assented to. Review the signed record below.'
              : consentDecision === 'DECLINE'
                ? 'Review the document, confirm your decision, and optionally explain why you are declining this version.'
                : 'Review the document, type your full name, and record your assent to the active version.'
            : 'Upload your background check document for admin review. This does not clear the check automatically.'
      }
      icon={
        modalState?.type === 'training' ? (
          <BookOpenCheck className="h-5 w-5" />
        ) : modalState?.type === 'consent' ? (
          <FileSignature className="h-5 w-5" />
        ) : (
          <IdCard className="h-5 w-5" />
        )
      }
      size="xl"
    >
      {modalState ? (
        <div className="space-y-4">
          {modalState.type === 'background' ? (
            <>
              <div
                className={cn(
                  'rounded-[24px] border-2 border-dashed p-5 text-center transition',
                  isDragging
                    ? 'border-[var(--primary)] bg-[var(--surface-2)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50',
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) setBackgroundFile(file);
                }}
              >
                <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <UploadCloud className="h-6 w-6" />
                </span>
                <p className="mt-3 text-base font-semibold text-[var(--text)]">Drag and drop your background check file</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">PDF, DOC, DOCX, JPG, PNG, or WEBP. Maximum 10MB.</p>
                <div className="mt-4">
                  <input
                    ref={backgroundFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => setBackgroundFile(event.target.files?.[0] ?? null)}
                  />
                  <Button variant="secondary" onClick={() => backgroundFileInputRef.current?.click()}>
                    Choose file
                  </Button>
                </div>
                {backgroundFile ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left text-sm text-[var(--text)]">
                    <p className="font-medium">{backgroundFile.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{Math.round(backgroundFile.size / 1024)} KB</p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text)]">Checked on (optional)</span>
                  <Input type="date" value={checkedOn} onChange={(event) => setCheckedOn(event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text)]">Expires on (optional)</span>
                  <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
                <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_12%,white),var(--surface))] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                        {modalState.type === 'training' ? 'Training Module' : 'Consent Document'}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{modalState.item.title}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">Issued to {documentRecipient} on {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--text)] backdrop-blur">
                      {modalState.item.version}
                    </div>
                  </div>
                </div>

                <div ref={readerRef} onScroll={handleReaderScroll} className="max-h-[420px] space-y-5 overflow-y-auto px-5 py-5">
                  {(modalState.type === 'training'
                    ? buildTrainingReaderSections(modalState.item, documentRecipient)
                    : buildConsentReaderSections(modalState.item, documentRecipient)
                  ).map((section) => (
                    <section key={section.heading} className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{section.heading}</h4>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-[var(--text)]">
                          {paragraph}
                        </p>
                      ))}
                    </section>
                  ))}

                  {modalState.type === 'training' ? (
                    <section className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Authored Module Content</h4>
                      <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-white p-4">
                        <RenderedRichText html={modalState.item.moduleBody} />
                      </div>
                    </section>
                  ) : (
                    <section className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Authored Document</h4>
                      <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-white p-4">
                        <RenderedRichText html={modalState.item.documentBody} variables={consentRenderVariables} />
                      </div>
                    </section>
                  )}

                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--text)]">End of document</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Scroll fully through this document to unlock the acknowledgement gate below.</p>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Read progress {readerScrollProgress}%</p>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', readerReachedEnd ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                      {readerReachedEnd ? 'End reached' : 'Read to the end to continue'}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${readerScrollProgress}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Confirm gate</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {modalState.type === 'training'
                      ? `Completion only unlocks after you have reached the end of the module, answered all ${modalState.item.questionCount} quiz questions, and met the ${modalState.item.passingScore}% pass mark.`
                      : consentDecision === 'DECLINE'
                        ? 'Decline only unlocks after you have reached the end of the document and explicitly confirmed your response below.'
                        : 'Assent only unlocks after you have reached the end of the document and confirmed the statement below.'}
                  </p>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--text)]">Typed name</span>
                  <Input value={acknowledgedName} disabled={isReadOnlyModal} onChange={(event) => setAcknowledgedName(event.target.value)} placeholder="Enter your full name" />
                </label>

                <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Signature preview</p>
                  <p className="mt-3 text-3xl text-[var(--primary)]" style={{ fontFamily: '"Snell Roundhand","Segoe Script","Brush Script MT",cursive' }}>
                    {signaturePreview}
                  </p>
                  <p className="mt-3 text-xs text-[var(--muted)]">Recorded date: {new Date().toLocaleString()}</p>
                </div>

                <label className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3', readerReachedEnd ? 'border-[var(--border)] bg-[var(--surface-2)]' : 'border-amber-200 bg-amber-50')}>
                  <input type="checkbox" checked={confirmed} disabled={!readerReachedEnd || isReadOnlyModal} onChange={(event) => setConfirmed(event.target.checked)} />
                  <span className="text-sm leading-6 text-[var(--text)]">
                    {modalState.type === 'training'
                      ? `I, ${acknowledgedName.trim() || '________________'}, confirm that I have read and understood this module.`
                      : consentDecision === 'DECLINE'
                        ? `I, ${acknowledgedName.trim() || '________________'}, confirm that I have read this document and I do not want to accept it at this time.`
                        : `I, ${acknowledgedName.trim() || '________________'}, confirm that I have read and understood this document.`}
                  </span>
                </label>

                {!readerReachedEnd ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Scroll to the end of the {modalState.type === 'training' ? 'module' : 'document'} before you can confirm your response.
                  </div>
                ) : null}

                {modalState.type === 'training' ? (
                  <>
                    {isTrainingReviewOnly ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={`/api/protected/mentor-onboarding/training/${encodeURIComponent(modalState.item.id)}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                          Download certificate
                          <FileDown className="h-4 w-4" />
                        </a>
                        {modalState.item.completionRecordId ? (
                          <a href={`/verify/training/${encodeURIComponent(modalState.item.completionRecordId)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                            Public verification
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Assessment</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">Answer all questions. You need {modalState.item.passingScore}% to complete this module.</p>
                        </div>
                        {modalState.item.latestAttempt ? (
                          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', modalState.item.latestAttempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                            Last score {modalState.item.latestAttempt.score}%
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-4">
                        {modalState.item.questions.map((question, index) => (
                          <div key={question.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[var(--text)]">Question {index + 1}</p>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
                                {question.questionType === 'MULTI_CHOICE' ? 'Select all that apply' : 'Select one'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[var(--text)]">{question.prompt}</p>
                            {question.imageUrl ? (
                              <div className="mt-3 overflow-hidden rounded-[20px] border border-[var(--border)] bg-white p-3">
                                <Image src={question.imageUrl} alt={`Question ${index + 1}`} width={1200} height={720} className="max-h-72 w-full object-contain" />
                              </div>
                            ) : null}
                            <div className="mt-3 space-y-2">
                              {question.options.map((option) => (
                                <label key={`${question.id}-${option}`} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)]">
                                  <input
                                    type={question.questionType === 'MULTI_CHOICE' ? 'checkbox' : 'radio'}
                                    name={`question-${question.id}`}
                                    value={option}
                                    disabled={isReadOnlyModal}
                                    checked={(selectedAnswers[question.id] ?? []).includes(option)}
                                    onChange={(event) =>
                                      setSelectedAnswers((current) => ({
                                        ...current,
                                        [question.id]:
                                          question.questionType === 'MULTI_CHOICE'
                                            ? event.target.checked
                                              ? [...new Set([...(current[question.id] ?? []), option])]
                                              : (current[question.id] ?? []).filter((entry) => entry !== option)
                                            : event.target.checked
                                              ? [option]
                                              : [],
                                      }))
                                    }
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                            {question.explanation ? <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{question.explanation}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[var(--text)]">Notes (optional)</span>
                      <Textarea rows={4} value={notes} disabled={isReadOnlyModal} onChange={(event) => setNotes(event.target.value)} placeholder="Add any notes about how you completed this module." />
                    </label>
                  </>
                ) : (
                  <>
                    {!isConsentReviewOnly ? (
                      <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-2">
                        <button type="button" onClick={() => setConsentDecision('ASSENT')} className={cn('rounded-2xl px-4 py-3 text-sm font-semibold transition', consentDecision === 'ASSENT' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]')}>
                          I agree
                        </button>
                        <button type="button" onClick={() => setConsentDecision('DECLINE')} className={cn('rounded-2xl px-4 py-3 text-sm font-semibold transition', consentDecision === 'DECLINE' ? 'bg-white text-rose-700 shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]')}>
                          Decline
                        </button>
                      </div>
                    ) : null}
                    <a href={modalState.item.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                      Open source document
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {isConsentReviewOnly ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={`/api/protected/mentor-onboarding/consents/${encodeURIComponent(modalState.item.id)}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                          Download signed PDF
                          <FileDown className="h-4 w-4" />
                        </a>
                        {modalState.item.consentRecordId ? (
                          <a href={`/verify/consents/${encodeURIComponent(modalState.item.consentRecordId)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                            Public verification
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    {consentDecision === 'DECLINE' && !isConsentReviewOnly ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[var(--text)]">Reason for declining (optional)</span>
                        <Textarea rows={4} disabled={isReadOnlyModal} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="Explain why you do not want to accept this document right now." />
                      </label>
                    ) : null}
                    {consentDecision === 'ASSENT' && modalState.item.consentType === 'SAFEGUARDING' ? (
                      <div
                        className={cn(
                          'rounded-[24px] border-2 border-dashed p-5 text-center transition',
                          isDragging ? 'border-[var(--primary)] bg-[var(--surface-2)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50',
                        )}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          setIsDragging(false);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDragging(false);
                          const file = event.dataTransfer.files?.[0];
                          if (file) setConsentEvidenceFile(file);
                        }}
                      >
                        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                          <UploadCloud className="h-6 w-6" />
                        </span>
                        <p className="mt-3 text-base font-semibold text-[var(--text)]">Attach signed safeguarding evidence</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Upload a signed acknowledgement if you want your typed assent to be backed by a file.</p>
                        <div className="mt-4">
                          <Button variant="secondary" disabled={isReadOnlyModal} onClick={() => consentFileInputRef.current?.click()}>
                            Choose file
                          </Button>
                          <input
                            ref={consentFileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) => setConsentEvidenceFile(event.target.files?.[0] ?? null)}
                            disabled={isReadOnlyModal}
                          />
                        </div>
                        {consentEvidenceFile ? (
                          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left text-sm text-[var(--text)]">
                            <p className="font-medium">{consentEvidenceFile.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">{Math.round(consentEvidenceFile.size / 1024)} KB</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            {modalState.type === 'training' ? (
              isTrainingReviewOnly ? (
                <Button onClick={closeModal}>Close</Button>
              ) : (
                <Button onClick={onSubmitTraining} disabled={trainingPending || acknowledgedName.trim().length < 3 || !confirmed || !readerReachedEnd || unansweredTrainingQuestions > 0}>
                  {trainingPending ? 'Submitting...' : unansweredTrainingQuestions > 0 ? `Answer ${unansweredTrainingQuestions} more question${unansweredTrainingQuestions === 1 ? '' : 's'}` : 'Submit assessment'}
                </Button>
              )
            ) : modalState.type === 'consent' ? (
              isConsentReviewOnly ? (
                <Button onClick={closeModal}>Close</Button>
              ) : (
                <Button onClick={onSubmitConsent} disabled={consentPending || acknowledgedName.trim().length < 3 || !confirmed || !readerReachedEnd}>
                  {consentPending ? 'Saving...' : consentDecision === 'DECLINE' ? 'Confirm decline' : 'Record assent'}
                </Button>
              )
            ) : (
              <Button onClick={onSubmitBackground} disabled={backgroundPending || !backgroundFile}>
                {backgroundPending ? 'Uploading...' : 'Submit background check'}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
