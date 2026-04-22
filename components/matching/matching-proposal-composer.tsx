import { ArrowRightLeft, CheckCircle2, FileText, Loader2, ShieldAlert, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchCandidateItem, MatchingIntakeItem, MatchingProgramOption } from "@/lib/api-types";

function formatEnum(value: string) {
  return value.replaceAll("_", " ");
}

export function MatchingProposalComposer({
  mentee,
  candidate,
  selectedProgram,
  activeProgramId,
  onProgramChange,
  checkInFrequency,
  onCheckInChange,
  onRefresh,
  onReview,
  isRefreshing,
  isSubmitting,
}: {
  mentee: MatchingIntakeItem | null;
  candidate: MatchCandidateItem | null;
  selectedProgram: MatchingProgramOption | null;
  activeProgramId: string;
  onProgramChange: (value: string) => void;
  checkInFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  onCheckInChange: (value: "WEEKLY" | "BIWEEKLY" | "MONTHLY") => void;
  onRefresh: () => void;
  onReview: () => void;
  isRefreshing: boolean;
  isSubmitting: boolean;
}) {
  if (!mentee) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
        Select a learner from the queue to prepare a proposal.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">Proposal Composer</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Confirm the program, cadence, and chosen mentor after reviewing the learner panel above.</p>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1 text-sm text-[var(--text)]">
          <span className="font-medium">Program</span>
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={activeProgramId}
            onChange={(event) => onProgramChange(event.target.value)}
          >
            <option value="">Select Program</option>
            {mentee.programOptions.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} • {program.stateLabel}
              </option>
            ))}
          </select>
        </label>

        {selectedProgram ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{selectedProgram.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {selectedProgram.startDate} to {selectedProgram.endDate}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--text)]">
                  {formatEnum(selectedProgram.programStatus)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    selectedProgram.proposalEnabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {selectedProgram.stateLabel}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <label className="grid gap-1 text-sm text-[var(--text)]">
          <span className="font-medium">Check-in cadence</span>
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={checkInFrequency}
            onChange={(event) => onCheckInChange(event.target.value as "WEEKLY" | "BIWEEKLY" | "MONTHLY")}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Biweekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Selected mentor</p>
            {candidate ? (
              <>
                <p className="mt-2 text-base font-semibold text-[var(--text)]">{candidate.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{candidate.school}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text)]">Fit {candidate.score}/100</span>
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text)]">{candidate.fitLabel}</span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">Choose a mentor suggestion to build the proposal.</p>
            )}
          </div>
          <Button variant="secondary" className="gap-2" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {candidate ? (
        <div className="space-y-3 rounded-xl bg-[var(--surface-2)]/60 p-4 text-sm">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Top matching reasons</span>
          </div>
          <ul className="space-y-2 text-[var(--muted)]">
            {candidate.matchReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
          {candidate.riskFlags.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 text-[var(--text)]">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Watch before sending</span>
              </div>
              <ul className="mt-2 space-y-2 text-[var(--muted)]">
                {candidate.riskFlags.map((risk) => (
                  <li key={risk}>• {risk}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {!mentee.eligibleForProposal ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-medium">This learner is not ready for a proposal yet.</p>
          <ul className="mt-2 space-y-1 text-xs">
            {mentee.proposalBlockers.map((blocker) => (
              <li key={blocker}>• {blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!selectedProgram?.proposalEnabled && activeProgramId ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Selected program is not open for matching.</p>
          <p className="mt-1 text-xs text-amber-800">Choose a program that is running, published, or open for enrollment.</p>
        </div>
      ) : null}

      <Button
        className="h-11 w-full gap-2"
        disabled={!candidate || !activeProgramId || !selectedProgram?.proposalEnabled || !mentee.eligibleForProposal || isSubmitting}
        onClick={onReview}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
        Review proposal
      </Button>

      <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-3 text-xs text-[var(--muted)]">
        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Proposals stay explainable: the selected mentor, score, risk flags, and acceptance path remain visible in the proposal queue.
        </span>
      </div>
    </div>
  );
}
