"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, KeyRound, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";

type InviteView = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expiresAt: string;
};

function formatRole(value: string) {
  return value.replaceAll("_", " ");
}

function AcceptInviteContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const { pushToast } = useToast();

  const token = params.get("token") ?? "";

  const [invite, setInvite] = useState<InviteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadInvite() {
      if (!token) {
        setLoading(false);
        setError("Invite token is missing.");
        return;
      }

      try {
        const response = await fetch(`/api/invites/tenant?token=${encodeURIComponent(token)}`, { method: "GET" });
        const body = (await response.json()) as { item?: InviteView; message?: string };
        if (!response.ok || !body.item) {
          if (mounted) {
            setError(body.message ?? "Invite is invalid or expired.");
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setInvite(body.item);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Could not load invite details.");
          setLoading(false);
        }
      }
    }

    void loadInvite();
    return () => {
      mounted = false;
    };
  }, [token]);

  const expiresLabel = useMemo(() => {
    if (!invite?.expiresAt) {
      return "-";
    }
    const parsed = new Date(invite.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return invite.expiresAt;
    }
    return parsed.toLocaleString();
  }, [invite?.expiresAt]);

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <SectionSkeleton rows={4} />
      </Card>
    );
  }

  if (error || !invite) {
    return (
      <Card className="w-full max-w-md space-y-3">
        <h2 className="text-xl font-semibold text-[var(--text)]">Invite Invalid</h2>
        <p className="text-sm text-[var(--muted)]">{error ?? "Invite is invalid or expired."}</p>
        <Button variant="secondary" onClick={() => router.push("/login")}>Go to Login</Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Complete Registration</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Finish setup to activate your tenant account.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
        <p className="font-semibold text-[var(--text)]">{invite.firstName} {invite.lastName}</p>
        <p className="text-[var(--muted)]">{invite.email}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Role: {formatRole(invite.role)}</p>
        <p className="text-xs text-[var(--muted)]">Expires: {expiresLabel}</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();

          if (password !== confirmPassword) {
            pushToast({ title: "Password mismatch", description: "Passwords do not match.", variant: "error" });
            return;
          }

          setSubmitting(true);
          try {
            const response = await fetch("/api/invites/tenant/accept", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token,
                dateOfBirth,
                password,
              }),
            });

            const body = (await response.json()) as { ok?: boolean; item?: { email: string }; message?: string };
            if (!response.ok || !body.ok || !body.item?.email) {
              throw new Error(body.message ?? "Could not complete registration");
            }

            const loginResult = await login(body.item.email, password);
            if (!loginResult.ok) {
              throw new Error(loginResult.message ?? "Registration complete, but login failed");
            }

            pushToast({ title: "Registration Complete", description: "Your account is now active.", variant: "success" });
            router.push("/work-queue");
          } catch (acceptError) {
            pushToast({
              title: "Could not complete registration",
              description: acceptError instanceof Error ? acceptError.message : "Request failed.",
              variant: "error",
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="space-y-1.5 text-sm font-medium text-[var(--text)]">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--muted)]">
            <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
            Date of Birth *
          </span>
          <Input type="date" required value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
        </label>

        <label className="space-y-1.5 text-sm font-medium text-[var(--text)]">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--muted)]">
            <KeyRound className="h-4 w-4 text-[var(--primary)]" />
            Password *
          </span>
          <Input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <label className="space-y-1.5 text-sm font-medium text-[var(--text)]">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--muted)]">
            <UserCheck className="h-4 w-4 text-[var(--primary)]" />
            Confirm Password *
          </span>
          <Input
            type="password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Completing..." : "Complete Registration"}
        </Button>
      </form>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <SectionSkeleton rows={4} />
        </Card>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
