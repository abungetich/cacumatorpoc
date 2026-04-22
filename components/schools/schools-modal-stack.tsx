import { SchoolFormModal } from '@/components/schools/school-form-modal';
import type { ManagedSchoolRow } from '@/lib/api-types';
import type { SchoolFormState } from '@/lib/schools-workspace';

export function SchoolsModalStack({
  showAddModal,
  editSchool,
  form,
  setForm,
  partnerOptions,
  showPartnerField,
  onCloseAdd,
  onCloseEdit,
  onCreate,
  onUpdate,
  createPending,
  updatePending,
}: {
  showAddModal: boolean;
  editSchool: ManagedSchoolRow | null;
  form: SchoolFormState;
  setForm: React.Dispatch<React.SetStateAction<SchoolFormState>>;
  partnerOptions: Array<{ id: string; name: string; type: string }>;
  showPartnerField: boolean;
  onCloseAdd: () => void;
  onCloseEdit: () => void;
  onCreate: (event: React.FormEvent) => void;
  onUpdate: (event: React.FormEvent) => void;
  createPending: boolean;
  updatePending: boolean;
}) {
  return (
    <>
      <SchoolFormModal
        open={showAddModal}
        mode="create"
        form={form}
        setForm={setForm}
        partnerOptions={partnerOptions}
        showPartnerField={showPartnerField}
        onClose={onCloseAdd}
        onSubmit={onCreate}
        pending={createPending}
      />

      <SchoolFormModal
        open={Boolean(editSchool)}
        mode="edit"
        form={form}
        setForm={setForm}
        partnerOptions={[]}
        showPartnerField={false}
        onClose={onCloseEdit}
        onSubmit={onUpdate}
        pending={updatePending}
        schoolName={editSchool?.name}
      />
    </>
  );
}
