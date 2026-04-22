import { UserRole } from "@prisma/client";
import { canManageGrants, type ActorContext } from "@/lib/actor-context";
import type { GrantScope, ServiceResult } from "@/lib/grants/service-support-types";
import { prisma } from "@/lib/prisma";

export function canActorAccessScopedRecord(actor: ActorContext, schoolId: string | null, partnerId: string | null) {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return true;
  }

  if (actor.role === UserRole.PARTNER_ADMIN) {
    return Boolean(actor.partnerId && partnerId && actor.partnerId === partnerId);
  }

  if (actor.role === UserRole.SCHOOL_ADMIN) {
    return Boolean(actor.schoolId && schoolId && actor.schoolId === schoolId);
  }

  return false;
}

export async function getScopedOpportunityById(actor: ActorContext, opportunityId: string) {
  if (!canManageGrants(actor.role)) {
    return {
      ok: false as const,
      status: 403,
      message: "Only admins can manage grants",
    };
  }

  const opportunity = await prisma.grantOpportunity.findUnique({
    where: {
      id: opportunityId,
    },
    select: {
      id: true,
      title: true,
      funderName: true,
      description: true,
      status: true,
      sourceType: true,
      sourceReference: true,
      sourceUrl: true,
      attachmentUrl: true,
      attachmentName: true,
      deadline: true,
      currencyCode: true,
      amountMinor: true,
      fitScore: true,
      fitMatrix: true,
      scoredAt: true,
      country: true,
      schoolId: true,
      partnerId: true,
      school: {
        select: {
          name: true,
        },
      },
      partner: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
      createdAt: true,
    },
  });

  if (!opportunity) {
    return {
      ok: false as const,
      status: 404,
      message: "Grant opportunity not found",
    };
  }

  if (!canActorAccessScopedRecord(actor, opportunity.schoolId, opportunity.partnerId)) {
    return {
      ok: false as const,
      status: 403,
      message: "You cannot access opportunities outside your scope",
    };
  }

  return {
    ok: true as const,
    data: opportunity,
  };
}

export function resolveGrantScope(actor: ActorContext): ServiceResult<GrantScope> {
  if (!canManageGrants(actor.role)) {
    return {
      ok: false,
      status: 403,
      message: "Only admins can manage grants",
    };
  }

  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return {
      ok: true,
      data: {
        opportunityWhere: {},
        applicationWhere: {},
      },
    };
  }

  if (actor.role === UserRole.PARTNER_ADMIN) {
    if (!actor.partnerId) {
      return {
        ok: false,
        status: 403,
        message: "Partner admin account is missing partner scope",
      };
    }

    return {
      ok: true,
      data: {
        opportunityWhere: {
          partnerId: actor.partnerId,
        },
        applicationWhere: {
          partnerId: actor.partnerId,
        },
      },
    };
  }

  if (!actor.schoolId) {
    return {
      ok: false,
      status: 403,
      message: "School admin account is missing school scope",
    };
  }

  return {
    ok: true,
    data: {
      opportunityWhere: {
        schoolId: actor.schoolId,
      },
      applicationWhere: {
        schoolId: actor.schoolId,
      },
    },
  };
}

export async function resolveOpportunityScope(input: {
  actor: ActorContext;
  schoolId?: string;
  partnerId?: string;
}): Promise<ServiceResult<{ schoolId: string | null; partnerId: string | null }>> {
  if (input.actor.role === UserRole.SCHOOL_ADMIN) {
    if (!input.actor.schoolId) {
      return {
        ok: false,
        status: 403,
        message: "School admin account is missing school scope",
      };
    }

    const school = await prisma.school.findUnique({
      where: { id: input.actor.schoolId },
      select: {
        id: true,
        partnerId: true,
      },
    });

    return {
      ok: true,
      data: {
        schoolId: school?.id ?? input.actor.schoolId,
        partnerId: school?.partnerId ?? null,
      },
    };
  }

  if (input.actor.role === UserRole.PARTNER_ADMIN) {
    if (!input.actor.partnerId) {
      return {
        ok: false,
        status: 403,
        message: "Partner admin account is missing partner scope",
      };
    }

    if (input.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: input.schoolId },
        select: {
          id: true,
          partnerId: true,
        },
      });

      if (!school) {
        return {
          ok: false,
          status: 404,
          message: "School not found",
        };
      }

      if (school.partnerId !== input.actor.partnerId) {
        return {
          ok: false,
          status: 403,
          message: "You can only scope grant opportunities to schools in your partner network",
        };
      }

      return {
        ok: true,
        data: {
          schoolId: school.id,
          partnerId: input.actor.partnerId,
        },
      };
    }

    return {
      ok: true,
      data: {
        schoolId: null,
        partnerId: input.actor.partnerId,
      },
    };
  }

  if (input.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: input.schoolId },
      select: {
        id: true,
        partnerId: true,
      },
    });

    if (!school) {
      return {
        ok: false,
        status: 404,
        message: "School not found",
      };
    }

    if (input.partnerId && school.partnerId && school.partnerId !== input.partnerId) {
      return {
        ok: false,
        status: 409,
        message: "School does not belong to the selected partner",
      };
    }

    return {
      ok: true,
      data: {
        schoolId: school.id,
        partnerId: input.partnerId ?? school.partnerId ?? null,
      },
    };
  }

  if (input.partnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: input.partnerId },
      select: { id: true },
    });

    if (!partner) {
      return {
        ok: false,
        status: 404,
        message: "Partner not found",
      };
    }

    return {
      ok: true,
      data: {
        schoolId: null,
        partnerId: partner.id,
      },
    };
  }

  return {
    ok: true,
    data: {
      schoolId: null,
      partnerId: null,
    },
  };
}
