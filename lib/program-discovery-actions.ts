import { apiFetch } from "@/lib/api-client";
import type {
  MentorProgramApplicationWorkspaceResponse,
  MentorProgramDiscoverResponse,
} from "@/lib/api-types";

export function fetchMentorProgramDiscover(params?: {
  search?: string;
  category?: string;
  status?: string;
}) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.category?.trim() && params.category !== "ALL") {
    query.set("category", params.category.trim());
  }

  if (params?.status?.trim() && params.status !== "ALL") {
    query.set("status", params.status.trim());
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<MentorProgramDiscoverResponse>(`/api/protected/programs/discover${suffix}`);
}

export function applyToProgram(payload: {
  programId: string;
  availabilityNotes: string;
  interestAreas: string[];
  commitmentHoursPerMonth: number;
  applicationNote?: string;
}) {
  return apiFetch<{ ok: boolean }>("/api/protected/programs/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMentorProgramApplicationsWorkspace(params?: {
  search?: string;
  status?: "ALL" | "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN";
}) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<MentorProgramApplicationWorkspaceResponse>(`/api/protected/programs/applications/workspace${suffix}`);
}

export function reviewMentorProgramApplication(payload: {
  applicationId: string;
  status: "APPROVED" | "WAITLISTED" | "REJECTED";
  reviewNotes?: string;
}) {
  return apiFetch<{ ok: boolean }>(`/api/protected/programs/applications/${payload.applicationId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: payload.status,
      reviewNotes: payload.reviewNotes,
    }),
  });
}
