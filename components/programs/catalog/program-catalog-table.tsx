import type { ReactNode } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, SectionSkeleton } from '@/components/ui/states';
import type { ProgramWorkspaceRow } from '@/lib/api-types';
import { programCategories, programStatuses } from '@/lib/programs-config';
import { formatEnumLabel, formatDate, activePillClass, statusPillClass } from '@/lib/programs-catalog';

export function ProgramCatalogTable({
  search,
  setSearch,
  schoolFilter,
  setSchoolFilter,
  categoryFilter,
  setCategoryFilter,
  lifecycleFilter,
  setLifecycleFilter,
  statusFilter,
  setStatusFilter,
  schools,
  programs,
  isLoading,
  error,
  onRefresh,
  onEdit,
  onToggle,
  onDelete,
}: {
  search: string;
  setSearch: (value: string) => void;
  schoolFilter: string;
  setSchoolFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  lifecycleFilter: 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ENROLLMENT_OPEN' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  setLifecycleFilter: (value: 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ENROLLMENT_OPEN' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED') => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  setStatusFilter: (value: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  schools: Array<{ id: string; name: string }>;
  programs: ProgramWorkspaceRow[];
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  onEdit: (program: ProgramWorkspaceRow) => void;
  onToggle: (program: ProgramWorkspaceRow) => void;
  onDelete: (program: ProgramWorkspaceRow) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-6">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <input className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text)]" placeholder="Search programs, schools, categories" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}>
          <option value="ALL">All Schools</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>{school.name}</option>
          ))}
        </select>
        <FilterSelect value={categoryFilter} onChange={setCategoryFilter} allLabel="All Categories" options={[...programCategories]} />
        <FilterSelect value={lifecycleFilter} onChange={setLifecycleFilter} allLabel="All Lifecycle States" options={[...programStatuses]} />
        <div className="flex gap-2">
          <select className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
            <option value="ALL">All Activity</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
          <Button variant="secondary" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? <SectionSkeleton rows={8} /> : null}
      {error ? <ErrorState title="Could not load programs" description={error.message || 'Try refreshing.'} onRetry={onRefresh} /> : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="max-h-[62vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Program</th>
                  <th className="px-3 py-3 font-semibold">Structure</th>
                  <th className="px-3 py-3 font-semibold">Targeting</th>
                  <th className="px-3 py-3 font-semibold">School</th>
                  <th className="px-3 py-3 font-semibold">Mentorships</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {programs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-5 text-[var(--muted)]" colSpan={7}>No programs found.</td>
                  </tr>
                ) : (
                  programs.map((program) => (
                    <tr key={program.id} className="border-t border-[var(--border)] align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[var(--text)]">{program.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{program.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Pill>{formatEnumLabel(program.category)}</Pill>
                          <Pill>{formatEnumLabel(program.programType)}</Pill>
                          <Pill>{formatEnumLabel(program.programFormat)}</Pill>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p>{program.durationMonths} months • {formatEnumLabel(program.sessionFrequency)}</p>
                        <p>{program.sessionDurationMinutes} min/session</p>
                        <p>Min {program.minSessionsPerMonth} session(s)/month</p>
                        <p>Deadline: {formatDate(program.applicationDeadline)}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p>{program.targetAgeGroups.length ? program.targetAgeGroups.map(formatEnumLabel).join(', ') : 'Age open'}</p>
                        <p>{program.targetEducationLevels.map(formatEnumLabel).join(', ')}</p>
                        <p>{formatEnumLabel(program.geographicScope)}</p>
                        <p>{program.targetCounties[0] ?? program.targetCountries[0] ?? 'School scoped'}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p className="font-medium text-[var(--text)]">{program.school?.name ?? 'No owner school'}</p>
                        <p>{program.school ? formatEnumLabel(program.school.type) : 'Shared / cross-school'}</p>
                        <p>{program.school?.partnerName ?? 'Independent'}</p>
                        {program.targetSchools.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {program.targetSchools.slice(0, 3).map((school) => (
                              <Pill key={school.id}>{school.name}</Pill>
                            ))}
                            {program.targetSchools.length > 3 ? <Pill>+{program.targetSchools.length - 3} more</Pill> : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        <p className="font-semibold text-[var(--text)]">{program.mentorshipCount}</p>
                        <p>{program.maxMentors ? `${program.maxMentors} mentor cap` : 'No mentor cap'}</p>
                        <p>{program.maxMentees ? `${program.maxMentees} mentee cap` : 'No mentee cap'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusPillClass(program.programStatus)}`}>{formatEnumLabel(program.programStatus)}</span>
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${activePillClass(program.isActive)}`}>{program.isActive ? 'Visible' : 'Hidden'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {program.school ? (
                            <Link href={`/schools/${program.school.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text)] transition hover:bg-[var(--surface)]" title="View school" aria-label="View school">
                              <Eye className="h-4 w-4" />
                            </Link>
                          ) : null}
                          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" title="Edit program" aria-label="Edit program" onClick={() => onEdit(program)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" title={program.isActive ? 'Hide program' : 'Show program'} aria-label={program.isActive ? 'Hide program' : 'Show program'} onClick={() => onToggle(program)}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="danger" className="h-8 w-8 p-0" title="Delete program" aria-label="Delete program" onClick={() => onDelete(program)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  allLabel: string;
  options: T[];
}) {
  return (
    <select
      className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      <option value="ALL">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>{formatEnumLabel(option)}</option>
      ))}
    </select>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">{children}</span>;
}
