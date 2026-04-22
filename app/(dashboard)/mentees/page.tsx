import { MenteesTable } from "@/components/tables/mentees-table";

export default function MenteesPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Mentee Management</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage matching pipeline, visibility, and safeguarding follow-up actions.
        </p>
      </section>
      <MenteesTable />
    </div>
  );
}
