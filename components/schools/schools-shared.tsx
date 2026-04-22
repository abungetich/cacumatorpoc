import type { ComponentProps, Dispatch, ReactNode, SelectHTMLAttributes, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, GraduationCap, Mail, MapPin, Phone, ShieldCheck, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SchoolFormState, SchoolType } from '@/lib/schools-workspace';
import { schoolTypes } from '@/lib/schools-workspace';

export function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export function SelectField({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode;
}) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:ring-2 focus:ring-[var(--ring)] ${className ?? ''}`}
    >
      {children}
    </select>
  );
}

export function LabeledField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
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

export function InputWithIcon({
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
      <Input {...props} className={`pl-10 ${props.className ?? ''}`} />
    </div>
  );
}

export function SelectWithIcon({
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
      <SelectField {...props} className={`pl-10 ${className ?? ''}`}>
        {children}
      </SelectField>
    </div>
  );
}

export function SchoolFormFields({
  form,
  setForm,
  showPartnerField,
  partnerOptions,
  partnerFieldDisabled = false,
}: {
  form: SchoolFormState;
  setForm: Dispatch<SetStateAction<SchoolFormState>>;
  showPartnerField: boolean;
  partnerOptions: Array<{ id: string; name: string; type: string }>;
  partnerFieldDisabled?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LabeledField label="School Name" required>
        <InputWithIcon icon={Building2} required placeholder="School name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
      </LabeledField>

      <LabeledField label="School Type" required>
        <SelectWithIcon icon={GraduationCap} value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as SchoolType }))}>
          {schoolTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectWithIcon>
      </LabeledField>

      <LabeledField label="Address" required>
        <InputWithIcon icon={MapPin} required placeholder="Address" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
      </LabeledField>

      <LabeledField label="School Phone" required>
        <InputWithIcon icon={Phone} required placeholder="School phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
      </LabeledField>

      <LabeledField label="School Email" required>
        <InputWithIcon icon={Mail} required type="email" placeholder="School email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
      </LabeledField>

      <LabeledField label="Student Population">
        <InputWithIcon icon={Users} type="number" min={1} placeholder="Student population" value={form.studentPopulation} onChange={(event) => setForm((prev) => ({ ...prev, studentPopulation: event.target.value }))} />
      </LabeledField>

      <LabeledField label="Accreditation Status">
        <InputWithIcon icon={ShieldCheck} placeholder="Accreditation status" value={form.accreditationStatus} onChange={(event) => setForm((prev) => ({ ...prev, accreditationStatus: event.target.value }))} />
      </LabeledField>

      {showPartnerField ? (
        <LabeledField label="Partner">
          <SelectWithIcon icon={Building2} disabled={partnerFieldDisabled} value={form.partnerId} onChange={(event) => setForm((prev) => ({ ...prev, partnerId: event.target.value }))} className="disabled:opacity-60">
            <option value="">No Partner</option>
            {partnerOptions.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name} ({partner.type})
              </option>
            ))}
          </SelectWithIcon>
        </LabeledField>
      ) : null}
    </div>
  );
}
