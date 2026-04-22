"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileSignature, Plus, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RenderedRichText } from "@/components/ui/rendered-rich-text";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/ui/rich-text-editor";
import { ErrorState, SectionSkeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import {
  createMentorConsentSetting,
  fetchMentorConsentSettings,
  updateConsentNotificationPreference,
  uploadMentorConsentBodyImage,
  updateMentorConsentSetting,
} from "@/lib/mentor-starter-pack-actions";
import { hasPermission } from "@/lib/permissions";
import { mentorConsentVariables } from "@/lib/rich-documents";
import type { MentorConsentSettingRow } from "@/lib/api-types";
import { useToast } from "@/context/toast-context";

type ConsentFormState = {
  title: string;
  consentType: "DATA_PROCESSING" | "PHOTO_RELEASE" | "MENTORSHIP_AGREEMENT" | "SAFEGUARDING";
  version: string;
  summary: string;
  documentBody: string;
  documentUrl: string;
  required: boolean;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: ConsentFormState = {
  title: "",
  consentType: "MENTORSHIP_AGREEMENT",
  version: "v1",
  summary: "",
  documentBody: "",
  documentUrl: "",
  required: true,
  sortOrder: "0",
  isActive: true,
};

function toneForType(type: ConsentFormState["consentType"] | MentorConsentSettingRow["consentType"]) {
  if (type === "SAFEGUARDING") return "bg-amber-100 text-amber-800";
  if (type === "MENTORSHIP_AGREEMENT") return "bg-indigo-100 text-indigo-800";
  return "bg-slate-100 text-slate-700";
}

function toPayload(form: ConsentFormState) {
  return {
    title: (form.title ?? "").trim(),
    consentType: form.consentType,
    version: (form.version ?? "").trim(),
    summary: (form.summary ?? "").trim(),
    documentBody: (form.documentBody ?? "").trim(),
    documentUrl: (form.documentUrl ?? "").trim(),
    required: form.required,
    sortOrder: Number((form.sortOrder ?? "").trim() || "0"),
    isActive: form.isActive,
  };
}

export default function SettingsConsentsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MentorConsentSettingRow | null>(null);
  const [form, setForm] = useState<ConsentFormState>(emptyForm);

  const canManage = hasPermission(user?.role, "consents.manage");

  const settingsQuery = useQuery({
    queryKey: ["mentor-consent-settings"],
    queryFn: fetchMentorConsentSettings,
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (editing) {
        return updateMentorConsentSetting(editing.id, payload);
      }
      return createMentorConsentSetting(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mentor-consent-settings"] });
      pushToast({
        title: editing ? "Consent pack updated" : "Consent pack created",
        description: "Mentor assent packs have been updated.",
        variant: "success",
      });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error) => {
      pushToast({
        title: editing ? "Could not update consent pack" : "Could not create consent pack",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: (enabled: boolean) => updateConsentNotificationPreference({ notifyPlatformAdminsOnDecline: enabled }),
    onSuccess: async (_, enabled) => {
      queryClient.setQueryData(["mentor-consent-settings"], (current: { items: MentorConsentSettingRow[]; notifications?: { notifyPlatformAdminsOnDecline: boolean } } | undefined) =>
        current
          ? {
              ...current,
              notifications: {
                notifyPlatformAdminsOnDecline: enabled,
              },
            }
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: ["mentor-consent-settings"] });
      pushToast({
        title: "Notification preference updated",
        description: enabled
          ? "Platform admins will now be notified when a required consent is declined."
          : "Required-consent decline emails to platform admins are now disabled.",
        variant: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not update notification preference",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
  });

  const safeguardingCount = useMemo(
    () => settingsQuery.data?.items.filter((item) => item.isActive && item.consentType === "SAFEGUARDING").length ?? 0,
    [settingsQuery.data?.items],
  );

  const previewVariables = useMemo(
    () => ({
      "{{mentor_name}}": "Grace Mentor",
      "{{mentor_email}}": "grace.mentor@example.com",
      "{{signed_date}}": new Date().toLocaleDateString(),
      "{{platform_name}}": "Cacumator Mentorship Platform",
      "{{document_version}}": form.version || "v1.0",
    }),
    [form.version],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: MentorConsentSettingRow) => {
    setEditing(item);
    setForm({
      title: item.title ?? "",
      consentType: item.consentType,
      version: item.version ?? "",
      summary: item.summary ?? "",
      documentBody: item.documentBody ?? "",
      documentUrl: item.documentUrl ?? "",
      required: item.required,
      sortOrder: item.sortOrder.toString(),
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const notifyOnDecline = Boolean(settingsQuery.data?.notifications.notifyPlatformAdminsOnDecline);

  if (!canManage) {
    return (
      <Card>
        <ErrorState title="Access Restricted" description="Only platform admins can manage mentor consent packs." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Mentor Starter Pack</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Consents</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Version and publish the terms mentors must read and assent to before account review.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add consent pack
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <FileSignature className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Consent items</p>
              <p className="text-2xl font-semibold text-[var(--text)]">{settingsQuery.data?.items.length ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Safeguarding</p>
              <p className="text-2xl font-semibold text-[var(--text)]">{safeguardingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Required</p>
              <p className="text-2xl font-semibold text-[var(--text)]">
                {settingsQuery.data?.items.filter((item) => item.isActive && item.required).length ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <Card className="rounded-[24px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Decline notifications</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Optionally notify platform admins by email whenever a mentor declines a required consent item.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <input
              type="checkbox"
              checked={notifyOnDecline}
              disabled={notificationsMutation.isPending || settingsQuery.isLoading}
              onChange={(event) => {
                const nextValue = event.target.checked;
                notificationsMutation.mutate(nextValue);
              }}
            />
            <span className="text-sm text-[var(--text)]">Email platform admins on required-consent decline</span>
          </label>
        </div>
      </Card>

      {settingsQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={6} />
        </Card>
      ) : null}

      {settingsQuery.error ? (
        <Card>
          <ErrorState
            title="Could not load consent packs"
            description={settingsQuery.error.message || "Try refreshing."}
            onRetry={() => {
              void settingsQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.error ? (
        <section className="space-y-4">
          {settingsQuery.data?.items.map((item) => (
            <Card key={item.id} className="rounded-[24px] border border-[var(--border)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-[var(--text)]">{item.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneForType(item.consentType)}`}>
                      {item.consentType.replaceAll("_", " ")}
                    </span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
                      {item.version}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.required ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.required ? "Required" : "Optional"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
                  <a
                    href={item.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    Open source document
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)]">
                    <div className="border-b border-[var(--border)] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Rendered preview</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-4">
                      <RenderedRichText html={item.documentBody} variables={previewVariables} />
                    </div>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => openEdit(item)}>
                  Edit consent
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit consent pack" : "Add consent pack"}
        description="This document will appear in the mentor onboarding workspace for review and assent."
        icon={<FileSignature className="h-5 w-5" />}
        size="xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Title</span>
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Version</span>
            <Input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Consent Type</span>
            <select
              value={form.consentType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  consentType: event.target.value as ConsentFormState["consentType"],
                }))
              }
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <option value="MENTORSHIP_AGREEMENT">Mentorship Agreement</option>
              <option value="SAFEGUARDING">Safeguarding</option>
              <option value="DATA_PROCESSING">Data Processing</option>
              <option value="PHOTO_RELEASE">Photo Release</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Sort Order</span>
            <Input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--text)]">Summary</span>
            <Textarea rows={5} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <div className="space-y-4 md:col-span-2">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-[var(--text)]">Document Body</span>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Author the exact consent document mentors will read. Images, headings, lists, and links are supported.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Rich editor
                  </div>
                </div>
                <RichTextEditor
                  ref={editorRef}
                  value={form.documentBody}
                  onChange={(value) => setForm((current) => ({ ...current, documentBody: value }))}
                  placeholder="Write the full consent body mentors must read in the onboarding reader."
                  onUploadImage={uploadMentorConsentBodyImage}
                  minHeightClassName="min-h-[380px]"
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Available variables</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mentorConsentVariables.map((variable) => (
                      <button
                        key={variable.token}
                        type="button"
                        onClick={() => editorRef.current?.insertHtml(variable.token)}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      >
                        {variable.token}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
                    {mentorConsentVariables.map((variable) => (
                      <p key={`${variable.token}-hint`}>
                        <span className="font-semibold text-[var(--text)]">{variable.label}:</span> {variable.description}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Live preview</p>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto p-4">
                    <RenderedRichText html={form.documentBody} variables={previewVariables} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--text)]">Document URL</span>
            <Input
              type="url"
              placeholder="https://..."
              value={form.documentUrl}
              onChange={(event) => setForm((current) => ({ ...current, documentUrl: event.target.value }))}
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(event) => setForm((current) => ({ ...current, required: event.target.checked }))}
            />
            <span className="text-sm text-[var(--text)]">Required before review</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            <span className="text-sm text-[var(--text)]">Visible to mentors</span>
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending ||
              !(form.title ?? "").trim() ||
              !(form.version ?? "").trim() ||
              !(form.summary ?? "").trim() ||
              !(form.documentBody ?? "").trim() ||
              !(form.documentUrl ?? "").trim()
            }
          >
            {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create consent"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
