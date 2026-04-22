import { Power, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { ProgramActionState } from '@/lib/programs-catalog';

export function ProgramActionModal({
  action,
  isSaving,
  onClose,
  onConfirm,
}: {
  action: ProgramActionState;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={Boolean(action)}
      onClose={onClose}
      title={action?.action === 'delete' ? 'Delete Program' : 'Update Program Visibility'}
      description={
        action?.action === 'delete'
          ? 'Delete this program permanently if no mentorships are linked.'
          : 'Show or hide this program from the workspace without changing its lifecycle.'
      }
      icon={action?.action === 'delete' ? <Trash2 className="h-4 w-4" /> : <Power className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text)]">
          {action?.action === 'delete'
            ? `Delete ${action?.program.name}?`
            : `${action?.nextIsActive ? 'Show' : 'Hide'} ${action?.program.name} in the workspace?`}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant={action?.action === 'delete' ? 'danger' : 'primary'} disabled={isSaving || !action} onClick={onConfirm}>
            {isSaving ? 'Saving...' : action?.action === 'delete' ? 'Delete' : action?.nextIsActive ? 'Show' : 'Hide'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
