"use client";

import Link from "next/link";
import {
  FormEvent,
  type ComponentProps,
  type ReactNode,
  type SelectHTMLAttributes,
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Building2,
  Eye,
  Handshake,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import type { ManagedPartnerRow } from "@/lib/api-types";
import { createPartner, fetchManagedPartners } from "@/lib/partner-management-actions";

const partnerTypes = ["ALL", "NGO", "CORPORATE", "FOUNDATION", "GOVERNMENT"] as const;
type PartnerTypeFilter = (typeof partnerTypes)[number];

type PartnerForm = {
  name: string;
  type: "NGO" | "CORPORATE" | "FOUNDATION" | "GOVERNMENT";
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  logoUrl: string;
  agreementSigned: boolean;
};

const emptyForm: PartnerForm = {
  name: "",
  type: "NGO",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  logoUrl: "",
  agreementSigned: false,
};

function sortHeader(label: string) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </span>
  );
}

function typePill(type: ManagedPartnerRow["type"]) {
  if (type === "CORPORATE") return "bg-sky-100 text-sky-800";
  if (type === "FOUNDATION") return "bg-violet-100 text-violet-800";
  if (type === "GOVERNMENT") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function lifecyclePill(status: ManagedPartnerRow["lifecycleStatus"]) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  return "bg-orange-100 text-orange-800";
}

