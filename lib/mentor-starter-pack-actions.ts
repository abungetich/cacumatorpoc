import { apiFetch } from "@/lib/api-client";
import type {
  MentorConsentSettingsResponse,
  MentorTrainingModuleDetailResponse,
  MentorOnboardingWorkspaceResponse,
  MentorTrainingSubmissionResponse,
  MentorTrainingSettingsResponse,
} from "@/lib/api-types";

export function fetchMentorTrainingSettings() {
  return apiFetch<MentorTrainingSettingsResponse>("/api/protected/settings/training");
}

export function fetchMentorTrainingModuleDetail(
  moduleId: string,
  params?: {
    organizationId?: string;
    schoolId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  const query = new URLSearchParams();
  if (params?.organizationId?.trim()) query.set("organizationId", params.organizationId.trim());
  if (params?.schoolId?.trim()) query.set("schoolId", params.schoolId.trim());
  if (params?.dateFrom?.trim()) query.set("dateFrom", params.dateFrom.trim());
  if (params?.dateTo?.trim()) query.set("dateTo", params.dateTo.trim());
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<MentorTrainingModuleDetailResponse>(`/api/protected/settings/training/${encodeURIComponent(moduleId)}${suffix}`);
}

export function createMentorTrainingSetting(input: {
  title: string;
  description: string;
  moduleBody: string;
  version: string;
  required: boolean;
  passingScore: number;
  maxAttempts: number | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  isActive: boolean;
  questions: Array<{
    id?: string;
    prompt: string;
    explanation?: string;
    questionType: "SINGLE_CHOICE" | "MULTI_CHOICE";
    options: string[];
    correctAnswers: string[];
    imageUrl?: string;
    sortOrder: number;
    isActive: boolean;
  }>;
}) {
  return apiFetch<{ ok: boolean }>("/api/protected/settings/training", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMentorTrainingSetting(
  moduleId: string,
  input: {
    title: string;
    description: string;
    moduleBody: string;
    version: string;
    required: boolean;
    passingScore: number;
    maxAttempts: number | null;
    estimatedMinutes: number | null;
    sortOrder: number;
    isActive: boolean;
    questions: Array<{
      id?: string;
      prompt: string;
      explanation?: string;
      questionType: "SINGLE_CHOICE" | "MULTI_CHOICE";
      options: string[];
      correctAnswers: string[];
      imageUrl?: string;
      sortOrder: number;
      isActive: boolean;
    }>;
  },
) {
  return apiFetch<{ ok: boolean }>(`/api/protected/settings/training/${encodeURIComponent(moduleId)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function fetchMentorConsentSettings() {
  return apiFetch<MentorConsentSettingsResponse>("/api/protected/settings/consents");
}

export function updateConsentNotificationPreference(input: { notifyPlatformAdminsOnDecline: boolean }) {
  return apiFetch<{ ok: boolean; item: { notifyPlatformAdminsOnDecline: boolean } }>(
    "/api/protected/settings/consents/notifications",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function createMentorConsentSetting(input: {
  title: string;
  consentType: "DATA_PROCESSING" | "PHOTO_RELEASE" | "MENTORSHIP_AGREEMENT" | "SAFEGUARDING";
  version: string;
  summary: string;
  documentBody: string;
  documentUrl: string;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
}) {
  return apiFetch<{ ok: boolean }>("/api/protected/settings/consents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMentorConsentSetting(
  settingId: string,
  input: {
    title: string;
    consentType: "DATA_PROCESSING" | "PHOTO_RELEASE" | "MENTORSHIP_AGREEMENT" | "SAFEGUARDING";
    version: string;
    summary: string;
    documentBody: string;
    documentUrl: string;
    required: boolean;
    sortOrder: number;
    isActive: boolean;
  },
) {
  return apiFetch<{ ok: boolean }>(`/api/protected/settings/consents/${encodeURIComponent(settingId)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function fetchMentorOnboardingWorkspace() {
  return apiFetch<MentorOnboardingWorkspaceResponse>("/api/protected/mentor-onboarding/workspace");
}

export function completeMentorTrainingModule(
  moduleId: string,
  input: {
    acknowledgedName: string;
    confirmed: true;
    reachedEnd: true;
    notes?: string;
    answers: Array<{
      questionId: string;
      selectedOptions: string[];
    }>;
  },
) {
  return apiFetch<MentorTrainingSubmissionResponse>(`/api/protected/mentor-onboarding/training/${encodeURIComponent(moduleId)}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadTrainingQuestionImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/protected/settings/training/question-image", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as {
    ok?: boolean;
    imageUrl?: string;
    imageName?: string;
    imageMime?: string;
    imageSize?: number;
    message?: string;
  };

  if (!response.ok || !body.ok || !body.imageUrl) {
    throw new Error(body.message ?? "Could not upload training question image");
  }

  return body;
}

export async function uploadTrainingBodyImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/protected/settings/training/body-image", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as {
    ok?: boolean;
    imageUrl?: string;
    message?: string;
  };

  if (!response.ok || !body.ok || !body.imageUrl) {
    throw new Error(body.message ?? "Could not upload training content image");
  }

  return { imageUrl: body.imageUrl };
}

export function assentMentorConsent(
  settingId: string,
  input:
    | { action: "ASSENT"; acknowledgedName: string; confirmed: true; reachedEnd: true; evidenceUrl?: string }
    | { action: "DECLINE"; acknowledgedName: string; confirmed: true; reachedEnd: true; reason?: string },
) {
  return apiFetch<MentorOnboardingWorkspaceResponse>(`/api/protected/mentor-onboarding/consents/${encodeURIComponent(settingId)}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadMentorConsentEvidence(file: File) {
  const formData = new FormData();
  formData.append("evidence", file);

  const response = await fetch("/api/protected/mentor-onboarding/consents/evidence", {
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
    throw new Error(body.message ?? "Could not upload safeguarding evidence");
  }

  return body;
}

export async function uploadMentorConsentBodyImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/protected/settings/consents/body-image", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as {
    ok?: boolean;
    imageUrl?: string;
    message?: string;
  };

  if (!response.ok || !body.ok || !body.imageUrl) {
    throw new Error(body.message ?? "Could not upload consent image");
  }

  return { imageUrl: body.imageUrl };
}

export async function submitMentorBackgroundCheck(input: {
  file: File;
  checkedOn?: string;
  expiresAt?: string;
}) {
  const formData = new FormData();
  formData.append("evidence", input.file);
  if (input.checkedOn?.trim()) {
    formData.append("checkedOn", input.checkedOn.trim());
  }
  if (input.expiresAt?.trim()) {
    formData.append("expiresAt", input.expiresAt.trim());
  }

  const response = await fetch("/api/protected/mentor-onboarding/background-check", {
    method: "POST",
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();
    const looksLikeHtml = /^\s*<!doctype html/i.test(text);
    const suffix = looksLikeHtml ? "Server returned HTML instead of JSON." : "Server returned a non-JSON response.";
    throw new Error(`Request failed (${response.status}): ${suffix}`);
  }

  const body = (await response.json()) as ({ message?: string } & MentorOnboardingWorkspaceResponse);
  if (!response.ok) {
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  return body;
}
