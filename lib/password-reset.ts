import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

type TxLike = PrismaClient | Prisma.TransactionClient;

export function createPasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordResetToken(input: {
  tx: TxLike;
  userId: string;
  email: string;
  origin: string;
}) {
  const now = new Date();
  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  await input.tx.passwordResetToken.deleteMany({
    where: {
      userId: input.userId,
      usedAt: null,
    },
  });

  await input.tx.passwordResetToken.create({
    data: {
      userId: input.userId,
      email: input.email,
      tokenHash,
      expiresAt,
    },
  });

  return {
    resetUrl: `${input.origin}/reset-password?token=${encodeURIComponent(token)}`,
    expiresAt,
  };
}
