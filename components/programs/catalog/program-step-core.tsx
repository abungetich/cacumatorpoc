import type { Dispatch, SetStateAction } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TomSelectInput } from '@/components/ui/tom-select';
import { programCategories, programThemes, programTypes } from '@/lib/programs-config';
import {
  addUniqueTags,
  getSuggestedThemes,
  normalizeTagSelection,
  programThemeOptions,
  type ProgramFormState,
} from '@/lib/programs-catalog';
import { LabeledField, LabeledSelect, ProgramStepHeader, type SchoolOption } from '@/components/programs/catalog/program-form-shared';

export function ProgramStepCore({
  form,
  schools,
  setForm,
}: {
  form: ProgramFormState;
  schools: SchoolOption[];
  setForm: Dispatch<SetStateAction<ProgramFormState>>;
}) {
  return (
    <ProgramStepHeader title="Core Identity" description="Name the program and define the operating model.">
      <LabeledField label="Owning School">
        <TomSelectInput
          options={schools.map((school) => ({ value: school.id, label: school.name }))}
          value={form.schoolId}
          onChange={(value) => setForm((prev) => ({ ...prev, schoolId: String(value || '') }))}
          placeholder="Optional owner school"
          appearance="bounded"
        />
      </LabeledField>
      <LabeledField label="Attached Schools">
        <TomSelectInput
          options={schools.map((school) => ({ value: school.id, label: school.name }))}
          value={form.targetSchoolIds}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              targetSchoolIds: Array.isArray(value) ? value : value ? [value] : [],
            }))
          }
          placeholder="Attach one or more schools"
          isMulti
          appearance="bounded"
        />
      </LabeledField>
      <LabeledField label="Program Name" required>
        <Input required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
      </LabeledField>
      <LabeledSelect label="Program Type" value={form.programType} onChange={(value) => setForm((prev) => ({ ...prev, programType: value as ProgramFormState['programType'] }))} options={programTypes} />
      <LabeledSelect label="Category" value={form.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value as ProgramFormState['category'] }))} options={programCategories} />
      <div className="md:col-span-2">
        <LabeledField label="Description" required>
          <textarea
            required
            className="min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </LabeledField>
      </div>
      <div className="md:col-span-2">
        <LabeledField label="Themes">
          <div className="space-y-3">
            <TomSelectInput
              options={programThemeOptions}
              value={form.themes}
              onChange={(value) => setForm((prev) => ({ ...prev, themes: normalizeTagSelection(value) }))}
              placeholder="Search or create theme tags"
              isMulti
              appearance="bounded"
              allowCreate
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    themes: addUniqueTags(prev.themes, getSuggestedThemes(prev)),
                  }))
                }
                disabled={!form.name.trim() && !form.description.trim()}
              >
                <Sparkles className="h-4 w-4" />
                Suggest from description
              </Button>
              <p className="flex items-center text-xs text-[var(--muted)]">Use the bank below or add your own tags for mentor discovery.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_4%,white),var(--surface))] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Suggested Theme Bank</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {programThemes.map((theme) => {
                  const selected = form.themes.includes(theme);
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          themes: selected ? prev.themes.filter((item) => item !== theme) : [...prev.themes, theme],
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-contrast)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] hover:text-[var(--primary)]'
                      }`}
                    >
                      {theme}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </LabeledField>
      </div>
    </ProgramStepHeader>
  );
}
