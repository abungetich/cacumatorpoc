"use client";

import Link from "next/link";
import { type ComponentType } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Globe, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { fetchPartnerDetail } from "@/lib/partner-management-actions";

function statusPill(status: "ACTIVE" | "SETUP_REQUIRED") {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-orange-100 text-orange-800";
}

function agreementPill(status: "SIGNED" | "MISSING") {
  if (status === "SIGNED") {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-rose-100 text-rose-800";
}

export default function PartnerDetailPage() {
  const params = useParams<{ partnerId: string }>();

  const partnerQuery = useQuery({
    queryKey: ["partner-detail", params.partnerId],
    queryFn: () => fetchPartnerDetail(params.partnerId),
    enabled: Boolean(params.partnerId),
  });

  const partner = partnerQuery.data?.item ?? null;

  if (partnerQuery.isLoading) {
    return <SectionSkeleton rows={6} />;
  }

  if (partnerQuery.error) {
    return (
      <Card>
        <ErrorState
          title="Could not load partner details"
          description={partnerQuery.error.message || "Try refreshing."}
          onRetry={() => {
            void partnerQuery.refetch();
          }}
        />
      </Card>
    );
  }

  if (!partner) {
    return (
      <Card>
        <EmptyState title="Partner not found" description="The selected partner does not exist or is out of scope." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/partners">
            <Button variant="secondary" size="sm" className="mb-3 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Partners
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text)]">{partner.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{partner.type} partner profile and linked school network.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPill(partner.lifecycleStatus)}`}>
            {partner.lifecycleStatus === "ACTIVE" ? "Active" : "Setup Required"}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${agreementPill(partner.agreementStatus)}`}>
            {partner.agreementStatus === "SIGNED" ? "Agreement Signed" : "Agreement Missing"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Linked Schools" value={partner.counts.schools} icon={Building2} />
        <MetricCard label="Linked Users" value={partner.counts.users} icon={Users} />
        <MetricCard label="Contact Email" value={partner.contactEmail} icon={Mail} />
        <MetricCard label="Contact Phone" value={partner.contactPhone || "Not set"} icon={Phone} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">Partner Profile</h2>
          <div className="grid gap-3">
            <ProfileRow icon={ShieldCheck} label="Type" value={partner.type} />
            <ProfileRow icon={Users} label="Primary Contact" value={partner.contactPerson} />
            <ProfileRow icon={Mail} label="Email" value={partner.contactEmail} />
            <ProfileRow icon={Phone} label="Phone" value={partner.contactPhone || "Not set"} />
            <ProfileRow icon={Globe} label="Website" value={partner.website || "Not set"} />
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">Linked Schools</h2>
            <Link href="/schools">
              <Button variant="secondary" size="sm" className="gap-2">
                <Building2 className="h-4 w-4" />
                Open Schools
              </Button>
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">School</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Students</th>
                </tr>
              </thead>
              <tbody>
                {partner.schools.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-[var(--muted)]" colSpan={4}>
                      No schools linked to this partner yet.
                    </td>
                  </tr>
                ) : (
                  partner.schools.map((school) => (
                    <tr key={school.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">
                        <Link href={`/schools/${school.id}`} className="font-medium text-[var(--text)] hover:text-[var(--primary)]">
                          {school.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-[var(--text)]">{school.type}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{school.location}</td>
                      <td className="px-3 py-2 text-[var(--text)]">{school.students}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="space-y-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--text)]">{value}</p>
    </Card>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
        <p className="text-sm text-[var(--text)]">{value}</p>
      </div>
    </div>
  );
}
