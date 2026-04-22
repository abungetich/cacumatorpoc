'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { hasPermission } from '@/lib/permissions';
import type { ManagedSchoolRow, PartnersResponse } from '@/lib/api-types';
import { apiFetch } from '@/lib/api-client';
import {
  createSchool,
  deleteSchool,
  fetchManagedSchools,
  type SchoolPayload,
  updateSchool,
} from '@/lib/school-management-actions';
import {
  accreditationBucket,
  buildSchoolPartnerOptions,
  buildSchoolStats,
  emptySchoolForm,
  toSchoolPayload,
  type SchoolFormState,
  type SchoolType,
} from '@/lib/schools-workspace';

export function useSchoolsWorkspace() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { user } = useAuth();

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<SchoolType | 'ALL'>('ALL');
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [accreditationFilter, setAccreditationFilter] = useState<'ALL' | 'ACCREDITED' | 'PENDING' | 'NONE' | 'OTHER'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSchool, setEditSchool] = useState<ManagedSchoolRow | null>(null);
  const [form, setForm] = useState<SchoolFormState>(emptySchoolForm);

  const canManageSchools = hasPermission(user?.role, 'schools.manage');
  const canOnboard = hasPermission(user?.role, 'schools.onboard');
  const canDelete = hasPermission(user?.role, 'schools.onboard');
  const showPartnerField = hasPermission(user?.role, 'schools.onboard') && user?.role === 'PLATFORM_ADMIN';

  const schoolsQuery = useQuery({
    queryKey: ['managed-schools'],
    queryFn: fetchManagedSchools,
    enabled: canManageSchools,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners-for-school-modal'],
    queryFn: () => apiFetch<PartnersResponse>('/api/protected/partners'),
    enabled: canOnboard,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['managed-schools'] });
    await queryClient.invalidateQueries({ queryKey: ['schools'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: SchoolPayload) => createSchool(payload),
    onSuccess: refresh,
  });

  const updateMutation = useMutation({
    mutationFn: ({ schoolId, payload }: { schoolId: string; payload: SchoolPayload }) => updateSchool(schoolId, payload),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (schoolId: string) => deleteSchool(schoolId),
    onSuccess: refresh,
  });

  const rows = useMemo(() => schoolsQuery.data?.items ?? [], [schoolsQuery.data?.items]);
  const stats = useMemo(() => buildSchoolStats(rows), [rows]);
  const partnerOptions = useMemo(() => buildSchoolPartnerOptions(rows), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((school) => {
      if (typeFilter !== 'ALL' && school.type !== typeFilter) return false;
      const partnerName = school.partner?.name ?? 'Independent';
      if (partnerFilter !== 'ALL' && partnerName !== partnerFilter) return false;
      if (accreditationFilter !== 'ALL' && accreditationBucket(school.accreditationStatus) !== accreditationFilter) return false;
      return true;
    });
  }, [rows, typeFilter, partnerFilter, accreditationFilter]);

  const clearFilters = () => {
    setGlobalFilter('');
    setTypeFilter('ALL');
    setPartnerFilter('ALL');
    setAccreditationFilter('ALL');
  };

  const openAddModal = () => {
    setForm(emptySchoolForm);
    setShowAddModal(true);
  };

  const openEditModal = (school: ManagedSchoolRow) => {
    setEditSchool(school);
    setForm({
      name: school.name,
      type: school.type,
      address: school.address,
      phone: school.phone,
      email: school.email,
      principalName: school.principalName,
      principalEmail: school.principalEmail,
      studentPopulation: school.studentPopulation ? String(school.studentPopulation) : '',
      accreditationStatus: school.accreditationStatus ?? '',
      partnerId: school.partner?.id ?? '',
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setForm(emptySchoolForm);
  };

  const closeEditModal = () => {
    setEditSchool(null);
  };

  const handleDelete = async (school: ManagedSchoolRow) => {
    try {
      await deleteMutation.mutateAsync(school.id);
      pushToast({ title: 'School Deleted', description: `${school.name} was removed.`, variant: 'success' });
    } catch (error) {
      pushToast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Could not delete school.',
        variant: 'error',
      });
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = await createMutation.mutateAsync(toSchoolPayload(form));
      pushToast({ title: 'School Added', description: `${payload.school.name} created successfully.`, variant: 'success' });
      closeAddModal();
    } catch (error) {
      pushToast({
        title: 'Add School Failed',
        description: error instanceof Error ? error.message : 'Request failed.',
        variant: 'error',
      });
    }
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editSchool) return;
    try {
      await updateMutation.mutateAsync({ schoolId: editSchool.id, payload: toSchoolPayload(form) });
      pushToast({ title: 'School Updated', description: `${form.name} was updated.`, variant: 'success' });
      closeEditModal();
    } catch (error) {
      pushToast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Request failed.',
        variant: 'error',
      });
    }
  };

  return {
    user,
    canManageSchools,
    canOnboard,
    canDelete,
    showPartnerField,
    rows,
    filteredRows,
    stats,
    partnerOptions,
    sorting,
    setSorting,
    globalFilter,
    setGlobalFilter,
    typeFilter,
    setTypeFilter,
    partnerFilter,
    setPartnerFilter,
    accreditationFilter,
    setAccreditationFilter,
    clearFilters,
    schoolsQuery,
    partnersQuery,
    showAddModal,
    editSchool,
    form,
    setForm,
    openAddModal,
    openEditModal,
    closeAddModal,
    closeEditModal,
    handleDelete,
    handleCreate,
    handleUpdate,
    createPending: createMutation.isPending,
    updatePending: updateMutation.isPending,
  };
}
