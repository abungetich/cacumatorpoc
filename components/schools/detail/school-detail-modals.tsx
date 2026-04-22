import { FormEvent } from "react";
import Swal from "sweetalert2";
import { BookOpen, Power, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { StudentMasterUploadResponse, SchoolProgramRow } from "@/lib/api-types";
import {
  ProgramActionState,
  programEducationLevels,
  SchoolAdminFormState,
  SchoolHeadFormState,
  SchoolProgramFormState,
  SchoolStudentFormState,
  studentLevels,
  type ModalMode,
} from "@/lib/school-detail-workspace";

type PendingFlags = {
  admin: boolean;
  head: boolean;
  student: boolean;
  upload: boolean;
  createProgram: boolean;
  updateProgram: boolean;
  toggleProgram: boolean;
  deleteProgram: boolean;
};

type SchoolDetailModalsProps = {
  schoolName: string;
  principalAssigned: boolean;
  open: ModalMode;
  programAction: ProgramActionState;
  editingProgram: SchoolProgramRow | null;
  adminForm: SchoolAdminFormState;
  headForm: SchoolHeadFormState;
  studentForm: SchoolStudentFormState;
  programForm: SchoolProgramFormState;
  uploadFile: File | null;
  uploadDryRun: boolean;
  uploadResult: StudentMasterUploadResponse | null;
  pending: PendingFlags;
  onClose: () => void;
  onCloseProgramAction: () => void;
  onSubmitProgramAction: () => Promise<void>;
  onAdminFormChange: (value: SchoolAdminFormState) => void;
  onHeadFormChange: (value: SchoolHeadFormState) => void;
  onStudentFormChange: (value: SchoolStudentFormState) => void;
  onProgramFormChange: (value: SchoolProgramFormState) => void;
  onUploadFileChange: (file: File | null) => void;
  onUploadDryRunChange: (value: boolean) => void;
  onAdminSubmit: (event: FormEvent) => Promise<void>;
  onHeadSubmit: (event: FormEvent) => Promise<void>;
  onStudentSubmit: (event: FormEvent) => Promise<void>;
  onUploadSubmit: (event: FormEvent) => Promise<void>;
  onProgramSubmit: (event: FormEvent) => Promise<void>;
};

export function SchoolDetailModals({
  schoolName,
  principalAssigned,
  open,
  programAction,
  editingProgram,
  adminForm,
  headForm,
  studentForm,
  programForm,
  uploadDryRun,
  uploadResult,
  pending,
  onClose,
  onCloseProgramAction,
  onSubmitProgramAction,
  onAdminFormChange,
  onHeadFormChange,
  onStudentFormChange,
  onProgramFormChange,
  onUploadFileChange,
  onUploadDryRunChange,
  onAdminSubmit,
  onHeadSubmit,
  onStudentSubmit,
  onUploadSubmit,
  onProgramSubmit,
}: SchoolDetailModalsProps) {
  return (
    <>
      <Modal
        open={Boolean(programAction)}
        onClose={onCloseProgramAction}
        title={
          programAction?.action === "delete"
            ? "Delete Program"
            : programAction?.nextIsActive
              ? "Activate Program"
              : "Deactivate Program"
        }
        description={
          programAction?.action === "delete"
            ? "This action removes the program. Programs with mentorship records cannot be deleted."
            : "This updates whether the program appears in matching."
        }
        size="md"
        icon={programAction?.action === "delete" ? <Trash2 className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      >
        {programAction ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Program</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">{programAction.program.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{programAction.program.description}</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onCloseProgramAction}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={programAction.action === "delete" ? "danger" : "primary"}
                onClick={() => {
                  void onSubmitProgramAction();
                }}
                disabled={pending.toggleProgram || pending.deleteProgram}
              >
                {pending.toggleProgram || pending.deleteProgram
                  ? "Saving..."
                  : programAction.action === "delete"
                    ? "Delete Program"
                    : programAction.nextIsActive
                      ? "Activate Program"
                      : "Deactivate Program"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={open === "admin"} onClose={onClose} title="Add School Admin" description={`Create admin account for ${schoolName}`}>
        <form className="space-y-3" onSubmit={(event) => void onAdminSubmit(event)}>
          <Input required placeholder="First name" value={adminForm.firstName} onChange={(event) => onAdminFormChange({ ...adminForm, firstName: event.target.value })} />
          <Input required placeholder="Last name" value={adminForm.lastName} onChange={(event) => onAdminFormChange({ ...adminForm, lastName: event.target.value })} />
          <Input required type="email" placeholder="Email" value={adminForm.email} onChange={(event) => onAdminFormChange({ ...adminForm, email: event.target.value })} />
          <Input required placeholder="Phone" value={adminForm.phone} onChange={(event) => onAdminFormChange({ ...adminForm, phone: event.target.value })} />
          <Input required type="date" value={adminForm.dateOfBirth} onChange={(event) => onAdminFormChange({ ...adminForm, dateOfBirth: event.target.value })} />
          <Input required type="password" minLength={8} placeholder="Temporary password" value={adminForm.password} onChange={(event) => onAdminFormChange({ ...adminForm, password: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending.admin}>{pending.admin ? "Saving..." : "Save Admin"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={open === "head"}
        onClose={onClose}
        title={principalAssigned ? "Update Head of Institution" : "Add Head of Institution"}
        description={principalAssigned ? `Edit leadership details for ${schoolName}` : `Add leadership details for ${schoolName}`}
        icon={<UserRound className="h-4 w-4" />}
        size="lg"
      >
        <form className="space-y-3" onSubmit={(event) => void onHeadSubmit(event)}>
          <Input required placeholder="Principal name" value={headForm.principalName} onChange={(event) => onHeadFormChange({ ...headForm, principalName: event.target.value })} />
          <Input required type="email" placeholder="Principal email" value={headForm.principalEmail} onChange={(event) => onHeadFormChange({ ...headForm, principalEmail: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending.head}>{pending.head ? "Saving..." : "Save Head"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={open === "student"} onClose={onClose} title="Add Student (Mentee)" description={`Create a mentee for ${schoolName}`}>
        <form className="space-y-3" onSubmit={(event) => void onStudentSubmit(event)}>
          <Input required placeholder="Full name" value={studentForm.name} onChange={(event) => onStudentFormChange({ ...studentForm, name: event.target.value })} />
          <Input required type="email" placeholder="Email" value={studentForm.email} onChange={(event) => onStudentFormChange({ ...studentForm, email: event.target.value })} />
          <Input required placeholder="Phone" value={studentForm.phone} onChange={(event) => onStudentFormChange({ ...studentForm, phone: event.target.value })} />
          <Input required type="date" value={studentForm.dateOfBirth} onChange={(event) => onStudentFormChange({ ...studentForm, dateOfBirth: event.target.value })} />
          <select
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={studentForm.educationLevel}
            onChange={(event) => onStudentFormChange({ ...studentForm, educationLevel: event.target.value as SchoolStudentFormState["educationLevel"] })}
          >
            {studentLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending.student}>{pending.student ? "Saving..." : "Save Student"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={open === "upload"} onClose={onClose} title="Upload Students CSV" description={`Bulk import mentees into ${schoolName}`}>
        <form className="space-y-3" onSubmit={(event) => void onUploadSubmit(event)}>
          <input
            required
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-2"
            onChange={(event) => onUploadFileChange(event.target.files?.[0] ?? null)}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={uploadDryRun}
              onChange={(event) => onUploadDryRunChange(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            Dry-run only (no writes)
          </label>
          {uploadResult ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)]">
              <p>Total: {uploadResult.summary.totalRows}</p>
              <p>Validated: {uploadResult.summary.validated}</p>
              <p>Created: {uploadResult.summary.created}</p>
              <p>Skipped: {uploadResult.summary.skipped}</p>
              <p>Failed: {uploadResult.summary.failed}</p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="gap-2" disabled={pending.upload}>
              <Users className="h-4 w-4" />
              {pending.upload ? "Processing..." : "Upload Students"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={open === "program"}
        onClose={onClose}
        title={editingProgram ? "Edit Program" : "Add Program"}
        description={editingProgram ? `Update mentorship program details for ${schoolName}` : `Create a mentorship program for ${schoolName}`}
        icon={<BookOpen className="h-4 w-4" />}
        size="xl"
      >
        <form className="space-y-4" onSubmit={(event) => void onProgramSubmit(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input required placeholder="Program name" value={programForm.name} onChange={(event) => onProgramFormChange({ ...programForm, name: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <textarea
                required
                className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                placeholder="Program description"
                value={programForm.description}
                onChange={(event) => onProgramFormChange({ ...programForm, description: event.target.value })}
              />
            </div>
            <Input required type="number" min={1} max={60} placeholder="Duration (months)" value={programForm.durationMonths} onChange={(event) => onProgramFormChange({ ...programForm, durationMonths: event.target.value })} />
            <Input required type="number" min={1} max={12} placeholder="Min sessions / month" value={programForm.minSessionsPerMonth} onChange={(event) => onProgramFormChange({ ...programForm, minSessionsPerMonth: event.target.value })} />
            <Input required type="date" value={programForm.startDate} onChange={(event) => onProgramFormChange({ ...programForm, startDate: event.target.value })} />
            <Input required type="date" value={programForm.endDate} onChange={(event) => onProgramFormChange({ ...programForm, endDate: event.target.value })} />
            <div className="md:col-span-2">
              <Input required placeholder="Objectives (comma separated)" value={programForm.objectives} onChange={(event) => onProgramFormChange({ ...programForm, objectives: event.target.value })} />
            </div>
            <div className="md:col-span-2 rounded-xl border border-[var(--border)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Target Education Levels</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {programEducationLevels.map((level) => {
                  const checked = programForm.targetEducationLevels.includes(level);
                  return (
                    <label
                      key={level}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                        checked
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={checked}
                        onChange={(event) => {
                          onProgramFormChange({
                            ...programForm,
                            targetEducationLevels: event.target.checked
                              ? [...programForm.targetEducationLevels, level]
                              : programForm.targetEducationLevels.filter((item) => item !== level),
                          });
                        }}
                      />
                      {level}
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text)] md:col-span-2">
              <input type="checkbox" checked={programForm.isActive} onChange={(event) => onProgramFormChange({ ...programForm, isActive: event.target.checked })} />
              Program is active and available in matching
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending.createProgram || pending.updateProgram}>
              {pending.createProgram || pending.updateProgram ? "Saving..." : editingProgram ? "Save Changes" : "Create Program"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export async function confirmAdminCreated(email: string) {
  await Swal.fire({
    title: "Admin account created",
    text: `${email} can now access the school workspace.`,
    icon: "success",
    confirmButtonColor: "#15803d",
  });
}
