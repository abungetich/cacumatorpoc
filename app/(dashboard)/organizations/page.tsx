"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, HandCoins, Search, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { fetchOrganizations } from "@/lib/organization-actions";

const statuses = ["ALL", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "INACTIVE"] as const;

type StatusFilter = (typeof statuses)[number];

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusPill(status: StatusFilter | Exclude<StatusFilter, "ALL">) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "PENDING_REVIEW":
      return "bg-amber-100 text-amber-800";
    case "SUSPENDED":
      return "bg-rose-100 text-rose-800";
    case "INACTIVE":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default function OrganizationsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const canView = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "ORGANIZATION_ADMIN";

  const organizationsQuery = useQuery({
    queryKey: ["organizations", search, status],
    queryFn: () => fetchOrganizations({ search, status }),
    enabled: canView,
  });

  const items = useMemo(() => organizationsQuery.data?.items ?? [], [organizationsQuery.data?.items]);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => item.status === "PENDING_REVIEW").length,
    supportReady: items.filter((item) => item.financialSupport || item.inKindSupport).length,
    publicProfiles: items.filter((item) => item.publicProfileEnabled).length,
  }), [items]);

  if (!canView) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Organizations workspace is currently available to platform, partner, and organization admins." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_13%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Organizations</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text)]">Institutional mentor and support organizations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Review registered organizations, see who is offering mentors or support, and prepare the internal workspace for future org-admin operations.
            </p>
          </div>
          <Link
            href="/register/organization"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]"
          >
            Register Organization
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Organizations" value={stats.total} icon={Building2} />
        <MetricCard label="Pending Review" value={stats.pending} icon={ShieldCheck} />
        <MetricCard label="Support Ready" value={stats.supportReady} icon={HandCoins} />
        <MetricCard label="Public Profiles On" value={stats.publicProfiles} icon={Users} />
      </section>

      <Card className="rounded-2xl p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Directory</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Registered organizations</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search name, country, or admin email" />
            </label>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All statuses" : formatEnum(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {organizationsQuery.isLoading ? <SectionSkeleton rows={6} /> : null}
        {organizationsQuery.error ? (
          <ErrorState
            title="Could not load organizations"
            description={organizationsQuery.error.message || "Try again."}
            onRetry={() => void organizationsQuery.refetch()}
          />
        ) : null}

        {!organizationsQuery.isLoading && !organizationsQuery.error ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Organization</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Participation</th>
                  <th className="px-3 py-3 font-semibold">Primary Contact</th>
                  <th className="px-3 py-3 font-semibold">Counts</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8" colSpan={6}>
                      <EmptyState title="No organizations yet" description="Start by registering the first participating organization." />
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)] align-top">
                      <td className="px-3 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                            {item.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.logoUrl} alt={`${item.name} logo`} className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-4 w-4 text-[var(--muted)]" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text)]">{item.name}</p>
                            <p className="text-xs text-[var(--muted)]">{formatEnum(item.type)} • {item.country}</p>
                            <p className="text-xs text-[var(--muted)]">Admin: {item.adminName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(item.status)}`}>
                          {formatEnum(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs text-[var(--muted)]">
                        <p>{item.mentorParticipation ? "Mentors" : "No mentors"}</p>
                        <p>{item.financialSupport ? "Financial support" : "No financial support"}</p>
                        <p>{item.inKindSupport ? "In-kind support" : "No in-kind support"}</p>
                      </td>
                      <td className="px-3 py-4 text-xs text-[var(--muted)]">
                        <p className="font-medium text-[var(--text)]">{item.primaryContactName}</p>
                        <p>{item.contactEmail}</p>
                        <p>{item.contactPhone ?? "No phone"}</p>
                      </td>
                      <td className="px-3 py-4 text-xs text-[var(--muted)]">
                        <p>{item.counts.memberships} memberships</p>
                        <p>{item.counts.agreements} agreements</p>
                        <p>{item.publicProfileEnabled ? "Public profile on" : "Public profile off"}</p>
                      </td>
                      <td className="px-3 py-4">
                        <Link
                          href={`/organizations/${item.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)]"
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Building2 }) {
  return (
    <Card className="rounded-2xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
