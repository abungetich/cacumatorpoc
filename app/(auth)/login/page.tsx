"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, Mail, LockKeyhole } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("platform.admin@mentorhub.org");
  const [password, setPassword] = useState("pass1234");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    const result = await login(email, password, browserTimeZone);

    if (!result.ok) {
      setIsSubmitting(false);
      pushToast({
        title: "Login Failed",
        description: result.message ?? "Unable to sign in.",
        variant: "error",
      });
      await Swal.fire({
        title: "Login failed",
        text: result.message ?? "Unable to sign in",
        icon: "error",
        confirmButtonColor: "#b91c1c",
      });
      return;
    }

    if (result.pending) {
      pushToast({
        title: "Account Pending",
        description: "Your registration is under review.",
        variant: "info",
      });
      router.push(`/registration-pending?email=${encodeURIComponent(email)}`);
      return;
    }

    if (result.onboarding) {
      pushToast({
        title: "Complete Your Onboarding",
        description: "Finish the required onboarding steps before review can continue.",
        variant: "info",
      });
      router.push(result.redirectTo ?? "/mentor-onboarding");
      return;
    }

    pushToast({
      title: "Welcome Back",
      description: "You are now signed in.",
      variant: "success",
    });
    router.push("/work-queue");
  };

  return (
    <Card className="cacumator-auth-panel w-full max-w-[35rem] rounded-[34px] border-white/60 p-8 shadow-[0_30px_72px_rgba(32,20,50,0.08)]">
      <h2 className="font-[family:Georgia,Times,'Times_New_Roman',serif] text-5xl font-semibold tracking-[-0.03em] text-[var(--text)]">
        Sign in to your account
      </h2>
      <p className="mt-3 text-[1.05rem] leading-7 text-[var(--muted)]">
        Use your email and password to continue.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text)]">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="h-12 rounded-2xl border-[color-mix(in_srgb,var(--border)_92%,white)] bg-[color-mix(in_srgb,var(--surface-2)_72%,white)] pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_2px_6px_rgba(51,42,74,0.04)]"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-[var(--text)]">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-[var(--text)] underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="h-12 rounded-2xl border-[color-mix(in_srgb,var(--border)_92%,white)] bg-[color-mix(in_srgb,var(--surface-2)_72%,white)] pl-11 pr-12 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_2px_6px_rgba(51,42,74,0.04)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_1fr] sm:items-center">
          <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <input type="checkbox" className="h-5 w-5 rounded-md border border-[var(--border)] bg-transparent" />
            <span>Remember me</span>
          </label>
          <p className="text-sm leading-6 text-[var(--muted)]">Secure access for verified accounts</p>
        </div>

        <Button type="submit" className="cacumator-auth-cta mt-2 h-12 w-full rounded-full text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="mt-8 border-t border-[var(--border)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">Need help logging in?</p>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link href="/register" className="text-[var(--text)] underline underline-offset-4">
              Register as mentor
            </Link>
            <Link href="/join/mentor/organization" className="text-[var(--text)] underline underline-offset-4">
              Organization path
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
