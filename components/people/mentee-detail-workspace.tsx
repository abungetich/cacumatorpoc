'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, SectionSkeleton } from '@/components/ui/states';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { fetchMenteeDetail, transitionMenteeIntake, type MenteeIntakeAction } from '@/lib/people-actions';
import { hasPermission } from '@/lib/permissions';
import { MenteeDetailActionModal } from '@/components/people/detail/mentee-detail-action-modal';
import { MenteeDetailSections } from '@/components/people/detail/mentee-detail-sections';
import { menteeDetailTabs, stagePill, statusPill, type MenteeDetailTab } from '@/components/people/detail/mentee-detail-shared';
import type { MenteeDetailAction } from '@/lib/api-types';

const actionMap: Record<MenteeDetailAction, MenteeIntakeAction> = {
  MARK_MATCHED: 'MARK_MATCHED',
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
  REOPEN_WAITING: 'REOPEN_WAITING',
};

function isValidTab(value: string | null | undefined): value is MenteeDetailTab {
  return Boolean(value && menteeDetailTabs.some((tab) => tab.id === value));
}

export function MenteeDetailWorkspace({
  menteeProfileId,
  initialTab,
}: {
  menteeProfileId: string;
  initialTab?: string | null;
}) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MenteeDetailTab>(isValidTab(initialTab) ? initialTab : 'overview');
  const [action, setAction] = useState<MenteeDetailAction | null>(null);
  const [reason, setReason] = useState('');

  const canOperate = hasPermission(user?.role, 'mentees.manage');

  const detailQuery = useQuery({
    queryKey: ['mentee-detail', menteeProfileId],
    queryFn: () => fetchMenteeDetail(menteeProfileId),
  });

  const transitionMutation = useMutation({
    mutationFn: (input: { action: MenteeDetailAction; reason?: string }) =>
      transitionMenteeIntake(menteeProfileId, actionMap[input.action], input.reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mentee-detail', menteeProfileId] });
      await queryClient.invalidateQueries({ queryKey: ['people-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['people-mentees'] });
      await queryClient.invalidateQueries({ queryKey: ['mentees'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const item = detailQuery.data?.item;
  const availableActions = useMemo(() => item?.matching.availableActions ?? [], [item]);

  const submitAction = async () => {
    if (!action) return;

    try {
      await transitionMutation.mutateAsync({
        action,
        reason: reason.trim() || undefined,
      });
      pushToast({
        title: 'Mentee updated',
        description: 'The learner record was updated successfully.',
        variant: 'success',
      });
      setAction(null);
      setReason('');
    } catch (error) {
      pushToast({
        title: 'Could not update mentee',
        description: error instanceof Error ? error.message : 'Request failed.',
        variant: 'error',
      });
    }
  };

  const selectTab = (tab: MenteeDetailTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/people/mentees" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
              <ArrowLeft className="h-4 w-4" />Back to mentee intake
            </Link>
            {detailQuery.isLoading ? (
              <SectionSkeleton rows={2} />
            ) : item ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold text-[var(--text)]">{item.snapshot.fullName}</h1>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stagePill(item.snapshot.intakeStage)}`}>{item.snapshot.intakeStage}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(item.snapshot.status)}`}>{item.snapshot.status}</span>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {item.snapshot.email} · {item.snapshot.schoolName} {item.snapshot.partnerName ? `· ${item.snapshot.partnerName}` : ''}
                </p>
              </>
            ) : null}
          </div>

          {canOperate && availableActions.length ? (
            <div className="flex flex-wrap gap-2">
              {availableActions.slice(0, 3).map((entry) => (
                <Button key={entry} variant={entry === 'DEACTIVATE' ? 'danger' : 'secondary'} onClick={() => setAction(entry)}>
                  {entry.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {detailQuery.error ? (
        <Card>
          <ErrorState
            title="Could not load mentee record"
            description={detailQuery.error.message || 'Try refreshing.'}
            onRetry={() => {
              void detailQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      {detailQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={8} />
        </Card>
      ) : null}

      {item ? (
        <>
          <section className="flex flex-wrap gap-2">
            {menteeDetailTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'bg-[var(--surface-2)] text-[var(--text)]'}`}
              >
                {tab.label}
              </button>
            ))}
          </section>

          <MenteeDetailSections activeTab={activeTab} item={item} canOperate={canOperate} openAction={setAction} />
        </>
      ) : null}

      <MenteeDetailActionModal
        action={action}
        reason={reason}
        setReason={setReason}
        pending={transitionMutation.isPending}
        onClose={() => {
          setAction(null);
          setReason('');
        }}
        onSubmit={() => {
          void submitAction();
        }}
      />
    </div>
  );
}
