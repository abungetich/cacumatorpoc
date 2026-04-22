import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getPlatformBranding } from "@/lib/platform-branding";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const branding = await getPlatformBranding();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.status === "pending") {
    redirect("/registration-pending");
  }

  return (
    <DashboardShell branding={branding}>{children}</DashboardShell>
  );
}
