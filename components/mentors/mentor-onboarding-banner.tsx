"use client";

import Link from "next/link";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MentorOnboardingBanner({
  title = "Complete your onboarding to unlock mentor review.",
  description = "Finish the remaining setup steps so safeguarding and admin review can begin.",
  ctaHref = "/mentor-onboarding",
  ctaLabel = "Open onboarding",
}: {
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,#fff6db,#fff1c4)] p-5 shadow-[0_14px_30px_rgba(160,98,0,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            <Flame className="h-3.5 w-3.5" />
            Mentor Reminder
          </div>
          <h2 className="mt-3 text-xl font-semibold text-amber-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-amber-700">
            <Sparkles className="h-5 w-5" />
          </span>
          <Link href={ctaHref}>
            <Button className="gap-2 bg-amber-900 text-white hover:bg-amber-950">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
