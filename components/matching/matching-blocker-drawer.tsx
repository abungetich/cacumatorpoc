import { AlertTriangle, ExternalLink, FolderKanban, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { MatchingIntakeItem } from "@/lib/api-types";

type BlockerGroup = "Consent" | "Program" | "Capacity" | "Other";

function classifyBlocker(blocker: string): BlockerGroup {
  const value = blocker.toLowerCase();
  if (value.includes("consent")) return "Consent";
  if (value.includes("program")) return "Program";
  if (value.includes("limit") || value.includes("open mentorship")) return "Capacity";
  return "Other";
}

const blockerSeverity: Record<BlockerGroup, { rank: number; label: string; tone: string }> = {
  Consent: {
    rank: 1,
    label: "High priority",
    tone: "bg-rose-100 text-rose-800",
  },
  Program: {
    rank: 2,
    label: "Needs program action",
    tone: "bg-amber-100 text-amber-800",
  },
  Capacity: {
    rank: 3,
    label: "Review workload",
    tone: "bg-sky-100 text-sky-800",
  },
  Other: {
    rank: 4,
    label: "General follow-up",
    tone: "bg-slate-100 text-slate-700",
  },
};

function remediationLinks(menteeProfileId: string, group: BlockerGroup) {
  if (group === "Consent") {
    return [
      {
        href: `/people/mentees/${menteeProfileId}?tab=guardian`,
        label: "Open learner record for consent follow-up",
        icon: ShieldCheck,
      },
    ];
  }

  if (group === "Program") {
    return [
      {
        href: "/programs/catalog",
        label: "Open program catalog",
        icon: FolderKanban,
      },
      {
        href: `/people/mentees/${menteeProfileId}?tab=matching`,
        label: "Open learner matching readiness",
        icon: ExternalLink,
      },
    ];
  }

  if (group === "Capacity") {
    return [
      {
        href: "/relationships",
        label: "Open relationships",
        icon: Users,
      },
      {
        href: `/people/mentees/${menteeProfileId}?tab=matching`,
        label: "Open learner matching readiness",
        icon: ExternalLink,
      },
    ];
  }

  return [
    {
      href: `/people/mentees/${menteeProfileId}?tab=overview`,
      label: "Open learner record",
      icon: ExternalLink,
    },
  ];
}

export function MatchingBlockerDrawer({
  open,
  mentee,
  onClose,
}: {
  open: boolean;
  mentee: MatchingIntakeItem | null;
  onClose: () => void;
}) {
  if (!open || !mentee) {
    return null;
  }

  const grouped = mentee.proposalBlockers.reduce<Record<BlockerGroup, string[]>>((acc, blocker) => {
    const key = classifyBlocker(blocker);
    acc[key] = [...(acc[key] ?? []), blocker];
    return acc;
  }, {} as Record<BlockerGroup, string[]>);
  const sortedGroups = (Object.entries(grouped) as Array<[BlockerGroup, string[]]>).sort(
    ([leftGroup], [rightGroup]) => blockerSeverity[leftGroup].rank - blockerSeverity[rightGroup].rank,
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Matching blockers</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{mentee.fullName}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Review everything preventing a new proposal, then jump straight to the learner record if you need to resolve it outside matching.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--text)]">
                {mentee.openMentorships}/{mentee.maxOpenMentorships} open relationships
              </span>
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--text)]">
                {mentee.programOptions.length} eligible program{mentee.programOptions.length === 1 ? "" : "s"}
              </span>
              <span className={`rounded-full px-2.5 py-1 font-medium ${mentee.hasConsent ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {mentee.hasConsent ? "Consent received" : "Consent pending"}
              </span>
            </div>
          </div>

          {mentee.proposalBlockers.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                No active blockers
              </div>
              <p className="mt-2">This learner does not currently have any recorded proposal blockers.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGroups.map(([group, blockers]) => (
                <section key={group} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{group} blockers</p>
                        <p className="text-xs text-[var(--muted)]">{blockers.length} issue{blockers.length === 1 ? "" : "s"} to clear</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${blockerSeverity[group].tone}`}>
                      {blockerSeverity[group].label}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--text)]">
                    {blockers.map((blocker) => (
                      <li key={blocker} className="rounded-xl bg-[var(--surface)] px-3 py-2">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {remediationLinks(mentee.profileId, group).map((entry) => {
                      const Icon = entry.icon;
                      return (
                        <Link
                          key={`${group}-${entry.href}-${entry.label}`}
                          href={entry.href}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--primary)]/35 hover:text-[var(--primary)]"
                        >
                          <Icon className="h-4 w-4" />
                          {entry.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/45 p-4">
            <p className="text-sm font-semibold text-[var(--text)]">Resolve in learner record</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Use the full learner record when the blocker needs consent updates, intake-stage changes, or other follow-up outside the matching workflow.
            </p>
            <div className="mt-3">
              <Link
                href={`/people/mentees/${mentee.profileId}?tab=matching`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                Open full learner record
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
