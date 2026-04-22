import { apiFetch } from "@/lib/api-client";
import type { PlatformBrandingResponse } from "@/lib/api-types";

export function fetchPlatformBranding() {
  return apiFetch<PlatformBrandingResponse>("/api/protected/settings/branding");
}

export function updatePlatformBranding(input: {
  platformName: string;
  logoUrl: string | null;
  ceoName: string;
  ceoTitle: string;
  ceoWelcomeMessage: string;
}) {
  return apiFetch<PlatformBrandingResponse>("/api/protected/settings/branding", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function uploadPlatformLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/protected/settings/branding/logo", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as { ok?: boolean; logoUrl?: string; message?: string };

  if (!response.ok || !body.ok || !body.logoUrl) {
    throw new Error(body.message ?? "Could not upload platform logo");
  }

  return body.logoUrl;
}
