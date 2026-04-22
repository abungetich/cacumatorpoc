import type { Prisma, PrismaClient } from "@prisma/client";
import { createEmailVerificationToken, hashEmailVerificationToken } from "@/lib/verification/token";

type TxLike = PrismaClient | Prisma.TransactionClient;

export async function issueMentorVerificationToken(input: {
  tx: TxLike;
  userId: string;
  email: string;
  origin: string;
}) {
  const now = new Date();
  const token = createEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await input.tx.emailVerificationToken.deleteMany({
    where: {
      userId: input.userId,
      verifiedAt: null,
    },
  });

  await input.tx.emailVerificationToken.create({
    data: {
      userId: input.userId,
      email: input.email,
      tokenHash,
      expiresAt,
    },
  });

  return {
    verificationUrl: `${input.origin}/verify-email?token=${encodeURIComponent(token)}`,
    expiresAt,
  };
}
