import { UserRole } from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";

export type RoleLike = AppRole | UserRole | string | undefined | null;

export type Permission =
  | "account.read"
  | "audit.read"
  | "grants.read"
  | "grants.manage"
  | "grants.settings.manage"
  | "matching.read"
  | "matching.manage"
  | "matching.policy.manage"
  | "mentees.create"
  | "mentees.manage"
  | "mentees.read"
  | "mentors.approve"
  | "mentors.read"
  | "mentors.review"
  | "onboarding.read"
  | "organizations.read"
  | "organizations.manage"
  | "partners.read"
  | "participants.read"
  | "platform.branding.manage"
  | "platform.settings.read"
  | "programs.read"
  | "programs.manage"
  | "relationships.read"
  | "reports.read"
  | "safeguarding.read"
  | "schools.onboard"
  | "schools.manage"
  | "schools.read"
  | "tenant-users.manage"
  | "training.manage"
  | "consents.manage"
  | "verification.manage";

const roleSet = new Set<AppRole>([
  "PLATFORM_ADMIN",
  "PARTNER_ADMIN",
  "SCHOOL_ADMIN",
  "ORGANIZATION_ADMIN",
  "MENTOR",
  "MENTEE",
  "GUARDIAN",
]);

const rolePermissions: Record<AppRole, readonly Permission[]> = {
  PLATFORM_ADMIN: [
    "account.read",
    "audit.read",
    "grants.read",
    "grants.manage",
    "grants.settings.manage",
    "matching.read",
    "matching.manage",
    "matching.policy.manage",
    "mentees.create",
    "mentees.manage",
    "mentees.read",
    "mentors.approve",
    "mentors.read",
    "mentors.review",
    "onboarding.read",
    "organizations.read",
    "organizations.manage",
    "partners.read",
    "participants.read",
    "platform.branding.manage",
    "platform.settings.read",
    "programs.manage",
    "programs.read",
    "relationships.read",
    "reports.read",
    "safeguarding.read",
    "schools.manage",
    "schools.onboard",
    "schools.read",
    "tenant-users.manage",
    "training.manage",
    "consents.manage",
    "verification.manage",
  ],
  PARTNER_ADMIN: [
    "account.read",
    "audit.read",
    "grants.read",
    "grants.manage",
    "grants.settings.manage",
    "matching.read",
    "matching.manage",
    "mentees.create",
    "mentees.manage",
    "mentees.read",
    "mentors.read",
    "mentors.review",
    "onboarding.read",
    "organizations.read",
    "partners.read",
    "participants.read",
    "platform.settings.read",
    "programs.manage",
    "programs.read",
    "relationships.read",
    "reports.read",
    "safeguarding.read",
    "schools.manage",
    "schools.onboard",
    "schools.read",
  ],
  SCHOOL_ADMIN: [
    "account.read",
    "audit.read",
    "grants.read",
    "grants.manage",
    "grants.settings.manage",
    "matching.read",
    "matching.manage",
    "mentees.create",
    "mentees.manage",
    "mentees.read",
    "mentors.read",
    "onboarding.read",
    "partners.read",
    "participants.read",
    "platform.settings.read",
    "programs.manage",
    "programs.read",
    "relationships.read",
    "reports.read",
    "safeguarding.read",
    "schools.manage",
    "schools.read",
  ],
  ORGANIZATION_ADMIN: [
    "account.read",
    "organizations.read",
    "organizations.manage",
    "programs.read",
    "relationships.read",
    "reports.read",
  ],
  MENTOR: ["account.read", "mentors.read", "programs.read", "relationships.read"],
  MENTEE: ["account.read", "mentees.read", "programs.read", "relationships.read"],
  GUARDIAN: ["account.read", "mentees.read", "relationships.read", "reports.read"],
};

export type ScopedActor = {
  id: string;
  role: RoleLike;
  schoolId?: string | null;
  partnerId?: string | null;
  organizationId?: string | null;
};

export type ScopedResource = {
  userId?: string | null;
  ownerUserId?: string | null;
  guardianUserId?: string | null;
  schoolId?: string | null;
  partnerId?: string | null;
  organizationId?: string | null;
};

export function normalizeRole(role: RoleLike): AppRole | null {
  if (!role || typeof role !== "string") return null;
  return roleSet.has(role as AppRole) ? (role as AppRole) : null;
}

export function hasPermission(role: RoleLike, permission: Permission): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return rolePermissions[normalized].includes(permission);
}

export function isInScope(actor: ScopedActor, resource: ScopedResource): boolean {
  const role = normalizeRole(actor.role);
  if (!role) return false;

  if (role === "PLATFORM_ADMIN") {
    return true;
  }

  if (role === "PARTNER_ADMIN") {
    return Boolean(actor.partnerId && resource.partnerId && actor.partnerId === resource.partnerId);
  }

  if (role === "SCHOOL_ADMIN") {
    return Boolean(actor.schoolId && resource.schoolId && actor.schoolId === resource.schoolId);
  }

  if (role === "ORGANIZATION_ADMIN") {
    return Boolean(actor.organizationId && resource.organizationId && actor.organizationId === resource.organizationId);
  }

  if (role === "GUARDIAN") {
    return Boolean(resource.guardianUserId && actor.id === resource.guardianUserId);
  }

  if (role === "MENTOR" || role === "MENTEE") {
    return Boolean(
      (resource.userId && actor.id === resource.userId) ||
        (resource.ownerUserId && actor.id === resource.ownerUserId),
    );
  }

  return false;
}

export function can(actor: ScopedActor | null | undefined, permission: Permission, resource?: ScopedResource): boolean {
  if (!actor || !hasPermission(actor.role, permission)) {
    return false;
  }

  if (!resource) {
    return true;
  }

  return isInScope(actor, resource);
}
