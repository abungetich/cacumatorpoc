import { apiFetch } from "@/lib/api-client";
import type { TenantUsersResponse } from "@/lib/api-types";

export function fetchTenantUsers() {
  return apiFetch<TenantUsersResponse>("/api/protected/settings/users");
}

export function createTenantUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "PLATFORM_ADMIN" | "PARTNER_ADMIN" | "SCHOOL_ADMIN";
}) {
  return apiFetch<{
    ok: true;
    item: { id: string };
    invite: { sent: boolean; reason: string | null; link: string | null; expiresAt: string };
  }>("/api/protected/settings/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function reInviteTenantUser(userId: string) {
  return apiFetch<{
    ok: true;
    item: { id: string };
    invite: { sent: boolean; reason: string | null; link: string | null; expiresAt: string };
  }>(`/api/protected/settings/users/${encodeURIComponent(userId)}/reinvite`, {
    method: "POST",
  });
}
