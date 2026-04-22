import { apiFetch } from "@/lib/api-client";
import type {
  MatchCandidatesResponse,
  MatchingOverviewResponse,
  MatchProposalsResponse,
  MatchProposalResponse,
  MatchingIntakeResponse,
  MatchingIntakeStage,
} from "@/lib/api-types";

export function fetchMatchingOverview() {
  return apiFetch<MatchingOverviewResponse>("/api/protected/matching/overview");
}

export function fetchMatchingIntake(params?: {
  search?: string;
  stage?: MatchingIntakeStage | "ALL";
}) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.stage && params.stage !== "ALL") {
    query.set("stage", params.stage);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<MatchingIntakeResponse>(`/api/protected/matching/intake${suffix}`);
}

export function fetchMatchCandidates(menteeUserId: string, programId: string, limit = 8) {
  const query = new URLSearchParams({
    menteeUserId,
    programId,
    limit: String(Math.min(Math.max(limit, 1), 50)),
  });

  return apiFetch<MatchCandidatesResponse>(`/api/protected/matching/candidates?${query.toString()}`);
}

export function createMatchProposalRequest(payload: {
  programId: string;
  mentorUserId: string;
  menteeUserId: string;
  checkInFrequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
}) {
  return apiFetch<{ ok: boolean; item: MatchProposalResponse }>("/api/protected/matching/proposals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMatchProposals(params?: {
  status?: "ALL" | "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "TERMINATED";
  limit?: number;
}) {
  const query = new URLSearchParams();

  if (params?.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  if (params?.limit) {
    query.set("limit", String(Math.min(Math.max(params.limit, 1), 200)));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<MatchProposalsResponse>(`/api/protected/matching/proposals${suffix}`);
}

export function respondToMatchProposalRequest(payload: {
  mentorshipId: string;
  decision: "ACCEPT" | "DECLINE";
  category?: "AVAILABILITY" | "FORMAT" | "FIT" | "CONTEXT" | "OTHER";
  reason?: string;
}) {
  return apiFetch<{ ok: boolean; item: MatchProposalResponse }>(
    `/api/protected/matching/proposals/${payload.mentorshipId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({
        decision: payload.decision,
        category: payload.category,
        reason: payload.reason,
      }),
    },
  );
}
