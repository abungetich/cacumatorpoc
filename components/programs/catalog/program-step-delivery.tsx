import type { Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { programFormats, programStatuses, sessionFrequencies } from '@/lib/programs-config';
import type { ProgramFormState } from '@/lib/programs-catalog';
import { DateField, DateTimeField, LabeledField, LabeledSelect, ProgramStepHeader, ToggleCheckbox } from '@/components/programs/catalog/program-form-shared';

export function ProgramStepDelivery({
  editing,
  form,
  setForm,
}: {
  editing: boolean;
  form: ProgramFormState;
  setForm: Dispatch<SetStateAction<ProgramFormState>>;
}) {
  return (
    <ProgramStepHeader title="Delivery Model" description="Set cadence, timing, visibility, and operating lifecycle.">
      <LabeledField label="Program Status" required>
        {editing ? (
          <select
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={form.programStatus}
            onChange={(event) => setForm((prev) => ({ ...prev, programStatus: event.target.value as ProgramFormState['programStatus'] }))}
          >
            {programStatuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>
            ))}
          </select>
        ) : (
          <div className="rounded-2xl border border-[color-mix(in_oklab,var(--primary)_18%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_6%,white)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text)]">Draft</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">New programs always start in Draft. Publication and approval will happen in a dedicated review modal.</p>
          </div>
        )}
      </LabeledField>
      <LabeledSelect label="Format" value={form.programFormat} onChange={(value) => setForm((prev) => ({ ...prev, programFormat: value as ProgramFormState['programFormat'] }))} options={programFormats} />
      <LabeledSelect label="Session Frequency" value={form.sessionFrequency} onChange={(value) => setForm((prev) => ({ ...prev, sessionFrequency: value as ProgramFormState['sessionFrequency'] }))} options={sessionFrequencies} />
      <LabeledField label="Session Duration (Minutes)" required>
        <Input required type="number" min={15} max={480} value={form.sessionDurationMinutes} onChange={(event) => setForm((prev) => ({ ...prev, sessionDurationMinutes: event.target.value }))} />
      </LabeledField>
      <LabeledField label="Duration (Months)" required>
        <Input required type="number" min={1} max={60} value={form.durationMonths} onChange={(event) => setForm((prev) => ({ ...prev, durationMonths: event.target.value }))} />
      </LabeledField>
      <LabeledField label="Min Sessions / Month" required>
        <Input required type="number" min={1} max={12} value={form.minSessionsPerMonth} onChange={(event) => setForm((prev) => ({ ...prev, minSessionsPerMonth: event.target.value }))} />
      </LabeledField>
      <DateField label="Start Date" value={form.startDate} onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))} required />
      <DateField label="End Date" value={form.endDate} onChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))} required />
      <DateTimeField label="Application Deadline" value={form.applicationDeadline} onChange={(value) => setForm((prev) => ({ ...prev, applicationDeadline: value }))} onClear={() => setForm((prev) => ({ ...prev, applicationDeadline: '' }))} />
      <LabeledField label="Max Mentors">
        <Input type="number" min={1} value={form.maxMentors} onChange={(event) => setForm((prev) => ({ ...prev, maxMentors: event.target.value }))} />
      </LabeledField>
      <LabeledField label="Max Mentees">
        <Input type="number" min={1} value={form.maxMentees} onChange={(event) => setForm((prev) => ({ ...prev, maxMentees: event.target.value }))} />
      </LabeledField>
      <LabeledField label="Cohort Length (Months)">
        <Input type="number" min={1} max={24} value={form.cohortLengthMonths} onChange={(event) => setForm((prev) => ({ ...prev, cohortLengthMonths: event.target.value }))} />
      </LabeledField>
      <div className="md:col-span-2 flex flex-wrap gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text)]">
        <ToggleCheckbox label="Rolling program" checked={form.rollingProgram} onChange={(checked) => setForm((prev) => ({ ...prev, rollingProgram: checked }))} />
        <ToggleCheckbox label="Visible in workspace" checked={form.isActive} onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
      </div>
    </ProgramStepHeader>
  );
}