function agreementPill(status: ManagedPartnerRow["agreementStatus"]) {
  if (status === "SIGNED") return "bg-blue-100 text-blue-800";
  return "bg-rose-100 text-rose-800";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PartnersPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { user } = useAuth();

  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PartnerTypeFilter>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<PartnerForm>(emptyForm);

  const canView = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "SCHOOL_ADMIN";
  const canCreate = user?.role === "PLATFORM_ADMIN";

  const partnersQuery = useQuery({
    queryKey: ["managed-partners", search, typeFilter],
    queryFn: () => fetchManagedPartners({ search, type: typeFilter }),
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPartner({
        name: form.name.trim(),
        type: form.type,
        contactPerson: form.contactPerson.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim() || undefined,
        website: form.website.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        agreementSigned: form.agreementSigned,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["managed-partners"] });
      await queryClient.invalidateQueries({ queryKey: ["partners-for-onboarding"] });
    },
  });

  const rows = useMemo(() => partnersQuery.data?.items ?? [], [partnersQuery.data?.items]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.lifecycleStatus === "ACTIVE").length;
    const agreementSigned = rows.filter((row) => row.agreementStatus === "SIGNED").length;
    const schoolLinks = rows.reduce((sum, row) => sum + row.counts.schools, 0);
    return { total, active, agreementSigned, schoolLinks };
  }, [rows]);

  const columns = useMemo<ColumnDef<ManagedPartnerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Partner")}
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-[var(--text)]">{row.original.name}</p>
            <p className="text-xs text-[var(--muted)]">{row.original.contactEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Type")}
          </button>
        ),
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${typePill(row.original.type)}`}>
            {row.original.type}
          </span>
        ),
      },
      {
        accessorFn: (row) => row.contactPerson,
        id: "contact",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Primary Contact")}
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-[var(--text)]">{row.original.contactPerson}</p>
            <p className="text-xs text-[var(--muted)]">{row.original.contactPhone || "No phone"}</p>
          </div>
        ),
      },
      {
        accessorFn: (row) => row.agreementStatus,
        id: "agreement",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Agreement")}
          </button>
        ),
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${agreementPill(row.original.agreementStatus)}`}>
            {row.original.agreementStatus === "SIGNED" ? "Signed" : "Missing"}
          </span>
        ),
      },
      {
        accessorFn: (row) => row.lifecycleStatus,
        id: "lifecycle",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Lifecycle")}
          </button>
        ),
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${lifecyclePill(row.original.lifecycleStatus)}`}>
            {row.original.lifecycleStatus === "ACTIVE" ? "Active" : "Setup Required"}
          </span>
        ),
      },
      {
        accessorFn: (row) => row.counts.schools,
        id: "schools",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Schools")}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm text-[var(--text)]">{row.original.counts.schools}</span>,
      },
      {
        accessorFn: (row) => row.createdAt,
        id: "createdAt",
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            {sortHeader("Created")}
          </button>
        ),
        cell: ({ row }) => <span className="text-xs text-[var(--muted)]">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/partners/${row.original.id}`}>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 rounded-lg p-0"
              aria-label="View partner"
              title="View partner"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        ),
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (!canView) {
    return (
      <Card>
        <EmptyState
          title="Access Restricted"
          description="Only platform, partner, or school admins can access partner management."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Partner Management</p>
            <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Partners</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Track organisation lifecycle readiness, agreement status, and connected school networks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/schools">
              <Button variant="secondary" className="gap-2">
                <Building2 className="h-4 w-4" />
                Open Schools
              </Button>
            </Link>
            {canCreate ? (
              <Button
                className="gap-2"
                onClick={() => {
                  setForm(emptyForm);
                  setShowAdd(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Partner
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Partners" value={stats.total} icon={Handshake} />
        <MetricCard label="Active Lifecycle" value={stats.active} icon={ShieldCheck} />
        <MetricCard label="Signed Agreements" value={stats.agreementSigned} icon={ShieldCheck} />
        <MetricCard label="Linked Schools" value={stats.schoolLinks} icon={Building2} />
      </section>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
            <Input
              className="pl-9"
              placeholder="Search partner name..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                table.setPageIndex(0);
              }}
            />
          </div>

          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as PartnerTypeFilter);
              table.setPageIndex(0);
            }}
          >
            {partnerTypes.map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? "All Types" : type}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              table.setPageIndex(0);
            }}
          >
            Reset
          </Button>
        </div>

        {partnersQuery.isLoading ? <SectionSkeleton rows={8} /> : null}
        {partnersQuery.error ? (
          <ErrorState
            title="Could not load partners"
            description={partnersQuery.error.message || "Try refreshing."}
            onRetry={() => {
              void partnersQuery.refetch();
            }}
          />
        ) : null}

        {!partnersQuery.isLoading && !partnersQuery.error ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="max-h-[64vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-3 py-3 font-semibold">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-5 text-[var(--muted)]" colSpan={8}>
                        No partners match the current filters.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--border)] transition hover:bg-[var(--surface-2)]/45">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-3 align-top text-[var(--text)]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!partnersQuery.isLoading && !partnersQuery.error ? (
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--muted)]">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Partner Organisation"
        description="Register a new partner before linking schools or cohorts."
        icon={<Handshake className="h-4 w-4" />}
        size="xl"
      >
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            try {
              const payload = await createMutation.mutateAsync();
              pushToast({
                title: "Partner Added",
                description: `${payload.item.name} created successfully.`,
                variant: "success",
              });
              setShowAdd(false);
              setForm(emptyForm);
            } catch (error) {
              pushToast({
                title: "Could not create partner",
                description: error instanceof Error ? error.message : "Request failed.",
                variant: "error",
              });
              await Swal.fire({
                title: "Creation failed",
                text: error instanceof Error ? error.message : "Request failed",
                icon: "error",
                confirmButtonColor: "#b91c1c",
              });
            }
          }}
        >
          <LabeledField label="Organisation Name" required>
            <InputWithIcon
              icon={Building2}
              required
              placeholder="Organisation name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Partner Type" required>
            <SelectWithIcon
              icon={Handshake}
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as PartnerForm["type"],
                }))
              }
            >
              <option value="NGO">NGO</option>
              <option value="CORPORATE">Corporate</option>
              <option value="FOUNDATION">Foundation</option>
              <option value="GOVERNMENT">Government</option>
            </SelectWithIcon>
          </LabeledField>

          <LabeledField label="Primary Contact" required>
            <InputWithIcon
              icon={UserRound}
              required
              placeholder="Contact person"
              value={form.contactPerson}
              onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Contact Email" required>
            <InputWithIcon
              icon={Mail}
              required
              type="email"
              placeholder="Contact email"
              value={form.contactEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Contact Phone">
            <InputWithIcon
              icon={Phone}
              placeholder="Contact phone"
              value={form.contactPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Website URL">
            <InputWithIcon
              icon={Building2}
              placeholder="https://example.org"
              value={form.website}
              onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Logo URL">
            <InputWithIcon
              icon={Building2}
              placeholder="https://example.org/logo.png"
              value={form.logoUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
            />
          </LabeledField>

          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={form.agreementSigned}
              onChange={(event) => setForm((prev) => ({ ...prev, agreementSigned: event.target.checked }))}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            Agreement already signed
          </label>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Create Partner"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
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

function InputWithIcon({
  icon: Icon,
  ...props
}: ComponentProps<typeof Input> & {
  icon: LucideIcon;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <Input {...props} className={`pl-10 ${props.className ?? ""}`} />
    </div>
  );
}

function SelectWithIcon({
  icon: Icon,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <select
        {...props}
        className={`h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 pl-10 text-sm text-[var(--text)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] ${className ?? ""}`}
      >
        {children}
      </select>
    </div>
  );
}

function LabeledField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
