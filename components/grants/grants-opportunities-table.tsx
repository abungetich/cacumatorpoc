import Link from 'next/link';
import { Boxes, FileSpreadsheet, Link2, Paperclip, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { GrantOpportunityRow } from '@/lib/api-types';
import {
  fitBand,
  formatDate,
  formatEnum,
  formatMinor,
  opportunityPill,
  type ApplicationForm,
  type ScoreForm,
  emptyApplication,
} from '@/lib/grants-workspace';

type GrantsOpportunitiesTableProps = {
  opportunities: GrantOpportunityRow[];
  autoPriorityEnabled: boolean;
  onAutoPriorityChange: (next: boolean | ((prev: boolean) => boolean)) => void;
  onOpenScoreModal: (payload: ScoreForm) => void;
  onOpenApplicationModal: (payload: ApplicationForm) => void;
};

export function GrantsOpportunitiesTable({
  opportunities,
  autoPriorityEnabled,
  onAutoPriorityChange,
  onOpenScoreModal,
  onOpenApplicationModal,
}: GrantsOpportunitiesTableProps) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">Discovery Opportunities</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {autoPriorityEnabled ? 'Auto-priority: fit then deadline' : 'Default order'}
          </span>
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => onAutoPriorityChange((prev) => !prev)}>
            {autoPriorityEnabled ? 'Turn Off' : 'Turn On'}
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="max-h-[32vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3 font-semibold">Opportunity</th>
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Deadline</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Fit</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--muted)]" colSpan={7}>
                    No opportunities yet.
                  </td>
                </tr>
              ) : (
                opportunities.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-3 py-3">
                      <Link href={`/grants/${item.id}`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)] hover:underline">
                        {item.title}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">{item.funderName}</p>
                      {item.description ? <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{item.description}</p> : null}
                      <p className="text-xs text-[var(--muted)]">{item.schoolName}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">
                      <p>{item.sourceType ? formatEnum(item.sourceType) : 'Unspecified'}</p>
                      {item.sourceReference ? <p className="mt-1">{item.sourceReference}</p> : null}
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[var(--primary)] hover:underline">
                          <Link2 className="h-3.5 w-3.5" />
                          Source
                        </a>
                      ) : null}
                      {item.attachmentUrl && item.attachmentName ? (
                        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[var(--primary)] hover:underline">
                          <Paperclip className="h-3.5 w-3.5" />
                          {item.attachmentName}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${opportunityPill(item.status)}`}>
                        {formatEnum(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatDate(item.deadline)}</td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatMinor(item.amountMinor, item.currencyCode)}</td>
                    <td className="px-3 py-3 text-xs">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${fitBand(item.fitScore).className}`}>
                        {fitBand(item.fitScore).label}
                      </span>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">Scored: {formatDate(item.scoredAt)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          title="Score opportunity"
                          aria-label="Score opportunity"
                          onClick={() =>
                            onOpenScoreModal({
                              opportunityId: item.id,
                              title: item.title,
                              timelineScore: item.fitMatrix?.timelineScore ?? 3,
                              amountScore: item.fitMatrix?.amountScore ?? 3,
                              areaScore: item.fitMatrix?.areaScore ?? 3,
                              eligibilityScore: item.fitMatrix?.eligibilityScore ?? 3,
                              readinessScore: item.fitMatrix?.readinessScore ?? 3,
                              notes: item.fitMatrix?.notes ?? '',
                            })
                          }
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          title="Create application"
                          aria-label="Create application"
                          onClick={() =>
                            onOpenApplicationModal({
                              ...emptyApplication,
                              opportunityId: item.id,
                              title: `Application - ${item.title}`,
                              currencyCode: item.currencyCode,
                              amountRequestedMinor: item.amountMinor,
                            })
                          }
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <Link
                          href={`/grants/${item.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text)] transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          title="Manage lots"
                          aria-label="Manage lots"
                        >
                          <Boxes className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
