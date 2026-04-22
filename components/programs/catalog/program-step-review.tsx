import { formatEnumLabel, type ProgramFormState } from '@/lib/programs-catalog';
import { ProgramStepHeader, ReviewBlock, ReviewRow, type SchoolOption } from '@/components/programs/catalog/program-form-shared';

export function ProgramStepReview({
  form,
  schools,
}: {
  form: ProgramFormState;
  schools: SchoolOption[];
}) {
  return (
    <ProgramStepHeader title="Review Program" description="Confirm the program setup before saving it to the catalog.">
      <ReviewBlock title="Core">
        <ReviewRow label="Program Name" value={form.name || '-'} />
        <ReviewRow label="Owner School" value={schools.find((school) => school.id === form.schoolId)?.name ?? 'No owner school'} />
        <ReviewRow label="Attached Schools" value={form.targetSchoolIds.length ? form.targetSchoolIds.map((id) => schools.find((school) => school.id === id)?.name ?? id).join(', ') : 'None'} />
        <ReviewRow label="Type / Category" value={`${formatEnumLabel(form.programType)} / ${formatEnumLabel(form.category)}`} />
        <ReviewRow label="Themes" value={form.themes.length ? form.themes.join(', ') : 'None'} />
        <ReviewRow label="Description" value={form.description || '-'} />
      </ReviewBlock>
      <ReviewBlock title="Delivery">
        <ReviewRow label="Status" value={formatEnumLabel(form.programStatus)} />
        <ReviewRow label="Format" value={formatEnumLabel(form.programFormat)} />
        <ReviewRow label="Cadence" value={`${formatEnumLabel(form.sessionFrequency)} / ${form.sessionDurationMinutes || '-'} min`} />
        <ReviewRow label="Duration" value={`${form.durationMonths || '-'} months`} />
        <ReviewRow label="Schedule" value={`${form.startDate || '-'} to ${form.endDate || '-'}`} />
        <ReviewRow label="Deadline" value={form.applicationDeadline || 'Not set'} />
      </ReviewBlock>
      <ReviewBlock title="Targeting">
        <ReviewRow label="Age Groups" value={form.targetAgeGroups.length ? form.targetAgeGroups.map(formatEnumLabel).join(', ') : 'Open'} />
        <ReviewRow label="Education Levels" value={form.targetEducationLevels.map(formatEnumLabel).join(', ')} />
        <ReviewRow label="Scope" value={formatEnumLabel(form.geographicScope)} />
        <ReviewRow label="Country" value="Kenya" />
        <ReviewRow label="Counties" value={form.targetCounties.length ? form.targetCounties.join(', ') : 'None'} />
        <ReviewRow label="Objectives" value={form.objectives || '-'} />
      </ReviewBlock>
      <ReviewBlock title="Mentor Rules">
        <ReviewRow label="Min Experience" value={`${form.minimumYearsExperience || '0'} years`} />
        <ReviewRow label="Industries" value={form.industries.length === 0 ? 'None' : form.industries.includes('ALL') ? 'All industries' : form.industries.join(', ')} />
        <ReviewRow label="Professions" value={form.professions || 'None'} />
        <ReviewRow label="Education Preferences" value={form.mentorEducationLevels.length ? form.mentorEducationLevels.map(formatEnumLabel).join(', ') : 'None'} />
        <ReviewRow label="Background Check" value={form.backgroundCheckRequired ? 'Required' : 'Not required'} />
        <ReviewRow label="Safeguarding Training" value={form.safeguardingTrainingRequired ? 'Required' : 'Not required'} />
        <ReviewRow label="Alumni Only" value={form.alumniOnly ? 'Yes' : 'No'} />
      </ReviewBlock>
    </ProgramStepHeader>
  );
}
