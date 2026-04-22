import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

function createPgPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === "development" ? 5 : 10,
  });
}

function createPrismaClient() {
  const pool = globalForPrisma.prismaPool ?? createPgPool();
  globalForPrisma.prismaPool = pool;

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function hasRequiredDelegates(client: PrismaClient) {
  const candidate = client as PrismaClient & {
    grantOpportunity?: unknown;
    grantApplication?: unknown;
    grantFunder?: unknown;
    grantSourceSetting?: unknown;
    grantCurrencySetting?: unknown;
    grantScoringProfile?: unknown;
    tenantUserInvite?: unknown;
    mentorOnboarding?: unknown;
    mentorProgramApplication?: unknown;
    organization?: unknown;
    organizationMembership?: unknown;
    organizationAgreement?: unknown;
    platformBranding?: unknown;
    emailVerificationToken?: unknown;
    passwordResetToken?: unknown;
    matchingSettings?: unknown;
    verificationSettings?: unknown;
    consentNotificationSettings?: unknown;
    mentorTrainingModuleSetting?: unknown;
    mentorTrainingCompletion?: unknown;
    mentorConsentSetting?: unknown;
    mentorTrainingQuestion?: unknown;
    mentorTrainingAttempt?: unknown;
  };

  return Boolean(
    candidate.grantOpportunity &&
      candidate.grantApplication &&
      candidate.grantFunder &&
      candidate.grantSourceSetting &&
      candidate.grantCurrencySetting &&
      candidate.grantScoringProfile &&
      candidate.tenantUserInvite &&
      candidate.mentorOnboarding &&
      candidate.mentorProgramApplication &&
      candidate.organization &&
      candidate.organizationMembership &&
      candidate.organizationAgreement &&
      candidate.platformBranding &&
      candidate.emailVerificationToken &&
      candidate.passwordResetToken &&
      candidate.matchingSettings &&
      candidate.verificationSettings &&
      candidate.consentNotificationSettings &&
      candidate.mentorTrainingModuleSetting &&
      candidate.mentorTrainingCompletion &&
      candidate.mentorConsentSetting &&
      candidate.mentorTrainingQuestion &&
      candidate.mentorTrainingAttempt,
  );
}

function resolvePrismaClient() {
  if (!globalForPrisma.prisma) {
    return createPrismaClient();
  }

  if (hasRequiredDelegates(globalForPrisma.prisma)) {
    return globalForPrisma.prisma;
  }

  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  return createPrismaClient();
}

export const prisma = resolvePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
