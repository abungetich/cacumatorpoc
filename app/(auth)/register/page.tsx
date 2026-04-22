"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const { pushToast } = useToast();
  const organizationSlug = searchParams.get("organizationSlug")?.trim() ?? "";
  const organizationName = searchParams.get("organizationName")?.trim() ?? "";
  const joiningThroughOrganization = Boolean(organizationSlug && organizationName);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    organizationSlug,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await register({
        ...form,
        role: "MENTOR",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        organizationSlug: organizationSlug || undefined,
      });
      pushToast({
        title: "Registration Submitted",
        description: result.message ?? "Check your email to confirm your account.",
        variant: "info",
      });
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } catch (error) {
      setIsSubmitting(false);
      pushToast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Unable to submit registration.",
        variant: "error",
      });
      await Swal.fire({
        title: "Registration failed",
        text: error instanceof Error ? error.message : "Unable to submit registration",
        icon: "error",
        confirmButtonColor: "#b91c1c",
      });
    }
  };

  return (
    <Card className="w-full max-w-lg rounded-[30px] p-5 shadow-[0_18px_46px_rgba(0,0,0,0.08)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {joiningThroughOrganization ? "Mentor via organization" : "Mentor registration"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">
            {joiningThroughOrganization ? "Create your mentor account" : "Start your mentor account"}
          </h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
          Step 1 of 2
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Keep this step light. The rest of your mentoring profile is completed during onboarding after email verification.
      </p>

      {joiningThroughOrganization ? (
        <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_26%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,white),var(--surface))] p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)]">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Organization Join</p>
              <p className="mt-1 text-sm font-medium text-[var(--text)]">{organizationName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Your mentor registration will also create a pending membership request under this organization.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-4 text-sm text-[var(--muted)] md:grid-cols-2">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--primary)]" />
          <p>Create your account in under a minute.</p>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--primary)]" />
          <p>Phone, date of birth, and detailed profile fields move to onboarding after this step.</p>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">First Name</label>
            <Input
              required
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Last Name</label>
            <Input
              required
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Email</label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--primary)]">
            Sign in
          </Link>
        </p>
        {!joiningThroughOrganization ? (
          <Link href="/join/mentor/organization" className="inline-flex items-center gap-1 font-medium text-[var(--primary)]">
            Organization path
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
