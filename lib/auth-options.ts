import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { AppUserStatus } from "@/lib/auth-types";
import type { DbUserForAuth } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { toSessionUser } from "@/lib/auth-user";
import { credentialsSchema } from "@/lib/validation";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-auth-secret-change-me",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        timeZone: { label: "Time Zone", type: "text" },
      },
      async authorize(credentials, req) {
        void req;
        const parsed = credentialsSchema.safeParse(credentials ?? {});
        if (!parsed.success) {
          return null;
        }

        const { email, password, timeZone } = parsed.data;

        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            password: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phone: true,
            dateOfBirth: true,
            role: true,
            schoolId: true,
            partnerId: true,
            profilePhoto: true,
            emailVerifiedAt: true,
            isActive: true,
            timeZone: true,
            school: {
              select: { name: true },
            },
            mentorProfile: {
              select: {
                status: true,
                backgroundCheckStatus: true,
                trainingCompleted: true,
                safeguardingAgreed: true,
              },
            },
            mentorOnboarding: {
              select: {
                consentSignedAt: true,
              },
            },
            organizationMemberships: {
              where: {
                role: "ADMIN",
                status: {
                  in: ["ACTIVE", "PENDING"],
                },
              },
              take: 1,
              select: {
                role: true,
                status: true,
                organization: {
                  select: {
                    status: true,
                    mentorParticipation: true,
                    financialSupport: true,
                    inKindSupport: true,
                    primaryContactName: true,
                    contactEmail: true,
                    country: true,
                    agreements: {
                      select: {
                        code: true,
                        version: true,
                      },
                    },
                  },
                },
              },
            },
            menteeProfile: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!dbUser) {
          return null;
        }

        const passwordMatches = await compare(password, dbUser.password);
        if (!passwordMatches) {
          return null;
        }

        if (timeZone?.trim() && dbUser.timeZone !== timeZone.trim()) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              timeZone: timeZone.trim(),
            },
          });
          dbUser.timeZone = timeZone.trim();
        }

        if ((dbUser.role === "MENTOR" || dbUser.role === "ORGANIZATION_ADMIN") && !dbUser.emailVerifiedAt) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const appUser = toSessionUser(dbUser as DbUserForAuth);

        return {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          profilePhoto: dbUser.profilePhoto ?? undefined,
          image: dbUser.profilePhoto ?? undefined,
          role: appUser.role,
          status: appUser.status,
          school: appUser.school,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.status = user.status as AppUserStatus;
        token.school = user.school;
        token.profilePhoto = user.profilePhoto ?? user.image ?? undefined;
      }

      if (trigger === "update") {
        if (session?.name) {
          token.name = session.name;
        }
        if (session?.email) {
          token.email = session.email;
        }
        if (session?.status) {
          token.status = session.status;
        }
        if ("profilePhoto" in (session ?? {}) && typeof session.profilePhoto === "string") {
          token.profilePhoto = session.profilePhoto;
        }
        if (typeof session?.image === "string") {
          token.profilePhoto = session.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as typeof session.user.role) ?? "MENTEE";
        session.user.status = (token.status as AppUserStatus) ?? "active";
        session.user.school = typeof token.school === "string" ? token.school : undefined;
        session.user.profilePhoto = typeof token.profilePhoto === "string" ? token.profilePhoto : undefined;
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.profilePhoto === "string") {
          session.user.image = token.profilePhoto;
        }
      }

      return session;
    },
  },
};
