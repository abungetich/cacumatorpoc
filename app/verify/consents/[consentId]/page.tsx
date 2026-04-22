import { notFound } from "next/navigation";
import { BadgeCheck, FileSignature, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPlatformBranding } from "@/lib/platform-branding";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not recorded";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function maskName(firstName: string | null, middleName: string | null, lastName: string | null) {
  const first = firstName?.trim() || "Mentor";
  const surnameInitial = lastName?.trim()?.[0] ? `${lastName.trim()[0]}.` : "";
  return [first, middleName?.trim(), surnameInitial].filter(Boolean).join(" ");
}

export default async function PublicConsentVerificationPage({
  params,
}: {
  params: Promise<{ consentId: string }>;
}) {
  const { consentId } = await params;

  const [branding, consent] = await Promise.all([
    getPlatformBranding(),
    prisma.consent.findUnique({
      where: { id: consentId },
      select: {
        id: true,
        userId: true,
        consentType: true,
        version: true,
        agreedAt: true,
        revokedAt: true,
        evidenceUrl: true,
        documentUrl: true,
        user: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  if (!consent) {
    notFound();
  }

  const setting = await prisma.mentorConsentSetting.findFirst({
    where: {
      consentType: consent.consentType,
      version: consent.version,
    },
    select: {
      title: true,
      summary: true,
    },
  });

  const auditEntries = await prisma.auditLog.findMany({
    where: {
      userId: consent.userId,
      action: "MENTOR_CONSENT_SELF_ASSENTED",
      entityType: "mentor_consent_settings",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      newValues: true,
    },
  });

  const auditEntry = auditEntries.find((entry) => {
    const payload = (entry.newValues ?? {}) as Record<string, unknown>;
    return payload.consentType === consent.consentType && payload.version === consent.version;
  });

  const payload = (auditEntry?.newValues ?? {}) as Record<string, unknown>;
  const acknowledgedName = typeof payload.acknowledgedName === "string" ? payload.acknowledgedName : maskName(consent.user.firstName, consent.user.middleName, consent.user.lastName);
  const publicName = maskName(consent.user.firstName, consent.user.middleName, consent.user.lastName);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)]" data-theme="cacumator">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),white)] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            <span className="rounded-full bg-white/85 px-3 py-1 text-[var(--primary)]">Public verification</span>
            <span>{branding.platformName}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">Signed consent record verified</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            This page confirms that the consent record below was signed on the platform and remains available for verification.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <FileSignature className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Document</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">{setting?.title ?? consent.consentType.replaceAll("_", " ")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{setting?.summary ?? "Verified mentor assent record."}</p>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Signer</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">{publicName}</h2>
            <div className="mt-4 space-y-2 text-sm text-[var(--text)]">
              <p>Typed signature: <span className="font-semibold">{acknowledgedName}</span></p>
              <p>Version: <span className="font-semibold">{consent.version}</span></p>
              <p>Signed on: <span className="font-semibold">{formatDateTime(consent.agreedAt)}</span></p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Verification status</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
                {consent.revokedAt ? "Record revoked" : "Valid assent record"}
              </h2>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${consent.revokedAt ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
              <ShieldCheck className="h-4 w-4" />
              {consent.revokedAt ? "Revoked" : "Valid"}
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Consent ID</p>
              <p className="mt-2 break-all text-sm font-medium text-[var(--text)]">{consent.id}</p>
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Source document</p>
              <p className="mt-2 break-all text-sm font-medium text-[var(--text)]">{consent.documentUrl}</p>
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Evidence on file</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">{consent.evidenceUrl ? "Yes" : "No"}</p>
              <p className="text-xs text-[var(--muted)]">{branding.ceoName} • {branding.ceoTitle}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
