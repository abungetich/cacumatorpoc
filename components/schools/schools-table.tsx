import Link from 'next/link';
import { useMemo } from 'react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type ColumnDef, type SortingState, useReactTable } from '@tanstack/react-table';
import { ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/states';
import { SelectField } from '@/components/schools/schools-shared';
import type { ManagedSchoolRow } from '@/lib/api-types';
import { accreditationPill, typePillClass } from '@/lib/schools-workspace';

function SortableHeader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </span>
  );
}

export function SchoolsTable({
  rows,
  sorting,
  setSorting,
  globalFilter,
  setGlobalFilter,
  canDelete,
  isLoading,
  error,
  onRetry,
  onEdit,
  onDelete,
}: {
  rows: ManagedSchoolRow[];
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  canDelete: boolean;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onEdit: (row: ManagedSchoolRow) => void;
  onDelete: (row: ManagedSchoolRow) => void;
}) {
  const columns = useMemo<ColumnDef<ManagedSchoolRow>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button">
          <SortableHeader label="School" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <Link href={`/schools/${row.original.id}`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)]">
            {row.original.name}
          </Link>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{row.original.location}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button">
          <SortableHeader label="Type" />
        </button>
      ),
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${typePillClass(row.original.type)}`}>
          {row.original.type}
        </span>
      ),
    },
    {
      accessorFn: (row) => row.principalName,
      id: 'principalName',
      header: ({ column }) => (
        <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button">
          <SortableHeader label="Head" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--text)]">{row.original.principalName}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.principalEmail}</p>
        </div>
      ),
    },
    {
      accessorFn: (row) => row.partner?.name ?? 'Independent',
      id: 'partner',
      header: ({ column }) => (
        <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button">
          <SortableHeader label="Partner" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {row.original.partner?.name ?? 'Independent'}
        </span>
      ),
    },
    {
      accessorFn: (row) => row.counts.students,
      id: 'students',
      header: ({ column }) => (
        <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button">
          <SortableHeader label="Capacity" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-[var(--text)]">{row.original.counts.students} students</p>
          <p className="text-[var(--muted)]">{row.original.counts.admins} admins</p>
        </div>
      ),
    },
    {
      accessorFn: (row) => row.accreditationStatus ?? '',
      id: 'accreditation',
      header: ({ column }) => (
        <button className="inline-flex items-center gap-1" onClick={column.getToggleSortingHandler()} type="button">
          <SortableHeader label="Accreditation" />
        </button>
      ),
      cell: ({ row }) => {
        const badge = accreditationPill(row.original.accreditationStatus);
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Link href={`/schools/${row.original.id}`}>
            <Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" aria-label="View school" title="View school">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" aria-label="Edit school" title="Edit school" onClick={() => onEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {canDelete ? (
            <Button size="sm" variant="danger" className="h-8 w-8 rounded-lg p-0" aria-label="Delete school" title="Delete school" onClick={() => onDelete(row.original)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ], [canDelete, onDelete, onEdit]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _, filterValue) => {
      const value = String(filterValue || '').trim().toLowerCase();
      if (!value) return true;
      const target = [row.original.name, row.original.location, row.original.type, row.original.email, row.original.principalName, row.original.partner?.name ?? 'independent', row.original.accreditationStatus ?? '']
        .join(' ')
        .toLowerCase();
      return target.includes(value);
    },
  });

  return (
    <Card className="space-y-4 border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
      {isLoading ? <SectionSkeleton rows={8} /> : null}
      {error ? <ErrorState title="Could not load schools" description={error.message || 'Try refreshing.'} onRetry={onRetry} /> : null}

      {!isLoading && !error ? (
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
                    <td className="px-3 py-5 text-[var(--muted)]" colSpan={7}>No schools match your filters.</td>
                  </tr>
                ) : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)] transition hover:bg-[var(--surface-2)]/45">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3 align-top text-[var(--text)]">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-[var(--muted)]">Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} filtered records</div>
          <div className="flex items-center gap-2">
            <SelectField value={String(table.getState().pagination.pageSize)} onChange={(event) => table.setPageSize(Number(event.target.value))} className="h-9 min-w-[100px] text-xs">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </SelectField>
            <span className="px-2 text-xs text-[var(--muted)]">Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span>
            <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
        </div>
      ) : null}

      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState title="No Schools Yet" description="Create your first school to begin onboarding mentors, admins, and students." />
      ) : null}
    </Card>
  );
}
