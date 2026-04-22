import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type SchoolDetailHeaderProps = {
  name: string;
  type: string;
  location: string;
  canCreateAdmins: boolean;
  principalAssigned: boolean;
  onAddAdmin: () => void;
  onEditHead: () => void;
  onAddStudent: () => void;
  onUploadCsv: () => void;
  onAddProgram: () => void;
};

export function SchoolDetailHeader({
  name,
  type,
  location,
  canCreateAdmins,
  principalAssigned,
  onAddAdmin,
  onEditHead,
  onAddStudent,
  onUploadCsv,
  onAddProgram,
}: SchoolDetailHeaderProps) {
  return (
    <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-2">
          <Link href="/schools">
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Schools
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">{name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {type} • {location}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canCreateAdmins ? (
          <Button variant="secondary" size="sm" onClick={onAddAdmin}>
            Add Admin
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onClick={onEditHead}>
          {principalAssigned ? "Update Head" : "Add Head"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onAddStudent}>
          Add Student
        </Button>
        <Button variant="secondary" size="sm" onClick={onUploadCsv}>
          Upload CSV
        </Button>
        <Button size="sm" className="gap-2" onClick={onAddProgram}>
          <Plus className="h-4 w-4" />
          Add Program
        </Button>
      </div>
    </section>
  );
}
