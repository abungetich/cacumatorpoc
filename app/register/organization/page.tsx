"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, ImagePlus, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/context/toast-context";
import { registerOrganization, uploadOrganizationLogo } from "@/lib/organization-actions";
import { registerOrganizationSchema } from "@/lib/validation";

const organizationTypes = ["CORPORATE", "NGO", "FOUNDATION", "GOVERNMENT", "ALUMNI", "ASSOCIATION", "COMMUNITY", "FAITH_BASED", "OTHER"] as const;

type OrganizationType = (typeof organizationTypes)[number];
type OrganizationIntent = "default" | "mentor-org" | "partner" | "funder";

type FormState = {
  name: string;
  type: OrganizationType;
  logoUrl: string;
  country: string;
  website: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  mentorParticipation: boolean;
  financialSupport: boolean;
  inKindSupport: boolean;
};

const initialForm: FormState = {
  name: "",
  type: "CORPORATE",
  logoUrl: "",
  country: "Kenya",
  website: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPhone: "",
  mentorParticipation: true,
  financialSupport: false,
  inKindSupport: false,
};

const intentConfig: Record<
  OrganizationIntent,
  {
    label: string;
    title: string;
    description: string;
    type: OrganizationType;
    mentorParticipation: boolean;
    financialSupport: boolean;
    inKindSupport: boolean;
  }
> = {
  default: {
    label: "General organization",
    title: "Create an organization workspace request",
    description:
      "This intake is intentionally short. Start with identity, admin contact, and required agreements. The rest can be completed later inside the workspace.",
    type: "CORPORATE",
    mentorParticipation: true,
    financialSupport: false,
    inKindSupport: false,
  },
  "mentor-org": {
    label: "Mentor organization",
    title: "Register an organization that will supply mentors",
    description:
      "Use this path for employers, alumni bodies, NGOs, associations, and institutions that want mentors to join through an accountable organization workspace.",
    type: "CORPORATE",
    mentorParticipation: true,
    financialSupport: false,
    inKindSupport: false,
  },
  partner: {
    label: "Partner organization",
    title: "Register a delivery or operating partner",
    description:
      "Use this path for organizations coordinating schools, shared delivery operations, or partner-led mentorship programs.",
    type: "NGO",
    mentorParticipation: true,
    financialSupport: false,
    inKindSupport: true,
  },
  funder: {
    label: "Funder or financier",
    title: "Register a funding or support organization",
    description:
      "Use this path for grantmakers, sponsors, and institutions offering financial or in-kind support to mentorship programs.",
    type: "FOUNDATION",
    mentorParticipation: false,
    financialSupport: true,
    inKindSupport: false,
  },
};

const stepMeta = [
  { title: "Identity", icon: Building2 },
  { title: "Admin", icon: UserRound },
  { title: "Review", icon: Sparkles },
] as const;

