import type { DefaultSession } from "next-auth";
import type { AppRole, AppUserStatus } from "@/lib/auth-types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      status: AppUserStatus;
      school?: string;
      profilePhoto?: string;
    };
  }

  interface User {
    role: AppRole;
    status: AppUserStatus;
    school?: string;
    profilePhoto?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    status?: AppUserStatus;
    school?: string;
    profilePhoto?: string;
  }
}
