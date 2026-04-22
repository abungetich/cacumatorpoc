"use client";

import { BadgeDollarSign, Building2, CircleDollarSign, FilterX, Eye, Globe, Pencil, Plus, Search, SlidersHorizontal, Target, ToggleLeft, ToggleRight } from "lucide-react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, type ColumnDef, type SortingState, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import type { GrantCurrencySettingRow, GrantFunderRow, GrantFunderType, GrantSourceSettingRow } from "@/lib/api-types";
import { formatEnum, funderTypeOptions, funderTypePill, scoringTotal, type ScoringFormState } from "@/lib/grant-settings-workspace";
import { SortableHeader, WeightInput } from "@/components/grants/settings/grant-settings-shared";

export function GrantSettingsHeader() {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Settings / Grants</p>
      <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Grant Settings</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Configure funders, channels, currencies, and scoring rules for the grants workflow.
      </p>
    </section>
  );
}

export function GrantSettingsTabBar({ activeTab, onChange }: { activeTab: "funders" | "sources" | "currencies" | "scoring"; onChange: (tab: "funders" | "sources" | "currencies" | "scoring") => void; }) {
  const items = [
    { id: "funders", label: "Funders", icon: Building2 },
    { id: "sources", label: "Sources", icon: Globe },
    { id: "currencies", label: "Currencies", icon: CircleDollarSign },
    { id: "scoring", label: "Scoring", icon: Target },
  ] as const;

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              active
                ? "border-transparent bg-[var(--primary)] text-[var(--primary-contrast)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </section>
  );
}

