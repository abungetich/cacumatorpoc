"use client";

import Link from "next/link";
import { Clock3, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyMilestone, MetricCard, OverviewCard, newMentorWindowDays } from "@/components/people/people-shared";

export function PeopleOverviewPanel({
  stats,
}: {
  stats: {
    totalMentors: number;
    totalMentees: number;
    mentorsPendingReview: number;
    newMentorSignups: number;
    declinedConsentMentors: number;
    mentorsMatchable: number;
    menteesAwaiting: number;
    menteesConsentBlocked: number;
  };
}) {
  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Intake Control Center</p>
            <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">People</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Manage mentor and mentee pipeline transitions from onboarding readiness through matching activation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/register">
              <Button variant="secondary" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Individual Mentor Registration
              </Button>
            </Link>
            <Link href="/join/mentor/organization">
              <Button variant="secondary" className="gap-2">
                <Users className="h-4 w-4" />
                Organization Mentor Path
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mentors Pending Review" value={stats.mentorsPendingReview} icon={Clock3} />
        <MetricCard label={`New Mentor Signups (${newMentorWindowDays}d)`} value={stats.newMentorSignups} icon={UserPlus} />
        <MetricCard label="Declined Consents" value={stats.declinedConsentMentors} icon={ShieldCheck} />
        <MetricCard label="Mentors Matchable" value={stats.mentorsMatchable} icon={UserCheck} />
        <MetricCard label="Mentees Awaiting Match" value={stats.menteesAwaiting} icon={Users} />
        <MetricCard label="Consent Blockers" value={stats.menteesConsentBlocked} icon={ShieldCheck} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <OverviewCard
          title="Mentors"
          description="Review mentor readiness, compliance, and approval state from the people workspace."
          meta={`${stats.mentorsPendingReview} pending review • ${stats.newMentorSignups} new in ${newMentorWindowDays} days`}
          href="/people/mentors"
        />
        <OverviewCard
          title="Mentees"
          description="Track learner readiness, consent blockers, and matching status from the people workspace."
          meta={`${stats.menteesAwaiting} awaiting matching • ${stats.menteesConsentBlocked} consent blockers`}
          href="/people/mentees"
        />
        <OverviewCard
          title="Registration Paths"
          description="Start either the direct mentor path or the organization-led mentor path from here."
          meta="Public registration stays separate from internal review"
          href="/register"
          secondaryHref="/join/mentor/organization"
          secondaryLabel="Open organization path"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <JourneyMilestone
          id="mentor-journey-background"
          title="Background Check"
          stage="Pre-screening milestone"
          description="Must be cleared before mentor is matchable."
        />
        <JourneyMilestone
          id="mentor-journey-training"
          title="Training Completion"
          stage="Onboarding milestone"
          description="Safeguarding training must be marked done."
        />
        <JourneyMilestone
          id="mentor-journey-safeguarding"
          title="Safeguarding Agreement"
          stage="Readiness milestone"
          description="Agreement must be recorded before approval."
        />
      </section>
    </>
  );
}
