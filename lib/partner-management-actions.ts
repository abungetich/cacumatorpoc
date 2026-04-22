import { apiFetch } from "@/lib/api-client";
import type { ManagedPartnersResponse, PartnerDetailResponse } from "@/lib/api-types";

export type CreatePartnerPayload = {
  name: string;
  type: "NGO" | "CORPORATE" | "FOUNDATION" | "GOVERNMENT";
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  agreementSigned: boolean;
};

export function fetchManagedPartners(params?: { search?: string; type?: string }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params?.type?.trim() && params.type !== "ALL") {
    query.set("type", params.type);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ManagedPartnersResponse>(`/api/protected/partners/manage${suffix}`);
}

export function createPartner(payload: CreatePartnerPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; name: string; type: string } }>("/api/protected/partners/manage", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchPartnerDetail(partnerId: string) {
  return apiFetch<PartnerDetailResponse>(`/api/protected/partners/${partnerId}`);
}
