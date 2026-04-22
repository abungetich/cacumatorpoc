import type { MatchProposalQueueItem } from "@/lib/api-types";
import { Button } from "@/components/ui/button";

function proposalStatusPill(status: MatchProposalQueueItem["status"]) {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  if (status === "PAUSED") return "bg-purple-100 text-purple-800";
  if (status === "TERMINATED") return "bg-rose-100 text-rose-800";
  if (status === "COMPLETED") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

function formatEnum(value: string) {
  return value.replaceAll("_", " ");
}

function declineCategoryPill(category: MatchProposalQueueItem["declineCategory"]) {
  if (!category) return null;
  if (category === "AVAILABILITY") return "bg-amber-100 text-amber-800";
  if (category === "FORMAT") return "bg-sky-100 text-sky-800";
  if (category === "FIT") return "bg-fuchsia-100 text-fuchsia-800";
  if (category === "CONTEXT") return "bg-indigo-100 text-indigo-800";
  return "bg-slate-100 text-slate-700";
}

function toDateLabel(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function MatchingProposalsTable({
  items,
  canActorRespond,
  onRespond,
  isResponding,
}: {
  items: MatchProposalQueueItem[];
  canActorRespond: (item: MatchProposalQueueItem) => { canRespond: boolean; role: null | "mentor" | "mentee" };
  onRespond: (item: MatchProposalQueueItem, decision: "ACCEPT" | "DECLINE") => void;
  isResponding: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="max-h-[58vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-3 font-semibold">Pair</th>
              <th className="px-3 py-3 font-semibold">Program</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Acceptance</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-[var(--muted)]" colSpan={5}>
                  No proposals found for this filter.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const responsePermission = canActorRespond(item);
                const acceptanceSummary = `${item.mentor.accepted ? "Mentor: accepted" : "Mentor: pending"} • ${
                  item.mentee.accepted ? "Mentee: accepted" : "Mentee: pending"
                }`;

                return (
                  <tr key={item.mentorshipId} className="border-t border-[var(--border)] align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[var(--text)]">{item.mentor.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{item.mentee.name}</p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">Created {toDateLabel(item.createdAt)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-[var(--text)]">{item.program.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{item.program.schoolName}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${proposalStatusPill(item.status)}`}>
                        {formatEnum(item.status)}
                      </span>
                      {item.declineCategory ? (
                        <div className="mt-1">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${declineCategoryPill(item.declineCategory)}`}
                          >
                            {formatEnum(item.declineCategory)}
                          </span>
                        </div>
                      ) : null}
                      {item.declineReason ? <p className="mt-1 max-w-[220px] text-[11px] text-rose-700">{item.declineReason}</p> : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">
                      <p>{acceptanceSummary}</p>
                      <p className="mt-1">Check-in: {formatEnum(item.checkInFrequency)}</p>
                    </td>
                    <td className="px-3 py-3">
                      {responsePermission.canRespond ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="h-8" disabled={isResponding} onClick={() => onRespond(item, "ACCEPT")}>
                            Accept
                          </Button>
                          <Button size="sm" variant="danger" className="h-8" disabled={isResponding} onClick={() => onRespond(item, "DECLINE")}>
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">No action</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
