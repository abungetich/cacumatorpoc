import { BarChart3, FileText, LineChart, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

const reportCards = [
  {
    title: "Partner Reports",
    description: "School and organisation views with strict data-silo governance.",
    icon: FileText,
  },
  {
    title: "Lifecycle Outcomes",
    description: "Referral-to-match, active-to-closure, and outcome completion metrics.",
    icon: LineChart,
  },
  {
    title: "Compliance",
    description: "Vetting, consent, and training completion status by cohort and role.",
    icon: Shield,
  },
  {
    title: "Regional Analytics",
    description: "Volume and impact segmentation by region and partner type.",
    icon: BarChart3,
  },
] as const;

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workflow Foundation</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Audience-specific reporting surfaces aligned to school, organisation, and coordinator needs.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="space-y-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-base font-semibold text-[var(--text)]">{card.title}</p>
              <p className="text-sm text-[var(--muted)]">{card.description}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
