import type { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SortableHeader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </span>
  );
}

export function LabeledField({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm text-[var(--muted)]">
      <span className="inline-flex items-center gap-2">
        {icon ? icon : null}
        <span>{label}</span>
        {required ? <span className="text-[var(--danger)]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

export function WeightInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-1 text-sm text-[var(--muted)]">
      <span>{label}</span>
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
      />
    </label>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text)]">{value}</p>
    </div>
  );
}
