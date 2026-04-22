import { notFound } from "next/navigation";
import { Award, BadgeCheck, ShieldCheck } from "lucide-react";
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

export default async function PublicTrainingVerificationPage({
  params,
}: {
  params: Promise<{ completionId: string }>;
}) {
  const { completionId } = await params;

  const [branding, completion] = await Promise.all([
    getPlatformBranding(),
    prisma.mentorTrainingCompletion.findUnique({
      where: { id: completionId },
      select: {
        id: true,
        userId: true,
        moduleId: true,
        acknowledgedName: true,
        completedAt: true,
        module: {
          select: {
            title: true,
            version: true,
            description: true,
            passingScore: true,
          },
        },
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

  if (!completion) {
    notFound();
  }

  const attempt = await prisma.mentorTrainingAttempt.findFirst({
    where: {
      userId: completion.userId,
      moduleId: completion.moduleId,
      passed: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
    select: {
      score: true,
      submittedAt: true,
    },
  });

  const fullName = [completion.user.firstName, completion.user.middleName, completion.user.lastName].filter(Boolean).join(" ").trim();

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)]" data-theme="cacumator">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),white)] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            <span className="rounded-full bg-white/85 px-3 py-1 text-[var(--primary)]">Public verification</span>
            <span>{branding.platformName}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">Training certificate verified</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            This page confirms that the training completion record below is valid and was issued through the platform.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <Award className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Certificate holder</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">{completion.acknowledgedName || fullName}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{completion.module.description}</p>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Module</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">{completion.module.title}</h2>
            <div className="mt-4 space-y-2 text-sm text-[var(--text)]">
              <p>Version: <span className="font-semibold">{completion.module.version}</span></p>
              <p>Completed on: <span className="font-semibold">{formatDateTime(completion.completedAt)}</span></p>
              <p>Passing score: <span className="font-semibold">{completion.module.passingScore}%</span></p>
              <p>Achieved score: <span className="font-semibold">{attempt?.score ?? completion.module.passingScore}%</span></p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Verification status</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Valid completion record</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Valid
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Record ID</p>
              <p className="mt-2 break-all text-sm font-medium text-[var(--text)]">{completion.id}</p>
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Recorded date</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">{formatDateTime(attempt?.submittedAt ?? completion.completedAt)}</p>
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Issuer</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">{branding.ceoName}</p>
              <p className="text-xs text-[var(--muted)]">{branding.ceoTitle}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
