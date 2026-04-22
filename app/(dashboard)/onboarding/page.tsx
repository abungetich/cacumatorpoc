import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const onboardingCards = [
  {
    title: "Individual Mentor Registration",
    description: "Open the lightweight public registration for mentors who are joining directly.",
    meta: "Public route: /register",
    href: "/register",
    cta: "Open mentor registration",
    icon: UserPlus,
  },
  {
    title: "Organization Mentor Path",
    description: "Send mentors through the organization join flow when they are attached to an approved organization.",
    meta: "Public route: /join/mentor/organization",
    href: "/join/mentor/organization",
    cta: "Open organization mentor path",
    icon: Users,
  },
  {
    title: "Organization Registration",
    description: "Register a mentor-supplying organization, partner, or funder through the governed intake flow.",
    meta: "Public route: /register/organization",
    href: "/register/organization",
    cta: "Open organization registration",
    icon: Building2,
  },
  {
    title: "Mentor Intake Queue",
    description: "Review new signups, complete readiness steps, and move mentors toward approval.",
    meta: "Internal route: /people/mentors",
    href: "/people/mentors?mentorState=PENDING_ADMIN_REVIEW&newRegistrations=1",
    cta: "Open mentor intake",
    icon: ClipboardCheck,
  },
] as const;

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_13%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Onboarding Module</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Start people and organization intake from one place.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Use this workspace to launch the right registration path, then move back into People intake to review new mentors and organizations.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {onboardingCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="rounded-[24px] border border-[var(--border)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-[var(--text)]">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{card.meta}</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-5">
                <Link href={card.href}>
                  <Button className="gap-2">
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
