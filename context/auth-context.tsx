"use client";

import { createContext, useContext } from "react";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import type { AppRole, AppUser } from "@/lib/auth-types";
import { updateProfileRequest } from "@/lib/profile-actions";
import { credentialsSchema, profileUpdateSchema, registerSchema } from "@/lib/validation";

type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AppRole;
  phone?: string;
  dateOfBirth?: string;
  timeZone?: string;
  organizationSlug?: string;
};

type LoginResult = {
  ok: boolean;
  pending?: boolean;
  onboarding?: boolean;
  redirectTo?: string;
  message?: string;
};

type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string, timeZone?: string) => Promise<LoginResult>;
  register: (payload: RegisterPayload) => Promise<{ ok: boolean; email: string; message?: string; status?: string }>;
  logout: () => Promise<void>;
  syncSessionUser: (next: { name?: string; email?: string; status?: string; profilePhoto?: string | null }) => Promise<void>;
  updateProfile: (next: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    timeZone: string;
    profilePhoto?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, status, update } = useSession();

  const user: AppUser | null = data?.user
      ? {
        id: data.user.id,
        name: data.user.name ?? "",
        email: data.user.email ?? "",
        role: data.user.role,
        status: data.user.status,
        school: data.user.school,
        profilePhoto: data.user.profilePhoto ?? data.user.image ?? undefined,
      }
    : null;

  const login = async (email: string, password: string, timeZone?: string): Promise<LoginResult> => {
    const parsed = credentialsSchema.safeParse({ email, password, timeZone });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid credentials" };
    }

    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      timeZone: parsed.data.timeZone,
      redirect: false,
    });

    if (!result || result.error) {
      if (result?.error === "EMAIL_NOT_VERIFIED") {
        return { ok: false, message: "Confirm your email first, then sign in to complete your profile." };
      }
      return { ok: false, message: "Invalid credentials" };
    }

    const nextSession = await getSession();
    const isPending = nextSession?.user?.status === "pending";
    const isOnboarding = nextSession?.user?.status === "onboarding";
    const onboardingRoute = nextSession?.user?.role === "ORGANIZATION_ADMIN" ? "/organization-onboarding" : "/mentor-onboarding";

    return { ok: true, pending: isPending, onboarding: isOnboarding, redirectTo: isOnboarding ? onboardingRoute : "/work-queue" };
  };

  const register = async (payload: RegisterPayload) => {
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Registration failed");
    }

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const body = (await response.json()) as { ok?: boolean; email?: string; message?: string; status?: string };

    if (!response.ok || !body.email) {
      throw new Error(body.message ?? "Registration failed");
    }

    return { ok: true, email: body.email, message: body.message, status: body.status };
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  const syncSessionUser = async (next: { name?: string; email?: string; status?: string; profilePhoto?: string | null }) => {
    await update({
      ...(next.name ? { name: next.name } : {}),
      ...(next.email ? { email: next.email } : {}),
      ...(next.status ? { status: next.status } : {}),
      ...(next.profilePhoto !== undefined ? { image: next.profilePhoto, profilePhoto: next.profilePhoto } : {}),
    });
  };

  const updateProfile = async (next: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    timeZone: string;
    profilePhoto?: string;
  }) => {
    const parsed = profileUpdateSchema.safeParse(next);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Unable to update profile");
    }

    const body = await updateProfileRequest(parsed.data);
    await syncSessionUser({
      name: body.user.name,
      email: body.user.email,
      status: body.user.status,
      profilePhoto: body.profile.profilePhoto ?? null,
    });
  };

  const value: AuthContextValue = {
    user,
    isLoading: status === "loading",
    login,
    register,
    logout,
    syncSessionUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
