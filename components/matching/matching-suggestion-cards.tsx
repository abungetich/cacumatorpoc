import { AlertTriangle, BadgeCheck, CalendarClock, ChevronRight, ShieldAlert, Sparkles, Users } from "lucide-react";
import type { MatchCandidateItem } from "@/lib/api-types";

function scoreTone(score: number) {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 70) return "bg-sky-100 text-sky-800";
  if (score >= 55) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export function MatchingSuggestionCards({
  items,
  selectedMentorUserId,
  comparedMentorUserIds,
  onSelect,
  onToggleCompare,
}: {
  items: MatchCandidateItem[];
  selectedMentorUserId: string | null;
  comparedMentorUserIds: string[];
  onSelect: (mentorUserId: string) => void;
  onToggleCompare: (mentorUserId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-sm text-[var(--muted)]">
        No eligible mentors found for the selected mentee.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((candidate, index) => {
        const selected = selectedMentorUserId === candidate.mentorUserId;
        const compared = comparedMentorUserIds.includes(candidate.mentorUserId);
        return (
          <button
            key={candidate.mentorUserId}
            type="button"
            onClick={() => onSelect(candidate.mentorUserId)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selected
                ? "border-[var(--primary)] bg-[var(--surface-2)]/70 shadow-[0_8px_18px_rgba(85,34,136,0.10)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]/35"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--surface-2)] px-2 text-[11px] font-semibold text-[var(--muted)]">
                    #{index + 1}
                  </span>
                  <p className="text-base font-semibold text-[var(--text)]">{candidate.name}</p>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{candidate.school}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${scoreTone(candidate.score)}`}>
                  {candidate.score}/100
                </span>
                <span className="inline-flex rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px] font-semibold text-[var(--text)]">
                  {candidate.fitLabel}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Why this match
                </div>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                  {candidate.matchReasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Watch-outs
                </div>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                  {candidate.riskFlags.length === 0 ? (
                    <li className="flex gap-2 text-emerald-700">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>No immediate matching risks surfaced.</span>
                    </li>
                  ) : (
                    candidate.riskFlags.map((risk) => (
                      <li key={risk} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>{risk}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
                <Users className="h-3.5 w-3.5" />
                Capacity {candidate.capacity.current}/{candidate.capacity.max}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Base {candidate.baseScore}/100
              </span>
              {candidate.priorDeclineCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {candidate.priorDeclineCount} prior decline{candidate.priorDeclineCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
              <div className="grid gap-1 text-[11px] text-[var(--muted)] sm:grid-cols-5 sm:gap-3">
                <span>Interest {candidate.scoreBreakdown.interests}%</span>
                <span>Format {candidate.scoreBreakdown.format}%</span>
                <span>Availability {candidate.scoreBreakdown.availability}%</span>
                <span>Capacity {candidate.scoreBreakdown.capacity}%</span>
                <span>Context {candidate.scoreBreakdown.context}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleCompare(candidate.mentorUserId);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    compared
                      ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                      : "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {compared ? "Comparing" : "Compare"}
                </button>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                  Use in proposal
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
