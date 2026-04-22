import { CalendarDays, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import type { SchoolProgramRow } from "@/lib/api-types";
import { formatDate } from "@/lib/school-detail-workspace";

type SchoolDetailProgramsProps = {
  programs: SchoolProgramRow[];
  toggling: boolean;
  deleting: boolean;
  onAddProgram: () => void;
  onEditProgram: (program: SchoolProgramRow) => void;
  onToggleProgram: (program: SchoolProgramRow) => void;
  onDeleteProgram: (program: SchoolProgramRow) => void;
};

export function SchoolDetailPrograms({
  programs,
  toggling,
  deleting,
  onAddProgram,
  onEditProgram,
  onToggleProgram,
  onDeleteProgram,
}: SchoolDetailProgramsProps) {
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--text)]">Programs</h2>
        <Button size="sm" className="gap-2" onClick={onAddProgram}>
          <Plus className="h-4 w-4" />
          Add Program
        </Button>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          title="No Programs Yet"
          description="Create the first mentorship program for this school to enable matching."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="max-h-[52vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Program</th>
                  <th className="px-3 py-3 font-semibold">Timeline</th>
                  <th className="px-3 py-3 font-semibold">Levels</th>
                  <th className="px-3 py-3 font-semibold">Cadence</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {programs.map((program) => (
                  <tr key={program.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[var(--text)]">{program.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{program.description}</p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {program.mentorshipCount} mentorship{program.mentorshipCount === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="inline-flex items-center gap-1 text-xs text-[var(--text)]">
                        <CalendarDays className="h-3.5 w-3.5 text-[var(--primary)]" />
                        {formatDate(program.startDate)} - {formatDate(program.endDate)}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">{program.durationMonths} month(s)</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {program.targetEducationLevels.map((level) => (
                          <span
                            key={`${program.id}-${level}`}
                            className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {level}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--text)]">{program.minSessionsPerMonth} session(s)/month</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          program.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {program.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => onEditProgram(program)}
                          title="Edit program"
                          aria-label="Edit program"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className={`h-8 w-8 p-0 ${program.isActive ? "text-amber-700" : "text-emerald-700"}`}
                          onClick={() => onToggleProgram(program)}
                          title={program.isActive ? "Deactivate program" : "Activate program"}
                          aria-label={program.isActive ? "Deactivate program" : "Activate program"}
                          disabled={toggling}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="h-8 w-8 p-0"
                          onClick={() => onDeleteProgram(program)}
                          title="Delete program"
                          aria-label="Delete program"
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
