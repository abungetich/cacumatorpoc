"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { MentorIntakeRow } from "@/lib/api-types";
import { PaginationBar, formatRegistrationAge, mentorStatePill, profileStatusPill } from "@/components/people/people-shared";

export function MentorQueueTable({
  rows,
  canAdminMentors,
  pagination,
  onPageChange,
}: {
  rows: MentorIntakeRow[];
  canAdminMentors: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No mentors in queue" description="Mentor onboarding records will appear here once applications are submitted." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="max-h-[62vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-3 font-semibold">Mentor</th>
              <th className="px-3 py-3 font-semibold">State</th>
              <th className="px-3 py-3 font-semibold">Profile</th>
              <th className="px-3 py-3 font-semibold">Readiness</th>
              <th className="px-3 py-3 font-semibold">Consent Follow-up</th>
              <th className="px-3 py-3 font-semibold">Capacity</th>
              <th className="px-3 py-3 font-semibold">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.userId} className="border-t border-[var(--border)] align-top">
                <td className="px-3 py-3">
                  <Link href={`/people/mentors/${item.userId}`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)]">
                    {item.fullName}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">{item.email}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {item.schoolName} · {item.partnerName}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Registered {formatRegistrationAge(item.createdAt)}</p>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${mentorStatePill(item.derivedState)}`}>
                    {item.derivedState}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${profileStatusPill(item.profileStatus)}`}>
                    {item.profileStatus}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-[var(--text)]">
                  <div className="space-y-1">
                    <a href="#mentor-journey-background" className="inline-flex text-[var(--primary)] underline decoration-dotted underline-offset-2 hover:opacity-80">
                      Background: {item.backgroundCheckStatus}
                    </a>
                    <a href="#mentor-journey-training" className="inline-flex text-[var(--primary)] underline decoration-dotted underline-offset-2 hover:opacity-80">
                      Training: {item.trainingCompleted ? "Done" : "Pending"}
                    </a>
                    <a href="#mentor-journey-safeguarding" className="inline-flex text-[var(--primary)] underline decoration-dotted underline-offset-2 hover:opacity-80">
                      Safeguarding: {item.safeguardingAgreed ? "Agreed" : "Pending"}
                    </a>
                  </div>
                  {!item.canBeMatched && item.blockers.length > 0 ? <p className="mt-1 text-[var(--muted)]">Blockers: {item.blockers.join(", ")}</p> : null}
                </td>
                <td className="px-3 py-3 text-xs text-[var(--text)]">
                  {item.declinedConsentCount > 0 ? (
                    <div className="space-y-1">
                      <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                        {item.declinedConsentCount} declined
                      </span>
                      <p className="font-medium text-[var(--text)]">{item.latestDeclinedConsentTitle ?? "Consent document"}</p>
                      <p className="text-[var(--muted)]">{item.latestDeclinedConsentAt ? `Updated ${formatRegistrationAge(item.latestDeclinedConsentAt)}` : "Needs follow-up"}</p>
                      {item.latestDeclinedConsentReason ? <p className="text-[var(--muted)]">Reason: {item.latestDeclinedConsentReason}</p> : null}
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">No declined consents</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-[var(--text)]">
                  {item.currentMentees}/{item.maxMentees}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/people/mentors/${item.userId}`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={canAdminMentors ? `Open mentor record for ${item.fullName}` : `View mentor record for ${item.fullName}`}
                        title={canAdminMentors ? "Open mentor record" : "View mentor record"}
                        className="w-9 px-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <span className="text-xs text-[var(--muted)]">{canAdminMentors ? "Open record" : "View record"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar pagination={pagination} onPageChange={onPageChange} label="mentors" />
    </div>
  );
}
