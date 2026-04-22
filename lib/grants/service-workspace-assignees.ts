import { Prisma, UserRole } from "@prisma/client";
import type { ActorContext } from "@/lib/actor-context";
import { resolveGrantScope } from "@/lib/grants/service-support";
import type { GrantTaskAssignee, ServiceResult } from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";

export async function listGrantTaskAssignees(actor: ActorContext): Promise<ServiceResult<GrantTaskAssignee[]>> {
  const scope = resolveGrantScope(actor);
  if (!scope.ok) {
    return scope;
  }

  const baseWhere: Prisma.UserWhereInput = {
    isActive: true,
  };

  let scopedWhere: Prisma.UserWhereInput = baseWhere;
  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId) {
    scopedWhere = {
      ...baseWhere,
      OR: [{ partnerId: actor.partnerId }, { partnerId: null, schoolId: null }],
    };
  } else if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
    scopedWhere = {
      ...baseWhere,
      OR: [{ schoolId: actor.schoolId }, { partnerId: null, schoolId: null }],
    };
  }

  const users = await prisma.user.findMany({
    where: scopedWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return {
    ok: true,
    data: users.map((item) => ({
      id: item.id,
      fullName: `${item.firstName} ${item.lastName}`.trim(),
      email: item.email,
      role: item.role,
    })),
  };
}
