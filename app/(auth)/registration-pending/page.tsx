import { getServerSession } from "next-auth";
import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth-options";
import { PendingPageActions } from "@/components/auth/pending-page-actions";

type RegistrationPendingPageProps = {
  searchParams: Promise<{ email?: string }>;
};

function maskEmail(email: string) {
  const normalized = email.trim();
  if (!normalized || !normalized.includes("@")) {
    return "your email";
  }

  const [localPart, domainPart] = normalized.split("@");
  if (!localPart || !domainPart) {
    return "your email";
  }

  const maskedLocal =
    localPart.length <= 2 ? `${localPart[0] ?? ""}*` : `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 2))}`;

  const domainSegments = domainPart.split(".");
  const domainName = domainSegments[0] ?? "";
  const domainSuffix = domainSegments.slice(1).join(".");
  const maskedDomain =
    domainName.length <= 2 ? `${domainName[0] ?? ""}*` : `${domainName.slice(0, 2)}${"*".repeat(Math.max(domainName.length - 2, 2))}`;

  return `${maskedLocal}@${domainSuffix ? `${maskedDomain}.${domainSuffix}` : maskedDomain}`;
}

export default async function RegistrationPendingPage({ searchParams }: RegistrationPendingPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const pendingEmail = session?.user?.email ?? params.email ?? "";
  const maskedEmail = maskEmail(pendingEmail);
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <Card className="cacumator-auth-panel w-full max-w-[35rem] rounded-[34px] border-white/60 p-8 text-center shadow-[0_30px_72px_rgba(32,20,50,0.08)]">
      <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
        <Clock3 className="h-3.5 w-3.5" />
        Registration Pending
      </div>
      <h2 className="mt-5 font-[family:Georgia,Times,'Times_New_Roman',serif] text-5xl font-semibold tracking-[-0.03em] text-[var(--text)]">We are reviewing your account</h2>
      <p className="mt-4 text-[1.05rem] leading-7 text-[var(--muted)]">
        {firstName}, your account linked to <strong>{maskedEmail}</strong> is awaiting review. We&apos;ll email you once safeguarding checks and review are complete.
      </p>
      <PendingPageActions />
      <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
        Need to register an organization instead? Sign out first, then use organization registration from the public landing page.
      </p>
    </Card>
  );
}
