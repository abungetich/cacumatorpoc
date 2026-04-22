"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowUpDown, BookOpenCheck, Clock3, Eye, ImagePlus, Layers3, PencilLine, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RenderedRichText } from "@/components/ui/rendered-rich-text";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ErrorState, SectionSkeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import {
  createMentorTrainingSetting,
  fetchMentorTrainingSettings,
  uploadTrainingBodyImage,
  uploadTrainingQuestionImage,
  updateMentorTrainingSetting,
} from "@/lib/mentor-starter-pack-actions";
import type { MentorTrainingModuleSettingRow } from "@/lib/api-types";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";

type TrainingQuestionFormState = {
  id: string;
  prompt: string;
  explanation: string;
  questionType: "SINGLE_CHOICE" | "MULTI_CHOICE";
  options: string[];
  correctAnswers: string[];
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};

type TrainingFormState = {
  title: string;
  description: string;
  moduleBody: string;
  version: string;
  required: boolean;
  passingScore: string;
  maxAttempts: string;
  estimatedMinutes: string;
  sortOrder: string;
  isActive: boolean;
  questions: TrainingQuestionFormState[];
};

function createEmptyQuestion(index = 0): TrainingQuestionFormState {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `question-${Date.now()}-${index}`,
    prompt: "",
    explanation: "",
    questionType: "SINGLE_CHOICE",
    options: ["", "", "", ""],
    correctAnswers: [],
    imageUrl: "",
    sortOrder: String(index),
    isActive: true,
  };
}

const emptyForm: TrainingFormState = {
  title: "",
  description: "",
  moduleBody: "",
  version: "v1",
  required: true,
  passingScore: "100",
  maxAttempts: "",
  estimatedMinutes: "",
  sortOrder: "0",
  isActive: true,
  questions: [createEmptyQuestion(0)],
};

function toPayload(form: TrainingFormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    moduleBody: form.moduleBody.trim(),
    version: form.version.trim(),
    required: form.required,
    passingScore: Number(form.passingScore.trim() || "100"),
    maxAttempts: form.maxAttempts.trim() ? Number(form.maxAttempts.trim()) : null,
    estimatedMinutes: form.estimatedMinutes.trim() ? Number(form.estimatedMinutes.trim()) : null,
    sortOrder: Number(form.sortOrder.trim() || "0"),
    isActive: form.isActive,
    questions: form.questions.map((question, index) => ({
      id: question.id,
      prompt: question.prompt.trim(),
      explanation: question.explanation.trim() || undefined,
      questionType: question.questionType,
      options: question.options.map((option) => option.trim()).filter(Boolean),
      correctAnswers: question.correctAnswers.map((answer) => answer.trim()).filter(Boolean),
      imageUrl: question.imageUrl.trim() || undefined,
      sortOrder: Number(question.sortOrder.trim() || String(index)),
      isActive: question.isActive,
    })),
  };
}

function formatRelativeDate(value: string | null) {
  if (!value) return "No completions";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No completions";
  const diffMinutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");

  const diffMonths = Math.round(diffDays / 30);
  return rtf.format(diffMonths, "month");
}

function statusPill(active: boolean) {
  return active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700";
}

function requirementPill(required: boolean) {
  return required ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
}

