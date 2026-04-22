"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, HandCoins, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { fetchOrganizationDetail } from "@/lib/organization-actions";

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OrganizationDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ organizationId: string }>();
  const canView = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "ORGANIZATION_ADMIN";

  const detailQuery = useQuery({
    queryKey: ["organization-detail", params.organizationId],
    queryFn: () => fetchOrganizationDetail(params.organizationId),
    enabled: canView && Boolean(params.organizationId),
  });

  const organization = detailQuery.data?.item;
  const sections = useMemo(
    () => [
      {
        title: "Members",
        description: "Membership management will sit here once org admin invite and member onboarding are active.",
        icon: Users,
      },
      {
        title: "Support",
        description: "Financial and in-kind support commitments will be tracked here, tied to schools and programs.",
        icon: HandCoins,
      },
      {
        title: "Compliance",
        description: "Organization agreements, safeguarding attestations, and future org-level documents will live here.",
        icon: ShieldCheck,
      },
    ],
    [],
  );

  if (!canView) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Organizations workspace is currently available to platform, partner, and organization admins." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {detailQuery.isLoading ? <SectionSkeleton rows={6} /> : null}
      {detailQuery.error ? (
        <ErrorState
          title="Could not load organization"
          description={detailQuery.error.message || "Try again."}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}

      {organization ? (
        <>
          <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_13%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Organization Workspace</p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
                    {organization.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={organization.logoUrl} alt={`${organization.name} logo`} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-[var(--muted)]" />
                    )}
                  </div>
                  <h1 className="text-3xl font-semibold text-[var(--text)]">{organization.name}</h1>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  This is the internal organization shell. Next phases will activate members, support operations, compliance workflows, and public profile controls.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/organizations" className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)]">
                  Back to directory
                </Link>
                {organization.status === "ACTIVE" ? (
                  <Link href={`/org/${organization.slug}`} className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]">
                    Public profile route
                  </Link>
                ) : (
                  <span className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium text-[var(--muted)]">
                    Public profile available when active
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Identity</p>
                  <p className="text-lg font-semibold text-[var(--text)]">{formatEnum(organization.type)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>Status: <span className="font-medium text-[var(--text)]">{formatEnum(organization.status)}</span></p>
                <p>Location: <span className="font-medium text-[var(--text)]">{[organization.city, organization.county, organization.country].filter(Boolean).join(", ")}</span></p>
                <p>Partner: <span className="font-medium text-[var(--text)]">{organization.partner?.name ?? "Independent"}</span></p>
              </div>
            </Card>

            <Card className="rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Admin Contact</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text)]">{organization.adminName}</p>
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>{organization.adminEmail}</p>
                <p>{organization.adminPhone}</p>
                <p>{organization.adminTitle ?? "Title pending"}</p>
              </div>
            </Card>

            <Card className="rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Participation Profile</p>
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>{organization.mentorParticipation ? "Mentor participation enabled" : "Mentor participation not enabled"}</p>
                <p>{organization.financialSupport ? "Financial support enabled" : "No financial support declared"}</p>
                <p>{organization.inKindSupport ? "In-kind support enabled" : "No in-kind support declared"}</p>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Profile Summary</p>
              <div className="mt-4 space-y-4 text-sm text-[var(--muted)]">
                <div>
                  <p className="font-medium text-[var(--text)]">Mission</p>
                  <p>{organization.mission ?? "Mission has not been added yet."}</p>
                </div>
                <div>
                  <p className="font-medium text-[var(--text)]">Description</p>
                  <p>{organization.description ?? "Description has not been added yet."}</p>
                </div>
                <div>
                  <p className="font-medium text-[var(--text)]">Schools of Interest</p>
                  <p>{organization.schoolsOfInterest.length ? organization.schoolsOfInterest.join(", ") : "No schools specified yet."}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Agreements</p>
              <div className="mt-4 space-y-3">
                {organization.agreements.map((agreement) => (
                  <div key={agreement.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="font-medium text-[var(--text)]">{agreement.title}</p>
                    <p className="text-xs text-[var(--muted)]">{agreement.code} • {agreement.version}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">Agreed by {agreement.agreedByName} on {new Date(agreement.agreedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.title} className="rounded-2xl p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-4 text-lg font-semibold text-[var(--text)]">{section.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{section.description}</p>
                </Card>
              );
            })}
          </section>
        </>
      ) : null}
    </div>
  );
}
