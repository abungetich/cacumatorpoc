"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VerifyState = "idle" | "verifying" | "success" | "error";

function statusMeta(state: VerifyState) {
  switch (state) {
    case "success":
      return {
        title: "Email confirmed",
        description: "Your email is now confirmed. You can sign in and continue with onboarding.",
        tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
        panel: "border-emerald-200 bg-emerald-50",
        icon: CheckCircle2,
      };
    case "error":
      return {
        title: "Confirmation issue",
        description: "The link could not be completed as expected. You can request a fresh verification email below.",
        tone: "bg-rose-100 text-rose-800 border-rose-200",
        panel: "border-rose-200 bg-rose-50",
        icon: AlertTriangle,
      };
    case "verifying":
      return {
        title: "Confirming your email",
        description: "We are validating your link and activating the next step of onboarding.",
        tone: "bg-amber-100 text-amber-800 border-amber-200",
        panel: "border-amber-200 bg-amber-50",
        icon: LoaderCircle,
      };
    default:
      return {
        title: "Check your inbox",
        description: "Open the confirmation email we sent you, then return here if you need a fresh link.",
        tone: "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]",
        panel: "border-[var(--border)] bg-[var(--surface-2)]",
        icon: Mail,
      };
  }
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<VerifyState>(token ? "verifying" : "idle");
  const [message, setMessage] = useState(
    token ? "Confirming your email address..." : "We’ll keep this account inactive until the email address is confirmed.",
  );
  const [isResending, setIsResending] = useState(false);

  const meta = useMemo(() => statusMeta(state), [state]);
  const StatusIcon = meta.icon;

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const body = (await response.json()) as { message?: string };
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setState("error");
          setMessage(body.message ?? "Could not confirm email.");
          return;
        }

        setState("success");
        setMessage(body.message ?? "Email confirmed. Sign in to complete onboarding.");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Could not confirm email right now.");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div data-theme="cacumator" className="cacumator-auth-shell min-h-screen px-4 py-8 text-[var(--text)] md:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 md:min-h-[calc(100vh-4rem)] md:grid-cols-[1fr_1.02fr]">
        <section className="cacumator-auth-hero hidden rounded-[34px] p-10 text-white shadow-[0_30px_72px_rgba(32,20,50,0.16)] md:flex md:flex-col md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/78">
              <ShieldCheck className="h-3.5 w-3.5" />
              Email Confirmation
            </div>
            <h1 className="mt-8 max-w-xl font-[family:Georgia,Times,'Times_New_Roman',serif] text-6xl font-semibold leading-[0.95] tracking-[-0.03em]">
              Confirm your email address
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-9 text-white/82">
              Registration creates the account, but the secure link in your email must be opened before sign-in and onboarding continue.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Open the verification email sent after registration.",
              "Use the secure link to confirm the address.",
              "Then sign in and continue with onboarding.",
            ].map((step, index) => (
              <div key={step} className="flex items-start gap-4 rounded-2xl border border-white/14 bg-white/8 px-4 py-4 backdrop-blur-sm">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm text-white/92">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="cacumator-auth-panel rounded-[34px] border-white/60 p-7 shadow-[0_30px_72px_rgba(32,20,50,0.08)] md:p-8">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${meta.tone}`}>
            <StatusIcon className={`h-3.5 w-3.5 ${state === "verifying" ? "animate-spin" : ""}`} />
            {meta.title}
          </div>

          <h2 className="mt-5 font-[family:Georgia,Times,'Times_New_Roman',serif] text-5xl font-semibold tracking-[-0.03em] text-[var(--text)]">{meta.title}</h2>
          <p className="mt-3 text-[1.05rem] leading-7 text-[var(--muted)]">{meta.description}</p>

          {email ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_72%,white)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Email Address</p>
              <p className="mt-2 break-all text-base font-semibold text-[var(--text)]">{email}</p>
            </div>
          ) : null}

          <div className={`mt-5 rounded-2xl border px-4 py-4 ${meta.panel}`}>
            <p className="text-sm leading-7 text-[var(--text)]">{message}</p>
          </div>

          {!token && email ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_72%,white)] p-4">
              <p className="text-sm font-semibold text-[var(--text)]">Need a fresh link?</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Request another confirmation email if the first one expired, went missing, or was blocked by your mailbox.
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  className="gap-2 rounded-full"
                  disabled={isResending}
                  onClick={async () => {
                    setIsResending(true);
                    try {
                      const response = await fetch("/api/verify-email/resend", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                      });
                      const body = (await response.json()) as { message?: string };
                      setMessage(body.message ?? (response.ok ? "Verification email sent." : "Could not resend verification email."));
                      setState(response.ok ? "idle" : "error");
                    } catch {
                      setState("error");
                      setMessage("Could not resend verification email right now.");
                    } finally {
                      setIsResending(false);
                    }
                  }}
                >
                  <RefreshCcw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {isResending ? "Sending..." : "Resend confirmation email"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {state === "success" ? (
              <Link href="/login">
                <Button className="cacumator-auth-cta gap-2 rounded-full">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            <Link href="/login">
              <Button variant="secondary" className="rounded-full">{state === "success" ? "Back to login" : "Open login"}</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary" className="rounded-full">Register another mentor</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
