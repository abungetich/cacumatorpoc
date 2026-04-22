import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SchoolDetailResponse } from "@/lib/api-types";

type SchoolDetailItem = SchoolDetailResponse["item"];

type SchoolDetailSummaryProps = {
  school: SchoolDetailItem;
  principalAssigned: boolean;
  onEditHead: () => void;
};

export function SchoolDetailSummary({ school, principalAssigned, onEditHead }: SchoolDetailSummaryProps) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Students" value={String(school.counts.students)} />
        <MetricCard label="Admins" value={String(school.counts.admins)} />
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Principal</p>
          {principalAssigned ? (
            <>
              <p className="mt-2 text-sm font-semibold text-[var(--text)]">{school.principalName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{school.principalEmail}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-[var(--text)]">Not Assigned</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Add leadership contact from this page.</p>
            </>
          )}
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Partner</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">{school.partner?.name ?? "Independent"}</p>
        </Card>
        <MetricCard label="Programs" value={String(school.programs.length)} />
      </section>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">School Profile</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/55 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Leadership Contact</p>
              {principalAssigned ? (
                <p className="mt-1 text-sm text-[var(--text)]">
                  <span className="font-semibold">{school.principalName}</span>
                  {" · "}
                  {school.principalEmail}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--muted)]">No head of institution assigned yet.</p>
              )}
            </div>
            <Button size="sm" onClick={onEditHead} className="gap-2">
              <UserRound className="h-4 w-4" />
              {principalAssigned ? "Edit Principal" : "Add Principal"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ProfileField label="Address" value={school.address} />
          <ProfileField label="School Email" value={school.email} />
          <ProfileField label="School Phone" value={school.phone} />
          <ProfileField label="Accreditation" value={school.accreditationStatus || "Not Set"} />
          <ProfileField
            label="Student Population"
            value={school.studentPopulation ? String(school.studentPopulation) : "Not Set"}
          />
          <ProfileField label="Partner Type" value={school.partner?.type || "None"} />
        </div>
      </Card>
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</p>
    </Card>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text)]">{value}</p>
    </div>
  );
}
