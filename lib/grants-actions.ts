import { apiFetch } from "@/lib/api-client";
import type { GrantOpportunityDetailResponse, GrantTaskAssigneesResponse, GrantWorkspaceResponse } from "@/lib/api-types";

export function fetchGrantWorkspace(params?: {
  search?: string;
  stage?: "ALL" | "DISCOVERY" | "APPROVAL" | "WRITING" | "SUBMISSION" | "SUBMITTED" | "CLOSED";
}) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.stage && params.stage !== "ALL") {
    query.set("stage", params.stage);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<GrantWorkspaceResponse>(`/api/protected/grants/workspace${suffix}`);
}

export function fetchGrantTaskAssignees() {
  return apiFetch<GrantTaskAssigneesResponse>("/api/protected/grants/assignees");
}

export function fetchGrantOpportunityDetail(opportunityId: string) {
  return apiFetch<GrantOpportunityDetailResponse>(`/api/protected/grants/opportunities/${opportunityId}`);
}

export function createGrantOpportunityRequest(payload: {
  title: string;
  funderName: string;
  description?: string;
  sourceType?: "TEAM" | "BOARD" | "WEBSITE" | "LINKEDIN" | "EMAIL" | "REFERRAL" | "OTHER";
  sourceReference?: string;
  sourceUrl?: string;
  attachment?: File | null;
  deadline: string;
  status?: "DISCOVERED" | "QUALIFYING" | "PURSUING" | "ARCHIVED";
  fitScore?: number;
  country?: string;
  currencyCode: string;
  amountMinor: string;
  schoolId?: string;
  partnerId?: string;
}) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("funderName", payload.funderName);
  formData.append("deadline", payload.deadline);
  formData.append("currencyCode", payload.currencyCode);
  formData.append("amountMinor", payload.amountMinor);

  if (payload.description?.trim()) formData.append("description", payload.description.trim());
  if (payload.sourceType) formData.append("sourceType", payload.sourceType);
  if (payload.sourceReference?.trim()) formData.append("sourceReference", payload.sourceReference.trim());
  if (payload.sourceUrl?.trim()) formData.append("sourceUrl", payload.sourceUrl.trim());
  if (payload.status) formData.append("status", payload.status);
  if (typeof payload.fitScore === "number") formData.append("fitScore", String(payload.fitScore));
  if (payload.country?.trim()) formData.append("country", payload.country.trim());
  if (payload.schoolId) formData.append("schoolId", payload.schoolId);
  if (payload.partnerId) formData.append("partnerId", payload.partnerId);
  if (payload.attachment instanceof File) formData.append("attachment", payload.attachment);

  return fetch("/api/protected/grants/opportunities", {
    method: "POST",
    body: formData,
  }).then(async (response) => {
    const body = (await response.json()) as { message?: string; ok: boolean; item: { id: string } };
    if (!response.ok) {
      throw new Error(body.message ?? "Request failed");
    }
    return body;
  });
}

export function createGrantApplicationRequest(payload: {
  opportunityId: string;
  title?: string;
  currencyCode?: string;
  amountRequestedMinor: string;
}) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>("/api/protected/grants/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function scoreGrantOpportunityRequest(
  opportunityId: string,
  payload: {
    timelineScore: number;
    amountScore: number;
    areaScore: number;
    eligibilityScore: number;
    readinessScore: number;
    notes?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; fitScore: number } }>(
    `/api/protected/grants/opportunities/${opportunityId}/score`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function createGrantOpportunityLotRequest(
  opportunityId: string,
  payload: {
    description: string;
    quantity: number;
    minBudgetMinor: string;
    maxBudgetMinor: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string } }>(`/api/protected/grants/opportunities/${opportunityId}/lots`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateGrantOpportunityLotRequest(
  opportunityId: string,
  lotId: string,
  payload: {
    description: string;
    quantity: number;
    minBudgetMinor: string;
    maxBudgetMinor: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string } }>(
    `/api/protected/grants/opportunities/${opportunityId}/lots/${lotId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteGrantOpportunityLotRequest(opportunityId: string, lotId: string) {
  return apiFetch<{ ok: boolean; item: { id: string } }>(
    `/api/protected/grants/opportunities/${opportunityId}/lots/${lotId}`,
    {
      method: "DELETE",
    },
  );
}

export function createGrantTaskRequest(
  applicationId: string,
  payload: {
    title: string;
    description?: string;
    section?: string;
    assigneeId: string;
    dueDate?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(
    `/api/protected/grants/applications/${applicationId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateGrantTaskRequest(
  taskId: string,
  payload: {
    status: "TODO" | "IN_PROGRESS" | "DONE";
    completionNotes?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(`/api/protected/grants/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadGrantTaskEvidenceRequest(taskId: string, evidence: File) {
  const formData = new FormData();
  formData.append("evidence", evidence);

  return fetch(`/api/protected/grants/tasks/${taskId}/evidence`, {
    method: "POST",
    body: formData,
  }).then(async (response) => {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      const text = await response.text();
      const looksLikeHtml = /^\s*<!doctype html/i.test(text);
      const suffix = looksLikeHtml ? "Server returned HTML instead of JSON." : "Server returned a non-JSON response.";
      throw new Error(`Request failed (${response.status}): ${suffix}`);
    }

    const body = (await response.json()) as {
      message?: string;
      ok: boolean;
      item: { id: string; stage: string };
    };

    if (!response.ok) {
      throw new Error(body.message ?? `Request failed (${response.status})`);
    }
    return body;
  });
}

export function reviewGrantTaskRequest(
  taskId: string,
  payload: {
    decision: "APPROVE" | "REWORK";
    notes?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(`/api/protected/grants/tasks/${taskId}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateGrantTaskDetailsRequest(
  taskId: string,
  payload: {
    title: string;
    description?: string;
    section?: string;
    assigneeId: string;
    dueDate?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(`/api/protected/grants/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteGrantTaskRequest(taskId: string) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(`/api/protected/grants/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export function upsertGrantApprovalRequest(
  applicationId: string,
  payload: {
    approvalType: "PURSUE" | "BUDGET" | "FINAL_SUBMISSION";
    status: "PENDING" | "APPROVED" | "REJECTED";
    notes?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(
    `/api/protected/grants/applications/${applicationId}/approvals`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function submitGrantApplicationRequest(
  applicationId: string,
  payload: {
    confirmationReference?: string;
    proofUrl?: string;
    packageVersion?: string;
    notes?: string;
  },
) {
  return apiFetch<{ ok: boolean; item: { id: string; stage: string } }>(
    `/api/protected/grants/applications/${applicationId}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
