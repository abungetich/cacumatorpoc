import { apiFetch } from "@/lib/api-client";
import type { GrantSettingsWorkspaceResponse, GrantFunderType } from "@/lib/api-types";

export type CreateGrantFunderPayload = {
  name: string;
  type: GrantFunderType;
  website?: string;
  country?: string;
  hqCity?: string;
  focusAreas?: string[];
  typicalMinAmountMinor?: string;
  typicalMaxAmountMinor?: string;
  currencyCode?: string;
  applicationUrl?: string;
  isActive?: boolean;
  contact?: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
  };
};

export type UpdateGrantFunderPayload = Partial<CreateGrantFunderPayload> & {
  isActive?: boolean;
};

export type GrantSourceSettingPayload = {
  code?: string;
  label?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type GrantCurrencySettingPayload = {
  code?: string;
  label?: string;
  symbol?: string;
  minorUnit?: number;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type GrantScoringPayload = {
  timelineWeight: number;
  amountWeight: number;
  areaWeight: number;
  eligibilityWeight: number;
  readinessWeight: number;
};

export function fetchGrantSettingsWorkspace() {
  return apiFetch<GrantSettingsWorkspaceResponse>("/api/protected/grants/settings/workspace");
}

export function createGrantFunder(payload: CreateGrantFunderPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; name: string; type: GrantFunderType; isActive: boolean } }>(
    "/api/protected/grants/settings/funders",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateGrantFunder(funderId: string, payload: UpdateGrantFunderPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; name: string; type: GrantFunderType; isActive: boolean } }>(
    `/api/protected/grants/settings/funders/${funderId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function createGrantSourceSetting(payload: Required<Pick<GrantSourceSettingPayload, "code" | "label">> & GrantSourceSettingPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; code: string; label: string; isActive: boolean } }>(
    "/api/protected/grants/settings/sources",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateGrantSourceSetting(sourceId: string, payload: GrantSourceSettingPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; code: string; label: string; isActive: boolean } }>(
    `/api/protected/grants/settings/sources/${sourceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function createGrantCurrencySetting(
  payload: Required<Pick<GrantCurrencySettingPayload, "code" | "label">> & GrantCurrencySettingPayload,
) {
  return apiFetch<{ ok: boolean; item: { id: string; code: string; label: string; isDefault: boolean; isActive: boolean } }>(
    "/api/protected/grants/settings/currencies",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateGrantCurrencySetting(currencyId: string, payload: GrantCurrencySettingPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; code: string; label: string; isDefault: boolean; isActive: boolean } }>(
    `/api/protected/grants/settings/currencies/${currencyId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function updateGrantScoringProfile(payload: GrantScoringPayload) {
  return apiFetch<{
    ok: boolean;
    item: {
      id: string;
      name: string;
      timelineWeight: number;
      amountWeight: number;
      areaWeight: number;
      eligibilityWeight: number;
      readinessWeight: number;
      updatedAt: string;
    };
  }>("/api/protected/grants/settings/scoring", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
