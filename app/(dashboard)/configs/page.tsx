"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { School2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import { uploadStudentMasterCsv } from "@/lib/config-actions";
import type { StudentMasterUploadResponse } from "@/lib/api-types";

const templateHeaders = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "date_of_birth",
  "education_level",
  "school_id",
  "school_name",
];

function downloadTemplate() {
  const template = `${templateHeaders.join(",")}\nJane,Doe,jane.doe@example.org,+254700000000,2010-05-10,SECONDARY,22222222-2222-2222-2222-222222222222,Nairobi Sunrise Secondary School\n`;
  const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "student-masters-template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ConfigsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<StudentMasterUploadResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error("Please choose a CSV file first.");
      }
      return uploadStudentMasterCsv(file, dryRun);
    },
    onSuccess: async (payload) => {
      setResult(payload);
      await queryClient.invalidateQueries({ queryKey: ["mentees"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });

  const summary = useMemo(() => result?.summary, [result?.summary]);
  const canAccess =
    user?.role === "PLATFORM_ADMIN" || user?.role === "SCHOOL_ADMIN" || user?.role === "PARTNER_ADMIN";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = await mutation.mutateAsync();
      pushToast({
        title: payload.summary.dryRun ? "Dry Run Complete" : "Upload Complete",
        description: `Processed ${payload.summary.totalRows} rows.`,
        variant: "success",
      });
      await Swal.fire({
        title: payload.summary.dryRun ? "Dry run completed" : "Student masters uploaded",
        text: `${payload.summary.created} created, ${payload.summary.failed} failed, ${payload.summary.skipped} skipped.`,
        icon: "success",
        confirmButtonColor: "#15803d",
      });
    } catch (error) {
      pushToast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not process CSV file.",
        variant: "error",
      });
      await Swal.fire({
        title: "Upload failed",
        text: error instanceof Error ? error.message : "Could not process CSV file",
        icon: "error",
        confirmButtonColor: "#b91c1c",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Configs</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload student master lists for onboarding and matching workflows.
        </p>
      </section>

      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">School Onboarding</p>
          <p className="text-xs text-[var(--muted)]">
            Create a school profile and provision a school admin using the guided flow.
          </p>
        </div>
        <Link href="/configs/schools">
          <Button variant="secondary" className="gap-2">
            <School2 className="h-4 w-4" />
            Open School Onboarding
          </Button>
        </Link>
      </Card>

      {!canAccess ? (
        <Card>
          <EmptyState
            title="Access Restricted"
            description="Only platform, school, and partner admins can upload student master files."
          />
        </Card>
      ) : null}

      {canAccess ? (
      <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Student Masters Upload</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Upload CSV files with one row per student. Start with dry-run to validate before creating records.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs font-medium text-[var(--text)]">Required Columns</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {templateHeaders.join(", ")}
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={downloadTemplate}>
              Download CSV Template
            </Button>
          </div>

          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">CSV File</label>
              <input
                required
                type="file"
                accept=".csv,text/csv"
                className="block w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-2"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setFile(nextFile);
                }}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">Maximum size: 5MB</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(event) => setDryRun(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              Run as dry-run (validate only, no writes)
            </label>

            <div className="flex justify-end">
              <Button type="submit" className="gap-2" disabled={mutation.isPending}>
                <Upload className="h-4 w-4" />
                {mutation.isPending ? "Processing..." : "Upload Student Masters"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[var(--text)]">Upload Results</h2>
          {!result ? (
            <div className="mt-4">
              <EmptyState
                title="No Upload Yet"
                description="Upload a CSV file to preview validation results and creation outcomes."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted)]">Total Rows</p>
                  <p className="text-xl font-semibold text-[var(--text)]">{summary?.totalRows ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted)]">{summary?.dryRun ? "Validated" : "Created"}</p>
                  <p className="text-xl font-semibold text-[var(--text)]">
                    {summary?.dryRun ? summary?.validated ?? 0 : summary?.created ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted)]">Failed</p>
                  <p className="text-xl font-semibold text-[var(--danger)]">{summary?.failed ?? 0}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Line</th>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">School</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row) => (
                      <tr key={`${row.line}-${row.email}`} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 text-[var(--muted)]">{row.line}</td>
                        <td className="px-3 py-2 text-[var(--text)]">
                          <p>{row.name}</p>
                          <p className="text-xs text-[var(--muted)]">{row.email}</p>
                        </td>
                        <td className="px-3 py-2 text-[var(--text)]">{row.school}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs font-medium uppercase tracking-wide text-[var(--text)]">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--muted)]">{row.reason ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </section>
      ) : null}
    </div>
  );
}
