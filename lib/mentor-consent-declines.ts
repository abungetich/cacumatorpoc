import { prisma } from "@/lib/prisma";

type OutstandingConsentDecline = {
  id: string;
  userId: string;
  title: string;
  consentType: string | null;
  version: string | null;
  declinedAt: string;
  reason: string | null;
};

function readAuditObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function getOutstandingConsentDeclinesForMentors(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, OutstandingConsentDecline[]>();
  }

  const [declineLogs, activeConsents] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: {
        userId: {
          in: userIds,
        },
        action: "MENTOR_CONSENT_DECLINED",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        newValues: true,
      },
    }),
    prisma.consent.findMany({
      where: {
        userId: {
          in: userIds,
        },
        revokedAt: null,
      },
      select: {
        userId: true,
        consentType: true,
        version: true,
      },
    }),
  ]);

  const activeConsentKeys = new Set(
    activeConsents.map((item) => `${item.userId}:${item.consentType}:${item.version}`),
  );

  const byUser = new Map<string, OutstandingConsentDecline[]>();
  const seenDeclines = new Set<string>();

  for (const log of declineLogs) {
    const payload = readAuditObject(log.newValues);
    const consentType = typeof payload?.consentType === "string" ? payload.consentType : null;
    const version = typeof payload?.version === "string" ? payload.version : null;
    const title = typeof payload?.title === "string" ? payload.title : "Consent document";
    const reason = typeof payload?.reason === "string" ? payload.reason : null;

    if (!consentType || !version) {
      continue;
    }

    const activeKey = `${log.userId}:${consentType}:${version}`;
    if (activeConsentKeys.has(activeKey)) {
      continue;
    }

    const unresolvedKey = `${log.userId}:${consentType}:${version}`;
    if (seenDeclines.has(unresolvedKey)) {
      continue;
    }
    seenDeclines.add(unresolvedKey);

    const current = byUser.get(log.userId) ?? [];
    current.push({
      id: log.id,
      userId: log.userId,
      title,
      consentType,
      version,
      declinedAt: log.createdAt.toISOString(),
      reason,
    });
    byUser.set(log.userId, current);
  }

  return byUser;
}

export async function getOutstandingConsentDeclinesForMentor(userId: string) {
  const map = await getOutstandingConsentDeclinesForMentors([userId]);
  return map.get(userId) ?? [];
}
