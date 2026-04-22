import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Handshake,
  Building2,
  Users,
  UserPlus,
  GitMerge,
  BookOpen,
  FileSpreadsheet,
  Link2,
  Siren,
  ChartColumnBig,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export type AppNavChild = {
  href: string;
  label: string;
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: AppNavChild[];
};

const baseNavItems: AppNavItem[] = [
  { href: "/work-queue", label: "Work Queue", icon: ClipboardList },
  { href: "/onboarding", label: "Onboarding", icon: UserPlus },
  { href: "/partners", label: "Partners", icon: Handshake },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  {
    href: "/people",
    label: "Participants",
    icon: Users,
    children: [
      { href: "/people/mentors", label: "Mentors" },
      { href: "/people/mentees", label: "Mentees" },
    ],
  },
  { href: "/matching", label: "Matching", icon: GitMerge },
  {
    href: "/programs",
    label: "Programs",
    icon: BookOpen,
  },
  {
    href: "/grants",
    label: "Grants",
    icon: FileSpreadsheet,
    children: [
      { href: "/grants", label: "Workspace" },
      { href: "/settings/grants", label: "Grant Settings" },
    ],
  },
  { href: "/relationships", label: "Relationships", icon: Link2 },
  { href: "/safeguarding", label: "Safeguarding", icon: Siren },
  { href: "/reports", label: "Reports", icon: ChartColumnBig },
  {
    href: "/settings",
    label: "Settings",
    icon: SlidersHorizontal,
    children: [
      { href: "/settings", label: "Workspace" },
      { href: "/settings/branding", label: "Platform Branding" },
      { href: "/settings/verification", label: "Verification" },
      { href: "/settings/matching", label: "Matching" },
      { href: "/settings/training", label: "Training" },
      { href: "/settings/consents", label: "Consents" },
      { href: "/settings/users", label: "Tenant Users" },
    ],
  },
];

export function getNavItemsForRole(role: string | undefined, status?: string): AppNavItem[] {
  if (role === "MENTOR") {
    if (status === "onboarding" || status === "pending") {
      return [
        { href: "/mentor-onboarding", label: "Onboarding", icon: UserPlus },
        { href: "/profile", label: "Account", icon: UserRound },
      ];
    }

    return [
      { href: "/mentor-onboarding", label: "Records", icon: UserPlus },
      {
        href: "/programs/discover",
        label: "Programs",
        icon: BookOpen,
        children: [{ href: "/programs/discover", label: "Discover" }],
      },
      { href: "/relationships", label: "Relationships", icon: Link2 },
      { href: "/profile", label: "Account", icon: UserRound },
    ];
  }

  if (role === "ORGANIZATION_ADMIN") {
    if (status === "onboarding" || status === "pending") {
      return [
        { href: "/organization-onboarding", label: "Onboarding", icon: UserPlus },
        { href: "/profile", label: "Account", icon: UserRound },
      ];
    }

    return [
      { href: "/organization-onboarding", label: "Records", icon: UserPlus },
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/profile", label: "Account", icon: UserRound },
    ];
  }

  return baseNavItems
    .filter((item) => {
      if (item.href === "/settings") {
        return hasPermission(role, "platform.settings.read");
      }

      if (item.href === "/onboarding") {
        return hasPermission(role, "onboarding.read");
      }

      if (item.href === "/organizations") {
        return hasPermission(role, "organizations.read");
      }

      if (item.href === "/partners") {
        return hasPermission(role, "partners.read");
      }

      if (item.href === "/people") {
        return hasPermission(role, "participants.read");
      }

      if (item.href === "/matching") {
        return hasPermission(role, "matching.read");
      }

      if (item.href === "/grants") {
        return hasPermission(role, "grants.read");
      }

      if (item.href === "/schools") {
        return hasPermission(role, "schools.read");
      }

      if (item.href === "/programs") {
        return hasPermission(role, "programs.manage");
      }

      if (item.href === "/relationships") {
        return hasPermission(role, "relationships.read");
      }

      if (item.href === "/reports") {
        return hasPermission(role, "reports.read");
      }

      if (item.href === "/safeguarding") {
        return hasPermission(role, "safeguarding.read");
      }

      return true;
    })
    .map((item) => {
      if (item.href === "/programs") {
        return {
          ...item,
          children: [
            { href: "/programs", label: "Overview" },
            { href: "/programs/catalog", label: "Catalog" },
            { href: "/programs/enrollment", label: "Enrollment" },
            { href: "/programs/analytics", label: "Analytics" },
          ],
        };
      }

      if (item.href === "/settings") {
        return {
          ...item,
          children: (item.children ?? []).filter((child) => {
            const settingsChildPermissions: Record<string, Parameters<typeof hasPermission>[1]> = {
              "/settings/branding": "platform.branding.manage",
              "/settings/verification": "verification.manage",
              "/settings/matching": "matching.policy.manage",
              "/settings/training": "training.manage",
              "/settings/consents": "consents.manage",
              "/settings/users": "tenant-users.manage",
            };

            const permission = settingsChildPermissions[child.href];
            return permission ? hasPermission(role, permission) : true;
          }),
        };
      }

      return item;
    });
}
