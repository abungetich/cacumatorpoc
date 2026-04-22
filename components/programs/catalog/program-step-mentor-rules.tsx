import type { Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { TomSelectInput } from '@/components/ui/tom-select';
import { educationLevels } from '@/lib/programs-config';
import { mentorIndustryOptions, normalizeIndustrySelection, toggleArrayValue, type ProgramFormState } from '@/lib/programs-catalog';
import { CheckboxGrid, LabeledField, ProgramStepHeader, ToggleCheckbox } from '@/components/programs/catalog/program-form-shared';

export function ProgramStepMentorRules({
  form,
  setForm,
}: {
  form: ProgramFormState;
  setForm: Dispatch<SetStateAction<ProgramFormState>>;
}) {
  return (
    <ProgramStepHeader title="Mentor Requirements" description="Control who can discover and join the mentor pool for this program.">
      <LabeledField label="Minimum Years Experience">
        <Input type="number" min={0} max={60} value={form.minimumYearsExperience} onChange={(event) => setForm((prev) => ({ ...prev, minimumYearsExperience: event.target.value }))} />
      </LabeledField>
      <LabeledField label="Industries">
        <TomSelectInput
          options={mentorIndustryOptions}
          value={form.industries}
          onChange={(value) => setForm((prev) => ({ ...prev, industries: normalizeIndustrySelection(value) }))}
          placeholder="Select industries or choose all"
          isMulti
          appearance="bounded"
        />
      </LabeledField>
      <div className="md:col-span-2">
        <LabeledField label="Professions">
          <Input placeholder="Engineer, Entrepreneur, Counselor" value={form.professions} onChange={(event) => setForm((prev) => ({ ...prev, professions: event.target.value }))} />
        </LabeledField>
      </div>
      <div className="md:col-span-2 space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Preferred Mentor Education Levels</span>
        <CheckboxGrid items={educationLevels} selected={form.mentorEducationLevels} onToggle={(value, checked) => setForm((prev) => ({ ...prev, mentorEducationLevels: toggleArrayValue(prev.mentorEducationLevels, value, checked) }))} />
      </div>
      <div className="md:col-span-2 flex flex-wrap gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text)]">
        <ToggleCheckbox label="Background check required" checked={form.backgroundCheckRequired} onChange={(checked) => setForm((prev) => ({ ...prev, backgroundCheckRequired: checked }))} />
        <ToggleCheckbox label="Safeguarding training required" checked={form.safeguardingTrainingRequired} onChange={(checked) => setForm((prev) => ({ ...prev, safeguardingTrainingRequired: checked }))} />
        <ToggleCheckbox label="Alumni only" checked={form.alumniOnly} onChange={(checked) => setForm((prev) => ({ ...prev, alumniOnly: checked }))} />
      </div>
    </ProgramStepHeader>
  );
}
