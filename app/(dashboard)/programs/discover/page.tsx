"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock3, Compass, MapPinned, Search, Send, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import type { MentorDiscoverProgramRow } from "@/lib/api-types";
import { applyToProgram, fetchMentorProgramDiscover } from "@/lib/program-discovery-actions";
import { programCategories } from "@/lib/programs-config";

type ApplyFormState = {
  availabilityNotes: string;
  interestAreas: string;
  commitmentHoursPerMonth: string;
  applicationNote: string;
};

const emptyApplyForm: ApplyFormState = {
  availabilityNotes: "",
  interestAreas: "",
  commitmentHoursPerMonth: "8",
  applicationNote: "",
};

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function canApply(stage: string | null) {
  return stage === "PROGRAM_ELIGIBLE" || stage === "MATCHING" || stage === "ACTIVE";
}

export default function ProgramDiscoverPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"ALL" | (typeof programCategories)[number]>("ALL");
  const [status, setStatus] = useState<"ALL" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE">("ALL");
  const [selectedProgram, setSelectedProgram] = useState<MentorDiscoverProgramRow | null>(null);
  const [form, setForm] = useState<ApplyFormState>(emptyApplyForm);

  const query = useQuery({
    queryKey: ["mentor-program-discover", search, category, status],
    queryFn: () =>
      fetchMentorProgramDiscover({
        search,
        category,
        status,
      }),
    enabled: user?.role === "MENTOR",
  });

  const applyMutation = useMutation({
    mutationFn: (payload: {
      programId: string;
      availabilityNotes: string;
      interestAreas: string[];
      commitmentHoursPerMonth: number;
      applicationNote?: string;
    }) => applyToProgram(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mentor-program-discover"] });
    },
  });

  const programs = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const applications = useMemo(() => query.data?.applications ?? [], [query.data?.applications]);
  const onboarding = query.data?.onboarding ?? null;

  if (user?.role !== "MENTOR") {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only mentors can browse and apply to mentorship programs here." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Mentor Program Discovery</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Browse programs and join the right mentor pool.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Apply to published mentorship programs that match your expertise, availability, and target group fit. Admins will review and approve you into the program mentor pool before matching begins.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Onboarding Stage</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{onboarding ? formatEnum(onboarding.currentStage) : "-"}</p>
        </Card>
        <Card className="rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Profile Completion</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{onboarding?.profileCompletionPercentage ?? 0}%</p>
        </Card>
        <Card className="rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">My Applications</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{applications.length}</p>
        </Card>
      </section>

      {!canApply(onboarding?.currentStage ?? null) ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="font-semibold text-amber-900">Complete mentor readiness before applying.</p>
              <p className="text-sm text-amber-800">
                You need an approved mentor profile, cleared background check, completed training, and safeguarding agreement before you can enter a program mentor pool.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
            <Input
              className="pl-9"
              placeholder="Search programs, categories, schools"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={category}
            onChange={(event) => setCategory(event.target.value as "ALL" | (typeof programCategories)[number])}
          >
            <option value="ALL">All Categories</option>
            {programCategories.map((item) => (
              <option key={item} value={item}>
                {formatEnum(item)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={status}
            onChange={(event) => setStatus(event.target.value as "ALL" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE")}
          >
            <option value="ALL">All States</option>
            <option value="PUBLISHED">Published</option>
            <option value="ENROLLMENT_OPEN">Enrollment Open</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>

        {query.isLoading ? <SectionSkeleton rows={6} /> : null}
        {query.error ? (
          <ErrorState
            title="Could not load programs"
            description={query.error.message || "Try again."}
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {!query.isLoading && !query.error ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {programs.length === 0 ? (
              <div className="lg:col-span-2">
                <EmptyState title="No programs available" description="There are no discoverable programs in your scope right now." />
              </div>
            ) : (
              programs.map((program) => (
                <Card key={program.id} className="rounded-2xl border border-[var(--border)] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{formatEnum(program.category)}</p>
                      <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{program.name}</h2>
                    </div>
                    <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text)]">
                      {formatEnum(program.programStatus)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{program.description}</p>

                  <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                    <MetaRow icon={BookOpen} label={`${formatEnum(program.programType)} • ${program.durationMonths} months`} />
                    <MetaRow icon={Clock3} label={`${formatEnum(program.sessionFrequency)} • ${program.sessionDurationMinutes} min`} />
                    <MetaRow icon={MapPinned} label={program.targetCounties[0] ?? program.targetCountries[0] ?? program.schoolName} />
                    <MetaRow icon={Users} label={`${program.openApplications} mentor applications`} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Pill>{formatEnum(program.programFormat)}</Pill>
                    {program.targetAgeGroups.slice(0, 2).map((item) => (
                      <Pill key={`${program.id}-${item}`}>{formatEnum(item)}</Pill>
                    ))}
                    {program.themes.slice(0, 2).map((item) => (
                      <Pill key={`${program.id}-theme-${item}`}>{item}</Pill>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                    <p className="font-medium text-[var(--text)]">{program.schoolName}</p>
                    <p>{program.partnerName ?? "Independent program"}</p>
                    <p className="mt-2">Deadline: {formatDate(program.applicationDeadline)}</p>
                    <p>Mentor experience: {program.mentorRequirements.minimumYearsExperience}+ years</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[var(--muted)]">
                      {program.myApplicationStatus ? `Application: ${formatEnum(program.myApplicationStatus)}` : "Not yet applied"}
                    </span>
                    <Button
                      className="gap-2"
                      disabled={!canApply(onboarding?.currentStage ?? null) || program.programStatus !== "ENROLLMENT_OPEN" || !!program.myApplicationStatus}
                      onClick={() => {
                        setSelectedProgram(program);
                        setForm(emptyApplyForm);
                      }}
                    >
                      <Send className="h-4 w-4" />
                      Apply as Mentor
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">My Applications</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Program enrollment history</h2>
        </div>
        {applications.length === 0 ? (
          <EmptyState title="No program applications yet" description="Your submitted mentor applications will appear here." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Program</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Commitment</th>
                  <th className="px-3 py-3 font-semibold">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[var(--text)]">{item.program.name}</p>
                      <p className="text-xs text-[var(--muted)]">{item.program.schoolName}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatEnum(item.status)}</td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">{item.commitmentHoursPerMonth} hrs/month</td>
                    <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatDate(item.appliedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(selectedProgram)}
        onClose={() => setSelectedProgram(null)}
        title="Apply as Mentor"
        description="Confirm your fit and commitment before joining this program’s mentor pool."
        icon={<Compass className="h-4 w-4" />}
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            if (!selectedProgram) {
              return;
            }

            try {
              await applyMutation.mutateAsync({
                programId: selectedProgram.id,
                availabilityNotes: form.availabilityNotes,
                interestAreas: form.interestAreas.split(",").map((item) => item.trim()).filter(Boolean),
                commitmentHoursPerMonth: Number(form.commitmentHoursPerMonth),
                applicationNote: form.applicationNote.trim() || undefined,
              });

              pushToast({
                title: "Application submitted",
                description: `${selectedProgram.name} has been added to your program applications.`,
                variant: "success",
              });
              setSelectedProgram(null);
            } catch (error) {
              pushToast({
                title: "Could not apply",
                description: error instanceof Error ? error.message : "Request failed.",
                variant: "error",
              });
            }
          }}
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="font-semibold text-[var(--text)]">{selectedProgram?.name}</p>
            <p className="text-sm text-[var(--muted)]">{selectedProgram?.schoolName}</p>
          </div>

          <Field label="Availability" required>
            <textarea
              required
              className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={form.availabilityNotes}
              onChange={(event) => setForm((prev) => ({ ...prev, availabilityNotes: event.target.value }))}
            />
          </Field>

          <Field label="Interest Areas" required>
            <Input
              required
              placeholder="Career exploration, entrepreneurship, confidence building"
              value={form.interestAreas}
              onChange={(event) => setForm((prev) => ({ ...prev, interestAreas: event.target.value }))}
            />
          </Field>

          <Field label="Commitment Hours / Month" required>
            <Input
              required
              type="number"
              min={1}
              max={200}
              value={form.commitmentHoursPerMonth}
              onChange={(event) => setForm((prev) => ({ ...prev, commitmentHoursPerMonth: event.target.value }))}
            />
          </Field>

          <Field label="Application Note">
            <textarea
              className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={form.applicationNote}
              onChange={(event) => setForm((prev) => ({ ...prev, applicationNote: event.target.value }))}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelectedProgram(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyMutation.isPending}>
              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MetaRow({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[var(--primary)]" />
      <span>{label}</span>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text)]">{children}</span>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
