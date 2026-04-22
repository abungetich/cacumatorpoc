import type { FormEvent } from 'react';
import { Building2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { SchoolFormFields } from '@/components/schools/schools-shared';
import type { SchoolFormState } from '@/lib/schools-workspace';

export function SchoolFormModal({
  open,
  mode,
  form,
  setForm,
  partnerOptions,
  showPartnerField,
  onClose,
  onSubmit,
  pending,
  schoolName,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  form: SchoolFormState;
  setForm: React.Dispatch<React.SetStateAction<SchoolFormState>>;
  partnerOptions: Array<{ id: string; name: string; type: string }>;
  showPartnerField: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  schoolName?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Add School' : 'Edit School'}
      description={mode === 'create' ? 'Create a school record directly from this page.' : schoolName ? `Update details for ${schoolName}` : undefined}
      size="xl"
      icon={mode === 'create' ? <Building2 className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <SchoolFormFields
          form={form}
          setForm={setForm}
          showPartnerField={showPartnerField}
          partnerOptions={partnerOptions}
          partnerFieldDisabled={mode === 'edit'}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Saving...' : mode === 'create' ? 'Create School' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
