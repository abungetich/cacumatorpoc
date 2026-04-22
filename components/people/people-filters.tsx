"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const mentorStateFilters = [
  "ALL",
  "PENDING_BACKGROUND_CHECK",
  "PENDING_TRAINING",
  "PENDING_ADMIN_REVIEW",
  "MATCHABLE",
  "ASSIGNED",
  "ACTIVE",
  "PAUSED",
  "INACTIVE",
] as const;

export const menteeStageFilters = ["ALL", "CONSENT_REQUIRED", "AWAITING_MATCHING", "MATCHED", "ACTIVE", "INACTIVE"] as const;

export function MentorFilterBar({
  search,
  mentorState,
  newRegistrationsOnly,
  declinedConsentsOnly,
  newMentorSignups,
  declinedConsentMentors,
  onSearchChange,
  onMentorStateChange,
  onToggleNewRegistrations,
  onToggleDeclinedConsents,
}: {
  search: string;
  mentorState: (typeof mentorStateFilters)[number];
  newRegistrationsOnly: boolean;
  declinedConsentsOnly: boolean;
  newMentorSignups: number;
  declinedConsentMentors: number;
  onSearchChange: (value: string) => void;
  onMentorStateChange: (value: (typeof mentorStateFilters)[number]) => void;
  onToggleNewRegistrations: () => void;
  onToggleDeclinedConsents: () => void;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-4">
      <div className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
        <Input className="pl-9" placeholder="Search mentors by name, email, school..." value={search} onChange={(event) => onSearchChange(event.target.value)} />
      </div>

      <select
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
        value={mentorState}
        onChange={(event) => onMentorStateChange(event.target.value as (typeof mentorStateFilters)[number])}
      >
        {mentorStateFilters.map((item) => (
          <option key={item} value={item}>
            {item === "ALL" ? "All Mentor States" : item}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onToggleNewRegistrations}
        className={`rounded-xl px-3 py-2 text-sm font-medium ${
          newRegistrationsOnly ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "bg-[var(--surface-2)] text-[var(--text)]"
        }`}
      >
        New Registrations ({newMentorSignups})
      </button>
      <button
        type="button"
        onClick={onToggleDeclinedConsents}
        className={`rounded-xl px-3 py-2 text-sm font-medium ${
          declinedConsentsOnly ? "bg-rose-600 text-white" : "bg-[var(--surface-2)] text-[var(--text)]"
        }`}
      >
        Declined Consents ({declinedConsentMentors})
      </button>
    </section>
  );
}

export function MenteeFilterBar({
  search,
  menteeStage,
  onSearchChange,
  onMenteeStageChange,
}: {
  search: string;
  menteeStage: (typeof menteeStageFilters)[number];
  onSearchChange: (value: string) => void;
  onMenteeStageChange: (value: (typeof menteeStageFilters)[number]) => void;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <div className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
        <Input className="pl-9" placeholder="Search mentees by name, email, school..." value={search} onChange={(event) => onSearchChange(event.target.value)} />
      </div>

      <select
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
        value={menteeStage}
        onChange={(event) => onMenteeStageChange(event.target.value as (typeof menteeStageFilters)[number])}
      >
        {menteeStageFilters.map((item) => (
          <option key={item} value={item}>
            {item === "ALL" ? "All Mentee Stages" : item}
          </option>
        ))}
      </select>
    </section>
  );
}
