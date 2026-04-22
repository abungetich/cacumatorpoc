import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl border-[var(--border)] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

export function LabeledField({
  label,
  required,
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
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
