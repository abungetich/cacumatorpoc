"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Swal from "sweetalert2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, ChevronLeft, ChevronRight, Info, School2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { apiFetch } from "@/lib/api-client";
import type { PartnersResponse, SchoolOnboardingResponse } from "@/lib/api-types";

type Step = 1 | 2 | 3;

const schoolTypes = ["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY", "VOCATIONAL"] as const;

function FieldLabel({
  label,
  required,
  tooltip,
}: {
  label: string;
  required: boolean;
  tooltip: string;
}) {
  return (
    <label className="mb-1 flex items-center gap-2 text-sm text-[var(--muted)]">
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${required ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
      >
        {required ? "Required" : "Optional"}
      </span>
      <span title={tooltip} aria-label={`${label} info`} className="text-[var(--muted)]">
        <Info className="h-3.5 w-3.5" />
      </span>
    </label>
  );
}

export default function SchoolOnboardingPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [created, setCreated] = useState<SchoolOnboardingResponse | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "SECONDARY",
    address: "",
    phone: "",
    email: "",
    principalName: "",
    principalEmail: "",
    studentPopulation: "",
    accreditationStatus: "",
    partnerId: "",
    createAdmin: true,
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    adminDob: "",
    adminPassword: "",
  });

  const canOnboard = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN";

  const partnersQuery = useQuery({
    queryKey: ["partners-for-onboarding"],
    queryFn: () => apiFetch<PartnersResponse>("/api/protected/partners"),
    enabled: canOnboard,
  });

  const selectedPartner = partnersQuery.data?.items?.find((item) => item.id === form.partnerId);
  const partnerLabel = selectedPartner ? `${selectedPartner.name} (${selectedPartner.type})` : "None";

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<SchoolOnboardingResponse>("/api/protected/schools/onboard", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          address: form.address,
          phone: form.phone,
          email: form.email,
          principalName: form.principalName,
          principalEmail: form.principalEmail,
          partnerId: form.partnerId || undefined,
          studentPopulation: form.studentPopulation ? Number(form.studentPopulation) : undefined,
          accreditationStatus: form.accreditationStatus || undefined,
          schoolAdmin: {
            create: form.createAdmin,
            firstName: form.adminFirstName || undefined,
            lastName: form.adminLastName || undefined,
            email: form.adminEmail || undefined,
            phone: form.adminPhone || undefined,
            dateOfBirth: form.adminDob || undefined,
            password: form.adminPassword || undefined,
          },
        }),
      }),
    onSuccess: (payload) => {
      setCreated(payload);
    },
  });

  const validateStep = (nextStep: Step) => {
    if (nextStep === 2) {
      if (
        !form.name.trim() ||
        !form.address.trim() ||
        !form.phone.trim() ||
        !form.email.trim() ||
        !form.principalName.trim() ||
        !form.principalEmail.trim()
      ) {
        throw new Error("Complete all required school profile fields.");
      }
    }

    if (nextStep === 3 && form.createAdmin) {
      if (
        !form.adminFirstName.trim() ||
        !form.adminLastName.trim() ||
        !form.adminEmail.trim() ||
        !form.adminPhone.trim() ||
        !form.adminDob.trim() ||
        !form.adminPassword.trim()
      ) {
        throw new Error("Complete all required school admin fields.");
      }
    }
  };

  const moveStep = async (target: Step) => {
    try {
      validateStep(target);
      setStep(target);
    } catch (error) {
      pushToast({
        title: "Missing Fields",
        description: error instanceof Error ? error.message : "Please complete required fields.",
        variant: "error",
      });
      await Swal.fire({
        title: "Cannot continue",
        text: error instanceof Error ? error.message : "Please complete required fields.",
        icon: "warning",
        confirmButtonColor: "#d97706",
      });
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = await mutation.mutateAsync();
      pushToast({
        title: "School Onboarded",
        description: `${payload.school.name} is now active in the platform.`,
        variant: "success",
      });
      await Swal.fire({
        title: "School onboarded",
        text: payload.adminAccount
          ? `School created with admin account ${payload.adminAccount.email}.`
          : "School created without provisioning a school admin account.",
        icon: "success",
        confirmButtonColor: "#15803d",
      });
    } catch (error) {
      pushToast({
        title: "Onboarding Failed",
        description: error instanceof Error ? error.message : "Could not onboard school.",
        variant: "error",
      });
      await Swal.fire({
        title: "Onboarding failed",
        text: error instanceof Error ? error.message : "Could not onboard school.",
        icon: "error",
        confirmButtonColor: "#b91c1c",
      });
    }
  };

  if (!canOnboard) {
    return (
      <Card>
        <EmptyState
          title="Access Restricted"
          description="Only platform admins and partner admins can onboard schools."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">School Onboarding</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Guided workflow to create a school and optionally provision the school admin account.
          </p>
        </div>
        <Link href="/configs">
          <Button variant="secondary" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Configs
          </Button>
        </Link>
      </section>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <button
            className={`rounded-xl border p-3 text-left ${step === 1 ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            onClick={() => setStep(1)}
            type="button"
          >
            <p className="text-xs text-[var(--muted)]">Step 1</p>
            <p className="font-medium text-[var(--text)]">School Profile</p>
          </button>
          <button
            className={`rounded-xl border p-3 text-left ${step === 2 ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            onClick={() => moveStep(2)}
            type="button"
          >
            <p className="text-xs text-[var(--muted)]">Step 2</p>
            <p className="font-medium text-[var(--text)]">Admin Account</p>
          </button>
          <button
            className={`rounded-xl border p-3 text-left ${step === 3 ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            onClick={() => moveStep(3)}
            type="button"
          >
            <p className="text-xs text-[var(--muted)]">Step 3</p>
            <p className="font-medium text-[var(--text)]">Review & Create</p>
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel
                  label="School Name"
                  required
                  tooltip="Official institution name that appears across dashboards, reports, and matching workflows."
                />
                <Input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="School Type"
                  required
                  tooltip="Education category used for eligibility rules, targeting, and reporting segmentation."
                />
                <select
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  {schoolTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel
                  label="Student Population"
                  required={false}
                  tooltip="Approximate learner count used for planning capacity, impact measurement, and prioritization."
                />
                <Input
                  type="number"
                  min={1}
                  value={form.studentPopulation}
                  onChange={(event) => setForm((prev) => ({ ...prev, studentPopulation: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel
                  label="Address"
                  required
                  tooltip="Physical school location used for regional filtering and safeguarding coverage."
                />
                <Input
                  required
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="School Phone"
                  required
                  tooltip="Primary contact number for operational coordination and urgent follow-up."
                />
                <Input
                  required
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="School Email"
                  required
                  tooltip="Official institutional email for notifications, reports, and account recovery."
                />
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="Principal Name"
                  required
                  tooltip="Responsible leadership contact recorded for governance and escalation workflows."
                />
                <Input
                  required
                  value={form.principalName}
                  onChange={(event) => setForm((prev) => ({ ...prev, principalName: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="Principal Email"
                  required
                  tooltip="Direct leadership email used for approvals, compliance communication, and escalations."
                />
                <Input
                  required
                  type="email"
                  value={form.principalEmail}
                  onChange={(event) => setForm((prev) => ({ ...prev, principalEmail: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="Accreditation Status"
                  required={false}
                  tooltip="Current accreditation or registration standing for policy tracking and stakeholder reporting."
                />
                <Input
                  value={form.accreditationStatus}
                  onChange={(event) => setForm((prev) => ({ ...prev, accreditationStatus: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel
                  label="Partner"
                  required={user?.role === "PARTNER_ADMIN"}
                  tooltip="Owning partner organization. Partner admins are automatically scoped to their own partner."
                />
                {user?.role === "PARTNER_ADMIN" ? (
                  <Input value={partnersQuery.data?.items[0]?.name ?? "Partner scoped"} disabled />
                ) : (
                  <select
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                    value={form.partnerId}
                    onChange={(event) => setForm((prev) => ({ ...prev, partnerId: event.target.value }))}
                  >
                    <option value="">No partner</option>
                    {(partnersQuery.data?.items ?? []).map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={form.createAdmin}
                  onChange={(event) => setForm((prev) => ({ ...prev, createAdmin: event.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                <span>Provision school admin account now</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Optional
                </span>
                <span
                  title="Enable to create a SCHOOL_ADMIN user immediately so the school can start operating right away."
                  aria-label="Provision school admin account info"
                  className="text-[var(--muted)]"
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </label>

              {form.createAdmin ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel
                      label="Admin First Name"
                      required
                      tooltip="Given name of the first school admin account owner."
                    />
                    <Input
                      required
                      value={form.adminFirstName}
                      onChange={(event) => setForm((prev) => ({ ...prev, adminFirstName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Admin Last Name"
                      required
                      tooltip="Family name of the school admin account owner."
                    />
                    <Input
                      required
                      value={form.adminLastName}
                      onChange={(event) => setForm((prev) => ({ ...prev, adminLastName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Admin Email"
                      required
                      tooltip="Login email for the school admin user account."
                    />
                    <Input
                      required
                      type="email"
                      value={form.adminEmail}
                      onChange={(event) => setForm((prev) => ({ ...prev, adminEmail: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Admin Phone"
                      required
                      tooltip="Direct phone number for admin notifications and urgent contact."
                    />
                    <Input
                      required
                      value={form.adminPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, adminPhone: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Admin Date of Birth"
                      required
                      tooltip="Used for identity verification and safeguarding-related audit requirements."
                    />
                    <Input
                      required
                      type="date"
                      value={form.adminDob}
                      onChange={(event) => setForm((prev) => ({ ...prev, adminDob: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Temporary Password"
                      required
                      tooltip="Initial password for first login; should be changed by the admin after onboarding."
                    />
                    <Input
                      required
                      type="password"
                      minLength={8}
                      value={form.adminPassword}
                      onChange={(event) => setForm((prev) => ({ ...prev, adminPassword: event.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  You can create the school now and provision the admin account later.
                </p>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">School</p>
                <p className="text-sm font-medium text-[var(--text)]">
                  {form.name} ({form.type})
                </p>
                <p className="text-xs text-[var(--muted)]">{form.address}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Partner</p>
                <p className="text-sm font-medium text-[var(--text)]">{partnerLabel}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">School Admin Provisioning</p>
                <p className="text-sm font-medium text-[var(--text)]">
                  {form.createAdmin ? `Yes - ${form.adminEmail}` : "No (skip for now)"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
              disabled={step === 1}
            >
              Previous
            </Button>
            {step < 3 ? (
              <Button type="button" className="gap-2" onClick={() => moveStep((step + 1) as Step)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="gap-2" disabled={mutation.isPending}>
                <School2 className="h-4 w-4" />
                {mutation.isPending ? "Creating..." : "Create School"}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {created ? (
        <Card className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
            <Building2 className="h-4 w-4" />
            Onboarding Result
          </p>
          <p className="text-sm text-[var(--text)]">
            School created: <span className="font-medium">{created.school.name}</span>
          </p>
          <p className="text-xs text-[var(--muted)]">School ID: {created.school.id}</p>
          <p className="text-xs text-[var(--muted)]">
            Admin account: {created.adminAccount?.email ?? "Not provisioned"}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
