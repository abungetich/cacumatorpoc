"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { MenteeIntakeRow } from "@/lib/api-types";
import { PaginationBar, stagePill } from "@/components/people/people-shared";

export function MenteeQueueTable({
  rows,
  pagination,
  onPageChange,
}: {
  rows: MenteeIntakeRow[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No mentees in queue" description="Mentee referrals and assessments will appear here as they enter intake." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="max-h-[62vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-3 font-semibold">Mentee</th>
              <th className="px-3 py-3 font-semibold">School</th>
              <th className="px-3 py-3 font-semibold">Level</th>
              <th className="px-3 py-3 font-semibold">Stage</th>
              <th className="px-3 py-3 font-semibold">Consent</th>
              <th className="px-3 py-3 font-semibold">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.profileId} className="border-t border-[var(--border)] align-top">
                <td className="px-3 py-3">
                  <Link href={`/people/mentees/${item.profileId}`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)]">
                    {item.fullName}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">{item.email}</p>
                </td>
                <td className="px-3 py-3 text-[var(--text)]">{item.schoolName}</td>
                <td className="px-3 py-3 text-[var(--text)]">{item.educationLevel}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stagePill(item.intakeStage)}`}>
                    {item.intakeStage}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-[var(--text)]">{item.requiresConsent ? (item.hasConsent ? "Received" : "Missing") : "Not required"}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/people/mentees/${item.profileId}`}>
                      <Button size="sm" variant="secondary" className="w-9 px-0" aria-label={`Open mentee record for ${item.fullName}`} title="Open mentee record">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <span className="text-xs text-[var(--muted)]">Open record</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar pagination={pagination} onPageChange={onPageChange} label="mentees" />
    </div>
  );
}