function resolveIntent(value: string | null): OrganizationIntent {
  if (value === "mentor-org" || value === "partner" || value === "funder") {
    return value;
  }
  return "default";
}

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [step, setStep] = useState(0);
  const intent = resolveIntent(searchParams.get("intent"));
  const submittedName = searchParams.get("submitted");
  const config = intentConfig[intent];

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      type: prev.name || prev.adminEmail ? prev.type : config.type,
      mentorParticipation: config.mentorParticipation,
      financialSupport: config.financialSupport,
      inKindSupport: config.inKindSupport,
    }));
  }, [config.financialSupport, config.inKindSupport, config.mentorParticipation, config.type]);

  const canProceed = useMemo(() => {
    if (step === 0) {
      return form.name.trim().length >= 3 && form.country.trim().length >= 2 && (form.mentorParticipation || form.financialSupport || form.inKindSupport);
    }
    if (step === 1) {
      return (
        form.adminFirstName.trim().length >= 2 &&
        form.adminLastName.trim().length >= 2 &&
        /\S+@\S+\.\S+/.test(form.adminEmail) &&
        form.adminPhone.trim().length >= 7
      );
    }

    return true;
  }, [form, step]);

  const onLogoSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsUploadingLogo(true);
    try {
      const payload = await uploadOrganizationLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: payload.logoUrl ?? "" }));
      pushToast({
        title: "Logo Uploaded",
        description: "Organization logo uploaded successfully.",
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Could Not Upload Logo",
        description: error instanceof Error ? error.message : "Upload failed.",
        variant: "error",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step < stepMeta.length - 1) {
      if (!canProceed) {
        pushToast({
          title: "Complete This Step",
          description: "Fill the required fields before moving on.",
          variant: "error",
        });
        return;
      }
      setStep((current) => Math.min(current + 1, stepMeta.length - 1));
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: form.name,
      type: form.type,
      logoUrl: form.logoUrl.trim() || undefined,
      country: form.country,
      website: form.website.trim() || undefined,
      adminFirstName: form.adminFirstName,
      adminLastName: form.adminLastName,
      adminEmail: form.adminEmail,
      adminPhone: form.adminPhone,
      mentorParticipation: form.mentorParticipation,
      financialSupport: form.financialSupport,
      inKindSupport: form.inKindSupport,
    };

    const parsed = registerOrganizationSchema.safeParse(payload);
    if (!parsed.success) {
      setIsSubmitting(false);
      pushToast({ title: "Check Organization Registration", description: parsed.error.issues[0]?.message ?? "Invalid form", variant: "error" });
      return;
    }

    try {
      const result = await registerOrganization(parsed.data);
      pushToast({
        title: "Verify Organization Email",
        description: result.message ?? "Confirm the admin email before signing in.",
        variant: "success",
      });
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
      setForm({
        ...initialForm,
        type: config.type,
        mentorParticipation: config.mentorParticipation,
        financialSupport: config.financialSupport,
        inKindSupport: config.inKindSupport,
      });
      setStep(0);
    } catch (error) {
      pushToast({
        title: "Could Not Register Organization",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-theme="cacumator" className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
      {submittedName ? (
        <section className="rounded-[24px] border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,white),var(--surface))] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.05)]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Submission Received</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">{submittedName}</span> was created. Confirm the organization admin email before signing in.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_15%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{config.label}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{config.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{config.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/login" className="font-medium text-[var(--primary)]">Already have an account?</Link>
          <Link href="/register" className="font-medium text-[var(--primary)]">Register as an individual mentor</Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {stepMeta.map((item, index) => {
          const Icon = item.icon;
          const active = index === step;
          const done = index < step;
          return (
            <div
              key={item.title}
              className={`rounded-2xl border px-4 py-4 ${active ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,white)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${active || done ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Step {index + 1}</p>
                  <p className="font-semibold text-[var(--text)]">{item.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <form className="space-y-6" onSubmit={onSubmit}>
        {step === 0 ? (
          <SectionCard icon={Building2} title="Organization Identity" description="Keep it short. Capture only what is needed to identify the institution and its participation mode.">
            <WideField label="Organization Logo">
              <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="Organization logo" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-[var(--muted)]" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--muted)]">Optional logo for the public and internal organization pages.</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]">
                      {isUploadingLogo ? "Uploading..." : form.logoUrl ? "Change Logo" : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={isUploadingLogo}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void onLogoSelected(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </WideField>
            <Field label="Organization Name" required>
              <Input required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </Field>
            <Field label="Organization Type" required>
              <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as OrganizationType }))}>
                {organizationTypes.map((option) => (
                  <option key={option} value={option}>{formatEnum(option)}</option>
                ))}
              </select>
            </Field>
            <Field label="Country" required>
              <Input required value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} placeholder="https://example.org" />
            </Field>
            <WideField label="Participation Modes" required>
              <div className="grid gap-3 sm:grid-cols-3">
                <CheckboxCard checked={form.mentorParticipation} label="Provide mentors" help="Mentors will join through this organization." onToggle={() => setForm((prev) => ({ ...prev, mentorParticipation: !prev.mentorParticipation }))} />
                <CheckboxCard checked={form.financialSupport} label="Provide financial support" help="Funding or sponsorship obligations will be captured." onToggle={() => setForm((prev) => ({ ...prev, financialSupport: !prev.financialSupport }))} />
                <CheckboxCard checked={form.inKindSupport} label="Provide in-kind support" help="Staff time, venues, equipment, and similar support." onToggle={() => setForm((prev) => ({ ...prev, inKindSupport: !prev.inKindSupport }))} />
              </div>
            </WideField>
          </SectionCard>
        ) : null}

        {step === 1 ? (
          <SectionCard icon={UserRound} title="Founding Admin" description="This is the first accountable admin contact for the organization workspace.">
            <Field label="Admin First Name" required>
              <Input required value={form.adminFirstName} onChange={(event) => setForm((prev) => ({ ...prev, adminFirstName: event.target.value }))} />
            </Field>
            <Field label="Admin Last Name" required>
              <Input required value={form.adminLastName} onChange={(event) => setForm((prev) => ({ ...prev, adminLastName: event.target.value }))} />
            </Field>
            <Field label="Admin Email" required>
              <Input required type="email" value={form.adminEmail} onChange={(event) => setForm((prev) => ({ ...prev, adminEmail: event.target.value }))} />
            </Field>
            <Field label="Admin Phone" required>
              <Input required value={form.adminPhone} onChange={(event) => setForm((prev) => ({ ...prev, adminPhone: event.target.value }))} />
            </Field>
            <WideField label="What we will derive automatically">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                <p>Public contact email defaults to the admin email.</p>
                <p>Primary contact defaults to the founding admin name.</p>
                <p>Additional organization details can be completed after approval.</p>
              </div>
            </WideField>
          </SectionCard>
        ) : null}

        {step === 2 ? (
          <SectionCard icon={Sparkles} title="Review" description="We only need the basics at this stage. The organization admin will confirm email, sign in, and complete agreements after login.">
            <WideField label="Review Summary">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                <p><span className="font-medium text-[var(--text)]">Organization:</span> {form.name || "Not set"}</p>
                <p><span className="font-medium text-[var(--text)]">Country:</span> {form.country || "Not set"}</p>
                <p><span className="font-medium text-[var(--text)]">Admin:</span> {[form.adminFirstName, form.adminLastName].filter(Boolean).join(" ") || "Not set"}</p>
                <p><span className="font-medium text-[var(--text)]">Participation:</span> {[
                  form.mentorParticipation ? "Mentors" : null,
                  form.financialSupport ? "Financial support" : null,
                  form.inKindSupport ? "In-kind support" : null,
                ].filter(Boolean).join(", ") || "Not set"}</p>
              </div>
            </WideField>
            <WideField label="What happens next">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
                <p>1. We send a verification email to the organization admin.</p>
                <p>2. The admin confirms the email address.</p>
                <p>3. After sign-in, they complete the organization profile and required agreements.</p>
                <p>4. Only then does the organization move into review.</p>
              </div>
            </WideField>
          </SectionCard>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Submission creates the organization and sends a verification email to the founding admin.
          </p>
          <div className="flex gap-3">
            {step > 0 ? (
              <Button type="button" variant="secondary" className="gap-2" onClick={() => setStep((current) => Math.max(current - 1, 0))}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : null}
            <Button type="submit" className="gap-2 sm:min-w-[220px]" disabled={isSubmitting || isUploadingLogo || !canProceed}>
              {step < stepMeta.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                isSubmitting ? "Submitting..." : "Submit Organization"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }: { icon: typeof Building2; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_65%,white))] text-[var(--primary-contrast)]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>
    </Card>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-[var(--muted)]">
      <span className="font-medium text-[var(--text)]">{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function WideField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-[var(--muted)] md:col-span-2">
      <span className="font-medium text-[var(--text)]">{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function CheckboxCard({ checked, label, help, onToggle }: { checked: boolean; label: string; help: string; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${checked ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-xs leading-5">{help}</p>
    </button>
  );
}
