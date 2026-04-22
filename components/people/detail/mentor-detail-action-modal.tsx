'use client';

import { type ChangeEvent, type RefObject } from 'react';
import Flatpickr from 'react-flatpickr';
import { BookOpenCheck, CalendarDays, ClipboardCheck, Link2, ShieldCheck, StickyNote, UploadCloud, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import type { ActionFormState, ModalAction } from '@/components/people/detail/mentor-detail-shared';
import { actionCopy, Field } from '@/components/people/detail/mentor-detail-shared';

type TrainingEvidenceState = {
  file: File | null;
  uploadedUrl: string;
  uploadedName: string;
};

export function MentorDetailActionModal({
  modalAction,
  closeModal,
  form,
  setForm,
  trainingEvidence,
  applyTrainingEvidence,
  trainingEvidenceInputRef,
  isTrainingDragActive,
  setIsTrainingDragActive,
  onTrainingFileChange,
  submitAction,
  pending,
}: {
  modalAction: ModalAction | null;
  closeModal: () => void;
  form: ActionFormState;
  setForm: (updater: (current: ActionFormState) => ActionFormState) => void;
  trainingEvidence: TrainingEvidenceState;
  applyTrainingEvidence: (file: File | null) => void;
  trainingEvidenceInputRef: RefObject<HTMLInputElement | null>;
  isTrainingDragActive: boolean;
  setIsTrainingDragActive: (value: boolean) => void;
  onTrainingFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  submitAction: () => void;
  pending: boolean;
}) {
  if (!modalAction) return null;

  return (
    <Modal open onClose={closeModal} title={actionCopy(modalAction).title} description={actionCopy(modalAction).description} size="xl" icon={<ClipboardCheck className="h-5 w-5" />}>
      <div className="space-y-5">
        {(modalAction === 'BACKGROUND_CLEAR' || modalAction === 'COMPLETE_TRAINING' || modalAction === 'AGREE_SAFEGUARDING') ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={modalAction === 'BACKGROUND_CLEAR' ? 'Effective date' : modalAction === 'COMPLETE_TRAINING' ? 'Completed on' : 'Agreed on'} icon={<CalendarDays className="h-4 w-4" />}>
              <Flatpickr
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                value={form.effectiveAt ?? undefined}
                options={{ enableTime: false, dateFormat: 'Y-m-d' }}
                onChange={(dates) => setForm((prev) => ({ ...prev, effectiveAt: dates[0] ?? null }))}
              />
            </Field>
            {modalAction === 'BACKGROUND_CLEAR' ? (
              <Field label="Expiry date" icon={<CalendarDays className="h-4 w-4" />}>
                <Flatpickr
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                  value={form.expiryDate ?? undefined}
                  options={{ enableTime: false, dateFormat: 'Y-m-d' }}
                  onChange={(dates) => setForm((prev) => ({ ...prev, expiryDate: dates[0] ?? null }))}
                />
              </Field>
            ) : null}
            {modalAction === 'COMPLETE_TRAINING' ? (
              <Field label="Training name" icon={<BookOpenCheck className="h-4 w-4" />}>
                <Input value={form.trainingName} onChange={(event) => setForm((prev) => ({ ...prev, trainingName: event.target.value }))} placeholder="Safeguarding Foundation Module" />
              </Field>
            ) : null}
            {modalAction === 'AGREE_SAFEGUARDING' ? (
              <Field label="Agreement version" icon={<ShieldCheck className="h-4 w-4" />}>
                <Input value={form.agreementVersion} onChange={(event) => setForm((prev) => ({ ...prev, agreementVersion: event.target.value }))} placeholder="v1.0" />
              </Field>
            ) : null}
          </div>
        ) : null}

        {modalAction === 'COMPLETE_TRAINING' ? (
          <Field label="Training evidence" icon={<UploadCloud className="h-4 w-4" />}>
            <div className="space-y-3">
              <input ref={trainingEvidenceInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={onTrainingFileChange} />
              <button
                type="button"
                className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-left transition ${
                  isTrainingDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
                onClick={() => trainingEvidenceInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsTrainingDragActive(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsTrainingDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsTrainingDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsTrainingDragActive(false);
                  const dropped = event.dataTransfer.files && event.dataTransfer.files[0] ? event.dataTransfer.files[0] : null;
                  applyTrainingEvidence(dropped);
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"><UploadCloud className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Drag and drop training evidence</p>
                    <p className="text-xs text-[var(--muted)]">or click to browse. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, WEBP (max 10MB).</p>
                  </div>
                </div>
              </button>

              {trainingEvidence.file ? (
                <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text)]">{trainingEvidence.file.name}</p>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                    applyTrainingEvidence(null);
                    if (trainingEvidenceInputRef.current) trainingEvidenceInputRef.current.value = '';
                  }} aria-label="Remove evidence" title="Remove evidence">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}

              {!trainingEvidence.file && trainingEvidence.uploadedUrl ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]">Uploaded evidence attached: {trainingEvidence.uploadedName || 'Training evidence'}</div>
              ) : null}
            </div>
          </Field>
        ) : null}

        {(modalAction === 'BACKGROUND_CLEAR' || modalAction === 'AGREE_SAFEGUARDING') ? (
          <Field label="Evidence URL" icon={<Link2 className="h-4 w-4" />}>
            <Input value={form.evidenceUrl} onChange={(event) => setForm((prev) => ({ ...prev, evidenceUrl: event.target.value }))} placeholder="https://..." />
          </Field>
        ) : null}

        <Field label={modalAction === 'APPROVE' ? 'Approval notes *' : modalAction === 'REJECT' || modalAction === 'BACKGROUND_FAIL' ? 'Review notes *' : 'Reviewer notes'} icon={<StickyNote className="h-4 w-4" />}>
          <Textarea value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Record what was checked, any evidence reviewed, and the decision context." />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button variant={modalAction === 'REJECT' || modalAction === 'BACKGROUND_FAIL' ? 'danger' : 'primary'} onClick={submitAction} disabled={pending}>
            {pending ? 'Saving...' : actionCopy(modalAction).title}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
