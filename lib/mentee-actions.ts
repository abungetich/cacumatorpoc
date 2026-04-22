import { apiFetch } from "@/lib/api-client";
import type { MenteeRow, MenteesResponse } from "@/lib/api-types";

export type CreateMenteePayload = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  school?: string;
  schoolId?: string;
  educationLevel: string;
};

export function fetchMentees() {
  return apiFetch<MenteesResponse>("/api/protected/mentees");
}

export function createMenteeRecord(payload: CreateMenteePayload) {
  return apiFetch<{ ok: boolean; item: MenteeRow }>("/api/protected/mentees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function flagMenteeRecord(menteeProfileId: string) {
  return apiFetch<{ ok: boolean }>(`/api/protected/mentees/${menteeProfileId}/flag`, {
    method: "POST",
  });
}
