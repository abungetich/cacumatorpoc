"use client";

import { useMemo, useState } from "react";
import { MailCheck, RefreshCcw, ShieldAlert } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useToast } from "@/context/toast-context";
import { apiFetch } from "@/lib/api-client";
import type { VerificationSettingsResponse } from "@/lib/api-types";

function fetchVerificationSettings() {
  return apiFetch<VerificationSettingsResponse>("/api/protected/settings/verification");
}

function updateVerificationSettings(payload: {
  autoReminderEnabled: boolean;
  resendIntervalHours: number;
  maxReminders: number;
}) {
  return apiFetch<VerificationSettingsResponse>("/api/protected/settings/verification", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

function sendVerificationTestEmail(payload: { email: string }) {
  return apiFetch<{
    ok?: boolean;
    message: string;
    result?: {
      channel: "ZEPTO" | "SMTP" | "NONE";
      providerStatusCode: number | null;
      providerMessage: string | null;
      reason: string | null;
    };
  }>("/api/protected/settings/verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default function VerificationSettingsPage() {
  const { pushToast } = useToast();
  const settingsQuery = useQuery({
    queryKey: ["verification-settings"],
    queryFn: fetchVerificationSettings,
  });
  const [form, setForm] = useState<{
    autoReminderEnabled: boolean;
    resendIntervalHours: number;
    maxReminders: number;
  } | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const resolvedForm = useMemo(
    () =>
      form ?? {
        autoReminderEnabled: settingsQuery.data?.item?.autoReminderEnabled ?? false,
        resendIntervalHours: settingsQuery.data?.item?.resendIntervalHours ?? 24,
        maxReminders: settingsQuery.data?.item?.maxReminders ?? 3,
      },
    [form, settingsQuery.data],
  );

  const mutation = useMutation({
    mutationFn: updateVerificationSettings,
    onSuccess: (result) => {
      setForm({
        autoReminderEnabled: result.item.autoReminderEnabled,
        resendIntervalHours: result.item.resendIntervalHours,
        maxReminders: result.item.maxReminders,
      });
      pushToast({
        title: "Verification settings updated",
        description: "Reminder policy was saved successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not update verification settings",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: sendVerificationTestEmail,
    onSuccess: (result) => {
      pushToast({
        title: "Test email sent",
        description: `${result.message} via ${result.result?.channel ?? "current channel"}.`,
        variant: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not send test email",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Notifications</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Verification Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Define how often unverified mentors should be reminded and how many reminder attempts the system should allow.
        </p>
      </section>

      {settingsQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={4} />
        </Card>
      ) : null}

      {settingsQuery.error ? (
        <Card>
          <ErrorState
            title="Could not load verification settings"
            description={settingsQuery.error.message || "Try refreshing."}
            onRetry={() => {
              void settingsQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.error ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-[var(--text)]">Automatic reminders</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Turn reminder sends on or off for unverified mentors.</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <MailCheck className="h-5 w-5" />
                </span>
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={resolvedForm.autoReminderEnabled}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...(prev ?? resolvedForm),
                      autoReminderEnabled: event.target.checked,
                    }))
                  }
                />
                Enable automatic verification reminders
              </label>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-[var(--text)]">Reminder interval</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Wait this many hours between reminder emails.</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <RefreshCcw className="h-5 w-5" />
                </span>
              </div>
              <Input
                type="number"
                min={1}
                max={168}
                value={String(resolvedForm.resendIntervalHours)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? resolvedForm),
                    resendIntervalHours: Number(event.target.value) || 1,
                  }))
                }
              />
            </Card>

            <Card className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-[var(--text)]">Max reminders</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Stop resending after this many reminder attempts.</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <ShieldAlert className="h-5 w-5" />
                </span>
              </div>
              <Input
                type="number"
                min={0}
                max={10}
                value={String(resolvedForm.maxReminders)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? resolvedForm),
                    maxReminders: Number(event.target.value) || 0,
                  }))
                }
              />
            </Card>
          </section>

          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Delivery channel</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Verification email currently attempts delivery over the preferred configured transport first.</p>
              </div>
              <span className="inline-flex rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
                {settingsQuery.data?.item.delivery.activeChannel ?? "NONE"}
              </span>
            </div>
            <div className="grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
              <p>SMTP configured: {settingsQuery.data?.item.delivery.smtpConfigured ? "Yes" : "No"}</p>
              <p>Zepto configured: {settingsQuery.data?.item.delivery.zeptoConfigured ? "Yes" : "No"}</p>
              <p>From address: {settingsQuery.data?.item.delivery.fromAddress ?? "Not configured"}</p>
              <p>Sender name: {settingsQuery.data?.item.delivery.fromName ?? "Not configured"}</p>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">Test email</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Send a simple delivery test through the current preferred transport so you can verify provider access before relying on mentor verification sends.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
              />
              <Button
                onClick={() => {
                  void testEmailMutation.mutateAsync({ email: testEmail.trim() });
                }}
                disabled={testEmailMutation.isPending || !testEmail.trim()}
              >
                {testEmailMutation.isPending ? "Sending..." : "Send test email"}
              </Button>
            </div>
            {testEmailMutation.data?.result ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
                <p className="font-medium text-[var(--text)]">Latest test result</p>
                <div className="mt-2 space-y-1 text-[var(--muted)]">
                  <p>Channel: {testEmailMutation.data.result.channel}</p>
                  <p>Response code: {testEmailMutation.data.result.providerStatusCode ?? "Not returned"}</p>
                  <p>Provider message: {testEmailMutation.data.result.providerMessage ?? "Not returned"}</p>
                  <p>Failure reason: {testEmailMutation.data.result.reason ?? "None"}</p>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">Operational note</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                These settings define the reminder policy and are used by verification diagnostics. Automated recurring sending still needs a background job to be scheduled against this policy.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  void mutation.mutateAsync(resolvedForm);
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : "Save verification settings"}
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
