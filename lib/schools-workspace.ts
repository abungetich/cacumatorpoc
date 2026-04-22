import type { ManagedSchoolRow } from '@/lib/api-types';
import type { SchoolPayload } from '@/lib/school-management-actions';

export const schoolTypes = ['PRIMARY', 'SECONDARY', 'COLLEGE', 'UNIVERSITY', 'VOCATIONAL'] as const;
export type SchoolType = (typeof schoolTypes)[number];

export type SchoolFormState = {
  name: string;
  type: SchoolType;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  principalEmail: string;
  studentPopulation: string;
  accreditationStatus: string;
  partnerId: string;
};

export const emptySchoolForm: SchoolFormState = {
  name: '',
  type: 'SECONDARY',
  address: '',
  phone: '',
  email: '',
  principalName: '',
  principalEmail: '',
  studentPopulation: '',
  accreditationStatus: '',
  partnerId: '',
};

export function toSchoolPayload(form: SchoolFormState): SchoolPayload {
  return {
    name: form.name.trim(),
    type: form.type,
    address: form.address.trim(),
    phone: form.phone.trim(),
    email: form.email.trim().toLowerCase(),
    principalName: form.principalName.trim() || undefined,
    principalEmail: form.principalEmail.trim() ? form.principalEmail.trim().toLowerCase() : undefined,
    studentPopulation: form.studentPopulation.trim() ? Number(form.studentPopulation) : undefined,
    accreditationStatus: form.accreditationStatus.trim() || undefined,
    partnerId: form.partnerId || undefined,
  };
}

export function typePillClass(type: SchoolType) {
  if (type === 'PRIMARY') return 'bg-cyan-100 text-cyan-800';
  if (type === 'SECONDARY') return 'bg-indigo-100 text-indigo-800';
  if (type === 'COLLEGE') return 'bg-violet-100 text-violet-800';
  if (type === 'UNIVERSITY') return 'bg-emerald-100 text-emerald-800';
  return 'bg-orange-100 text-orange-800';
}

export function accreditationBucket(status: string | null) {
  if (!status?.trim()) return 'NONE';
  const normalized = status.toLowerCase();
  if (normalized.includes('accredit') || normalized.includes('approved')) return 'ACCREDITED';
  if (normalized.includes('pending') || normalized.includes('provisional')) return 'PENDING';
  return 'OTHER';
}

export function accreditationPill(status: string | null) {
  const bucket = accreditationBucket(status);
  if (bucket === 'ACCREDITED') {
    return { label: status ?? 'Accredited', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (bucket === 'PENDING') {
    return { label: status ?? 'Pending', className: 'bg-amber-100 text-amber-800' };
  }
  if (bucket === 'OTHER') {
    return { label: status ?? 'In Review', className: 'bg-sky-100 text-sky-800' };
  }
  return { label: 'Not Set', className: 'bg-slate-100 text-slate-700' };
}

export function buildSchoolStats(rows: ManagedSchoolRow[]) {
  const totalSchools = rows.length;
  const totalStudents = rows.reduce((sum, school) => sum + school.counts.students, 0);
  const totalAdmins = rows.reduce((sum, school) => sum + school.counts.admins, 0);
  const independent = rows.filter((school) => !school.partner).length;
  const avgStudents = totalSchools > 0 ? Math.round(totalStudents / totalSchools) : 0;
  return { totalSchools, totalStudents, totalAdmins, independent, avgStudents };
}

export function buildSchoolPartnerOptions(rows: ManagedSchoolRow[]) {
  const labels = new Set<string>();
  for (const school of rows) {
    if (school.partner?.name) {
      labels.add(school.partner.name);
    }
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b));
}
