import { OrganizationMembershipRole, OrganizationMembershipStatus, Prisma, UserRole } from "@prisma/client";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ActorContext = {
  id: string;
  role: UserRole;
  schoolId: string | null;
  partnerId: string | null;
  organizationId: string | null;
};

export type ScopedMentor = {
  userId: string;
  schoolId: string | null;
  partnerId: string | null;
};

export type ScopedMentee = {
  userId: string;
  schoolId: string | null;
  partnerId: string | null;
  guardianUserId: string | null;
};

export type ScopedUser = {
  id: string;
  schoolId: string | null;
  partnerId: string | null;
  organizationId?: string | null;
};

export type ScopedSchool = {
  id: string;
  partnerId: string | null;
};

export async function getActorContext(userId: string): Promise<ActorContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      schoolId: true,
      partnerId: true,
      organizationMemberships: {
        where: {
          role: OrganizationMembershipRole.ADMIN,
          status: {
            in: [OrganizationMembershipStatus.ACTIVE, OrganizationMembershipStatus.PENDING],
          },
        },
        take: 1,
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    schoolId: user.schoolId,
    partnerId: user.partnerId,
    organizationId: user.organizationMemberships[0]?.organizationId ?? null,
  };
}

export function getAuditScopeWhere(actor: ActorContext): Prisma.AuditLogWhereInput | undefined {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return undefined;
  }

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId) {
    return {
      user: {
        partnerId: actor.partnerId,
      },
    };
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
    return {
      user: {
        schoolId: actor.schoolId,
      },
    };
  }

  return {
    userId: actor.id,
  };
}

export function canCreateMentee(role: UserRole) {
  return can({ id: "", role }, "mentees.create");
}

export function canManageMentee(actor: ActorContext, mentee: ScopedMentee) {
  return can(actor, "mentees.manage", mentee);
}

export function canApproveMentor(actor: ActorContext, mentor: ScopedMentor) {
  return can(actor, "mentors.approve", mentor);
}

export function canViewMentor(actor: ActorContext, mentor: ScopedMentor) {
  return can(actor, "mentors.read", mentor);
}

export function canViewMentee(actor: ActorContext, mentee: ScopedMentee) {
  return can(actor, "mentees.read", mentee);
}

export function canManageMatching(role: UserRole) {
  return can({ id: "", role }, "matching.manage");
}

export function canManageGrants(role: UserRole) {
  return can({ id: "", role }, "grants.manage");
}

export function canOnboardSchool(role: UserRole) {
  return can({ id: "", role }, "schools.onboard");
}

export function canManageSchool(actor: ActorContext, school: ScopedSchool) {
  return can(actor, "schools.manage", { schoolId: school.id, partnerId: school.partnerId });
}

export function isUserInActorScope(actor: ActorContext, target: ScopedUser) {
  return can(actor, "participants.read", { userId: target.id, ...target });
}

export function isSchoolInActorScope(actor: ActorContext, school: ScopedSchool) {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return true;
  }

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId && school.partnerId) {
    return actor.partnerId === school.partnerId;
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
    return actor.schoolId === school.id;
  }

  return false;
}
