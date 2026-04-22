import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardCheck, FileSpreadsheet, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const queueCards = [
  {
    title: "Pending Intake Reviews",
    description: "School and individual referrals waiting for coordinator assessment.",
    icon: ClipboardCheck,
    href: "/people/mentors",
    cta: "Open Participants",
  },
  {
    title: "Matching Queue",
    description: "Approved mentees waiting for mentor proposal and intro session.",
    icon: UsersRound,
    href: "/matching",
    cta: "Open Matching",
  },
  {
    title: "Grant Pipeline",
    description: "Discovery, approvals, writing tasks, and submission tracking.",
    icon: FileSpreadsheet,
    href: "/grants",
    cta: "Open Grants",
  },
  {
    title: "Safeguarding Alerts",
    description: "Flags requiring DSO or coordinator review and escalation.",
    icon: ShieldAlert,
    href: "/safeguarding",
    cta: "Open Safeguarding",
  },
  {
    title: "Overdue Actions",
    description: "Sessions, supervision, and closure milestones outside SLA.",
    icon: AlertTriangle,
    href: "/relationships",
    cta: "Open Relationships",
  },
] as const;

export default function WorkQueuePage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workflow Foundation</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Work Queue</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Central action hub for intake, matching, safeguarding, and relationship follow-up.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/register">
            <Button variant="secondary" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Register Individual Mentor
            </Button>
          </Link>
          <Link href="/join/mentor/organization">
            <Button variant="secondary" className="gap-2">
              <UsersRound className="h-4 w-4" />
              Organization Mentor Path
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {queueCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-[var(--text)]">{card.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{card.description}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <Link href={card.href}>
                <Button variant="secondary" className="gap-2">
                  {card.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
