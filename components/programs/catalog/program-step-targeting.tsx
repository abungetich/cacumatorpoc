import type { Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { TomSelectInput } from '@/components/ui/tom-select';
import { educationLevels, geographicScopes, targetAgeGroups } from '@/lib/programs-config';
import { countyOptions, handleGeographicScopeChange, toggleArrayValue, type ProgramFormState } from '@/lib/programs-catalog';
import { CheckboxGrid, LabeledField, LabeledSelect, ProgramStepHeader } from '@/components/programs/catalog/program-form-shared';

export function ProgramStepTargeting({
  form,
  setForm,
}: {
  form: ProgramFormState;
  setForm: Dispatch<SetStateAction<ProgramFormState>>;
}) {
  return (
    <ProgramStepHeader title="Target Group" description="Define the mentees and geography this program is meant for.">
      <div className="md:col-span-2 space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Target Age Groups</span>
        <CheckboxGrid items={targetAgeGroups} selected={form.targetAgeGroups} onToggle={(value, checked) => setForm((prev) => ({ ...prev, targetAgeGroups: toggleArrayValue(prev.targetAgeGroups, value, checked) }))} />
      </div>
      <div className="md:col-span-2 space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Education Levels *</span>
        <CheckboxGrid items={educationLevels} selected={form.targetEducationLevels} onToggle={(value, checked) => setForm((prev) => ({ ...prev, targetEducationLevels: toggleArrayValue(prev.targetEducationLevels, value, checked) }))} />
      </div>
      <LabeledSelect label="Geographic Scope" value={form.geographicScope} onChange={(value) => handleGeographicScopeChange(value as ProgramFormState['geographicScope'], setForm)} options={geographicScopes} />
      <div className="md:col-span-2">
        <LabeledField label="Target Country">
          <div className="flex h-11 items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-medium text-[var(--text)]">Kenya</div>
          <p className="mt-1 text-xs text-[var(--muted)]">Country targeting is currently fixed to Kenya for mentorship programs on this platform.</p>
        </LabeledField>
      </div>
      {form.geographicScope === 'COUNTY' || form.geographicScope === 'REGIONAL' ? (
        <div className="md:col-span-2">
          <LabeledField label={form.geographicScope === 'COUNTY' ? 'Target Counties' : 'Regional County Cluster'}>
            <TomSelectInput
              options={countyOptions}
              value={form.targetCounties}
              onChange={(value) => setForm((prev) => ({ ...prev, targetCounties: Array.isArray(value) ? value : value ? [value] : [] }))}
              placeholder="Select one or more Kenyan counties"
              isMulti
              appearance="bounded"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              {form.geographicScope === 'COUNTY' ? 'Choose the counties this program directly serves.' : 'Use counties to define the regional cluster inside Kenya.'}
            </p>
          </LabeledField>
        </div>
      ) : null}
      <div className="md:col-span-2">
        <LabeledField label="Program Objectives" required>
          <Input required placeholder="Career clarity, interview readiness, networking confidence" value={form.objectives} onChange={(event) => setForm((prev) => ({ ...prev, objectives: event.target.value }))} />
        </LabeledField>
      </div>
    </ProgramStepHeader>
  );
}
