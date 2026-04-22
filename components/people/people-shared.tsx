"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MenteeIntakeRow, MentorIntakeRow } from "@/lib/api-types";

export const newMentorWindowDays = 7;
export const defaultPageSize = 12;

export function formatRegistrationAge(value: string) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return value;
  }

  const diffMs = Date.now() - createdAt.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  return createdAt.toLocaleDateString();
}

export function stagePill(stage: MenteeIntakeRow["intakeStage"]) {
  if (stage === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  if (stage === "MATCHED") return "bg-sky-100 text-sky-800";
  if (stage === "AWAITING_MATCHING") return "bg-amber-100 text-amber-800";
  if (stage === "CONSENT_REQUIRED") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export function mentorStatePill(state: MentorIntakeRow["derivedState"]) {
  if (state === "ACTIVE" || state === "MATCHABLE") return "bg-emerald-100 text-emerald-800";
  if (state === "ASSIGNED") return "bg-sky-100 text-sky-800";
  if (state === "PENDING_ADMIN_REVIEW") return "bg-amber-100 text-amber-800";
  if (state === "PENDING_BACKGROUND_CHECK" || state === "PENDING_TRAINING") return "bg-orange-100 text-orange-800";
  if (state === "PAUSED") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

export function profileStatusPill(status: MentorIntakeRow["profileStatus"]) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "REJECTED") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export function PaginationBar({
  pagination,
  onPageChange,
  label,
}: {
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  label: string;
}) {
  if (!pagination) {
    return null;
  }

  const start = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-xs text-[var(--muted)]">
      <p>
        Showing {start}-{end} of {pagination.totalItems} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" className="gap-1" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl border-[var(--border)] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

export function JourneyMilestone({
  id,
  title,
  stage,
  description,
}: {
  id: string;
  title: string;
  stage: string;
  description: string;
}) {
  return (
    <Card
      id={id}
      className="scroll-mt-24 rounded-xl border-[var(--border)] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] target:border-[var(--primary)] target:ring-2 target:ring-[var(--primary)]/20"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{stage}</p>
      <p className="mt-1 text-base font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
    </Card>
  );
}

export function SubNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
        active ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)]"
      }`}
    >
      {label}
    </Link>
  );
}

export function OverviewCard({
  title,
  description,
  meta,
  href,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description: string;
  meta: string;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <Card className="rounded-2xl border-[var(--border)] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
      <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      <p className="mt-4 text-xs font-medium text-[var(--muted)]">{meta}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={href}>
          <Button className="gap-2">
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref}>
            <Button variant="secondary">{secondaryLabel}</Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
