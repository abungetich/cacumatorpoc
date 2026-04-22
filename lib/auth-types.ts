export type AppRole =
  | "PLATFORM_ADMIN"
  | "SCHOOL_ADMIN"
  | "PARTNER_ADMIN"
  | "ORGANIZATION_ADMIN"
  | "MENTOR"
  | "MENTEE"
  | "GUARDIAN";

export type AppUserStatus = "active" | "pending" | "onboarding";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: AppUserStatus;
  school?: string;
  profilePhoto?: string;
};
