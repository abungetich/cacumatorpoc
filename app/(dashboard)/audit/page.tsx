"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useToast } from "@/context/toast-context";
import { apiFetch } from "@/lib/api-client";
import type { AuditResponse, IncidentsResponse } from "@/lib/api-types";

const severityClass: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};

function formatRelativeAge(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const elapsedMs = Date.now() - parsed.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  if (elapsedMinutes < 1) {
    return "just now";
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  const elapsedWeeks = Math.floor(elapsedDays / 7);
  if (elapsedWeeks < 5) {
    return `${elapsedWeeks} wk${elapsedWeeks === 1 ? "" : "s"} ago`;
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) {
    return `${elapsedMonths} mo${elapsedMonths === 1 ? "" : "s"} ago`;
  }

  const elapsedYears = Math.floor(elapsedDays / 365);
  return `${elapsedYears} yr${elapsedYears === 1 ? "" : "s"} ago`;
}

function formatAbsoluteDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default function AuditPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [form, setForm] = useState({
    subject: "",
    summary: "",
    severity: "MEDIUM",
    immediateAction: "",
    mentorshipId: "",
  });

  const auditQuery = useQuery({
    queryKey: ["audit-logs", actionFilter],
    queryFn: () => apiFetch<AuditResponse>(`/api/protected/audit?limit=100&action=${encodeURIComponent(actionFilter)}`),
  });

  const incidentsQuery = useQuery({
    queryKey: ["incidents"],
    queryFn: () => apiFetch<IncidentsResponse>("/api/protected/incidents"),
  });

  const incidentMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; message: string }>("/api/protected/incidents", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject,
          summary: form.summary,
          severity: form.severity,
          immediateAction: form.immediateAction,
          mentorshipId: form.mentorshipId || undefined,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    },
  });

  const incidentCountLabel = useMemo(() => {
    if (incidentsQuery.isLoading) {
      return "Loading incidents...";
    }
    return `${incidentsQuery.data?.items.length ?? 0} open or recent incidents`;
  }, [incidentsQuery.data?.items.length, incidentsQuery.isLoading]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Audit & Safeguarding</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Track system activity and report high-priority safeguarding incidents.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <AlertTriangle className="h-4 w-4" />
          Report Incident
        </Button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">Incident Timeline</h2>
            <p className="text-xs text-[var(--muted)]">{incidentCountLabel}</p>
          </div>

          {incidentsQuery.isLoading ? <SectionSkeleton rows={4} /> : null}
          {incidentsQuery.error ? (
            <ErrorState
              title="Could not load incidents"
              description={incidentsQuery.error.message || "Try again shortly."}
              onRetry={() => {
                void incidentsQuery.refetch();
              }}
            />
          ) : null}

          {!incidentsQuery.isLoading && !incidentsQuery.error && (incidentsQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="No Incidents Reported"
              description="If a safeguarding concern occurs, report it and it will appear here."
            />
          ) : null}

          <div className="space-y-3">
            {(incidentsQuery.data?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--text)]">{item.subject}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Reported by {item.reportedBy} on {item.timestamp}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass[item.severity] ?? severityClass.MEDIUM}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--text)]">{item.summary}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Immediate action: {item.immediateAction}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">Audit Log</h2>
            <Input
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              placeholder="Filter action"
              className="max-w-[180px]"
            />
          </div>

          {auditQuery.isLoading ? <SectionSkeleton rows={5} /> : null}
          {auditQuery.error ? (
            <ErrorState
              title="Could not load audit log"
              description={auditQuery.error.message || "Try again shortly."}
              onRetry={() => {
                void auditQuery.refetch();
              }}
            />
          ) : null}

          {!auditQuery.isLoading && !auditQuery.error && (auditQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="No Audit Entries" description="Activity entries will appear as actions happen in the system." />
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {(auditQuery.data?.items ?? []).map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-[var(--text)]">{entry.action.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2 text-[var(--text)]">{entry.actor}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{entry.entityType}:{entry.entityId.slice(0, 8)}</td>
                    <td className="px-3 py-2">
                      <p className="text-[var(--text)]">{formatRelativeAge(entry.timestamp)}</p>
                      <p className="text-[11px] text-[var(--muted)]">{formatAbsoluteDateTime(entry.timestamp)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report Safeguarding Incident"
        description="Incident reports notify administrators and create immutable audit records."
      >
        <form
          className="space-y-3"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();

            try {
              await incidentMutation.mutateAsync();
              setOpen(false);
              setForm({ subject: "", summary: "", severity: "MEDIUM", immediateAction: "", mentorshipId: "" });

              pushToast({
                title: "Incident Reported",
                description: "Safeguarding incident was logged successfully.",
                variant: "success",
              });

              await Swal.fire({
                title: "Incident reported",
                text: "The safeguarding team has been notified.",
                icon: "success",
                confirmButtonColor: "#15803d",
              });
            } catch (error) {
              pushToast({
                title: "Incident Report Failed",
                description: error instanceof Error ? error.message : "Could not submit incident.",
                variant: "error",
              });

              await Swal.fire({
                title: "Report failed",
                text: error instanceof Error ? error.message : "Could not submit incident.",
                icon: "error",
                confirmButtonColor: "#b91c1c",
              });
            }
          }}
        >
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Subject</label>
            <Input
              required
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Severity</label>
            <select
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              value={form.severity}
              onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Summary</label>
            <textarea
              required
              className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]"
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Immediate Action</label>
            <textarea
              required
              className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]"
              value={form.immediateAction}
              onChange={(event) => setForm((prev) => ({ ...prev, immediateAction: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Mentorship ID (optional)</label>
            <Input
              value={form.mentorshipId}
              onChange={(event) => setForm((prev) => ({ ...prev, mentorshipId: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={incidentMutation.isPending}>
              {incidentMutation.isPending ? "Submitting..." : "Submit Incident"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