export default function SettingsTrainingPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MentorTrainingModuleSettingRow | null>(null);
  const [form, setForm] = useState<TrainingFormState>(emptyForm);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [requirementFilter, setRequirementFilter] = useState<"ALL" | "REQUIRED" | "OPTIONAL">("ALL");
  const [sorting, setSorting] = useState<SortingState>([{ id: "sortOrder", desc: false }]);

  const canManage = hasPermission(user?.role, "training.manage");

  const settingsQuery = useQuery({
    queryKey: ["mentor-training-settings"],
    queryFn: fetchMentorTrainingSettings,
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (editing) {
        return updateMentorTrainingSetting(editing.id, payload);
      }
      return createMentorTrainingSetting(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mentor-training-settings"] });
      pushToast({
        title: editing ? "Training module updated" : "Training module created",
        description: "Mentor training definitions are now up to date.",
        variant: "success",
      });
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm, questions: [createEmptyQuestion(0)] });
    },
    onError: (error) => {
      pushToast({
        title: editing ? "Could not update training module" : "Could not create training module",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
  });

  const rows = useMemo(() => {
    const items = settingsQuery.data?.items ?? [];
    return items.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;
      if (requirementFilter === "REQUIRED" && !item.required) return false;
      if (requirementFilter === "OPTIONAL" && item.required) return false;
      return true;
    });
  }, [requirementFilter, settingsQuery.data?.items, statusFilter]);

  const columns = useMemo<ColumnDef<MentorTrainingModuleSettingRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <button className="inline-flex items-center gap-1 font-medium" onClick={column.getToggleSortingHandler()}>
            Module
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="min-w-[260px]">
            <Link href={`/settings/training/${row.original.id}`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)]">
              {row.original.title}
            </Link>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{row.original.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">{row.original.version}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${requirementPill(row.original.required)}`}>
                {row.original.required ? "Required" : "Optional"}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPill(row.original.isActive)}`}>
                {row.original.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "estimatedMinutes",
        header: "Duration",
        cell: ({ row }) => <span>{row.original.estimatedMinutes ? `${row.original.estimatedMinutes} mins` : "-"}</span>,
      },
      {
        accessorKey: "passingScore",
        header: "Assessment",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-[var(--text)]">{row.original.passingScore}% pass</p>
            <p className="text-xs text-[var(--muted)]">
              {row.original.questionCount} questions
              {row.original.maxAttempts ? ` • max ${row.original.maxAttempts} attempts` : " • unlimited attempts"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "participantsCount",
        header: ({ column }) => (
          <button className="inline-flex items-center gap-1 font-medium" onClick={column.getToggleSortingHandler()}>
            Participation
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-[var(--text)]">{row.original.participantsCount}</p>
            <p className="text-xs text-[var(--muted)]">{row.original.attemptsCount} attempts • {row.original.completionsCount} completions</p>
          </div>
        ),
      },
      {
        accessorKey: "lastCompletedAt",
        header: ({ column }) => (
          <button className="inline-flex items-center gap-1 font-medium" onClick={column.getToggleSortingHandler()}>
            Latest Activity
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-[var(--text)]">{formatRelativeDate(row.original.lastCompletedAt)}</p>
            <p className="text-xs text-[var(--muted)]">
              {row.original.lastCompletedAt ? new Date(row.original.lastCompletedAt).toLocaleString() : "No activity yet"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "sortOrder",
        header: "Sort",
        cell: ({ row }) => <span>{row.original.sortOrder}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Link href={`/settings/training/${row.original.id}`}>
              <Button
                variant="secondary"
                size="sm"
                className="w-9 px-0"
                title="Open module detail"
                aria-label="Open module detail"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="w-9 px-0"
              onClick={() => openEdit(row.original)}
              title="Edit module"
              aria-label="Edit module"
            >
              <PencilLine className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const items = settingsQuery.data?.items ?? [];
  const requiredCount = items.filter((item) => item.required && item.isActive).length;
  const activeCount = items.filter((item) => item.isActive).length;
  const participationCount = items.reduce((sum, item) => sum + item.participantsCount, 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, questions: [createEmptyQuestion(0)] });
    setOpen(true);
  };

  const openEdit = (item: MentorTrainingModuleSettingRow) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      moduleBody: item.moduleBody,
      version: item.version,
      required: item.required,
      passingScore: String(item.passingScore),
      maxAttempts: item.maxAttempts?.toString() ?? "",
      estimatedMinutes: item.estimatedMinutes?.toString() ?? "",
      sortOrder: item.sortOrder.toString(),
      isActive: item.isActive,
      questions: item.questions.length
        ? item.questions.map((question, index) => ({
            id: question.id,
            prompt: question.prompt,
            explanation: question.explanation ?? "",
            questionType: question.questionType,
            options: [...question.options, ...Array.from({ length: Math.max(0, 4 - question.options.length) }, () => "")].slice(0, 4),
            correctAnswers: question.correctAnswers,
            imageUrl: question.imageUrl ?? "",
            sortOrder: String(question.sortOrder ?? index),
            isActive: question.isActive,
          }))
        : [createEmptyQuestion(0)],
    });
    setOpen(true);
  };

  const updateQuestion = (questionId: string, updater: (current: TrainingQuestionFormState) => TrainingQuestionFormState) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question) => (question.id === questionId ? updater(question) : question)),
    }));
  };

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      questions: [...current.questions, createEmptyQuestion(current.questions.length)],
    }));
  };

  const removeQuestion = (questionId: string) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.length > 1 ? current.questions.filter((question) => question.id !== questionId) : current.questions,
    }));
  };

  const uploadQuestionImage = async (questionId: string, file: File) => {
    setUploadingQuestionId(questionId);
    try {
      const uploaded = await uploadTrainingQuestionImage(file);
      updateQuestion(questionId, (current) => ({
        ...current,
        imageUrl: uploaded.imageUrl ?? "",
      }));
      pushToast({
        title: "Question image uploaded",
        description: "The image is now attached to this question.",
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Could not upload question image",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    } finally {
      setUploadingQuestionId((current) => (current === questionId ? null : current));
    }
  };

  if (!canManage) {
    return (
      <Card>
        <ErrorState title="Access Restricted" description="Only platform admins can manage mentor training packs." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_14%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Mentor Starter Pack</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Training Registry</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Settings is the right place for module definitions. Participation analytics and module performance are now attached to each record so you can inspect real usage, not just edit metadata.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add module
          </Button>
        </div>
      </section>

      <Card className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Location</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Definitions belong here. Runtime signals belong on each module.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Settings is the correct place for module definitions and publishing controls. Participation, completions, and future assessment attempts should be inspected from the module detail record, not buried inside the setup form.
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)]">
            Better long-term IA:
            {" "}
            <span className="font-semibold text-[var(--primary)]">Training</span>
            {" "}
            as a top-level workspace, with Settings owning only templates and policy.
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<BookOpenCheck className="h-5 w-5" />} label="Modules" value={String(items.length)} />
        <MetricCard icon={<Sparkles className="h-5 w-5" />} label="Required" value={String(requiredCount)} />
        <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Active" value={String(activeCount)} />
        <MetricCard icon={<Clock3 className="h-5 w-5" />} label="Recorded Participation" value={String(participationCount)} />
      </section>

      {settingsQuery.isLoading ? (
        <Card>
          <SectionSkeleton rows={8} />
        </Card>
      ) : null}

      {settingsQuery.error ? (
        <Card>
          <ErrorState
            title="Could not load training modules"
            description={settingsQuery.error.message || "Try refreshing."}
            onRetry={() => void settingsQuery.refetch()}
          />
        </Card>
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.error ? (
        <Card className="rounded-[26px] p-0 overflow-hidden">
          <div className="border-b border-[var(--border)] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="pl-9"
                  placeholder="Search module title, version, or description..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterPill active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} label="All status" />
                <FilterPill active={statusFilter === "ACTIVE"} onClick={() => setStatusFilter("ACTIVE")} label="Active" />
                <FilterPill active={statusFilter === "INACTIVE"} onClick={() => setStatusFilter("INACTIVE")} label="Inactive" />
                <FilterPill active={requirementFilter === "ALL"} onClick={() => setRequirementFilter("ALL")} label="All types" />
                <FilterPill active={requirementFilter === "REQUIRED"} onClick={() => setRequirementFilter("REQUIRED")} label="Required" />
                <FilterPill active={requirementFilter === "OPTIONAL"} onClick={() => setRequirementFilter("OPTIONAL")} label="Optional" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-medium">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--muted)]">
                      No training modules match the current filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--border)] align-top transition hover:bg-[var(--surface-2)]/60">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-4 text-[var(--text)]">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
            <p className="text-xs text-[var(--muted)]">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit training module" : "Add training module"}
        description="This module definition feeds the mentor starter pack. Author the learning content here, then inspect attempts and analytics from the module detail view."
        icon={<BookOpenCheck className="h-5 w-5" />}
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
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--text)]">Description</span>
            <Textarea rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <div className="space-y-4 md:col-span-2">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-[var(--text)]">Module Body</span>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Author the exact training content mentors must read before they take the quiz. Images, headings, lists, and links are supported.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Rich editor
                  </div>
                </div>
                <RichTextEditor
                  value={form.moduleBody}
                  onChange={(value) => setForm((current) => ({ ...current, moduleBody: value }))}
                  placeholder="Write the authored training content mentors must read before they take the quiz."
                  minHeightClassName="min-h-[360px]"
                  onUploadImage={uploadTrainingBodyImage}
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Preview</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    This is the content mentors will see in the training reader before the assessment unlocks.
                  </p>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Live preview</p>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto p-4">
                    <RenderedRichText html={form.moduleBody} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Passing Score (%)</span>
            <Input type="number" min={1} max={100} value={form.passingScore} onChange={(event) => setForm((current) => ({ ...current, passingScore: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Max Attempts</span>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.maxAttempts}
              onChange={(event) => setForm((current) => ({ ...current, maxAttempts: event.target.value }))}
              placeholder="Leave blank for unlimited"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Estimated Minutes</span>
            <Input type="number" min={1} value={form.estimatedMinutes} onChange={(event) => setForm((current) => ({ ...current, estimatedMinutes: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text)]">Sort Order</span>
            <Input type="number" min={0} value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)]">
            <input type="checkbox" checked={form.required} onChange={(event) => setForm((current) => ({ ...current, required: event.target.checked }))} />
            Required before mentor review
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)]">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Active in onboarding
          </label>
        </div>

        <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Question Bank</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Mentors must answer every active question correctly according to the module pass mark.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {form.questions.map((question, index) => (
              <div key={question.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text)]">Question {index + 1}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(question.id)}
                    disabled={form.questions.length === 1}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-[var(--text)]">Prompt</span>
                    <Textarea rows={3} value={question.prompt} onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, prompt: event.target.value }))} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-[var(--text)]">Explanation (optional)</span>
                    <Textarea rows={3} value={question.explanation} onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, explanation: event.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text)]">Question Type</span>
                    <select
                      value={question.questionType}
                      onChange={(event) =>
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          questionType: event.target.value as TrainingQuestionFormState["questionType"],
                          correctAnswers:
                            event.target.value === "SINGLE_CHOICE" ? current.correctAnswers.slice(0, 1) : current.correctAnswers,
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <option value="SINGLE_CHOICE">Single choice</option>
                      <option value="MULTI_CHOICE">Multi choice</option>
                    </select>
                  </label>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text)]">Question Image (optional)</span>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      {question.imageUrl ? (
                        <div className="space-y-3">
                          <Image src={question.imageUrl} alt={`Question ${index + 1}`} width={1200} height={480} className="max-h-40 w-full rounded-xl object-contain bg-white" />
                          <div className="flex items-center justify-between gap-3">
                            <a href={question.imageUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--primary)] hover:underline">
                              Open image
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuestion(question.id, (current) => ({ ...current, imageUrl: "" }))}
                            >
                              Remove image
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">Attach a diagram, scenario card, or screenshot for this question.</p>
                      )}
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--primary)]/40">
                        <ImagePlus className="h-4 w-4 text-[var(--primary)]" />
                        {uploadingQuestionId === question.id ? "Uploading..." : question.imageUrl ? "Replace image" : "Upload image"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadQuestionImage(question.id, file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {question.options.map((option, optionIndex) => (
                    <label key={`${question.id}-option-${optionIndex}`} className="space-y-2">
                      <span className="text-sm font-medium text-[var(--text)]">Option {optionIndex + 1}</span>
                      <Input
                        value={option}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            options: current.options.map((entry, currentIndex) => (currentIndex === optionIndex ? event.target.value : entry)),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <div className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-[var(--text)]">Correct Answer{question.questionType === "MULTI_CHOICE" ? "s" : ""}</span>
                    <div className="grid gap-2 md:grid-cols-2">
                      {question.options
                        .map((option) => option.trim())
                        .filter(Boolean)
                        .map((option) => {
                          const checked = question.correctAnswers.includes(option);
                          return (
                            <label key={`${question.id}-correct-${option}`} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]">
                              <input
                                type={question.questionType === "MULTI_CHOICE" ? "checkbox" : "radio"}
                                name={`correct-${question.id}`}
                                checked={checked}
                                onChange={(event) =>
                                  updateQuestion(question.id, (current) => {
                                    const currentAnswers = current.correctAnswers.filter(Boolean);
                                    if (current.questionType === "MULTI_CHOICE") {
                                      const nextAnswers = event.target.checked
                                        ? [...new Set([...currentAnswers, option])]
                                        : currentAnswers.filter((answer) => answer !== option);
                                      return { ...current, correctAnswers: nextAnswers };
                                    }
                                    return { ...current, correctAnswers: event.target.checked ? [option] : [] };
                                  })
                                }
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {question.questionType === "MULTI_CHOICE"
                        ? "Select every option that must be chosen for a fully correct answer."
                        : "Select the single correct option."}
                    </p>
                  </div>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text)]">Sort Order</span>
                    <Input type="number" min={0} value={question.sortOrder} onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, sortOrder: event.target.value }))} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void saveMutation.mutateAsync()}
            disabled={
              saveMutation.isPending ||
              !form.title.trim() ||
              !form.description.trim() ||
              !form.moduleBody.trim() ||
              !form.version.trim() ||
              !form.passingScore.trim() ||
              form.questions.some(
                (question) =>
                  !question.prompt.trim() ||
                  question.options.filter((option) => option.trim()).length < 2 ||
                  question.correctAnswers.length === 0 ||
                  (question.questionType === "SINGLE_CHOICE" && question.correctAnswers.length !== 1) ||
                  (question.questionType === "MULTI_CHOICE" && question.correctAnswers.length < 2),
              )
            }
          >
            {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create module"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="rounded-[24px] p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-semibold text-[var(--text)]">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)]"
      }`}
    >
      {label}
    </button>
  );
}
