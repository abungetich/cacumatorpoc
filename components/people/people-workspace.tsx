"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { hasPermission } from "@/lib/permissions";
import {
  fetchPeopleMentees,
  fetchPeopleMentors,
  fetchPeopleOverview,
} from "@/lib/people-actions";
import { MenteeQueueTable } from "@/components/people/mentee-queue-table";
import { MentorQueueTable } from "@/components/people/mentor-queue-table";
import { MenteeFilterBar, menteeStageFilters, MentorFilterBar, mentorStateFilters } from "@/components/people/people-filters";
import { JourneyMilestone, MetricCard, SubNavLink, defaultPageSize } from "@/components/people/people-shared";
import { Clock3, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

type PeopleView = "mentors" | "mentees";

export function PeopleWorkspace({ view }: { view: PeopleView }) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialMentorState = searchParams.get("mentorState");
  const initialMenteeStage = searchParams.get("menteeStage");
  const initialNewRegistrations = searchParams.get("newRegistrations") === "1";

  const [search, setSearch] = useState("");
  const [mentorState, setMentorState] = useState<(typeof mentorStateFilters)[number]>(
    mentorStateFilters.includes(initialMentorState as (typeof mentorStateFilters)[number])
      ? (initialMentorState as (typeof mentorStateFilters)[number])
      : "ALL",
  );
  const [menteeStage, setMenteeStage] = useState<(typeof menteeStageFilters)[number]>(
    menteeStageFilters.includes(initialMenteeStage as (typeof menteeStageFilters)[number])
      ? (initialMenteeStage as (typeof menteeStageFilters)[number])
      : "ALL",
  );
  const [newRegistrationsOnly, setNewRegistrationsOnly] = useState(initialNewRegistrations);
  const [declinedConsentsOnly, setDeclinedConsentsOnly] = useState(searchParams.get("declinedConsents") === "1");
  const [mentorPage, setMentorPage] = useState(1);
  const [menteePage, setMenteePage] = useState(1);

  const canOperate = hasPermission(user?.role, "participants.read");
  const canAdminMentors = hasPermission(user?.role, "mentors.approve");

  const overviewQuery = useQuery({
    queryKey: ["people-overview"],
    queryFn: fetchPeopleOverview,
    enabled: canOperate,
    staleTime: 30_000,
  });

  const mentorsQuery = useQuery({
    queryKey: ["people-mentors", search, mentorState, newRegistrationsOnly, declinedConsentsOnly, mentorPage],
    queryFn: () =>
      fetchPeopleMentors({
        search,
        mentorState,
        newRegistrations: newRegistrationsOnly,
        declinedConsents: declinedConsentsOnly,
        page: mentorPage,
        pageSize: defaultPageSize,
      }),
    enabled: canOperate && view === "mentors",
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const menteesQuery = useQuery({
    queryKey: ["people-mentees", search, menteeStage, menteePage],
    queryFn: () =>
      fetchPeopleMentees({
        search,
        menteeStage,
        page: menteePage,
        pageSize: defaultPageSize,
      }),
    enabled: canOperate && view === "mentees",
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const mentors = mentorsQuery.data?.items ?? [];
  const mentees = menteesQuery.data?.items ?? [];
  const mentorPagination = mentorsQuery.data?.pagination;
  const menteePagination = menteesQuery.data?.pagination;
  const stats = overviewQuery.data?.summary ?? {
    totalMentors: 0,
    totalMentees: 0,
    mentorsPendingReview: 0,
    newMentorSignups: 0,
    declinedConsentMentors: 0,
    mentorsMatchable: 0,
    menteesAwaiting: 0,
    menteesConsentBlocked: 0,
  };

  if (!canOperate) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only platform, partner, or school admins can access intake pipelines." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap gap-2">
        <SubNavLink href="/people/mentors" label={`Mentors (${stats.totalMentors})`} active={view === "mentors"} />
        <SubNavLink href="/people/mentees" label={`Mentees (${stats.totalMentees})`} active={view === "mentees"} />
      </section>

      {view === "mentors" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Pending Review" value={stats.mentorsPendingReview} icon={Clock3} />
            <MetricCard label="New in 7 Days" value={stats.newMentorSignups} icon={UserPlus} />
            <MetricCard label="Matchable" value={stats.mentorsMatchable} icon={UserCheck} />
            <MetricCard label="Declined Consents" value={stats.declinedConsentMentors} icon={ShieldCheck} />
          </section>

          <MentorFilterBar
            search={search}
            mentorState={mentorState}
            newRegistrationsOnly={newRegistrationsOnly}
            declinedConsentsOnly={declinedConsentsOnly}
            newMentorSignups={stats.newMentorSignups}
            declinedConsentMentors={stats.declinedConsentMentors}
            onSearchChange={(value) => {
              setSearch(value);
              setMentorPage(1);
            }}
            onMentorStateChange={(value) => {
              setMentorState(value);
              setMentorPage(1);
            }}
            onToggleNewRegistrations={() => {
              setNewRegistrationsOnly((current) => !current);
              setMentorPage(1);
            }}
            onToggleDeclinedConsents={() => {
              setDeclinedConsentsOnly((current) => !current);
              setMentorPage(1);
            }}
          />

          <section className="grid gap-3 md:grid-cols-3">
            <JourneyMilestone id="mentor-journey-background" title="Background Check" stage="Pre-screening milestone" description="Must be cleared before mentor is matchable." />
            <JourneyMilestone id="mentor-journey-training" title="Training Completion" stage="Onboarding milestone" description="Safeguarding training must be marked done." />
            <JourneyMilestone id="mentor-journey-safeguarding" title="Safeguarding Agreement" stage="Readiness milestone" description="Agreement must be recorded before approval." />
          </section>

          <Card className="space-y-4">
            {mentorsQuery.isLoading ? <SectionSkeleton rows={8} /> : null}
            {mentorsQuery.error ? (
              <ErrorState
                title="Could not load mentor intake"
                description={mentorsQuery.error.message || "Try refreshing."}
                onRetry={() => {
                  void mentorsQuery.refetch();
                }}
              />
            ) : null}

            {!mentorsQuery.isLoading && !mentorsQuery.error ? (
              <MentorQueueTable rows={mentors} canAdminMentors={canAdminMentors} pagination={mentorPagination} onPageChange={setMentorPage} />
            ) : null}
          </Card>
        </>
      ) : null}

      {view === "mentees" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Awaiting Match" value={stats.menteesAwaiting} icon={Users} />
            <MetricCard label="Consent Required" value={stats.menteesConsentBlocked} icon={ShieldCheck} />
            <MetricCard
              label="Matched"
              value={mentees.filter((item) => item.intakeStage === "MATCHED").length}
              icon={UserCheck}
            />
            <MetricCard
              label="Active"
              value={mentees.filter((item) => item.intakeStage === "ACTIVE").length}
              icon={Clock3}
            />
          </section>

          <MenteeFilterBar
            search={search}
            menteeStage={menteeStage}
            onSearchChange={(value) => {
              setSearch(value);
              setMenteePage(1);
            }}
            onMenteeStageChange={(value) => {
              setMenteeStage(value);
              setMenteePage(1);
            }}
          />

          <Card className="space-y-4">
            {menteesQuery.isLoading ? <SectionSkeleton rows={8} /> : null}
            {menteesQuery.error ? (
              <ErrorState
                title="Could not load mentee intake"
                description={menteesQuery.error.message || "Try refreshing."}
                onRetry={() => {
                  void menteesQuery.refetch();
                }}
              />
            ) : null}

            {!menteesQuery.isLoading && !menteesQuery.error ? (
              <MenteeQueueTable
                rows={mentees}
                pagination={menteePagination}
                onPageChange={setMenteePage}
              />
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}
