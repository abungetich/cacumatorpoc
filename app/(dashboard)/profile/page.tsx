"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Camera, Clock3, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { MentorOnboardingBanner } from "@/components/mentors/mentor-onboarding-banner";
import {
  fetchProfileRequest,
  updateProfilePasswordRequest,
  updateProfileRequest,
  uploadProfilePhotoRequest,
} from "@/lib/profile-actions";

type ProfileForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  timeZone: string;
  profilePhoto: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyProfileForm: ProfileForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  timeZone: "Africa/Nairobi",
  profilePhoto: "",
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function initials(firstName: string, lastName: string) {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase() || "U";
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile, syncSessionUser } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfileRequest(),
  });

  useEffect(() => {
    if (!profileQuery.data?.profile) {
      return;
    }

    setProfileForm({
      firstName: profileQuery.data.profile.firstName,
      middleName: profileQuery.data.profile.middleName || "",
      lastName: profileQuery.data.profile.lastName,
      phone: profileQuery.data.profile.phone,
      email: profileQuery.data.profile.email,
      dateOfBirth: profileQuery.data.profile.dateOfBirth,
      timeZone: profileQuery.data.profile.timeZone,
      profilePhoto: profileQuery.data.profile.profilePhoto || "",
    });
  }, [profileQuery.data?.profile]);

  const saveProfileMutation = useMutation({
    mutationFn: (payload: ProfileForm) =>
      updateProfileRequest({
        firstName: payload.firstName,
        middleName: payload.middleName || undefined,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email,
        dateOfBirth: payload.dateOfBirth,
        timeZone: payload.timeZone,
        profilePhoto: payload.profilePhoto || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await updateProfile({
        firstName: profileForm.firstName,
        middleName: profileForm.middleName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        email: profileForm.email,
        dateOfBirth: profileForm.dateOfBirth,
        timeZone: profileForm.timeZone,
        profilePhoto: profileForm.profilePhoto || undefined,
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => uploadProfilePhotoRequest(file),
    onSuccess: async (payload) => {
      setProfileForm((prev) => ({ ...prev, profilePhoto: payload.profilePhoto ?? "" }));
      await syncSessionUser({ profilePhoto: payload.profilePhoto ?? null });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      pushToast({ title: "Profile Photo Updated", description: "Photo uploaded successfully.", variant: "success" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (payload: PasswordForm) => updateProfilePasswordRequest(payload),
  });

  const roleLabel = useMemo(() => user?.role.replaceAll("_", " ") ?? "", [user?.role]);

  const onProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await saveProfileMutation.mutateAsync(profileForm);
      pushToast({
        title: "Profile Updated",
        description: "Your profile details were saved.",
        variant: "success",
      });

      if (user?.role === "MENTOR" && user.status === "onboarding" && result.user.status === "pending") {
        router.push(`/registration-pending?email=${encodeURIComponent(result.user.email)}`);
      }
    } catch (error) {
      pushToast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Unable to save profile.",
        variant: "error",
      });
    }
  };

  const onPasswordSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updatePasswordMutation.mutateAsync(passwordForm);
      setPasswordForm(emptyPasswordForm);
      pushToast({
        title: "Password Updated",
        description: "Your password was changed successfully.",
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Password Update Failed",
        description: error instanceof Error ? error.message : "Unable to update password.",
        variant: "error",
      });
    }
  };

  const onPhotoPicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await uploadPhotoMutation.mutateAsync(file);
    } catch (error) {
      pushToast({
        title: "Photo Upload Failed",
        description: error instanceof Error ? error.message : "Unable to upload photo.",
        variant: "error",
      });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {user?.role === "MENTOR" && user.status !== "active" ? (
        <MentorOnboardingBanner
          description="Your mentor account is still in setup. Complete your account details here, then return to the onboarding workspace for training, terms, safeguarding, and background submission."
        />
      ) : null}

      <section>
        <h1 className="text-2xl font-semibold text-[var(--text)]">{user?.role === "MENTOR" ? "Account" : "Profile"}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user?.role === "MENTOR"
            ? "Manage your identity details, timezone, password, and account photo. This is separate from your mentor readiness and compliance record."
            : "Manage your identity details, password, and profile photo."}
        </p>
      </section>

      {profileQuery.isLoading ? (
        <Card className="max-w-3xl">
          <p className="text-sm text-[var(--muted)]">Loading profile...</p>
        </Card>
      ) : null}

      {profileQuery.error ? (
        <Card className="max-w-3xl">
          <p className="text-sm text-[var(--danger)]">{profileQuery.error.message || "Could not load profile."}</p>
        </Card>
      ) : null}

      {!profileQuery.isLoading && !profileQuery.error ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <form className="space-y-4" onSubmit={onProfileSave}>
              <div className="flex items-center gap-3">
                {profileForm.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileForm.profilePhoto}
                    alt="Profile"
                    className="h-16 w-16 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-sm font-semibold text-[var(--text)]">
                    {initials(profileForm.firstName, profileForm.lastName)}
                  </div>
                )}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]">
                  <Camera className="h-4 w-4 text-[var(--primary)]" />
                  {uploadPhotoMutation.isPending ? "Uploading..." : "Change Photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onPhotoPicked}
                    disabled={uploadPhotoMutation.isPending}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledField label="First Name" icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />} required>
                  <Input
                    required
                    value={profileForm.firstName}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  />
                </LabeledField>
                <LabeledField label="Middle Name" icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />}>
                  <Input
                    value={profileForm.middleName}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, middleName: event.target.value }))}
                  />
                </LabeledField>
              </div>

              <LabeledField label="Surname" icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  required
                  value={profileForm.lastName}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="Cell Phone" icon={<Phone className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  required
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="Date of Birth" icon={<CalendarDays className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  type="date"
                  required
                  value={profileForm.dateOfBirth}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="Email" icon={<Mail className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="Timezone" icon={<Clock3 className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  required
                  value={profileForm.timeZone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, timeZone: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="Role" icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />}>
                <Input value={roleLabel} disabled />
              </LabeledField>

              <Button type="submit" disabled={saveProfileMutation.isPending}>
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </Card>

          <Card>
            <form className="space-y-4" onSubmit={onPasswordSave}>
              <h2 className="text-lg font-semibold text-[var(--text)]">Change Password</h2>
              <LabeledField label="Current Password" icon={<KeyRound className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="New Password" icon={<KeyRound className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                />
              </LabeledField>

              <LabeledField label="Confirm New Password" icon={<KeyRound className="h-4 w-4 text-[var(--primary)]" />} required>
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              </LabeledField>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                <p className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-[var(--primary)]" />
                  Use at least 8 characters. Avoid reusing old passwords.
                </p>
              </div>

              <Button type="submit" disabled={updatePasswordMutation.isPending}>
                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function LabeledField({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {icon}
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
