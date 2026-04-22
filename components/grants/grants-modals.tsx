import { FormEvent, RefObject } from 'react';
import Swal from 'sweetalert2';
import Flatpickr from 'react-flatpickr';
import { BadgeCheck, FileSpreadsheet, Paperclip, PencilLine, Send, SlidersHorizontal, Target, Trash2, UploadCloud, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { TomSelectInput } from '@/components/ui/tom-select';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import {
  computeMatrixScore,
  emptyTaskEvidence,
  fitBand,
  formatEnum,
  scoreLevelLabel,
  scorePillClass,
  scoringRubric,
  sourceTypes,
  taskDomains,
  type ApprovalForm,
  type ApplicationForm,
  type EditTaskForm,
  type OpportunityForm,
  type ScoreForm,
  type SubmitForm,
  type TaskEvidenceForm,
  type TaskReviewForm,
} from '@/lib/grants-workspace';
import type { GrantTaskAssigneeRow } from '@/lib/api-types';

import { LabeledField } from '@/components/grants/grants-shared';

type GrantsModalsProps = {
  opportunityForm: OpportunityForm;
  setOpportunityForm: (updater: OpportunityForm | ((prev: OpportunityForm) => OpportunityForm)) => void;
  isOpportunityModalOpen: boolean;
  setIsOpportunityModalOpen: (open: boolean) => void;
  isAttachmentDragActive: boolean;
  setIsAttachmentDragActive: (active: boolean) => void;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  applyOpportunityAttachment: (file: File | null) => void;
  clearOpportunityAttachment: () => void;
  onCreateOpportunity: () => Promise<void>;
  createOpportunityPending: boolean;

  scoreForm: ScoreForm;
  setScoreForm: (updater: ScoreForm | ((prev: ScoreForm) => ScoreForm)) => void;
  isScoreModalOpen: boolean;
  setIsScoreModalOpen: (open: boolean) => void;
  onSaveScore: () => Promise<void>;
  scoreOpportunityPending: boolean;

  opportunities: Array<{ id: string; title: string; funderName: string; currencyCode: string; amountMinor: string }>;
  applicationForm: ApplicationForm;
  setApplicationForm: (updater: ApplicationForm | ((prev: ApplicationForm) => ApplicationForm)) => void;
  isApplicationModalOpen: boolean;
  setIsApplicationModalOpen: (open: boolean) => void;
  onCreateApplication: () => Promise<void>;
  createApplicationPending: boolean;

  taskEvidenceForm: TaskEvidenceForm;
  setTaskEvidenceForm: (updater: TaskEvidenceForm | ((prev: TaskEvidenceForm) => TaskEvidenceForm)) => void;
  isTaskEvidenceModalOpen: boolean;
  setIsTaskEvidenceModalOpen: (open: boolean) => void;
  isTaskEvidenceDragActive: boolean;
  setIsTaskEvidenceDragActive: (active: boolean) => void;
  taskEvidenceInputRef: RefObject<HTMLInputElement | null>;
  applyTaskEvidence: (file: File | null) => void;
  clearTaskEvidence: () => void;
  onUploadTaskEvidence: () => Promise<void>;
  uploadTaskEvidencePending: boolean;

  taskReviewForm: TaskReviewForm;
  setTaskReviewForm: (updater: TaskReviewForm | ((prev: TaskReviewForm) => TaskReviewForm)) => void;
  isTaskReviewModalOpen: boolean;
  setIsTaskReviewModalOpen: (open: boolean) => void;
  onReviewTask: () => Promise<void>;
  reviewTaskPending: boolean;

  editTaskForm: EditTaskForm;
  setEditTaskForm: (updater: EditTaskForm | ((prev: EditTaskForm) => EditTaskForm)) => void;
  isTaskEditModalOpen: boolean;
  setIsTaskEditModalOpen: (open: boolean) => void;
  taskAssignees: GrantTaskAssigneeRow[];
  onUpdateTaskDetails: () => Promise<void>;
  updateTaskDetailsPending: boolean;

  taskPendingDelete: { id: string; title: string } | null;
  setTaskPendingDelete: (value: { id: string; title: string } | null) => void;
  onDeleteTask: () => Promise<void>;
  deleteTaskPending: boolean;

  approvalForm: ApprovalForm;
  setApprovalForm: (updater: ApprovalForm | ((prev: ApprovalForm) => ApprovalForm)) => void;
  isApprovalModalOpen: boolean;
  setIsApprovalModalOpen: (open: boolean) => void;
  onSaveApproval: () => Promise<void>;
  approvalPending: boolean;

  submitForm: SubmitForm;
  setSubmitForm: (updater: SubmitForm | ((prev: SubmitForm) => SubmitForm)) => void;
  isSubmitModalOpen: boolean;
  setIsSubmitModalOpen: (open: boolean) => void;
  onSubmitApplication: () => Promise<void>;
  submitPending: boolean;
};

export function GrantsModals({
  opportunityForm,
  setOpportunityForm,
  isOpportunityModalOpen,
  setIsOpportunityModalOpen,
  isAttachmentDragActive,
  setIsAttachmentDragActive,
  attachmentInputRef,
  applyOpportunityAttachment,
  clearOpportunityAttachment,
  onCreateOpportunity,
  createOpportunityPending,
  scoreForm,
  setScoreForm,
  isScoreModalOpen,
  setIsScoreModalOpen,
  onSaveScore,
  scoreOpportunityPending,
  opportunities,
  applicationForm,
  setApplicationForm,
  isApplicationModalOpen,
  setIsApplicationModalOpen,
  onCreateApplication,
  createApplicationPending,
  taskEvidenceForm,
  setTaskEvidenceForm,
  isTaskEvidenceModalOpen,
  setIsTaskEvidenceModalOpen,
  isTaskEvidenceDragActive,
  setIsTaskEvidenceDragActive,
  taskEvidenceInputRef,
  applyTaskEvidence,
  clearTaskEvidence,
  onUploadTaskEvidence,
  uploadTaskEvidencePending,
  taskReviewForm,
  setTaskReviewForm,
  isTaskReviewModalOpen,
  setIsTaskReviewModalOpen,
  onReviewTask,
  reviewTaskPending,
  editTaskForm,
  setEditTaskForm,
  isTaskEditModalOpen,
  setIsTaskEditModalOpen,
  taskAssignees,
  onUpdateTaskDetails,
  updateTaskDetailsPending,
  taskPendingDelete,
  setTaskPendingDelete,
  onDeleteTask,
  deleteTaskPending,
  approvalForm,
  setApprovalForm,
  isApprovalModalOpen,
  setIsApprovalModalOpen,
  onSaveApproval,
  approvalPending,
  submitForm,
  setSubmitForm,
  isSubmitModalOpen,
  setIsSubmitModalOpen,
  onSubmitApplication,
  submitPending,
}: GrantsModalsProps) {

  const previewFitScore = computeMatrixScore({
    timelineScore: scoreForm.timelineScore,
    amountScore: scoreForm.amountScore,
    areaScore: scoreForm.areaScore,
    eligibilityScore: scoreForm.eligibilityScore,
    readinessScore: scoreForm.readinessScore,
  });

  return (
    <>
      <Modal open={isOpportunityModalOpen} onClose={() => setIsOpportunityModalOpen(false)} title="Add Opportunity" description="Capture the opportunity details now. Fit scoring can be completed after posting." icon={<Target className="h-4 w-4" />} size="xl">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void onCreateOpportunity(); }}>
          <LabeledField label="Title" required>
            <Input required value={opportunityForm.title} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, title: event.target.value }))} />
          </LabeledField>
          <LabeledField label="Funder" required>
            <Input required value={opportunityForm.funderName} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, funderName: event.target.value }))} />
          </LabeledField>
          <div className="md:col-span-2">
            <LabeledField label="Description">
              <textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" placeholder="Briefly describe the opportunity scope and relevance" value={opportunityForm.description} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, description: event.target.value }))} />
            </LabeledField>
          </div>
          <LabeledField label="Source Type">
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" value={opportunityForm.sourceType} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, sourceType: event.target.value as OpportunityForm['sourceType'] }))}>
              <option value="">Select source</option>
              {sourceTypes.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Source Reference">
            <Input placeholder="Team name, board contact, referrer, or email origin" value={opportunityForm.sourceReference} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, sourceReference: event.target.value }))} />
          </LabeledField>
          <LabeledField label="Deadline" required>
            <Flatpickr options={{ enableTime: true, time_24hr: true, dateFormat: 'Y-m-d\\TH:i', altInput: true, altFormat: 'M j, Y H:i', minuteIncrement: 5, altInputClass: 'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]' }} value={opportunityForm.deadline || undefined} onChange={(_, dateStr) => setOpportunityForm((prev) => ({ ...prev, deadline: dateStr || '' }))} required className="hidden" placeholder="Select date and time" />
          </LabeledField>
          <LabeledField label="Status" required>
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" value={opportunityForm.status} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, status: event.target.value as OpportunityForm['status'] }))}>
              <option value="DISCOVERED">Discovered</option>
              <option value="QUALIFYING">Qualifying</option>
              <option value="PURSUING">Pursuing</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </LabeledField>
          <LabeledField label="Currency Code" required>
            <Input required maxLength={3} value={opportunityForm.currencyCode} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, currencyCode: event.target.value.toUpperCase() }))} />
          </LabeledField>
          <LabeledField label="Amount (Minor Units)" required>
            <Input required value={opportunityForm.amountMinor} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, amountMinor: event.target.value }))} />
          </LabeledField>
          <LabeledField label="Country">
            <TomSelectInput options={COUNTRY_OPTIONS} value={opportunityForm.country} onChange={(value) => setOpportunityForm((prev) => ({ ...prev, country: Array.isArray(value) ? value[0] ?? '' : value }))} placeholder="Search and select country" />
          </LabeledField>
          <div className="md:col-span-2">
            <LabeledField label="Source URL">
              <Input value={opportunityForm.sourceUrl} onChange={(event) => setOpportunityForm((prev) => ({ ...prev, sourceUrl: event.target.value }))} />
            </LabeledField>
          </div>
          <div className="md:col-span-2">
            <LabeledField label="Attachment">
              <input ref={attachmentInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(event) => applyOpportunityAttachment(event.target.files && event.target.files[0] ? event.target.files[0] : null)} />
              <button type="button" className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-left transition ${isAttachmentDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`} onClick={() => attachmentInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsAttachmentDragActive(true); }} onDragEnter={(event) => { event.preventDefault(); setIsAttachmentDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); setIsAttachmentDragActive(false); }} onDrop={(event) => { event.preventDefault(); setIsAttachmentDragActive(false); applyOpportunityAttachment(event.dataTransfer.files && event.dataTransfer.files[0] ? event.dataTransfer.files[0] : null); }}>
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"><UploadCloud className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Drag and drop attachment</p>
                    <p className="text-xs text-[var(--muted)]">or click to browse. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, WEBP (max 10MB).</p>
                  </div>
                </div>
              </button>
            </LabeledField>
            {opportunityForm.attachment ? (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text)]"><Paperclip className="h-3.5 w-3.5 text-[var(--primary)]" />{opportunityForm.attachment.name}</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearOpportunityAttachment} aria-label="Remove attachment" title="Remove attachment"><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpportunityModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createOpportunityPending}>{createOpportunityPending ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isScoreModalOpen} onClose={() => setIsScoreModalOpen(false)} title="Opportunity Scoring Matrix" description="Score after posting based on timeline, amount, strategic areas, eligibility, and readiness." icon={<SlidersHorizontal className="h-4 w-4" />}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void onSaveScore(); }}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Opportunity</p>
            <p className="mt-1 font-semibold text-[var(--text)]">{scoreForm.title || '-'}</p>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">Weighted score preview:</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${fitBand(previewFitScore).className}`}>{previewFitScore}/100</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]"><tr><th className="px-3 py-2 font-semibold">Criterion</th><th className="px-3 py-2 font-semibold">Weight</th><th className="px-3 py-2 font-semibold">Score</th><th className="px-3 py-2 font-semibold">Slider</th></tr></thead>
              <tbody>
                {scoringRubric.map((criterion) => (
                  <tr key={criterion.key} className="border-t border-[var(--border)]">
                    <td className="px-3 py-3 text-[var(--text)]">{criterion.title} *</td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">{criterion.weight}%</td>
                    <td className="px-3 py-3 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${scorePillClass(scoreForm[criterion.key])}`}>{scoreForm[criterion.key]} - {scoreLevelLabel(scoreForm[criterion.key])}</span></td>
                    <td className="px-3 py-3"><div className="space-y-1"><input type="range" min={1} max={5} step={1} value={scoreForm[criterion.key]} onChange={(event) => setScoreForm((prev) => ({ ...prev, [criterion.key]: Number(event.target.value) }))} className="h-2 w-full cursor-pointer accent-[var(--primary)]" /><div className="flex justify-between text-[10px] text-[var(--muted)]"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <LabeledField label="Notes">
            <textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={scoreForm.notes} onChange={(event) => setScoreForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </LabeledField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsScoreModalOpen(false)}>Cancel</Button><Button type="submit" disabled={scoreOpportunityPending}>{scoreOpportunityPending ? 'Saving...' : 'Save Score'}</Button></div>
        </form>
      </Modal>

      <Modal open={isApplicationModalOpen} onClose={() => setIsApplicationModalOpen(false)} title="Create Grant Application" description="Create a scoped application from a discovery opportunity." icon={<FileSpreadsheet className="h-4 w-4" />}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void onCreateApplication(); }}>
          <LabeledField label="Opportunity" required>
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" required value={applicationForm.opportunityId} onChange={(event) => setApplicationForm((prev) => ({ ...prev, opportunityId: event.target.value }))}>
              <option value="">Select opportunity</option>
              {opportunities.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.funderName})</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Application Title"><Input value={applicationForm.title} onChange={(event) => setApplicationForm((prev) => ({ ...prev, title: event.target.value }))} /></LabeledField>
          <div className="grid gap-3 md:grid-cols-2">
            <LabeledField label="Currency Code" required><Input required maxLength={3} value={applicationForm.currencyCode} onChange={(event) => setApplicationForm((prev) => ({ ...prev, currencyCode: event.target.value.toUpperCase() }))} /></LabeledField>
            <LabeledField label="Requested Amount (Minor Units)" required><Input required value={applicationForm.amountRequestedMinor} onChange={(event) => setApplicationForm((prev) => ({ ...prev, amountRequestedMinor: event.target.value }))} /></LabeledField>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsApplicationModalOpen(false)}>Cancel</Button><Button type="submit" disabled={createApplicationPending}>{createApplicationPending ? 'Saving...' : 'Create Application'}</Button></div>
        </form>
      </Modal>

      <Modal open={isTaskEvidenceModalOpen} onClose={() => setIsTaskEvidenceModalOpen(false)} title="Upload Task Evidence" description="Attach proof of completion before reviewer decision." icon={<UploadCloud className="h-4 w-4" />}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void onUploadTaskEvidence(); }}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--muted)]">Task</p><p className="mt-1 text-sm font-semibold text-[var(--text)]">{taskEvidenceForm.title || '-'}</p></div>
          <input ref={taskEvidenceInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(event) => applyTaskEvidence(event.target.files && event.target.files[0] ? event.target.files[0] : null)} />
          <button type="button" className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-left transition ${isTaskEvidenceDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`} onClick={() => taskEvidenceInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsTaskEvidenceDragActive(true); }} onDragEnter={(event) => { event.preventDefault(); setIsTaskEvidenceDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); setIsTaskEvidenceDragActive(false); }} onDrop={(event) => { event.preventDefault(); setIsTaskEvidenceDragActive(false); applyTaskEvidence(event.dataTransfer.files && event.dataTransfer.files[0] ? event.dataTransfer.files[0] : null); }}>
            <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"><UploadCloud className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[var(--text)]">Drag and drop evidence</p><p className="text-xs text-[var(--muted)]">or click to browse. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, WEBP (max 10MB).</p></div></div>
          </button>
          {taskEvidenceForm.file ? <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"><p className="inline-flex items-center gap-1.5 text-xs text-[var(--text)]"><Paperclip className="h-3.5 w-3.5 text-[var(--primary)]" />{taskEvidenceForm.file.name}</p><Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearTaskEvidence} aria-label="Remove evidence" title="Remove evidence"><X className="h-3.5 w-3.5" /></Button></div> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => { setIsTaskEvidenceModalOpen(false); setTaskEvidenceForm(emptyTaskEvidence); }}>Cancel</Button><Button type="submit" disabled={uploadTaskEvidencePending}>{uploadTaskEvidencePending ? 'Uploading...' : 'Upload Evidence'}</Button></div>
        </form>
      </Modal>

      <Modal open={isTaskReviewModalOpen} onClose={() => setIsTaskReviewModalOpen(false)} title="Review Completed Task" description="Approve or request rework after checking evidence." icon={<BadgeCheck className="h-4 w-4" />}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void onReviewTask(); }}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><p className="text-xs uppercase tracking-wide text-[var(--muted)]">Task</p><p className="mt-1 text-sm font-semibold text-[var(--text)]">{taskReviewForm.title || '-'}</p></div>
          <LabeledField label="Decision" required>
            <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" value={taskReviewForm.decision} onChange={(event) => setTaskReviewForm((prev) => ({ ...prev, decision: event.target.value as TaskReviewForm['decision'] }))}>
              <option value="APPROVE">Approve (Complete)</option>
              <option value="REWORK">Request Rework</option>
            </select>
          </LabeledField>
          <LabeledField label="Review Notes"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={taskReviewForm.notes} onChange={(event) => setTaskReviewForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional comments for completion or rework guidance" /></LabeledField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => { setIsTaskReviewModalOpen(false); setTaskReviewForm({ taskId: '', title: '', decision: 'APPROVE', notes: '' }); }}>Cancel</Button><Button type="submit" disabled={reviewTaskPending}>{reviewTaskPending ? 'Saving...' : taskReviewForm.decision === 'APPROVE' ? 'Approve Task' : 'Request Rework'}</Button></div>
        </form>
      </Modal>

      <Modal open={isTaskEditModalOpen} onClose={() => setIsTaskEditModalOpen(false)} title="Edit Task" description="Update assignment, domain, deadline, and task details." icon={<PencilLine className="h-4 w-4" />}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void onUpdateTaskDetails(); }}>
          <LabeledField label="Task Title" required><Input required value={editTaskForm.title} onChange={(event) => setEditTaskForm((prev) => ({ ...prev, title: event.target.value }))} /></LabeledField>
          <LabeledField label="Section"><select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" value={editTaskForm.section} onChange={(event) => setEditTaskForm((prev) => ({ ...prev, section: event.target.value }))}><option value="">Select domain</option>{taskDomains.map((domain) => <option key={domain} value={domain}>{formatEnum(domain)}</option>)}</select></LabeledField>
          <LabeledField label="Assignee" required><select required className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" value={editTaskForm.assigneeId} onChange={(event) => setEditTaskForm((prev) => ({ ...prev, assigneeId: event.target.value }))}><option value="">Select assignee</option>{taskAssignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.fullName} ({formatEnum(assignee.role)})</option>)}</select></LabeledField>
          <LabeledField label="Due Date"><div className="space-y-1.5"><Flatpickr options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'M j, Y', altInputClass: 'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]' }} value={editTaskForm.dueDate || undefined} onChange={(_, dateStr) => setEditTaskForm((prev) => ({ ...prev, dueDate: dateStr || '' }))} className="hidden" placeholder="Select due date" />{editTaskForm.dueDate ? <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setEditTaskForm((prev) => ({ ...prev, dueDate: '' }))}>Clear due date</Button> : null}</div></LabeledField>
          <div className="md:col-span-2"><LabeledField label="Description"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={editTaskForm.description} onChange={(event) => setEditTaskForm((prev) => ({ ...prev, description: event.target.value }))} /></LabeledField></div>
          <div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsTaskEditModalOpen(false)}>Cancel</Button><Button type="submit" disabled={updateTaskDetailsPending}>{updateTaskDetailsPending ? 'Saving...' : 'Save Changes'}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(taskPendingDelete)} onClose={() => setTaskPendingDelete(null)} title="Delete Task" description="This action removes the task from the writing plan." icon={<Trash2 className="h-4 w-4" />}>
        <div className="space-y-4"><p className="text-sm text-[var(--text)]">Are you sure you want to delete <span className="font-semibold">{taskPendingDelete?.title ?? 'this task'}</span>?</p><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setTaskPendingDelete(null)}>Cancel</Button><Button type="button" variant="danger" disabled={!taskPendingDelete || deleteTaskPending} onClick={() => void onDeleteTask()}>{deleteTaskPending ? 'Deleting...' : 'Delete Task'}</Button></div></div>
      </Modal>

      <Modal open={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} title="Approval Update" description="Set grant stage-gate approval status." icon={<BadgeCheck className="h-4 w-4" />}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void onSaveApproval(); }}>
          <LabeledField label="Approval Type" required><select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={approvalForm.approvalType} onChange={(event) => setApprovalForm((prev) => ({ ...prev, approvalType: event.target.value as ApprovalForm['approvalType'] }))}><option value="PURSUE">Pursue</option><option value="BUDGET">Budget</option><option value="FINAL_SUBMISSION">Final Submission</option></select></LabeledField>
          <LabeledField label="Status" required><select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={approvalForm.status} onChange={(event) => setApprovalForm((prev) => ({ ...prev, status: event.target.value as ApprovalForm['status'] }))}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></LabeledField>
          <LabeledField label="Notes"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={approvalForm.notes} onChange={(event) => setApprovalForm((prev) => ({ ...prev, notes: event.target.value }))} /></LabeledField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsApprovalModalOpen(false)}>Cancel</Button><Button type="submit" disabled={approvalPending}>{approvalPending ? 'Saving...' : 'Save Approval'}</Button></div>
        </form>
      </Modal>

      <Modal open={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Grant Application" description="Finalize and submit once tasks and approvals are complete." icon={<Send className="h-4 w-4" />}>
        <form className="space-y-3" onSubmit={async (event: FormEvent) => { event.preventDefault(); const confirm = await Swal.fire({ title: 'Confirm submission?', text: 'This will mark the application as submitted.', icon: 'question', showCancelButton: true, confirmButtonText: 'Submit', confirmButtonColor: '#0f766e' }); if (!confirm.isConfirmed) return; await onSubmitApplication(); }}>
          <LabeledField label="Confirmation Reference"><Input value={submitForm.confirmationReference} onChange={(event) => setSubmitForm((prev) => ({ ...prev, confirmationReference: event.target.value }))} /></LabeledField>
          <LabeledField label="Proof URL"><Input value={submitForm.proofUrl} onChange={(event) => setSubmitForm((prev) => ({ ...prev, proofUrl: event.target.value }))} /></LabeledField>
          <LabeledField label="Package Version"><Input value={submitForm.packageVersion} onChange={(event) => setSubmitForm((prev) => ({ ...prev, packageVersion: event.target.value }))} /></LabeledField>
          <LabeledField label="Notes"><textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={submitForm.notes} onChange={(event) => setSubmitForm((prev) => ({ ...prev, notes: event.target.value }))} /></LabeledField>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button><Button type="submit" disabled={submitPending}>{submitPending ? 'Submitting...' : 'Submit Application'}</Button></div>
        </form>
      </Modal>
    </>
  );
}
