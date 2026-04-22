import type { ReactNode } from 'react';
import Flatpickr from 'react-flatpickr';
import { Button } from '@/components/ui/button';
import { formatEnumLabel } from '@/lib/programs-catalog';

export type SchoolOption = { id: string; name: string };

export function ProgramStepHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
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

export function ReviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
      <div className="border-b border-[var(--border)] pb-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-dashed border-[color-mix(in_srgb,var(--border)_70%,transparent)] pb-2 last:border-b-0 last:pb-0 md:grid-cols-[180px_minmax(0,1fr)]">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <span className="text-sm leading-6 text-[var(--text)]">{value}</span>
    </div>
  );
}

export function CheckboxGrid<T extends string>({
  items,
  selected,
  onToggle,
}: {
  items: readonly T[];
  selected: T[];
  onToggle: (value: T, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const checked = selected.includes(item);
        return (
          <label key={item} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={checked} onChange={(event) => onToggle(item, event.target.checked)} />
            {formatEnumLabel(item)}
          </label>
        );
      })}
    </div>
  );
}

export function ToggleCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function LabeledSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: string) => void;
  options: readonly T[];
}) {
  return (
    <LabeledField label={label} required>
      <select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatEnumLabel(option)}
          </option>
        ))}
      </select>
    </LabeledField>
  );
}

export function DateField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <LabeledField label={label} required={required}>
      <Flatpickr
        options={{
          dateFormat: 'Y-m-d',
          altInput: true,
          altFormat: 'M j, Y',
          altInputClass:
            'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        }}
        value={value || undefined}
        onChange={(_, dateStr) => onChange(dateStr || '')}
        className="hidden"
        placeholder={`Select ${label.toLowerCase()}`}
        required={required}
      />
    </LabeledField>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <LabeledField label={label}>
      <div className="space-y-1.5">
        <Flatpickr
          options={{
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d\\TH:i',
            altInput: true,
            altFormat: 'M j, Y H:i',
            minuteIncrement: 5,
            altInputClass:
              'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          }}
          value={value || undefined}
          onChange={(_, dateStr) => onChange(dateStr || '')}
          className="hidden"
          placeholder="Select deadline"
        />
        {value ? (
          <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={onClear}>
            Clear deadline
          </Button>
        ) : null}
      </div>
    </LabeledField>
  );
}
