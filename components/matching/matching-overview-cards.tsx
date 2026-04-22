import { Building2, Clock3, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MatchingOverviewResponse } from "@/lib/api-types";

export function MatchingOverviewCards({ summary }: { summary: MatchingOverviewResponse["summary"] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Ready for Proposal" value={summary.readyForProposal} icon={Users} />
      <MetricCard label="Pending Proposals" value={summary.pending} icon={Clock3} />
      <MetricCard label="Mentor Supply Gap" value={summary.mentorSupplyGap} icon={TrendingUp} />
      <MetricCard label="Runnable Programs" value={summary.runnablePrograms} icon={Building2} />
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl border-[var(--border)] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
