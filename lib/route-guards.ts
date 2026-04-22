import type { Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

export type RouteDecision =
  | { type: "allow" }
  | { type: "json"; status: number; message: string }
  | { type: "redirect"; destination: string };

type EvaluateRouteGuardParams = {
  pathname: string;
  isLoggedIn: boolean;
  isPending: boolean;
  isOnboarding?: boolean;
  role?: string;
};

const authPages = new Set(["/login", "/register", "/forgot-password", "/reset-password", "/reset-password/success", "/registration-pending", "/verify-email"]);
const protectedPages = [
  "/dashboard",
  "/work-queue",
  "/mentor-onboarding",
  "/organization-onboarding",
  "/partners",
  "/people",
  "/matching",
  "/programs",
  "/grants",
  "/relationships",
  "/safeguarding",
  "/reports",
  "/settings",
  "/schools",
  "/mentees",
  "/configs",
  "/audit",
  "/profile",
];

const permissionProtectedRoutes: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/onboarding", permission: "onboarding.read" },
  { prefix: "/partners", permission: "partners.read" },
  { prefix: "/organizations", permission: "organizations.read" },
  { prefix: "/people", permission: "participants.read" },
  { prefix: "/matching", permission: "matching.read" },
  { prefix: "/programs/discover", permission: "programs.read" },
  { prefix: "/programs", permission: "programs.manage" },
  { prefix: "/grants", permission: "grants.read" },
  { prefix: "/relationships", permission: "relationships.read" },
  { prefix: "/safeguarding", permission: "safeguarding.read" },
  { prefix: "/reports", permission: "reports.read" },
  { prefix: "/schools", permission: "schools.read" },
  { prefix: "/settings", permission: "platform.settings.read" },
  { prefix: "/settings/branding", permission: "platform.branding.manage" },
  { prefix: "/settings/verification", permission: "verification.manage" },
  { prefix: "/settings/matching", permission: "matching.policy.manage" },
  { prefix: "/settings/training", permission: "training.manage" },
  { prefix: "/settings/consents", permission: "consents.manage" },
  { prefix: "/settings/users", permission: "tenant-users.manage" },
  { prefix: "/settings/grants", permission: "grants.settings.manage" },
];

function getOnboardingDestination(role?: string) {
  return role === "ORGANIZATION_ADMIN" ? "/organization-onboarding" : "/mentor-onboarding";
}

export function evaluateRouteGuard({ pathname, isLoggedIn, isPending, isOnboarding = false, role }: EvaluateRouteGuardParams): RouteDecision {
  const isAuthPage = authPages.has(pathname);
  const isProtectedPage = protectedPages.some((page) => pathname === page || pathname.startsWith(`${page}/`));
  const isProtectedApi = pathname.startsWith("/api/protected");
  const isProfileApi = pathname === "/api/protected/profile" || pathname.startsWith("/api/protected/profile/");
  const isMentorOnboardingApi =
    pathname === "/api/protected/mentor-onboarding/workspace" ||
    pathname.startsWith("/api/protected/mentor-onboarding/");
  const isOrganizationOnboardingApi =
    pathname === "/api/protected/organization-onboarding/workspace" ||
    pathname.startsWith("/api/protected/organization-onboarding/");

  if (!isLoggedIn && isProtectedApi) {
    return { type: "json", status: 401, message: "Unauthorized" };
  }

  if (!isLoggedIn && isProtectedPage) {
    return { type: "redirect", destination: "/login" };
  }

  if (isLoggedIn) {
    const matchedPermissionRoute = permissionProtectedRoutes
      .slice()
      .sort((left, right) => right.prefix.length - left.prefix.length)
      .find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (matchedPermissionRoute && !hasPermission(role, matchedPermissionRoute.permission)) {
      if (isProtectedApi) {
        return { type: "json", status: 403, message: "Forbidden" };
      }

      return { type: "redirect", destination: "/work-queue" };
    }
  }

  if (isLoggedIn && isPending && pathname === "/registration-pending") {
    return { type: "allow" };
  }

  if (isLoggedIn && isPending && pathname !== "/registration-pending") {
    if (isProtectedApi) {
      return { type: "json", status: 403, message: "Account pending approval" };
    }

    return { type: "redirect", destination: "/registration-pending" };
  }

  const onboardingDestination = getOnboardingDestination(role);

  if (isLoggedIn && isOnboarding && pathname !== "/mentor-onboarding" && pathname !== "/organization-onboarding" && pathname !== "/profile") {
    if (pathname === "/mentor-onboarding" || pathname === "/organization-onboarding") {
      return { type: "allow" };
    }

    if (isProtectedApi && !isProfileApi && !isMentorOnboardingApi && !isOrganizationOnboardingApi) {
      return { type: "json", status: 403, message: "Complete your profile first" };
    }

    if (isProtectedPage) {
      return { type: "redirect", destination: onboardingDestination };
    }
  }

  if (isLoggedIn && isAuthPage) {
    return { type: "redirect", destination: isPending ? "/registration-pending" : isOnboarding ? onboardingDestination : "/work-queue" };
  }

  return { type: "allow" };
}
