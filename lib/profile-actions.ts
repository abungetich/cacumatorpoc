import { apiFetch } from "@/lib/api-client";

export type ProfileView = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  timeZone: string;
  role: string;
  profilePhoto: string | null;
};

export function fetchProfileRequest() {
  return apiFetch<{ ok: boolean; profile: ProfileView }>("/api/protected/profile");
}

export function updateProfileRequest(payload: {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  timeZone: string;
  profilePhoto?: string;
}) {
  return apiFetch<{
    ok: boolean;
    user: {
      name: string;
      email: string;
      status: string;
    };
    profile: ProfileView;
  }>("/api/protected/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateProfilePasswordRequest(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiFetch<{ ok: boolean; message: string }>("/api/protected/profile/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadProfilePhotoRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/protected/profile/photo", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as { ok?: boolean; profilePhoto?: string; message?: string };
  if (!response.ok || !body.ok || !body.profilePhoto) {
    throw new Error(body.message ?? "Could not upload profile photo");
  }

  return body;
}
