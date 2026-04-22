"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRightLeft, ChevronDown, ChevronRight, ExternalLink, Loader2, Search } from "lucide-react";
import { MatchingBlockerDrawer } from "@/components/matching/matching-blocker-drawer";
import { MatchingBottlenecksPanel } from "@/components/matching/matching-bottlenecks-panel";
import { MatchingComparePanel } from "@/components/matching/matching-compare-panel";
import { MatchingOverviewCards } from "@/components/matching/matching-overview-cards";
import { MatchingProposalComposer } from "@/components/matching/matching-proposal-composer";
import { MatchingProposalsTable } from "@/components/matching/matching-proposals-table";
import { MatchingQueueTable } from "@/components/matching/matching-queue-table";
import { MatchingSuggestionCards } from "@/components/matching/matching-suggestion-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import type { MatchDeclineCategory, MatchProposalQueueItem } from "@/lib/api-types";
import { hasPermission } from "@/lib/permissions";
import {
  createMatchProposalRequest,
  fetchMatchCandidates,
  fetchMatchingIntake,
  fetchMatchingOverview,
  fetchMatchProposals,
  respondToMatchProposalRequest,
} from "@/lib/matching-actions";

const stageFilters = ["ALL", "AWAITING_MATCHING", "CONSENT_REQUIRED", "MATCHED", "ACTIVE", "INACTIVE"] as const;
const proposalStatusFilters = ["ALL", "PENDING", "ACTIVE", "PAUSED", "COMPLETED", "TERMINATED"] as const;
type BlockerFilter = "ALL" | "READY" | "CONSENT" | "PROGRAM" | "CAPACITY" | "OTHER";
const declineCategories: Array<{ value: MatchDeclineCategory; label: string; description: string }> = [
  {
    value: "AVAILABILITY",
    label: "Availability",
    description: "Schedules, timing, or cadence do not work for this pair.",
  },
  {
    value: "FORMAT",
    label: "Format",
    description: "Online, in-person, or hybrid delivery does not fit.",
  },
  {
    value: "FIT",
    label: "Fit",
    description: "Interests, communication style, or experience fit feels weak.",
  },
  {
    value: "CONTEXT",
    label: "Scope / Context",
    description: "School, geography, organization, or program context does not fit.",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Use only when the decline does not fit the standard matching categories.",
  },
] as const;

type CheckInOption = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
type DeclineDraft = {
  item: MatchProposalQueueItem;
  category: MatchDeclineCategory | "";
  reason: string;
};

type ProposalConfirmDraft = {
  menteeName: string;
  mentorName: string;
  programName: string;
  programStateLabel: string;
  checkInFrequency: CheckInOption;
  reasons: string[];
  risks: string[];
};

function formatEnum(value: string) {
  return value.replaceAll("_", " ");
}

function classifyProposalBlockers(blockers: string[]) {
  const normalized = blockers.map((blocker) => blocker.toLowerCase());

  if (normalized.length === 0) {
    return "READY" as const;
  }
  if (normalized.some((blocker) => blocker.includes("consent"))) {
    return "CONSENT" as const;
  }
  if (normalized.some((blocker) => blocker.includes("program"))) {
    return "PROGRAM" as const;
  }
  if (normalized.some((blocker) => blocker.includes("limit") || blocker.includes("open mentorship"))) {
    return "CAPACITY" as const;
  }
  return "OTHER" as const;
}

function canActorRespond(item: MatchProposalQueueItem, userId: string | undefined) {
  if (!userId || item.status !== "PENDING") {
    return { canRespond: false, role: null as null | "mentor" | "mentee" };
  }

  if (item.mentor.userId === userId && !item.mentor.accepted) {
    return { canRespond: true, role: "mentor" as const };
  }

  if (item.mentee.userId === userId && !item.mentee.accepted) {
    return { canRespond: true, role: "mentee" as const };
  }

  return { canRespond: false, role: null as null | "mentor" | "mentee" };
}

