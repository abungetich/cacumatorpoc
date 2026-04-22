'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MenteeDetailAction } from '@/lib/api-types';
import { actionCopy } from '@/components/people/detail/mentee-detail-shared';

export function MenteeDetailActionModal({
  action,
  reason,
  setReason,
  pending,
  onClose,
  onSubmit,
}: {
  action: MenteeDetailAction | null;
  reason: string;
  setReason: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!action) return null;

  const copy = actionCopy(action);
  const Icon = copy.icon;

  return (
    <Modal
      open
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--primary)]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--text)]">{copy.title}</p>
            <p className="text-sm leading-6 text-[var(--muted)]">{copy.description}</p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">Context note</span>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-[120px]"
            placeholder={action === 'DEACTIVATE' ? 'Optional reason for deactivation' : 'Optional operational note'}
          />
        </label>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={action === 'DEACTIVATE' ? 'danger' : 'primary'} onClick={onSubmit} disabled={pending}>
            {pending ? 'Saving...' : copy.title}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
