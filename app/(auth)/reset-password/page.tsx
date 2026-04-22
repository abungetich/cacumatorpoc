"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/context/toast-context";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        pushToast({
          title: "Could not reset password",
          description: body.message ?? "Try again.",
          variant: "error",
        });
        setIsSubmitting(false);
        return;
      }

      pushToast({
        title: "Password updated",
        description: body.message ?? "You can now sign in.",
        variant: "success",
      });
      router.push("/reset-password/success");
    } catch {
      pushToast({
        title: "Could not reset password",
        description: "Try again.",
        variant: "error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="cacumator-auth-panel w-full max-w-[35rem] rounded-[34px] border-white/60 p-8 shadow-[0_30px_72px_rgba(32,20,50,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Password Reset</p>
      <h2 className="mt-2 font-[family:Georgia,Times,'Times_New_Roman',serif] text-5xl font-semibold tracking-[-0.03em] text-[var(--text)]">
        Set a new password
      </h2>
      <p className="mt-3 text-[1.05rem] leading-7 text-[var(--muted)]">
        Use the secure link from your email to set a new password for your account.
      </p>

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text)]">New password</label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="h-12 rounded-2xl border-[color-mix(in_srgb,var(--border)_92%,white)] bg-[color-mix(in_srgb,var(--surface-2)_72%,white)] pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_2px_6px_rgba(51,42,74,0.04)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text)]">Confirm password</label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              className="h-12 rounded-2xl border-[color-mix(in_srgb,var(--border)_92%,white)] bg-[color-mix(in_srgb,var(--surface-2)_72%,white)] pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_2px_6px_rgba(51,42,74,0.04)]"
            />
          </div>
        </div>

        <Button type="submit" className="cacumator-auth-cta h-12 w-full rounded-full text-base font-semibold" disabled={isSubmitting || !token}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </form>

      <div className="mt-8 border-t border-[var(--border)] pt-5">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </Card>
  );
}
