'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import type { ProgramWorkspaceRow } from '@/lib/api-types';
import { hasPermission } from '@/lib/permissions';
import { createProgramFromWorkspace, deleteProgramFromWorkspace, fetchProgramsWorkspace, updateProgramFromWorkspace } from '@/lib/programs-actions';
import { ProgramActionModal } from '@/components/programs/catalog/program-action-modal';
import { ProgramCatalogOverview } from '@/components/programs/catalog/program-catalog-overview';
import { ProgramCatalogTable } from '@/components/programs/catalog/program-catalog-table';
import { ProgramFormModal } from '@/components/programs/catalog/program-form-modal';
import {
  emptyProgramForm,
  fromProgramRow,
  toProgramPayload,
  toUpdatePayload,
  type ProgramActionState,
  type ProgramFormState,
  type ProgramWizardStep,
  validateProgramStep,
} from '@/lib/programs-catalog';

export default function ProgramsCatalogPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lifecycleFilter, setLifecycleFilter] =
    useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'ENROLLMENT_OPEN' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ALL');
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramWorkspaceRow | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm);
  const [programWizardStep, setProgramWizardStep] = useState<ProgramWizardStep>('CORE');
  const [programAction, setProgramAction] = useState<ProgramActionState>(null);

  const canManagePrograms = hasPermission(user?.role, 'programs.manage');

  const workspaceQuery = useQuery({
    queryKey: ['programs-workspace', search, schoolFilter, statusFilter, categoryFilter, lifecycleFilter],
    queryFn: () =>
      fetchProgramsWorkspace({
        search,
        schoolId: schoolFilter === 'ALL' ? undefined : schoolFilter,
        status: statusFilter,
        category: categoryFilter,
        lifecycle: lifecycleFilter,
      }),
    enabled: canManagePrograms,
  });

  const schools = useMemo(() => workspaceQuery.data?.schools ?? [], [workspaceQuery.data?.schools]);
  const programs = useMemo(() => workspaceQuery.data?.items ?? [], [workspaceQuery.data?.items]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['programs-workspace'] });
    await queryClient.invalidateQueries({ queryKey: ['school-detail'] });
    await queryClient.invalidateQueries({ queryKey: ['managed-schools'] });
    await queryClient.invalidateQueries({ queryKey: ['matching-intake'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: ProgramFormState) =>
      createProgramFromWorkspace({
        ...toProgramPayload(payload),
        schoolId: payload.schoolId,
        programStatus: 'DRAFT',
      }),
    onSuccess: refresh,
  });

  const updateMutation = useMutation({
    mutationFn: ({ program, payload }: { program: ProgramWorkspaceRow; payload: ProgramFormState }) =>
      updateProgramFromWorkspace(program.id, toProgramPayload(payload)),
    onSuccess: refresh,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ program, nextIsActive }: { program: ProgramWorkspaceRow; nextIsActive: boolean }) =>
      updateProgramFromWorkspace(program.id, toUpdatePayload(program, nextIsActive)),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (program: ProgramWorkspaceRow) => deleteProgramFromWorkspace(program.id),
    onSuccess: refresh,
  });

  const stats = useMemo(() => {
    const total = programs.length;
    const active = programs.filter((program) => program.programStatus === 'ACTIVE').length;
    const enrollmentOpen = programs.filter((program) => program.programStatus === 'ENROLLMENT_OPEN').length;
    const rolling = programs.filter((program) => program.rollingProgram).length;
    const linkedMentorships = programs.reduce((sum, program) => sum + program.mentorshipCount, 0);
    return { total, active, enrollmentOpen, rolling, linkedMentorships };
  }, [programs]);

  const lifecycleBreakdown = useMemo(
    () =>
      ['DRAFT', 'PUBLISHED', 'ENROLLMENT_OPEN', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((status) => ({
        status,
        count: programs.filter((program) => program.programStatus === status).length,
      })),
    [programs],
  );

  const openCreateModal = () => {
    setEditingProgram(null);
    setProgramForm({
      ...emptyProgramForm,
      schoolId: '',
      targetSchoolIds: [],
    });
    setProgramWizardStep('CORE');
    setShowProgramModal(true);
  };

  const openEditModal = (program: ProgramWorkspaceRow) => {
    setEditingProgram(program);
    setProgramForm(fromProgramRow(program));
    setProgramWizardStep('CORE');
    setShowProgramModal(true);
  };

  if (!canManagePrograms) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only admin roles can manage programs." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProgramCatalogOverview stats={stats} lifecycleBreakdown={lifecycleBreakdown} onCreate={openCreateModal} />

      <ProgramCatalogTable
        search={search}
        setSearch={setSearch}
        schoolFilter={schoolFilter}
        setSchoolFilter={setSchoolFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        lifecycleFilter={lifecycleFilter}
        setLifecycleFilter={setLifecycleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        schools={schools}
        programs={programs}
        isLoading={workspaceQuery.isLoading}
        error={workspaceQuery.error instanceof Error ? workspaceQuery.error : null}
        onRefresh={() => void workspaceQuery.refetch()}
        onEdit={openEditModal}
        onToggle={(program) => setProgramAction({ action: 'toggle', program, nextIsActive: !program.isActive })}
        onDelete={(program) => setProgramAction({ action: 'delete', program })}
      />

      <ProgramFormModal
        open={showProgramModal}
        editing={Boolean(editingProgram)}
        form={programForm}
        schools={schools}
        step={programWizardStep}
        onClose={() => {
          setShowProgramModal(false);
          setProgramWizardStep('CORE');
        }}
        setStep={setProgramWizardStep}
        setForm={setProgramForm}
        onStepError={(message) => {
          pushToast({
            title: 'Step incomplete',
            description: message,
            variant: 'error',
          });
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (event) => {
          event.preventDefault();
          const finalError = validateProgramStep('REVIEW', programForm);
          if (finalError) {
            pushToast({
              title: 'Program form incomplete',
              description: finalError,
              variant: 'error',
            });
            return;
          }

          try {
            if (editingProgram) {
              await updateMutation.mutateAsync({ program: editingProgram, payload: programForm });
              pushToast({ title: 'Program Updated', description: 'Program changes saved.', variant: 'success' });
            } else {
              await createMutation.mutateAsync(programForm);
              pushToast({ title: 'Program Added', description: 'Program created successfully.', variant: 'success' });
            }
            setShowProgramModal(false);
            setProgramWizardStep('CORE');
          } catch (error) {
            pushToast({
              title: editingProgram ? 'Could Not Update Program' : 'Could Not Add Program',
              description: error instanceof Error ? error.message : 'Request failed.',
              variant: 'error',
            });
          }
        }}
      />

      <ProgramActionModal
        action={programAction}
        isSaving={toggleMutation.isPending || deleteMutation.isPending}
        onClose={() => setProgramAction(null)}
        onConfirm={async () => {
          if (!programAction) {
            return;
          }

          try {
            if (programAction.action === 'delete') {
              await deleteMutation.mutateAsync(programAction.program);
              pushToast({ title: 'Program Deleted', description: 'Program removed successfully.', variant: 'success' });
            } else {
              await toggleMutation.mutateAsync({
                program: programAction.program,
                nextIsActive: programAction.nextIsActive,
              });
              pushToast({
                title: programAction.nextIsActive ? 'Program Visible' : 'Program Hidden',
                description: 'Workspace visibility updated.',
                variant: 'success',
              });
            }
            setProgramAction(null);
          } catch (error) {
            pushToast({
              title: programAction.action === 'delete' ? 'Could Not Delete Program' : 'Could Not Update Program',
              description: error instanceof Error ? error.message : 'Request failed.',
              variant: 'error',
            });
          }
        }}
      />
    </div>
  );
}
