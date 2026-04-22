"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/context/toast-context";
import type { MenteeRow } from "@/lib/api-types";
import { createMenteeRecord, fetchMentees, flagMenteeRecord, type CreateMenteePayload } from "@/lib/mentee-actions";
import { fetchSchools } from "@/lib/school-actions";

function statusPill(status: MenteeRow["status"]) {
  if (status === "Matched") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "At Risk") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
}

export function MenteesTable() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["mentees"],
    queryFn: fetchMentees,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateMenteePayload) => createMenteeRecord(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mentees"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: (menteeProfileId: string) => flagMenteeRecord(menteeProfileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    },
  });

  const rows = data?.items ?? [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    school: "",
    schoolId: "",
    schoolLocation: "",
    level: "Secondary" as MenteeRow["educationLevel"],
  });

  const schoolsQuery = useQuery({
    queryKey: ["schools", form.school, form.schoolLocation],
    queryFn: () =>
      fetchSchools({
        search: form.school,
        location: form.schoolLocation,
        limit: 25,
      }),
    enabled: open,
  });

  const columns = useMemo<ColumnDef<MenteeRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: "school", header: "School" },
      { accessorKey: "educationLevel", header: "Level" },
      { accessorKey: "mentor", header: "Mentor" },
      { accessorKey: "nextSession", header: "Next Session" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusPill(row.original.status)}`}>
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await flagMutation.mutateAsync(row.original.id);
                pushToast({
                  title: "Safeguarding Alert Logged",
                  description: `${row.original.name} was flagged for follow-up.`,
                  variant: "success",
                });
                await Swal.fire({
                  title: "Safeguarding alert created",
                  text: `A follow-up task has been logged for ${row.original.name}.`,
                  icon: "warning",
                  confirmButtonColor: "#d97706",
                });
              } catch (mutationError) {
                pushToast({
                  title: "Flag Failed",
                  description: mutationError instanceof Error ? mutationError.message : "Unable to create alert.",
                  variant: "error",
                });
                await Swal.fire({
                  title: "Flag failed",
                  text: mutationError instanceof Error ? mutationError.message : "Unable to create alert",
                  icon: "error",
                  confirmButtonColor: "#b91c1c",
                });
              }
            }}
          >
            Flag
          </Button>
        ),
      },
    ],
    [flagMutation, pushToast],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
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

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search mentees, mentors, school..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="md:max-w-sm"
        />
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Mentee
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="Could not load mentees"
          description={error.message || "Try refreshing the page."}
          onRetry={() => {
            void queryClient.invalidateQueries({ queryKey: ["mentees"] });
          }}
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-3 font-medium">
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-4 text-[var(--muted)]" colSpan={7}>
                  Loading mentees...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-[var(--muted)]" colSpan={7}>
                  No mentees found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 text-[var(--text)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && !error && table.getRowModel().rows.length === 0 ? (
        <EmptyState
          title="No Mentees Yet"
          description="Create your first mentee record to start matching and safeguarding workflows."
        />
      ) : null}

      <div className="flex items-center justify-between">
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Register New Mentee"
        description="Create a basic record and move them into matching workflow."
      >
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();

            try {
              await createMutation.mutateAsync({
                name: form.name,
                email: form.email,
                phone: form.phone,
                dateOfBirth: form.dateOfBirth,
                school: form.school,
                schoolId: form.schoolId || undefined,
                educationLevel: form.level,
              });

              setOpen(false);
              setForm({
                name: "",
                email: "",
                phone: "",
                dateOfBirth: "",
                school: "",
                schoolId: "",
                schoolLocation: "",
                level: "Secondary",
              });
              pushToast({
                title: "Mentee Created",
                description: `${form.name} was added to the matching queue.`,
                variant: "success",
              });

              await Swal.fire({
                title: "Mentee created",
                text: "The record has been added and set to waiting status.",
                icon: "success",
                confirmButtonColor: "#15803d",
              });
            } catch (mutationError) {
              pushToast({
                title: "Creation Failed",
                description: mutationError instanceof Error ? mutationError.message : "Unable to create mentee.",
                variant: "error",
              });
              await Swal.fire({
                title: "Creation failed",
                text: mutationError instanceof Error ? mutationError.message : "Unable to create mentee",
                icon: "error",
                confirmButtonColor: "#b91c1c",
              });
            }
          }}
        >
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Name</label>
            <Input
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Email</label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Phone</label>
            <Input
              required
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Date of Birth</label>
            <Input
              required
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">School Location Filter</label>
            <Input
              value={form.schoolLocation}
              onChange={(event) => setForm((prev) => ({ ...prev, schoolLocation: event.target.value }))}
              placeholder="e.g Nairobi County"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Search School Name</label>
            <Input
              required
              value={form.school}
              onChange={(event) => setForm((prev) => ({ ...prev, school: event.target.value, schoolId: "" }))}
              placeholder="e.g Nairobi Sunrise"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Select Matching School</label>
            <select
              required
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              value={form.schoolId}
              onChange={(event) => {
                const selectedId = event.target.value;
                const selected = schoolsQuery.data?.items.find((item) => item.id === selectedId);
                setForm((prev) => ({
                  ...prev,
                  schoolId: selectedId,
                  school: selected?.name ?? prev.school,
                }));
              }}
            >
              <option value="">
                {schoolsQuery.isLoading ? "Loading schools..." : "Choose a school"}
              </option>
              {(schoolsQuery.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.location})
                </option>
              ))}
            </select>
            {schoolsQuery.isLoading ? <p className="mt-1 text-xs text-[var(--muted)]">Fetching school list...</p> : null}
            {!schoolsQuery.isLoading && (schoolsQuery.data?.items.length ?? 0) === 0 ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                No schools found for this location/filter. Adjust search terms.
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Education Level</label>
            <select
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              value={form.level}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, level: event.target.value as MenteeRow["educationLevel"] }))
              }
            >
              <option>Primary</option>
              <option>Secondary</option>
              <option>College</option>
              <option>University</option>
              <option>Vocational</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