export default function MatchingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<(typeof stageFilters)[number]>("ALL");
  const [blockerFilter, setBlockerFilter] = useState<BlockerFilter>("ALL");
  const [proposalStatus, setProposalStatus] = useState<(typeof proposalStatusFilters)[number]>("ALL");
  const [matchingTab, setMatchingTab] = useState<"CREATE" | "PIPELINE">("CREATE");
  const [selectedMenteeProfileId, setSelectedMenteeProfileId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedMentorUserId, setSelectedMentorUserId] = useState<string | null>(null);
  const [checkInFrequency, setCheckInFrequency] = useState<CheckInOption>("BIWEEKLY");
  const [declineDraft, setDeclineDraft] = useState<DeclineDraft | null>(null);
  const [proposalConfirmDraft, setProposalConfirmDraft] = useState<ProposalConfirmDraft | null>(null);
  const [proposalComposerOpen, setProposalComposerOpen] = useState(false);
  const [pressureOpen, setPressureOpen] = useState(false);
  const [blockerDrawerOpen, setBlockerDrawerOpen] = useState(false);
  const [comparedMentorUserIds, setComparedMentorUserIds] = useState<string[]>([]);

  const isCoordinator = hasPermission(user?.role, "matching.manage");
  const canRespondToProposal = user?.role === "MENTOR" || user?.role === "MENTEE";
  const canViewProposalQueue = isCoordinator || canRespondToProposal || user?.role === "GUARDIAN";

  const intakeQuery = useQuery({
    queryKey: ["matching-intake", search, stageFilter],
    queryFn: () =>
      fetchMatchingIntake({
        search,
        stage: stageFilter,
      }),
    enabled: isCoordinator,
  });

  const overviewQuery = useQuery({
    queryKey: ["matching-overview"],
    queryFn: fetchMatchingOverview,
    enabled: isCoordinator,
  });

  const intakeRows = useMemo(() => intakeQuery.data?.items ?? [], [intakeQuery.data?.items]);
  const filteredIntakeRows = useMemo(() => {
    if (blockerFilter === "ALL") {
      return intakeRows;
    }

    return intakeRows.filter((item) => classifyProposalBlockers(item.proposalBlockers) === blockerFilter);
  }, [blockerFilter, intakeRows]);

  const selectedMentee = useMemo(
    () => filteredIntakeRows.find((item) => item.profileId === selectedMenteeProfileId) ?? filteredIntakeRows[0] ?? null,
    [filteredIntakeRows, selectedMenteeProfileId],
  );

  const activeProgramId = useMemo(() => {
    if (!selectedMentee) {
      return "";
    }
    if (selectedProgramId && selectedMentee.programOptions.some((program) => program.id === selectedProgramId)) {
      return selectedProgramId;
    }
    return (
      selectedMentee.programOptions.find((program) => program.proposalEnabled)?.id ??
      selectedMentee.programOptions[0]?.id ??
      ""
    );
  }, [selectedMentee, selectedProgramId]);

  const selectedProgram = useMemo(
    () => selectedMentee?.programOptions.find((program) => program.id === activeProgramId) ?? null,
    [selectedMentee, activeProgramId],
  );

  const candidateQuery = useQuery({
    queryKey: ["matching-candidates", selectedMentee?.userId, activeProgramId],
    queryFn: () => fetchMatchCandidates(selectedMentee!.userId, activeProgramId, 8),
    enabled: isCoordinator && Boolean(selectedMentee?.userId) && Boolean(activeProgramId) && Boolean(selectedProgram?.proposalEnabled),
  });

  const candidateItems = useMemo(() => candidateQuery.data?.items ?? [], [candidateQuery.data?.items]);

  const selectedCandidate = useMemo(
    () => candidateItems.find((candidate) => candidate.mentorUserId === selectedMentorUserId) ?? candidateItems[0] ?? null,
    [candidateItems, selectedMentorUserId],
  );
  const comparedCandidates = useMemo(
    () => candidateItems.filter((candidate) => comparedMentorUserIds.includes(candidate.mentorUserId)),
    [candidateItems, comparedMentorUserIds],
  );

  const proposalQuery = useQuery({
    queryKey: ["match-proposals", proposalStatus],
    queryFn: () => fetchMatchProposals({ status: proposalStatus, limit: 120 }),
    enabled: canViewProposalQueue,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["matching-intake"] });
    await queryClient.invalidateQueries({ queryKey: ["matching-overview"] });
    await queryClient.invalidateQueries({ queryKey: ["matching-candidates"] });
    await queryClient.invalidateQueries({ queryKey: ["match-proposals"] });
    await queryClient.invalidateQueries({ queryKey: ["people-overview"] });
    await queryClient.invalidateQueries({ queryKey: ["people-mentors"] });
    await queryClient.invalidateQueries({ queryKey: ["people-mentees"] });
    await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const createProposalMutation = useMutation({
    mutationFn: ({ mentorUserId, menteeUserId, programId }: { mentorUserId: string; menteeUserId: string; programId: string }) =>
      createMatchProposalRequest({
        mentorUserId,
        menteeUserId,
        programId,
        checkInFrequency,
      }),
    onSuccess: refresh,
  });

  const respondMutation = useMutation({
    mutationFn: ({
      mentorshipId,
      decision,
      category,
      reason,
    }: {
      mentorshipId: string;
      decision: "ACCEPT" | "DECLINE";
      category?: MatchDeclineCategory;
      reason?: string;
    }) =>
      respondToMatchProposalRequest({
        mentorshipId,
        decision,
        category,
        reason,
      }),
    onSuccess: refresh,
  });

  const proposalRows = useMemo(() => proposalQuery.data?.items ?? [], [proposalQuery.data?.items]);
  const blockerCounts = useMemo(() => {
    return intakeRows.reduce(
      (acc, item) => {
        const key = classifyProposalBlockers(item.proposalBlockers);
        acc[key] += 1;
        return acc;
      },
      {
        READY: 0,
        CONSENT: 0,
        PROGRAM: 0,
        CAPACITY: 0,
        OTHER: 0,
      } as Record<Exclude<BlockerFilter, "ALL">, number>,
    );
  }, [intakeRows]);

  const selectedCandidateSummary = selectedCandidate
    ? `${selectedCandidate.name} • ${selectedCandidate.score}/100 • ${selectedCandidate.fitLabel}`
    : "Select a mentor suggestion to prepare a proposal.";

  const toggleComparedMentor = (mentorUserId: string) => {
    setComparedMentorUserIds((current) => {
      if (current.includes(mentorUserId)) {
        return current.filter((id) => id !== mentorUserId);
      }
      if (current.length >= 3) {
        return [...current.slice(1), mentorUserId];
      }
      return [...current, mentorUserId];
    });
  };

  const compareTopThree = () => {
    setComparedMentorUserIds(candidateItems.slice(0, 3).map((candidate) => candidate.mentorUserId));
  };
  const dashboardStats = overviewQuery.data?.summary ?? {
    pending: 0,
    active: 0,
    awaiting: 0,
    blockedByConsent: 0,
    readyForProposal: 0,
    blockedByNoEligiblePrograms: 0,
    blockedByProgramState: 0,
    blockedByCapacity: 0,
    runnablePrograms: 0,
    nonRunnablePrograms: 0,
    matchableMentors: 0,
    approvedMentorsForRunnablePrograms: 0,
    mentorSupplyGap: 0,
  };
  const matchingInsights = overviewQuery.data?.insights ?? {
    bottlenecks: [],
    recommendations: [],
  };

  const handleCreateProposal = async () => {
    if (!selectedMentee || !selectedCandidate || !selectedProgram) {
      return;
    }

    if (!activeProgramId) {
      pushToast({
        title: "Program Required",
        description: "Select a program before creating a proposal.",
        variant: "error",
      });
      return;
    }

    if (!selectedProgram.proposalEnabled) {
      pushToast({
        title: "Program not open for matching",
        description: `${selectedProgram.name} is currently marked as ${selectedProgram.stateLabel.toLowerCase()}.`,
        variant: "error",
      });
      return;
    }

    try {
      await createProposalMutation.mutateAsync({
        mentorUserId: selectedCandidate.mentorUserId,
        menteeUserId: selectedMentee.userId,
        programId: activeProgramId,
      });

      pushToast({
        title: "Proposal Created",
        description: `${selectedCandidate.name} has been proposed for ${selectedMentee.fullName}.`,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Could Not Create Proposal",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const openProposalConfirm = () => {
    if (!selectedMentee || !selectedCandidate || !selectedProgram) {
      return;
    }

    setProposalComposerOpen(false);
    setProposalConfirmDraft({
      menteeName: selectedMentee.fullName,
      mentorName: selectedCandidate.name,
      programName: selectedProgram.name,
      programStateLabel: selectedProgram.stateLabel,
      checkInFrequency,
      reasons: selectedCandidate.matchReasons,
      risks: selectedCandidate.riskFlags,
    });
  };

  const submitProposalResponse = async (
    item: MatchProposalQueueItem,
    decision: "ACCEPT" | "DECLINE",
    options?: { category?: MatchDeclineCategory; reason?: string },
  ) => {
    try {
      await respondMutation.mutateAsync({
        mentorshipId: item.mentorshipId,
        decision,
        category: options?.category,
        reason: options?.reason,
      });
      pushToast({
        title: decision === "ACCEPT" ? "Proposal Accepted" : "Proposal Declined",
        description: `${item.mentor.name} and ${item.mentee.name}`,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Response Failed",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const handleRespond = async (item: MatchProposalQueueItem, decision: "ACCEPT" | "DECLINE") => {
    if (decision === "DECLINE") {
      setDeclineDraft({
        item,
        category: "",
        reason: "",
      });
      return;
    }

    await submitProposalResponse(item, decision);
  };

  const handleDeclineSubmit = async () => {
    if (!declineDraft) {
      return;
    }

    if (!declineDraft.category) {
      pushToast({
        title: "Decline category required",
        description: "Select a category so the matching engine can learn from the decline.",
        variant: "error",
      });
      return;
    }

    const item = declineDraft.item;
    const category = declineDraft.category;
    const reason = declineDraft.reason.trim() || undefined;
    setDeclineDraft(null);
    await submitProposalResponse(item, "DECLINE", { category, reason });
  };

  const closeDeclineModal = () => {
    if (!respondMutation.isPending) {
      setDeclineDraft(null);
    }
  };

  const declineHelper = declineCategories.find((option) => option.value === declineDraft?.category)?.description;

  if (!isCoordinator && !canViewProposalQueue) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="You do not have matching permissions for this workspace." />
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Decision Support</p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Matching</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Move from mentee queue to ranked mentor suggestions, then create explainable proposals with visible fit reasons and risks.
          </p>
        </section>

        {isCoordinator ? <MatchingOverviewCards summary={dashboardStats} /> : null}
        {isCoordinator ? (
          <Card className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => setPressureOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[var(--surface-2)]/40"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Matching Pressure</p>
                <p className="mt-1 text-sm text-[var(--text)]">
                  {pressureOpen
                    ? "Hide limiting-resource insights and recommendations."
                    : "Show limiting-resource insights, mentor supply gap, and what to ramp up next."}
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
                {pressureOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            </button>
            {pressureOpen ? (
              <div className="border-t border-[var(--border)] px-5 py-5">
                <MatchingBottlenecksPanel summary={dashboardStats} insights={matchingInsights} />
              </div>
            ) : null}
          </Card>
        ) : null}

        {isCoordinator ? (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Matching Workspace</p>
                <p className="text-xs text-[var(--muted)]">Work the learner queue, review suggestions, and track proposal responses in separate modes.</p>
              </div>
              <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/55 p-1">
                <button
                  type="button"
                  onClick={() => setMatchingTab("CREATE")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    matchingTab === "CREATE" ? "bg-[var(--surface)] text-[var(--text)] shadow-[0_6px_16px_rgba(15,23,42,0.08)]" : "text-[var(--muted)]"
                  }`}
                >
                  Create Matches
                </button>
                <button
                  type="button"
                  onClick={() => setMatchingTab("PIPELINE")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    matchingTab === "PIPELINE" ? "bg-[var(--surface)] text-[var(--text)] shadow-[0_6px_16px_rgba(15,23,42,0.08)]" : "text-[var(--muted)]"
                  }`}
                >
                  Proposal Pipeline
                </button>
              </div>
            </div>

            {matchingTab === "CREATE" ? (
              <>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="relative md:col-span-3">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
                    <Input
                      className="pl-9"
                      placeholder="Search by student, school, email"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  <select
                    className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                    value={stageFilter}
                    onChange={(event) => setStageFilter(event.target.value as (typeof stageFilters)[number])}
                  >
                    {stageFilters.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage === "ALL" ? "All Intake Stages" : formatEnum(stage)}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                    value={blockerFilter}
                    onChange={(event) => setBlockerFilter(event.target.value as BlockerFilter)}
                  >
                    <option value="ALL">All blocker groups</option>
                    <option value="READY">Ready only ({blockerCounts.READY})</option>
                    <option value="CONSENT">Consent blockers ({blockerCounts.CONSENT})</option>
                    <option value="PROGRAM">Program blockers ({blockerCounts.PROGRAM})</option>
                    <option value="CAPACITY">Capacity blockers ({blockerCounts.CAPACITY})</option>
                    <option value="OTHER">Other blockers ({blockerCounts.OTHER})</option>
                  </select>

                  <Button variant="secondary" className="gap-2" onClick={() => void refresh()} disabled={intakeQuery.isFetching || overviewQuery.isFetching}>
                    {intakeQuery.isFetching || overviewQuery.isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>

                {intakeQuery.isLoading ? <SectionSkeleton rows={8} /> : null}
                {intakeQuery.error ? (
                  <ErrorState
                    title="Could not load matching intake"
                    description={intakeQuery.error.message || "Try refreshing."}
                    onRetry={() => {
                      void intakeQuery.refetch();
                    }}
                  />
                ) : null}

                {!intakeQuery.isLoading && !intakeQuery.error ? (
                  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.45fr]">
                    <MatchingQueueTable
                      items={filteredIntakeRows}
                      activeProfileId={selectedMentee?.profileId ?? null}
                      onSelect={(profileId) => {
                        setSelectedMenteeProfileId(profileId);
                        setSelectedProgramId("");
                        setSelectedMentorUserId(null);
                      }}
                    />

                    <div className="space-y-4">
                      {!selectedMentee ? (
                        <EmptyState title="Select a learner" description="Choose a learner from the queue to open their matching side panel." />
                      ) : (
                        <>
                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Selected learner</p>
                                <p className="mt-2 text-lg font-semibold text-[var(--text)]">{selectedMentee.fullName}</p>
                                <p className="mt-1 text-sm text-[var(--muted)]">
                                  {selectedMentee.schoolName} • {formatEnum(selectedMentee.educationLevel)} • Preferred {formatEnum(selectedMentee.preferredFormat)}
                                </p>
                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setBlockerDrawerOpen(true)}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                                    >
                                      View blocker details
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                    <Link
                                      href={`/people/mentees/${selectedMentee.profileId}`}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                                    >
                                      View full learner record
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-medium text-[var(--text)]">
                                  {selectedMentee.openMentorships}/{selectedMentee.maxOpenMentorships} open
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 font-medium ${
                                    selectedMentee.eligibleForProposal ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {selectedMentee.eligibleForProposal ? "Ready for proposal" : "Blocked"}
                                </span>
                                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-medium text-[var(--text)]">
                                  {formatEnum(selectedMentee.intakeStage)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
                              <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Interest profile</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {selectedMentee.interests.length === 0 ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">No interests tagged</span>
                                  ) : (
                                    selectedMentee.interests.slice(0, 8).map((interest) => (
                                      <span key={interest} className="rounded-full bg-sky-100 px-2 py-1 text-[11px] text-sky-800">
                                        {interest}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className="rounded-xl bg-[var(--surface-2)]/55 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Programs in scope</p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {selectedMentee.programOptions.length === 0 ? (
                                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-medium text-rose-800">
                                          No eligible programs
                                        </span>
                                      ) : (
                                        selectedMentee.programOptions.map((program) => (
                                          <span
                                            key={program.id}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                              program.proposalEnabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                            }`}
                                          >
                                            {program.name} • {program.stateLabel}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    disabled={!selectedCandidate || !activeProgramId}
                                    onClick={() => setProposalComposerOpen(true)}
                                  >
                                    Prepare proposal
                                  </Button>
                                </div>
                                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
                                  {selectedCandidateSummary}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text)]">Suggested matches</p>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                  Ranked mentors for this learner, with fit reasons and visible risks.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {candidateItems.length > 1 ? (
                                  <Button size="sm" variant="secondary" onClick={compareTopThree}>
                                    Compare top 3
                                  </Button>
                                ) : null}
                                {comparedMentorUserIds.length > 0 ? (
                                  <Button size="sm" variant="ghost" onClick={() => setComparedMentorUserIds([])}>
                                    Clear compare
                                  </Button>
                                ) : null}
                                {selectedCandidate ? (
                                  <Button size="sm" variant="secondary" onClick={() => setProposalComposerOpen(true)}>
                                    Open composer
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-4">
                              <MatchingComparePanel
                                items={comparedCandidates}
                                selectedMentorUserId={selectedCandidate?.mentorUserId ?? null}
                                onSelect={setSelectedMentorUserId}
                                onRemove={(mentorUserId) =>
                                  setComparedMentorUserIds((current) => current.filter((id) => id !== mentorUserId))
                                }
                              />
                              {comparedCandidates.length > 0 ? <div className="mt-4" /> : null}
                              {candidateQuery.isLoading ? <SectionSkeleton rows={5} /> : null}
                              {candidateQuery.error ? (
                                <ErrorState
                                  title="Could not load mentor suggestions"
                                  description={candidateQuery.error.message || "Try refreshing."}
                                  onRetry={() => {
                                    void candidateQuery.refetch();
                                  }}
                                />
                              ) : null}

                              {!candidateQuery.isLoading && !candidateQuery.error ? (
                                <MatchingSuggestionCards
                                  items={candidateItems}
                                  selectedMentorUserId={selectedCandidate?.mentorUserId ?? null}
                                  comparedMentorUserIds={comparedMentorUserIds}
                                  onSelect={setSelectedMentorUserId}
                                  onToggleCompare={toggleComparedMentor}
                                />
                              ) : null}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {matchingTab === "PIPELINE" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text)]">Proposal Queue</p>
                    <p className="text-xs text-[var(--muted)]">Track pending acceptance, active relationships, and declined proposals.</p>
                  </div>

                  <select
                    className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                    value={proposalStatus}
                    onChange={(event) => setProposalStatus(event.target.value as (typeof proposalStatusFilters)[number])}
                  >
                    {proposalStatusFilters.map((status) => (
                      <option key={status} value={status}>
                        {status === "ALL" ? "All Proposal Statuses" : formatEnum(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {proposalQuery.isLoading ? <SectionSkeleton rows={6} /> : null}
                {proposalQuery.error ? (
                  <ErrorState
                    title="Could not load proposal queue"
                    description={proposalQuery.error.message || "Try refreshing."}
                    onRetry={() => {
                      void proposalQuery.refetch();
                    }}
                  />
                ) : null}

                {!proposalQuery.isLoading && !proposalQuery.error ? (
                  <MatchingProposalsTable
                    items={proposalRows}
                    canActorRespond={(item) => canActorRespond(item, user?.id)}
                    onRespond={(item, decision) => {
                      void handleRespond(item, decision);
                    }}
                    isResponding={respondMutation.isPending}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : (
          <Card>
            <EmptyState title="Coordinator Matching Workspace" description="Admins create mentor proposals. Your proposal actions are available below." />
          </Card>
        )}
      </div>

      <Modal
        open={proposalComposerOpen}
        onClose={() => {
          if (!createProposalMutation.isPending) {
            setProposalComposerOpen(false);
          }
        }}
        title="Prepare proposal"
        description="Confirm the program, cadence, and selected mentor for this learner before moving into final review."
        size="lg"
        icon={<ArrowRightLeft className="h-5 w-5" />}
      >
        <MatchingProposalComposer
          mentee={selectedMentee}
          candidate={selectedCandidate}
          selectedProgram={selectedProgram}
          activeProgramId={activeProgramId}
          onProgramChange={setSelectedProgramId}
          checkInFrequency={checkInFrequency}
          onCheckInChange={setCheckInFrequency}
          onRefresh={() => {
            void candidateQuery.refetch();
          }}
          onReview={openProposalConfirm}
          isRefreshing={candidateQuery.isFetching}
          isSubmitting={createProposalMutation.isPending}
        />
      </Modal>

      <MatchingBlockerDrawer open={blockerDrawerOpen} mentee={selectedMentee} onClose={() => setBlockerDrawerOpen(false)} />

      <Modal
        open={Boolean(proposalConfirmDraft)}
        onClose={() => {
          if (!createProposalMutation.isPending) {
            setProposalConfirmDraft(null);
          }
        }}
        title="Confirm proposal"
        description="Review the selected mentor, learner, program, and cadence before creating the proposal."
        size="lg"
        icon={<ArrowRightLeft className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/55 p-4">
            <p className="text-sm font-semibold text-[var(--text)]">
              {proposalConfirmDraft?.mentorName} <span className="text-[var(--muted)]">×</span> {proposalConfirmDraft?.menteeName}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {proposalConfirmDraft?.programName} • {proposalConfirmDraft?.programStateLabel} • {proposalConfirmDraft ? formatEnum(proposalConfirmDraft.checkInFrequency) : ""}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Why this match is being suggested</p>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900/85">
                {proposalConfirmDraft?.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Risks to review before sending</p>
              {proposalConfirmDraft?.risks.length ? (
                <ul className="mt-3 space-y-2 text-sm text-amber-900/85">
                  {proposalConfirmDraft.risks.map((risk) => <li key={risk}>• {risk}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-amber-900/85">No significant matching risks are currently flagged.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button
              variant="secondary"
              onClick={() => setProposalConfirmDraft(null)}
              disabled={createProposalMutation.isPending}
            >
              Back
            </Button>
            <Button
              onClick={() => void handleCreateProposal().finally(() => setProposalConfirmDraft(null))}
              disabled={createProposalMutation.isPending}
            >
              {createProposalMutation.isPending ? "Creating..." : "Confirm proposal"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(declineDraft)}
        onClose={closeDeclineModal}
        title="Decline proposal"
        description="Choose the main reason so future matching suggestions can apply the right learning penalty. Add an optional note if coordinators need more context."
        size="lg"
        icon={<AlertTriangle className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/55 p-4">
            <p className="text-sm font-semibold text-[var(--text)]">
              {declineDraft?.item.mentor.name} <span className="text-[var(--muted)]">×</span> {declineDraft?.item.mentee.name}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{declineDraft?.item.program.name}</p>
          </div>

          <label className="grid gap-2 text-sm text-[var(--text)]">
            <span className="font-medium">Decline category *</span>
            <select
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              value={declineDraft?.category ?? ""}
              onChange={(event) =>
                setDeclineDraft((current) =>
                  current
                    ? {
                        ...current,
                        category: event.target.value as MatchDeclineCategory | "",
                      }
                    : current,
                )
              }
            >
              <option value="">Select a category</option>
              {declineCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--muted)]">{declineHelper ?? "Select the main reason for the decline."}</span>
          </label>

          <label className="grid gap-2 text-sm text-[var(--text)]">
            <span className="font-medium">Optional note</span>
            <Textarea
              value={declineDraft?.reason ?? ""}
              onChange={(event) =>
                setDeclineDraft((current) =>
                  current
                    ? {
                        ...current,
                        reason: event.target.value.slice(0, 500),
                      }
                    : current,
                )
              }
              placeholder="Add extra context for coordinators or future matching decisions"
              rows={5}
            />
            <span className="text-xs text-[var(--muted)]">{(declineDraft?.reason.length ?? 0)}/500 characters</span>
          </label>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" onClick={closeDeclineModal} disabled={respondMutation.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDeclineSubmit()} disabled={respondMutation.isPending}>
              {respondMutation.isPending ? "Declining..." : "Decline Proposal"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
