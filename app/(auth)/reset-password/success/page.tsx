import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ResetPasswordSuccessPage() {
  return (
    <Card className="cacumator-auth-panel w-full max-w-[35rem] rounded-[34px] border-white/60 p-8 shadow-[0_30px_72px_rgba(32,20,50,0.08)]">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Password Updated
      </div>
      <h2 className="mt-5 font-[family:Georgia,Times,'Times_New_Roman',serif] text-5xl font-semibold tracking-[-0.03em] text-[var(--text)]">
        Your password has been reset
      </h2>
      <p className="mt-4 text-[1.05rem] leading-7 text-[var(--muted)]">
        Sign in with your new password to continue into the platform.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login">
          <Button className="cacumator-auth-cta gap-2 rounded-full">
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/forgot-password">
          <Button variant="secondary" className="rounded-full">Send another reset link</Button>
        </Link>
      </div>
    </Card>
  );
}
