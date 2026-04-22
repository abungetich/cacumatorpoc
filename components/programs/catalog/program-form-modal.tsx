import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { programWizardSteps, type ProgramFormState, type ProgramWizardStep, validateProgramStep } from '@/lib/programs-catalog';
import { ProgramStepCore } from '@/components/programs/catalog/program-step-core';
import { ProgramStepDelivery } from '@/components/programs/catalog/program-step-delivery';
import { ProgramStepMentorRules } from '@/components/programs/catalog/program-step-mentor-rules';
import { ProgramStepReview } from '@/components/programs/catalog/program-step-review';
import { ProgramStepTargeting } from '@/components/programs/catalog/program-step-targeting';
import type { SchoolOption } from '@/components/programs/catalog/program-form-shared';

export function ProgramFormModal({
  open,
  editing,
  form,
  schools,
  step,
  onClose,
  setStep,
  setForm,
  onStepError,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  editing: boolean;
  form: ProgramFormState;
  schools: SchoolOption[];
  step: ProgramWizardStep;
  onClose: () => void;
  setStep: Dispatch<SetStateAction<ProgramWizardStep>>;
  setForm: Dispatch<SetStateAction<ProgramFormState>>;
  onStepError: (message: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Program' : 'Add Program'}
      description="Define program structure, targeting, mentor requirements, and lifecycle."
      icon={<BookOpen className="h-4 w-4" />}
      size="2xl"
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="grid gap-3 md:grid-cols-5">
            {programWizardSteps.map((wizardStep, index) => {
              const currentIndex = programWizardSteps.findIndex((item) => item.id === step);
              const isCurrent = wizardStep.id === step;
              const isComplete = index < currentIndex;

              return (
                <button
                  key={wizardStep.id}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isCurrent
                      ? 'border-[var(--primary)] bg-[var(--surface)] shadow-[0_12px_24px_rgba(0,0,0,0.06)]'
                      : isComplete
                        ? 'border-[color-mix(in_srgb,var(--primary)_24%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,white)]'
                        : 'border-[var(--border)] bg-[var(--surface)]/70'
                  }`}
                  onClick={() => setStep(wizardStep.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isCurrent || isComplete ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'bg-[var(--surface-2)] text-[var(--muted)]'}`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{wizardStep.label}</p>
                      <p className="text-xs text-[var(--muted)]">{wizardStep.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {step === 'CORE' ? <ProgramStepCore form={form} schools={schools} setForm={setForm} /> : null}
        {step === 'DELIVERY' ? <ProgramStepDelivery editing={editing} form={form} setForm={setForm} /> : null}
        {step === 'TARGETING' ? <ProgramStepTargeting form={form} setForm={setForm} /> : null}
        {step === 'MENTOR_RULES' ? <ProgramStepMentorRules form={form} setForm={setForm} /> : null}
        {step === 'REVIEW' ? <ProgramStepReview form={form} schools={schools} /> : null}

        <div className="sticky bottom-0 flex justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)]/95 pt-4 backdrop-blur">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const currentIndex = programWizardSteps.findIndex((item) => item.id === step);
                if (currentIndex > 0) {
                  setStep(programWizardSteps[currentIndex - 1].id);
                }
              }}
              disabled={step === 'CORE'}
            >
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            {step !== 'REVIEW' ? (
              <Button
                type="button"
                onClick={() => {
                  const error = validateProgramStep(step, form);
                  if (error) {
                    onStepError(error);
                    return;
                  }
                  const currentIndex = programWizardSteps.findIndex((item) => item.id === step);
                  if (currentIndex < programWizardSteps.length - 1) {
                    setStep(programWizardSteps[currentIndex + 1].id);
                  }
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Program'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
