import { apiFetch } from "@/lib/api-client";
import type { PeopleMenteesResponse, PeopleMentorsResponse, PeopleOverviewResponse } from "@/lib/api-types";

export type MentorIntakeAction =
  | "BACKGROUND_CLEAR"
  | "BACKGROUND_FAIL"
  | "COMPLETE_TRAINING"
  | "AGREE_SAFEGUARDING"
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "DEACTIVATE"
  | "REACTIVATE";

export type MenteeIntakeAction =
  | "APPROVE_FOR_MATCHING"
  | "MARK_MATCHED"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "REOPEN_WAITING";

export function fetchPeopleOverview() {
  return apiFetch<PeopleOverviewResponse>("/api/protected/people/intake/overview");
}

export function fetchPeopleMentors(params?: {
  search?: string;
  mentorState?: string;
  newRegistrations?: boolean;
  declinedConsents?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params?.mentorState?.trim() && params.mentorState !== "ALL") {
    query.set("mentorState", params.mentorState);
  }
  if (params?.newRegistrations) {
    query.set("newRegistrations", "1");
  }
  if (params?.declinedConsents) {
    query.set("declinedConsents", "1");
  }
  if (params?.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  if (params?.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<PeopleMentorsResponse>(`/api/protected/people/intake/mentors${suffix}`);
}

export function fetchPeopleMentees(params?: {
  search?: string;
  menteeStage?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params?.menteeStage?.trim() && params.menteeStage !== "ALL") {
    query.set("menteeStage", params.menteeStage);
  }
  if (params?.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  if (params?.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<PeopleMenteesResponse>(`/api/protected/people/intake/mentees${suffix}`);
}

export function fetchMenteeDetail(menteeProfileId: string) {
  return apiFetch<import("@/lib/api-types").MenteeDetailResponse>(`/api/protected/people/mentees/${menteeProfileId}`);
}

export function transitionMentorIntake(mentorUserId: string, action: MentorIntakeAction, reason?: string) {
  return apiFetch<{ ok: boolean; item: unknown }>(`/api/protected/mentor-engine/${mentorUserId}`, {
    method: "POST",
    body: JSON.stringify({
      action,
      reason,
    }),
  });
}

export function fetchMentorDetail(mentorUserId: string) {
  return apiFetch<import("@/lib/api-types").MentorDetailResponse>(`/api/protected/mentor-engine/${mentorUserId}`);
}

export function transitionMentorDetail(
  mentorUserId: string,
  action: MentorIntakeAction,
  payload?: {
    reason?: string;
    details?: import("@/lib/api-types").MentorTransitionDetailPayload;
  },
) {
  return apiFetch<import("@/lib/api-types").MentorDetailResponse>(`/api/protected/mentor-engine/${mentorUserId}`, {
    method: "POST",
    body: JSON.stringify({
      action,
      reason: payload?.reason,
      details: payload?.details,
    }),
  });
}

export async function uploadMentorTrainingEvidence(mentorUserId: string, file: File) {
  const formData = new FormData();
  formData.append("evidence", file);

  const response = await fetch(`/api/protected/mentor-engine/${mentorUserId}/training-evidence`, {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as {
    ok?: boolean;
    evidenceUrl?: string;
    evidenceName?: string;
    evidenceMime?: string;
    evidenceSize?: number;
    message?: string;
  };

  if (!response.ok || !body.ok || !body.evidenceUrl) {
    throw new Error(body.message ?? "Could not upload training evidence");
  }

  return body;
}

export function addMentorNote(mentorUserId: string, message: string) {
  return apiFetch<import("@/lib/api-types").MentorDetailResponse>(`/api/protected/mentor-engine/${mentorUserId}/notes`, {
    method: "POST",
    body: JSON.stringify({
      message,
    }),
  });
}

export function manageMentorVerification(
  mentorUserId: string,
  action: "RESEND_EMAIL" | "GENERATE_LINK",
) {
  return apiFetch<import("@/lib/api-types").MentorDetailResponse & { verificationUrl: string; expiresAt: string }>(
    `/api/protected/mentor-engine/${mentorUserId}/verification`,
    {
      method: "POST",
      body: JSON.stringify({
        action,
      }),
    },
  );
}

export function transitionMenteeIntake(menteeProfileId: string, action: MenteeIntakeAction, reason?: string) {
  return apiFetch<{ ok: boolean; item: { id: string; status: string } }>(
    `/api/protected/people/mentees/${menteeProfileId}/transition`,
    {
      method: "POST",
      body: JSON.stringify({
        action,
        reason,
      }),
    },
  );
}
