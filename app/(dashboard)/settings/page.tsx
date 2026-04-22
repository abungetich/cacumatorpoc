"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileSpreadsheet, FileSignature, GitMerge, ImageUp, MailCheck, Settings2, ShieldUser, UserCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { hasPermission } from "@/lib/permissions";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Workflow Foundation</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Configuration and profile surfaces separated from day-to-day operational workflows.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hasPermission(user?.role, "matching.policy.manage") ? (
          <Card className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Matching</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Tune weights, risk penalties, and decline-learning rules for the matching engine.
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                <GitMerge className="h-4 w-4" />
              </span>
            </div>
            <Link href="/settings/matching">
              <Button variant="secondary" className="gap-2">
                Open Matching Settings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ) : null}

        {hasPermission(user?.role, "platform.branding.manage") ? (
          <Card className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Platform Branding</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Update the portal logo, site name, and CEO welcome content. Organization and school branding stay separate from this surface.
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                <ImageUp className="h-4 w-4" />
              </span>
            </div>
            <Link href="/settings/branding">
              <Button variant="secondary" className="gap-2">
                Open Platform Branding
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ) : null}

        {hasPermission(user?.role, "verification.manage") ? (
          <Card className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Verification</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Control resend reminder policy and email verification diagnostics.
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                <MailCheck className="h-4 w-4" />
              </span>
            </div>
            <Link href="/settings/verification">
              <Button variant="secondary" className="gap-2">
                Open Verification
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ) : null}

        {hasPermission(user?.role, "training.manage") ? (
          <Card className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Training</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Define the mentor starter-pack modules they must complete before review.
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                <BookOpenCheck className="h-4 w-4" />
              </span>
            </div>
            <Link href="/settings/training">
              <Button variant="secondary" className="gap-2">
                Open Training
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ) : null}

        {hasPermission(user?.role, "consents.manage") ? (
          <Card className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Consents</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Publish mentor terms, safeguarding assent, and agreement packs with version control.
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                <FileSignature className="h-4 w-4" />
              </span>
            </div>
            <Link href="/settings/consents">
              <Button variant="secondary" className="gap-2">
                Open Consents
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ) : null}

        {hasPermission(user?.role, "grants.settings.manage") ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">Grant Settings</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Funders, source channels, currencies, and scoring matrix controls.
              </p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
          </div>
          <Link href="/settings/grants">
            <Button variant="secondary" className="gap-2">
              Open Grant Settings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
        ) : null}

        {hasPermission(user?.role, "platform.settings.read") ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">System Configuration</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Master uploads, partner setup, and platform controls.</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
              <Settings2 className="h-4 w-4" />
            </span>
          </div>
          <Link href="/configs">
            <Button variant="secondary" className="gap-2">
              Open Configs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        ) : null}

        {hasPermission(user?.role, "account.read") ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">My Profile</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Personal account and security preferences.</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
              <UserCircle2 className="h-4 w-4" />
            </span>
          </div>
          <Link href="/profile">
            <Button variant="secondary" className="gap-2">
              Open Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        ) : null}

        {hasPermission(user?.role, "tenant-users.manage") ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">Tenant Users</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Root organization users for assignments, grants workflow, and operations.
              </p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
              <ShieldUser className="h-4 w-4" />
            </span>
          </div>
          <Link href="/settings/users">
            <Button variant="secondary" className="gap-2">
              Open Tenant Users
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
        ) : null}
      </section>
    </div>
  );
}
