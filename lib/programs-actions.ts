import { apiFetch } from "@/lib/api-client";
import type { ProgramWorkspaceResponse } from "@/lib/api-types";
import type { SchoolProgramPayload } from "@/lib/school-management-actions";

export function fetchProgramsWorkspace(params?: {
  search?: string;
  schoolId?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  category?: string;
  lifecycle?: "ALL" | "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
}) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.schoolId?.trim()) {
    query.set("schoolId", params.schoolId.trim());
  }

  if (params?.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  if (params?.category?.trim() && params.category !== "ALL") {
    query.set("category", params.category.trim());
  }

  if (params?.lifecycle && params.lifecycle !== "ALL") {
    query.set("lifecycle", params.lifecycle);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ProgramWorkspaceResponse>(`/api/protected/programs/workspace${suffix}`);
}

export function createProgramFromWorkspace(payload: SchoolProgramPayload & { schoolId?: string }) {
  return apiFetch<{ ok: boolean }>("/api/protected/programs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProgramFromWorkspace(programId: string, payload: SchoolProgramPayload) {
  return apiFetch<{ ok: boolean }>(`/api/protected/programs/${programId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProgramFromWorkspace(programId: string) {
  return apiFetch<{ ok: boolean }>(`/api/protected/programs/${programId}`, {
    method: "DELETE",
  });
}
