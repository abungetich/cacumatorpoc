import { apiFetch } from "@/lib/api-client";
import type {
  RelationshipMutationResponse,
  RelationshipsOverviewResponse,
} from "@/lib/api-types";

export function fetchRelationshipsOverview(params?: {
  search?: string;
  status?: "ALL" | "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "TERMINATED";
  risk?: "ALL" | "AT_RISK" | "ON_TRACK" | "REVIEW_DUE";
}) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  if (params?.risk && params.risk !== "ALL") {
    query.set("risk", params.risk);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<RelationshipsOverviewResponse>(`/api/protected/relationships/overview${suffix}`);
}

export function logRelationshipSessionRequest(
  mentorshipId: string,
  payload: {
    scheduledDate: string;
    actualDate?: string;
    durationMinutes: number;
    format: "ONLINE" | "IN_PERSON" | "PHONE";
    location?: string;
    meetingLink?: string;
    topicsCovered: string[];
    sessionNotes: string;
    attendanceStatus: "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
    nextScheduledSession?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: RelationshipMutationResponse }>(
    `/api/protected/relationships/${mentorshipId}/session`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function transitionRelationshipStatusRequest(
  mentorshipId: string,
  payload: {
    action: "PAUSE" | "RESUME" | "COMPLETE" | "TERMINATE";
    reason?: string;
    outcome?: "SUCCESSFUL" | "PARTIAL" | "UNSUCCESSFUL";
  },
) {
  return apiFetch<{ ok: boolean; item: RelationshipMutationResponse }>(
    `/api/protected/relationships/${mentorshipId}/status`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function submitRelationshipReviewRequest(
  mentorshipId: string,
  payload: {
    type: "MID_TERM" | "END_TERM" | "MONTHLY";
    rating: number;
    strengths?: string;
    areasForImprovement?: string;
    comments?: string;
    isAnonymous?: boolean;
  },
) {
  return apiFetch<{ ok: boolean; item: RelationshipMutationResponse }>(
    `/api/protected/relationships/${mentorshipId}/review`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
