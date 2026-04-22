import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Globe, Handshake, Mail, MapPin, Phone, ShieldCheck, Users } from "lucide-react";
import { getPublicOrganizationBySlug } from "@/lib/public-organizations";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function PublicOrganizationProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const organization = await getPublicOrganizationBySlug(slug);

  if (!organization) {
    notFound();
  }

  const location = [organization.city, organization.county, organization.country].filter(Boolean).join(", ");

  return (
    <main data-theme="cacumator" className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_14%,white),transparent_25%),linear-gradient(180deg,var(--bg),color-mix(in_srgb,var(--surface)_90%,white))] px-4 py-8 text-[var(--text)] md:px-6 md:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[34px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),var(--surface))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Public Organization Profile</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
                  {organization.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={organization.logoUrl} alt={`${organization.name} logo`} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-7 w-7 text-[var(--muted)]" />
                  )}
                </div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">{organization.name}</h1>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] md:text-base">
                {organization.mission ?? organization.description ?? "This organization is participating in the Cacumator Mentorship Platform."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
              <Link
                href={`/register?organizationSlug=${encodeURIComponent(organization.slug)}&organizationName=${encodeURIComponent(organization.name)}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)]"
              >
                Join as mentor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/join/mentor/organization"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--text)]"
              >
                Browse organizations
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5">{formatEnum(organization.type)}</span>
            {location ? <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5">{location}</span> : null}
            {organization.partner?.name ? (
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5">Partner network: {organization.partner.name}</span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">About</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
                <p>{organization.description ?? "Organization description has not been published yet."}</p>
                <p>{organization.mission ?? "Mission statement has not been published yet."}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Participation Model</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <ProfileCapability
                  icon={Users}
                  title="Mentor participation"
                  active={organization.mentorParticipation}
                  description="This organization can bring mentors into the platform under its own institutional path."
                />
                <ProfileCapability
                  icon={Handshake}
                  title="Financial support"
                  active={organization.financialSupport}
                  description="This organization can support mentorship operations financially or through grant participation."
                />
                <ProfileCapability
                  icon={ShieldCheck}
                  title="In-kind support"
                  active={organization.inKindSupport}
                  description="This organization can contribute non-cash support such as staff time, equipment, events, or logistics."
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Schools and Geographies of Interest</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {organization.schoolsOfInterest.length ? (
                  organization.schoolsOfInterest.map((item) => (
                    <span key={item} className="rounded-full bg-[var(--surface-2)] px-3 py-2 text-[var(--text)]">
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-[var(--muted)]">No public targeting information has been listed yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Public Contact</p>
              <div className="mt-5 space-y-4 text-sm text-[var(--muted)]">
                <ContactRow icon={Building2} label="Primary Contact" value={organization.primaryContactName} secondary={organization.primaryContactTitle ?? undefined} />
                <ContactRow icon={Mail} label="Email" value={organization.contactEmail} />
                {organization.contactPhone ? <ContactRow icon={Phone} label="Phone" value={organization.contactPhone} /> : null}
                {organization.website ? <ContactRow icon={Globe} label="Website" value={organization.website} href={organization.website} /> : null}
                {location ? <ContactRow icon={MapPin} label="Location" value={location} /> : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,white),var(--surface))] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Join This Organization Path</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Come in through the same institutional route.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                If you are mentoring through this organization, use the dedicated mentor registration path so your onboarding and organization membership stay connected from the beginning.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/register?organizationSlug=${encodeURIComponent(organization.slug)}&organizationName=${encodeURIComponent(organization.name)}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]"
                >
                  Join as mentor
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register/organization?intent=partner"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)]"
                >
                  Register another organization
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileCapability({
  icon: Icon,
  title,
  description,
  active,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-4">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{active ? "Available" : "Not listed"}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  secondary,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  secondary?: string;
  href?: string;
}) {
  const content = href ? (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-[var(--primary)]">
      {value}
    </a>
  ) : (
    <p className="font-medium text-[var(--text)]">{value}</p>
  );

  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
        <div className="mt-1">{content}</div>
        {secondary ? <p className="mt-1 text-sm text-[var(--muted)]">{secondary}</p> : null}
      </div>
    </div>
  );
}
