import { ChevronRight } from "lucide-react";
import type { MatchingIntakeItem, MatchingIntakeStage } from "@/lib/api-types";

function stagePill(stage: MatchingIntakeStage) {
  if (stage === "AWAITING_MATCHING") return "bg-amber-100 text-amber-800";
  if (stage === "MATCHED") return "bg-sky-100 text-sky-800";
  if (stage === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  if (stage === "CONSENT_REQUIRED") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function formatEnum(value: string) {
  return value.replaceAll("_", " ");
}

function programStateClass(proposalEnabled: boolean) {
  return proposalEnabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
}

function readinessClass(ready: boolean) {
  return ready ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
}

function blockerCountClass(count: number) {
  return count === 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
}

export function MatchingQueueTable({
  items,
  activeProfileId,
  onSelect,
}: {
  items: MatchingIntakeItem[];
  activeProfileId: string | null;
  onSelect: (profileId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/55 px-4 py-3">
        <p className="text-sm font-semibold text-[var(--text)]">Mentee Queue</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Choose a learner to open a matching side panel with suggestions and proposal actions.</p>
      </div>

      <div className="max-h-[72vh] space-y-3 overflow-auto p-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-sm text-[var(--muted)]">
            No intake records match the current filters.
          </div>
        ) : (
          items.map((item) => {
            const selected = activeProfileId === item.profileId;

            return (
              <button
                key={item.profileId}
                type="button"
                onClick={() => onSelect(item.profileId)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[var(--primary)] bg-[var(--surface-2)]/70 shadow-[0_10px_24px_rgba(85,34,136,0.10)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface-2)]/35"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[var(--text)]">{item.fullName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.schoolName} • {formatEnum(item.educationLevel)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                    Open
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.8fr_0.95fr]">
                  <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Readiness</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${readinessClass(item.eligibleForProposal)}`}>
                        {item.eligibleForProposal ? "Ready" : "Blocked"}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${blockerCountClass(item.proposalBlockers.length)}`}>
                        {item.proposalBlockers.length} blocker{item.proposalBlockers.length === 1 ? "" : "s"}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${stagePill(item.intakeStage)}`}>
                        {formatEnum(item.intakeStage)}
                      </span>
                    </div>
                    {!item.eligibleForProposal && item.proposalBlockers[0] ? (
                      <p className="mt-2 text-xs leading-5 text-rose-700">{item.proposalBlockers[0]}</p>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-700">No immediate learner-side blocker is preventing proposal creation.</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Programs</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                      {item.programOptions.length} eligible program{item.programOptions.length === 1 ? "" : "s"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.programOptions.slice(0, 2).map((program) => (
                        <span key={program.id} className="group relative inline-flex">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${programStateClass(program.proposalEnabled)}`}>
                            {program.stateLabel}
                          </span>
                          <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden min-w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] leading-5 text-[var(--text)] shadow-[0_12px_28px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
                            <span className="block font-semibold">{program.name}</span>
                            <span className="mt-0.5 block text-[var(--muted)]">
                              {program.startDate} to {program.endDate}
                            </span>
                            <span className="mt-1 inline-flex rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text)]">
                              {formatEnum(program.programStatus)}
                            </span>
                          </span>
                        </span>
                      ))}
                      {item.programOptions.length > 2 ? (
                        <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--text)]">
                          +{item.programOptions.length - 2} more
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Capacity</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                      {item.openMentorships}/{item.maxOpenMentorships} open
                    </p>
                    <p className={`mt-2 text-xs ${item.openMentorships >= item.maxOpenMentorships ? "text-rose-700" : "text-emerald-700"}`}>
                      {item.openMentorships >= item.maxOpenMentorships ? "At learner limit" : "Capacity available"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
