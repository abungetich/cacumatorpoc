import { apiFetch } from "@/lib/api-client";
import type {
  OrganizationDetailResponse,
  OrganizationOnboardingWorkspaceResponse,
  OrganizationRegistrationResponse,
  OrganizationsResponse,
} from "@/lib/api-types";

export type OrganizationRegistrationPayload = {
  name: string;
  type: "CORPORATE" | "NGO" | "FOUNDATION" | "GOVERNMENT" | "ALUMNI" | "ASSOCIATION" | "COMMUNITY" | "FAITH_BASED" | "OTHER";
  logoUrl?: string;
  website?: string;
  country: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  mentorParticipation: boolean;
  financialSupport: boolean;
  inKindSupport: boolean;
};

export function fetchOrganizations(params?: { search?: string; status?: string }) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.status?.trim() && params.status !== "ALL") {
    query.set("status", params.status.trim());
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<OrganizationsResponse>(`/api/protected/organizations${suffix}`);
}

export function fetchOrganizationDetail(organizationId: string) {
  return apiFetch<OrganizationDetailResponse>(`/api/protected/organizations/${organizationId}`);
}

export async function registerOrganization(payload: OrganizationRegistrationPayload) {
  const response = await fetch("/api/organizations/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Request failed (${response.status})`);
  }

  const body = (await response.json()) as { message?: string } & OrganizationRegistrationResponse;
  if (!response.ok || !body.item) {
    throw new Error(body.message ?? "Could not register organization");
  }

  return body;
}

export async function uploadOrganizationLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/organizations/logo", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as { ok?: boolean; logoUrl?: string; message?: string };

  if (!response.ok || !body.ok || !body.logoUrl) {
    throw new Error(body.message ?? "Could not upload organization logo");
  }

  return body;
}

export function fetchOrganizationOnboardingWorkspace() {
  return apiFetch<OrganizationOnboardingWorkspaceResponse>("/api/protected/organization-onboarding/workspace");
}

export async function updateOrganizationOnboardingProfile(payload: {
  organizationName: string;
  type: OrganizationRegistrationPayload["type"];
  logoUrl?: string | null;
  registrationNumber?: string;
  website?: string;
  description?: string;
  mission?: string;
  country: string;
  county?: string;
  city?: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  primaryContactName: string;
  primaryContactTitle?: string;
  adminTitle?: string;
  mentorParticipation: boolean;
  financialSupport: boolean;
  inKindSupport: boolean;
  schoolsOfInterest: string[];
}) {
  return apiFetch<OrganizationOnboardingWorkspaceResponse>("/api/protected/organization-onboarding/workspace", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function assentOrganizationAgreement(payload: {
  code: "PLATFORM_TERMS" | "DATA_PROCESSING" | "SAFEGUARDING" | "CONFIDENTIALITY" | "SUPPORT_TERMS";
  acknowledgedName: string;
  confirmed: true;
  reachedEnd: true;
}) {
  return apiFetch<OrganizationOnboardingWorkspaceResponse>("/api/protected/organization-onboarding/agreements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
