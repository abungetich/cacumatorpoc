import Link from "next/link";
import { AlertOctagon, ArrowRight, ShieldCheck, Siren } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SafeguardingPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workflow Foundation</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Safeguarding</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Dedicated command center for alerts, escalations, and case lifecycle management.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">Operational Safety Feed</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Existing audit and incident feed remains available while full safeguarding workspace is built.
              </p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
              <Siren className="h-4 w-4" />
            </span>
          </div>
          <Link href="/audit">
            <Button variant="secondary" className="gap-2">
              Open Audit & Safety
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        <Card className="space-y-3">
          <p className="text-base font-semibold text-[var(--text)]">Step 2 Safeguarding Build</p>
          <div className="space-y-2 text-xs text-[var(--muted)]">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" />
              Case queue with role-restricted detail visibility
            </p>
            <p className="flex items-center gap-2">
              <AlertOctagon className="h-3.5 w-3.5 text-[var(--primary)]" />
              Trigger-driven escalation matrix and SLA timers
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
