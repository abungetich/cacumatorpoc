import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, Search, ShieldCheck, Users } from "lucide-react";
import { listPublicMentorOrganizations } from "@/lib/public-organizations";

type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function JoinMentorOrganizationPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const organizations = await listPublicMentorOrganizations(q);

  return (
    <main data-theme="cacumator" className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,white),transparent_28%),linear-gradient(180deg,var(--bg),color-mix(in_srgb,var(--surface)_92%,white))] px-4 py-8 text-[var(--text)] md:px-6 md:py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),var(--surface))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Join Through Organization</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              Register as a mentor under an approved organization.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">
              Use this route if you are joining through an employer, alumni body, NGO, association, or another approved organization that is supplying mentors into the platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--text)]"
              >
                Register independently
              </Link>
              <Link
                href="/register/organization?intent=mentor-org"
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)]"
              >
                My organization is not listed
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">What Happens Next</p>
            <div className="mt-5 space-y-4 text-sm text-[var(--muted)]">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <Users className="h-4 w-4" />
                </span>
                <p>Select an approved mentor organization below.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <p>Your mentor registration will still go through safeguarding, profile completion, and approval.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <BriefcaseBusiness className="h-4 w-4" />
                </span>
                <p>The platform creates a pending organization membership so the mentor path and the institutional path remain linked.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
          <form className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" action="/join/mentor/organization">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Approved Mentor Organizations</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Find the organization you are joining through.</h2>
            </div>
            <label className="flex h-12 min-w-[280px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by organization or location"
                className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </label>
          </form>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {organizations.length ? (
              organizations.map((organization) => (
                <article
                  key={organization.id}
                  className="rounded-[28px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,white)] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                      {organization.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={organization.logoUrl} alt={`${organization.name} logo`} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{formatEnum(organization.type)}</p>
                      <h3 className="mt-1 text-xl font-semibold">{organization.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {organization.mission ?? organization.description ?? "This organization participates in the mentorship platform as an approved mentor supplier."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5">
                      {[organization.city, organization.county, organization.country].filter(Boolean).join(", ")}
                    </span>
                    {organization.partner?.name ? (
                      <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5">Partnered with {organization.partner.name}</span>
                    ) : null}
                    {organization.counts.memberships ? (
                      <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5">
                        {organization.counts.memberships} linked members
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/register?organizationSlug=${encodeURIComponent(organization.slug)}&organizationName=${encodeURIComponent(organization.name)}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]"
                    >
                      Join through this organization
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/org/${organization.slug}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)]"
                    >
                      View public profile
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-8 text-center lg:col-span-2">
                <p className="text-lg font-semibold text-[var(--text)]">No approved mentor organizations found.</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  If the organization you need is not visible yet, ask them to register through the organization pathway first.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Link
                    href="/register/organization?intent=mentor-org"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]"
                  >
                    Register organization
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)]"
                  >
                    Continue as individual mentor
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
