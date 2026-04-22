import Link from "next/link";
import { Building2, Coins, Users } from "lucide-react";
import { PlatformLogo } from "@/components/branding/platform-logo";
import { getPlatformBranding } from "@/lib/platform-branding";

const authTracks = [
  {
    title: "Individual mentors",
    description: "Create a light account first, then complete profile, safeguarding, and program onboarding after registration.",
    icon: Users,
    href: "/register",
    cta: "Mentor registration",
  },
  {
    title: "Organization-linked mentors",
    description: "Join through an approved employer, alumni body, NGO, or mentor-supplying institution so membership is tracked correctly.",
    icon: Building2,
    href: "/join/mentor/organization",
    cta: "Join through organization",
  },
  {
    title: "Partners and funders",
    description: "Register organizations supplying mentors, operational support, or funding through the dedicated institutional path.",
    icon: Coins,
    href: "/register/organization",
    cta: "Register organization",
  },
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getPlatformBranding();

  return (
    <div data-theme="cacumator" className="cacumator-auth-shell grid min-h-screen grid-cols-1 md:grid-cols-[1fr_1.02fr]">
      <section className="cacumator-auth-hero relative hidden overflow-hidden md:flex md:flex-col md:justify-between">
        <div className="mx-auto flex w-full max-w-3xl justify-center px-10 pt-10">
          <div className="cacumator-auth-pill flex w-full max-w-xl items-center justify-between rounded-full px-6 py-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_8px_20px_rgba(86,34,136,0.22)]">
              <Building2 className="h-5 w-5" />
            </span>
            <Link
              href="/register"
              className="cacumator-auth-dark-btn inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white"
            >
              Mentor Register
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-16 py-14 text-white">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-sm">
            <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-white">
              <PlatformLogo logoUrl={branding.logoUrl} name={branding.platformName} />
            </div>
          </div>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.42em] text-white/70">
            {branding.platformName}
          </p>
          <h1 className="mt-10 max-w-xl font-[family:Georgia,Times,'Times_New_Roman',serif] text-7xl font-semibold leading-[0.92] tracking-[-0.03em]">
            Welcome back
          </h1>
          <p className="mt-8 max-w-xl text-[2rem] font-medium leading-[1.55] text-white/84">
            {branding.ceoWelcomeMessage}
          </p>
          <div className="mt-14 grid max-w-2xl grid-cols-3 gap-10 text-white/92">
            <Stat value="120+" label="Mentors connected" />
            <Stat value="24" label="Programs active" />
            <Stat value="8" label="Regions served" />
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-4 px-10 pb-10">
          {authTracks.map((track) => {
            const Icon = track.icon;
            return (
              <Link
                key={track.title}
                href={track.href}
                className="rounded-[24px] border border-white/14 bg-white/8 p-4 text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/14 text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-4 text-sm font-semibold">{track.title}</p>
                <p className="mt-2 text-xs leading-5 text-white/72">{track.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid place-items-center px-4 py-8 md:px-10">{children}</section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-5xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-3 text-sm tracking-[0.04em] text-white/72">{label}</p>
    </div>
  );
}
