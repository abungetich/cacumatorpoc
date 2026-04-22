import { ArrowLeftRight, BadgeCheck, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchCandidateItem } from "@/lib/api-types";

function scoreTone(score: number) {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 70) return "bg-sky-100 text-sky-800";
  if (score >= 55) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export function MatchingComparePanel({
  items,
  selectedMentorUserId,
  onSelect,
  onRemove,
}: {
  items: MatchCandidateItem[];
  selectedMentorUserId: string | null;
  onSelect: (mentorUserId: string) => void;
  onRemove: (mentorUserId: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Compare suggestions</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Compare the top mentor options side by side before deciding which one to use in the proposal.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text)]">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {items.length} selected
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {items.map((candidate) => {
          const selected = selectedMentorUserId === candidate.mentorUserId;

          return (
            <div key={candidate.mentorUserId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{candidate.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{candidate.school}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${scoreTone(candidate.score)}`}>
                  {candidate.score}/100
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--text)]">{candidate.fitLabel}</span>
                <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--text)]">
                  <Users className="mr-1 inline h-3.5 w-3.5" />
                  {candidate.capacity.current}/{candidate.capacity.max}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Top reasons</p>
                  <ul className="mt-2 space-y-2 text-[var(--text)]">
                    {candidate.matchReasons.slice(0, 2).map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Top risks</p>
                  {candidate.riskFlags.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-[var(--text)]">
                      {candidate.riskFlags.slice(0, 2).map((risk) => (
                        <li key={risk} className="flex gap-2">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[var(--muted)]">No immediate risks surfaced.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4">
                <Button variant={selected ? "primary" : "secondary"} size="sm" className="flex-1" onClick={() => onSelect(candidate.mentorUserId)}>
                  {selected ? "Selected" : "Use this mentor"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onRemove(candidate.mentorUserId)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
