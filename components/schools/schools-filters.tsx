import { FilterX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/schools/schools-shared';
import { schoolTypes, type SchoolType } from '@/lib/schools-workspace';

export function SchoolsFilters({
  globalFilter,
  setGlobalFilter,
  typeFilter,
  setTypeFilter,
  partnerFilter,
  setPartnerFilter,
  accreditationFilter,
  setAccreditationFilter,
  partnerOptions,
  onReset,
}: {
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  typeFilter: SchoolType | 'ALL';
  setTypeFilter: (value: SchoolType | 'ALL') => void;
  partnerFilter: string;
  setPartnerFilter: (value: string) => void;
  accreditationFilter: 'ALL' | 'ACCREDITED' | 'PENDING' | 'NONE' | 'OTHER';
  setAccreditationFilter: (value: 'ALL' | 'ACCREDITED' | 'PENDING' | 'NONE' | 'OTHER') => void;
  partnerOptions: string[];
  onReset: () => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="relative lg:col-span-4">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
        <Input
          placeholder="Search school, location, head, email..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="pl-9"
        />
      </div>
      <div className="lg:col-span-2">
        <SelectField value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as SchoolType | 'ALL')}>
          <option value="ALL">All Types</option>
          {schoolTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="lg:col-span-3">
        <SelectField value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}>
          <option value="ALL">All Partners</option>
          <option value="Independent">Independent</option>
          {partnerOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="lg:col-span-2">
        <SelectField value={accreditationFilter} onChange={(event) => setAccreditationFilter(event.target.value as 'ALL' | 'ACCREDITED' | 'PENDING' | 'NONE' | 'OTHER')}>
          <option value="ALL">All Accreditation</option>
          <option value="ACCREDITED">Accredited</option>
          <option value="PENDING">Pending</option>
          <option value="OTHER">Other</option>
          <option value="NONE">Not Set</option>
        </SelectField>
      </div>
      <div className="lg:col-span-1 lg:justify-self-end">
        <Button variant="ghost" className="h-10 w-full gap-1 rounded-lg border border-[var(--border)] px-2 lg:w-10 lg:px-0" onClick={onReset} title="Reset filters" aria-label="Reset filters">
          <FilterX className="h-4 w-4" />
          <span className="lg:hidden">Reset</span>
        </Button>
      </div>
    </div>
  );
}