export function FundersTab({
  funders,
  canEdit,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  sorting,
  onSortingChange,
  onOpenCreate,
  onView,
  onEdit,
  onToggle,
}: {
  funders: GrantFunderRow[];
  canEdit: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: GrantFunderType | "ALL";
  onTypeFilterChange: (value: GrantFunderType | "ALL") => void;
  statusFilter: "ALL" | "ACTIVE" | "INACTIVE";
  onStatusFilterChange: (value: "ALL" | "ACTIVE" | "INACTIVE") => void;
  sorting: SortingState;
  onSortingChange: (value: SortingState) => void;
  onOpenCreate: () => void;
  onView: (row: GrantFunderRow) => void;
  onEdit: (row: GrantFunderRow) => void;
  onToggle: (row: GrantFunderRow) => void;
}) {
  const filteredFunders = useMemo(() => {
    return funders.filter((item) => {
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      const haystack = `${item.name} ${item.type} ${item.country ?? ""} ${item.hqCity ?? ""} ${item.currencyCode ?? ""}`.toLowerCase().trim();
      return haystack.includes(query);
    });
  }, [funders, search, statusFilter, typeFilter]);

  const columns = useMemo<ColumnDef<GrantFunderRow>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button"><SortableHeader label="Funder" /></button>,
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[var(--text)]">{row.original.name}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.country ?? "Global"} · {row.original.hqCity ?? "No city"}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button"><SortableHeader label="Type" /></button>,
      cell: ({ row }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${funderTypePill(row.original.type)}`}>{formatEnum(row.original.type)}</span>,
    },
    {
      accessorFn: (row) => row.currencyCode ?? "",
      id: "currency",
      header: ({ column }) => <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button"><SortableHeader label="Currency" /></button>,
      cell: ({ row }) => <span className="text-xs text-[var(--muted)]">{row.original.currencyCode ?? "-"}</span>,
    },
    {
      accessorFn: (row) => row.opportunitiesCount,
      id: "opportunitiesCount",
      header: ({ column }) => <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button"><SortableHeader label="Linked Grants" /></button>,
      cell: ({ row }) => <span className="text-sm font-semibold text-[var(--text)]">{row.original.opportunitiesCount}</span>,
    },
    {
      accessorFn: (row) => (row.isActive ? "ACTIVE" : "INACTIVE"),
      id: "status",
      header: ({ column }) => <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button"><SortableHeader label="Status" /></button>,
      cell: ({ row }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.original.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{row.original.isActive ? "Active" : "Inactive"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" aria-label="View funder" title="View funder" onClick={() => onView(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" aria-label="Edit funder" title="Edit funder" onClick={() => onEdit(row.original)} disabled={!canEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={row.original.isActive ? "danger" : "secondary"} className="h-8 w-8 rounded-lg p-0" aria-label={row.original.isActive ? "Deactivate funder" : "Activate funder"} title={row.original.isActive ? "Deactivate funder" : "Activate funder"} onClick={() => onToggle(row.original)} disabled={!canEdit}>
            {row.original.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ], [canEdit, onEdit, onToggle, onView]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredFunders,
    columns,
    state: { sorting },
    onSortingChange: (updater) => onSortingChange(typeof updater === "function" ? updater(sorting) : updater),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--text)]">Funders Directory</p>
          <p className="text-sm text-[var(--muted)]">Manage funding organizations and their grant contacts.</p>
        </div>
        <Button onClick={onOpenCreate} className="gap-2" disabled={!canEdit}><Plus className="h-4 w-4" />Add Funder</Button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
          <Input className="pl-9" placeholder="Search funders by name, country, type" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        <select className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value as GrantFunderType | "ALL")}>
          <option value="ALL">All Types</option>
          {funderTypeOptions.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
        </select>
        <select className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" className="gap-2" onClick={() => { onSearchChange(""); onTypeFilterChange("ALL"); onStatusFilterChange("ALL"); }}>
          <FilterX className="h-4 w-4" />Clear filters
        </Button>
      </div>
      {filteredFunders.length === 0 ? <div className="mt-4"><EmptyState title="No funders found" description="Create the first funder or adjust your filters." /></div> : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3 py-3 font-semibold">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-3 align-top">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
            <p>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
              <Button size="sm" variant="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export function SourcesTab({ rows, canEdit, onOpenCreate, onEdit, onToggle }: { rows: GrantSourceSettingRow[]; canEdit: boolean; onOpenCreate: () => void; onEdit: (row: GrantSourceSettingRow) => void; onToggle: (row: GrantSourceSettingRow) => void; }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--text)]">Source Channels</p>
          <p className="text-sm text-[var(--muted)]">Control where grant opportunities can be sourced from.</p>
        </div>
        <Button className="gap-2" disabled={!canEdit} onClick={onOpenCreate}><Plus className="h-4 w-4" />Add Source</Button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-3 py-3 font-semibold">Code</th><th className="px-3 py-3 font-semibold">Label</th><th className="px-3 py-3 font-semibold">Description</th><th className="px-3 py-3 font-semibold">Order</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Actions</th></tr></thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-3 font-mono text-xs">{item.code}</td>
                <td className="px-3 py-3 font-medium text-[var(--text)]">{item.label}</td>
                <td className="px-3 py-3 text-xs text-[var(--muted)]">{item.description ?? "-"}</td>
                <td className="px-3 py-3 text-xs text-[var(--muted)]">{item.sortOrder}</td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                <td className="px-3 py-3"><div className="flex gap-1"><Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" title="Edit source" aria-label="Edit source" onClick={() => onEdit(item)} disabled={!canEdit}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant={item.isActive ? "danger" : "secondary"} className="h-8 w-8 rounded-lg p-0" title={item.isActive ? "Deactivate source" : "Activate source"} aria-label={item.isActive ? "Deactivate source" : "Activate source"} onClick={() => onToggle(item)} disabled={!canEdit}>{item.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function CurrenciesTab({ rows, canEdit, onOpenCreate, onEdit, onSetDefault, onToggle }: { rows: GrantCurrencySettingRow[]; canEdit: boolean; onOpenCreate: () => void; onEdit: (row: GrantCurrencySettingRow) => void; onSetDefault: (row: GrantCurrencySettingRow) => void; onToggle: (row: GrantCurrencySettingRow) => void; }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--text)]">Currencies</p>
          <p className="text-sm text-[var(--muted)]">Manage currency options and the default grant currency.</p>
        </div>
        <Button className="gap-2" disabled={!canEdit} onClick={onOpenCreate}><Plus className="h-4 w-4" />Add Currency</Button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-3 py-3 font-semibold">Code</th><th className="px-3 py-3 font-semibold">Label</th><th className="px-3 py-3 font-semibold">Symbol</th><th className="px-3 py-3 font-semibold">Minor Unit</th><th className="px-3 py-3 font-semibold">Default</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Actions</th></tr></thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-3 font-mono text-xs">{item.code}</td>
                <td className="px-3 py-3 font-medium text-[var(--text)]">{item.label}</td>
                <td className="px-3 py-3 text-xs text-[var(--muted)]">{item.symbol || "-"}</td>
                <td className="px-3 py-3 text-xs text-[var(--muted)]">{item.minorUnit}</td>
                <td className="px-3 py-3">{item.isDefault ? <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800">Default</span> : <span className="text-xs text-[var(--muted)]">-</span>}</td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                <td className="px-3 py-3"><div className="flex gap-1"><Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" title="Edit currency" aria-label="Edit currency" onClick={() => onEdit(item)} disabled={!canEdit}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" title={item.isDefault ? "Default currency" : "Set as default"} aria-label={item.isDefault ? "Default currency" : "Set as default"} onClick={() => onSetDefault(item)} disabled={!canEdit || item.isDefault}><BadgeDollarSign className="h-4 w-4" /></Button><Button size="sm" variant={item.isActive ? "danger" : "secondary"} className="h-8 w-8 rounded-lg p-0" title={item.isActive ? "Deactivate currency" : "Activate currency"} aria-label={item.isActive ? "Deactivate currency" : "Activate currency"} onClick={() => onToggle(item)} disabled={!canEdit}>{item.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ScoringTab({ scoringForm, scoringState, canEdit, pending, onChange, onSave }: { scoringForm: ScoringFormState; scoringState: ScoringFormState; canEdit: boolean; pending: boolean; onChange: (value: ScoringFormState) => void; onSave: () => void; }) {
  const total = scoringTotal(scoringForm);
  const valid = total === 100;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--text)]">Scoring Matrix Weights</p>
          <p className="text-sm text-[var(--muted)]">Configure weighted fit-scoring used in grant prioritization.</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${valid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>Total: {total}%</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <WeightInput label="Timeline" value={scoringForm.timelineWeight} onChange={(value) => onChange({ ...scoringForm, timelineWeight: value })} />
        <WeightInput label="Amount" value={scoringForm.amountWeight} onChange={(value) => onChange({ ...scoringForm, amountWeight: value })} />
        <WeightInput label="Strategic Area" value={scoringForm.areaWeight} onChange={(value) => onChange({ ...scoringForm, areaWeight: value })} />
        <WeightInput label="Eligibility" value={scoringForm.eligibilityWeight} onChange={(value) => onChange({ ...scoringForm, eligibilityWeight: value })} />
        <WeightInput label="Readiness" value={scoringForm.readinessWeight} onChange={(value) => onChange({ ...scoringForm, readinessWeight: value })} />
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => onChange(scoringState)} disabled={pending}>Reset</Button>
        <Button onClick={onSave} disabled={!canEdit || !valid || pending} className="gap-2"><SlidersHorizontal className="h-4 w-4" />Save Weights</Button>
      </div>
    </Card>
  );
}
