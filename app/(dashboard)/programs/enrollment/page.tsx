"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Search, Send, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import type { MentorProgramApplicationWorkspaceRow } from "@/lib/api-types";
import { hasPermission } from "@/lib/permissions";
import {
  fetchMentorProgramApplicationsWorkspace,
  reviewMentorProgramApplication,
} from "@/lib/program-discovery-actions";

const reviewStatuses = ["ALL", "PENDING", "APPROVED", "WAITLISTED", "REJECTED", "WITHDRAWN"] as const;

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

type ReviewAction =
  | {
      row: MentorProgramApplicationWorkspaceRow;
      status: "APPROVED" | "WAITLISTED" | "REJECTED";
    }
  | null;

export default function ProgramApplicationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof reviewStatuses)[number]>("PENDING");
  const [reviewAction, setReviewAction] = useState<ReviewAction>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const canReview = hasPermission(user?.role, "programs.manage");

  const query = useQuery({
    queryKey: ["mentor-program-applications-workspace", search, status],
    queryFn: () =>
      fetchMentorProgramApplicationsWorkspace({
        search,
        status,
      }),
    enabled: canReview,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { applicationId: string; status: "APPROVED" | "WAITLISTED" | "REJECTED"; reviewNotes?: string }) =>
      reviewMentorProgramApplication(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mentor-program-applications-workspace"] });
      await queryClient.invalidateQueries({ queryKey: ["mentor-program-discover"] });
      await queryClient.invalidateQueries({ queryKey: ["matching-candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });

  const rows = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  if (!canReview) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only admin roles can review mentor program applications." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Program Mentor Pool</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Review mentor program applications.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Approve, waitlist, or reject mentors into program-specific pools before they become eligible for matching.
        </p>
      </section>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
            <Input
              className="pl-9"
              placeholder="Search mentor, program, school"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof reviewStatuses)[number])}
          >
            {reviewStatuses.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All statuses" : formatEnum(item)}
              </option>
            ))}
          </select>
        </div>

        {query.isLoading ? <SectionSkeleton rows={8} /> : null}
        {query.error ? (
          <ErrorState
            title="Could not load application queue"
            description={query.error.message || "Try again."}
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {!query.isLoading && !query.error ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Mentor</th>
                  <th className="px-3 py-3 font-semibold">Program</th>
                  <th className="px-3 py-3 font-semibold">Application</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-5 text-[var(--muted)]" colSpan={5}>
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--border)] align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[var(--text)]">{row.mentor.name}</p>
                        <p className="text-xs text-[var(--muted)]">{row.mentor.email}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">Onboarding: {row.mentor.onboardingStage ? formatEnum(row.mentor.onboardingStage) : "-"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[var(--text)]">{row.program.name}</p>
                        <p className="text-xs text-[var(--muted)]">{row.program.schoolName}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          {formatEnum(row.program.category)} • {formatEnum(row.program.programStatus)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p>{row.commitmentHoursPerMonth} hrs/month</p>
                        <p>{row.interestAreas.join(", ")}</p>
                        <p>Applied: {formatDate(row.appliedAt)}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p className="font-medium text-[var(--text)]">{formatEnum(row.status)}</p>
                        <p>{row.reviewedAt ? `Reviewed ${formatDate(row.reviewedAt)}` : "Pending review"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            label="Approve"
                            tone="approve"
                            disabled={row.status === "APPROVED"}
                            onClick={() => {
                              setReviewAction({ row, status: "APPROVED" });
                              setReviewNotes(row.reviewNotes ?? "");
                            }}
                          />
                          <ActionButton
                            label="Waitlist"
                            tone="waitlist"
                            disabled={row.status === "WAITLISTED"}
                            onClick={() => {
                              setReviewAction({ row, status: "WAITLISTED" });
                              setReviewNotes(row.reviewNotes ?? "");
                            }}
                          />
                          <ActionButton
                            label="Reject"
                            tone="reject"
                            disabled={row.status === "REJECTED"}
                            onClick={() => {
                              setReviewAction({ row, status: "REJECTED" });
                              setReviewNotes(row.reviewNotes ?? "");
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Modal
        open={Boolean(reviewAction)}
        onClose={() => setReviewAction(null)}
        title="Review Application"
        description="Update the mentor’s status inside this program pool."
        icon={<ClipboardCheck className="h-4 w-4" />}
      >
        <form
          className="space-y-4"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            if (!reviewAction) {
              return;
            }

            try {
              await reviewMutation.mutateAsync({
                applicationId: reviewAction.row.id,
                status: reviewAction.status,
                reviewNotes: reviewNotes.trim() || undefined,
              });
              pushToast({
                title: "Application reviewed",
                description: `${reviewAction.row.mentor.name} marked ${formatEnum(reviewAction.status)}.`,
                variant: "success",
              });
              setReviewAction(null);
            } catch (error) {
              pushToast({
                title: "Could not review application",
                description: error instanceof Error ? error.message : "Request failed.",
                variant: "error",
              });
            }
          }}
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="font-semibold text-[var(--text)]">{reviewAction?.row.mentor.name}</p>
            <p className="text-sm text-[var(--muted)]">{reviewAction?.row.program.name}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">Availability</p>
            <p>{reviewAction?.row.availabilityNotes}</p>
            <p className="mt-3 font-medium text-[var(--text)]">Interest Areas</p>
            <p>{reviewAction?.row.interestAreas.join(", ")}</p>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Review Notes</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReviewAction(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? "Saving..." : `Mark ${reviewAction ? formatEnum(reviewAction.status) : ""}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  tone: "approve" | "waitlist" | "reject";
  disabled: boolean;
  onClick: () => void;
}) {
  const styles =
    tone === "approve"
      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
      : tone === "waitlist"
        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
        : "bg-rose-100 text-rose-800 hover:bg-rose-200";

  const Icon = tone === "approve" ? ShieldCheck : tone === "waitlist" ? Send : UserRound;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${styles}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
