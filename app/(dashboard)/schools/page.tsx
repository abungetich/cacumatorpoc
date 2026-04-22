'use client';

import Swal from 'sweetalert2';
import { SchoolsFilters } from '@/components/schools/schools-filters';
import { SchoolsModalStack } from '@/components/schools/schools-modal-stack';
import { SchoolsAccessRestricted, SchoolsOverview } from '@/components/schools/schools-overview';
import { SchoolsTable } from '@/components/schools/schools-table';
import { useSchoolsWorkspace } from '@/components/schools/use-schools-workspace';

export default function SchoolsPage() {
  const workspace = useSchoolsWorkspace();

  if (!workspace.canManageSchools) {
    return <SchoolsAccessRestricted />;
  }

  return (
    <div className="space-y-6">
      <SchoolsOverview canOnboard={workspace.canOnboard} onAddSchool={workspace.openAddModal} stats={workspace.stats} />

      <SchoolsFilters
        globalFilter={workspace.globalFilter}
        setGlobalFilter={workspace.setGlobalFilter}
        typeFilter={workspace.typeFilter}
        setTypeFilter={workspace.setTypeFilter}
        partnerFilter={workspace.partnerFilter}
        setPartnerFilter={workspace.setPartnerFilter}
        accreditationFilter={workspace.accreditationFilter}
        setAccreditationFilter={workspace.setAccreditationFilter}
        partnerOptions={workspace.partnerOptions}
        onReset={workspace.clearFilters}
      />

      <SchoolsTable
        rows={workspace.filteredRows}
        sorting={workspace.sorting}
        setSorting={workspace.setSorting}
        globalFilter={workspace.globalFilter}
        setGlobalFilter={workspace.setGlobalFilter}
        canDelete={workspace.canDelete}
        isLoading={workspace.schoolsQuery.isLoading}
        error={(workspace.schoolsQuery.error as Error | null) ?? null}
        onRetry={() => {
          void workspace.schoolsQuery.refetch();
        }}
        onEdit={workspace.openEditModal}
        onDelete={async (row) => {
          const result = await Swal.fire({
            title: 'Delete this school?',
            text: `${row.name} will be permanently removed if no linked records exist.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#b91c1c',
            confirmButtonText: 'Delete school',
          });

          if (!result.isConfirmed) {
            return;
          }

          await workspace.handleDelete(row);
        }}
      />

      <SchoolsModalStack
        showAddModal={workspace.showAddModal}
        editSchool={workspace.editSchool}
        form={workspace.form}
        setForm={workspace.setForm}
        partnerOptions={workspace.partnersQuery.data?.items ?? []}
        showPartnerField={workspace.showPartnerField}
        onCloseAdd={workspace.closeAddModal}
        onCloseEdit={workspace.closeEditModal}
        onCreate={workspace.handleCreate}
        onUpdate={workspace.handleUpdate}
        createPending={workspace.createPending}
        updatePending={workspace.updatePending}
      />
    </div>
  );
}
