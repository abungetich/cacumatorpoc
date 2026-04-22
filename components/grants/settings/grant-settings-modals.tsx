import type { FormEvent } from "react";
import { Building2, CircleDollarSign, Globe, Mail, MapPin, SlidersHorizontal, Target, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { GrantCurrencySettingRow, GrantFunderRow, GrantFunderType, GrantSourceSettingRow } from "@/lib/api-types";
import { formatEnum, funderTypeOptions, type CurrencyFormState, type FunderFormState, type SourceFormState } from "@/lib/grant-settings-workspace";
import { LabeledField, ReadOnlyField } from "@/components/grants/settings/grant-settings-shared";

export function GrantSettingsModals({
  showFunderModal,
  editingFunder,
  funderForm,
  showSourceModal,
  editingSource,
  sourceForm,
  showCurrencyModal,
  editingCurrency,
  currencyForm,
  viewingFunder,
  pending,
  onCloseFunder,
  onCloseSource,
  onCloseCurrency,
  onCloseViewing,
  onFunderFormChange,
  onSourceFormChange,
  onCurrencyFormChange,
  onFunderSubmit,
  onSourceSubmit,
  onCurrencySubmit,
}: {
  showFunderModal: boolean;
  editingFunder: GrantFunderRow | null;
  funderForm: FunderFormState;
  showSourceModal: boolean;
  editingSource: GrantSourceSettingRow | null;
  sourceForm: SourceFormState;
  showCurrencyModal: boolean;
  editingCurrency: GrantCurrencySettingRow | null;
  currencyForm: CurrencyFormState;
  viewingFunder: GrantFunderRow | null;
  pending: { funder: boolean; source: boolean; currency: boolean };
  onCloseFunder: () => void;
  onCloseSource: () => void;
  onCloseCurrency: () => void;
  onCloseViewing: () => void;
  onFunderFormChange: (value: FunderFormState) => void;
  onSourceFormChange: (value: SourceFormState) => void;
  onCurrencyFormChange: (value: CurrencyFormState) => void;
  onFunderSubmit: (event: FormEvent) => void;
  onSourceSubmit: (event: FormEvent) => void;
  onCurrencySubmit: (event: FormEvent) => void;
}) {
  return (
    <>
      <Modal open={showFunderModal} onClose={onCloseFunder} title={editingFunder ? "Edit Funder" : "Add Funder"} description="Create or update a funder profile with key qualification details." size="2xl" icon={<Building2 className="h-5 w-5 text-[var(--primary)]" />}>
        <form className="space-y-5" onSubmit={onFunderSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label="Funder Name" required icon={<Building2 className="h-4 w-4 text-[var(--primary)]" />}><Input required value={funderForm.name} onChange={(event) => onFunderFormChange({ ...funderForm, name: event.target.value })} /></LabeledField>
            <LabeledField label="Funder Type" required icon={<UsersRound className="h-4 w-4 text-[var(--primary)]" />}><select className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]" value={funderForm.type} onChange={(event) => onFunderFormChange({ ...funderForm, type: event.target.value as GrantFunderType })}>{funderTypeOptions.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}</select></LabeledField>
            <LabeledField label="Country" icon={<MapPin className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.country} onChange={(event) => onFunderFormChange({ ...funderForm, country: event.target.value })} /></LabeledField>
            <LabeledField label="HQ City" icon={<MapPin className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.hqCity} onChange={(event) => onFunderFormChange({ ...funderForm, hqCity: event.target.value })} /></LabeledField>
            <LabeledField label="Website" icon={<Globe className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.website} onChange={(event) => onFunderFormChange({ ...funderForm, website: event.target.value })} /></LabeledField>
            <LabeledField label="Application URL" icon={<Globe className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.applicationUrl} onChange={(event) => onFunderFormChange({ ...funderForm, applicationUrl: event.target.value })} /></LabeledField>
            <LabeledField label="Currency" icon={<CircleDollarSign className="h-4 w-4 text-[var(--primary)]" />}><Input maxLength={3} value={funderForm.currencyCode} onChange={(event) => onFunderFormChange({ ...funderForm, currencyCode: event.target.value.toUpperCase() })} /></LabeledField>
            <LabeledField label="Focus Areas (comma-separated)" icon={<Target className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.focusAreas} onChange={(event) => onFunderFormChange({ ...funderForm, focusAreas: event.target.value })} /></LabeledField>
            <LabeledField label="Typical Min Amount (minor units)" icon={<CircleDollarSign className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.typicalMinAmountMinor} onChange={(event) => onFunderFormChange({ ...funderForm, typicalMinAmountMinor: event.target.value })} /></LabeledField>
            <LabeledField label="Typical Max Amount (minor units)" icon={<CircleDollarSign className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.typicalMaxAmountMinor} onChange={(event) => onFunderFormChange({ ...funderForm, typicalMaxAmountMinor: event.target.value })} /></LabeledField>
            <LabeledField label="Primary Contact Name" icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.contactName} onChange={(event) => onFunderFormChange({ ...funderForm, contactName: event.target.value })} /></LabeledField>
            <LabeledField label="Primary Contact Email" icon={<Mail className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.contactEmail} onChange={(event) => onFunderFormChange({ ...funderForm, contactEmail: event.target.value })} /></LabeledField>
            <LabeledField label="Primary Contact Phone" icon={<UsersRound className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.contactPhone} onChange={(event) => onFunderFormChange({ ...funderForm, contactPhone: event.target.value })} /></LabeledField>
            <LabeledField label="Primary Contact Role" icon={<UsersRound className="h-4 w-4 text-[var(--primary)]" />}><Input value={funderForm.contactRole} onChange={(event) => onFunderFormChange({ ...funderForm, contactRole: event.target.value })} /></LabeledField>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" checked={funderForm.isActive} onChange={(event) => onFunderFormChange({ ...funderForm, isActive: event.target.checked })} />Active funder</label>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCloseFunder}>Cancel</Button><Button type="submit" disabled={pending.funder}>{editingFunder ? "Save Changes" : "Create Funder"}</Button></div>
        </form>
      </Modal>

      <Modal open={showSourceModal} onClose={onCloseSource} title={editingSource ? "Edit Source" : "Add Source"} description="Manage grant source channels." size="lg" icon={<Globe className="h-5 w-5 text-[var(--primary)]" />}>
        <form className="space-y-4" onSubmit={onSourceSubmit}>
          <LabeledField label="Source Code" required icon={<Globe className="h-4 w-4 text-[var(--primary)]" />}><Input required maxLength={32} value={sourceForm.code} onChange={(event) => onSourceFormChange({ ...sourceForm, code: event.target.value.toUpperCase() })} /></LabeledField>
          <LabeledField label="Label" required icon={<SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />}><Input required value={sourceForm.label} onChange={(event) => onSourceFormChange({ ...sourceForm, label: event.target.value })} /></LabeledField>
          <LabeledField label="Description" icon={<SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />}><Input value={sourceForm.description} onChange={(event) => onSourceFormChange({ ...sourceForm, description: event.target.value })} /></LabeledField>
          <LabeledField label="Sort Order" icon={<SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />}><Input type="number" min={0} value={sourceForm.sortOrder} onChange={(event) => onSourceFormChange({ ...sourceForm, sortOrder: event.target.value })} /></LabeledField>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" checked={sourceForm.isActive} onChange={(event) => onSourceFormChange({ ...sourceForm, isActive: event.target.checked })} />Active source</label>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCloseSource}>Cancel</Button><Button type="submit" disabled={pending.source}>{editingSource ? "Save Changes" : "Create Source"}</Button></div>
        </form>
      </Modal>

      <Modal open={showCurrencyModal} onClose={onCloseCurrency} title={editingCurrency ? "Edit Currency" : "Add Currency"} description="Manage supported currencies and default selection." size="lg" icon={<CircleDollarSign className="h-5 w-5 text-[var(--primary)]" />}>
        <form className="space-y-4" onSubmit={onCurrencySubmit}>
          <LabeledField label="Currency Code" required icon={<CircleDollarSign className="h-4 w-4 text-[var(--primary)]" />}><Input required maxLength={3} value={currencyForm.code} onChange={(event) => onCurrencyFormChange({ ...currencyForm, code: event.target.value.toUpperCase() })} /></LabeledField>
          <LabeledField label="Label" required icon={<SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />}><Input required value={currencyForm.label} onChange={(event) => onCurrencyFormChange({ ...currencyForm, label: event.target.value })} /></LabeledField>
          <LabeledField label="Symbol" icon={<CircleDollarSign className="h-4 w-4 text-[var(--primary)]" />}><Input value={currencyForm.symbol} onChange={(event) => onCurrencyFormChange({ ...currencyForm, symbol: event.target.value })} /></LabeledField>
          <LabeledField label="Minor Unit" icon={<SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />}><Input type="number" min={0} max={4} value={currencyForm.minorUnit} onChange={(event) => onCurrencyFormChange({ ...currencyForm, minorUnit: event.target.value })} /></LabeledField>
          <LabeledField label="Sort Order" icon={<SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />}><Input type="number" min={0} value={currencyForm.sortOrder} onChange={(event) => onCurrencyFormChange({ ...currencyForm, sortOrder: event.target.value })} /></LabeledField>
          <div className="flex gap-4"><label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" checked={currencyForm.isDefault} onChange={(event) => onCurrencyFormChange({ ...currencyForm, isDefault: event.target.checked })} />Default currency</label><label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" checked={currencyForm.isActive} onChange={(event) => onCurrencyFormChange({ ...currencyForm, isActive: event.target.checked })} />Active currency</label></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCloseCurrency}>Cancel</Button><Button type="submit" disabled={pending.currency}>{editingCurrency ? "Save Changes" : "Create Currency"}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(viewingFunder)} onClose={onCloseViewing} title="Funder Profile" description="Detailed profile information and primary contact." size="xl" icon={<Building2 className="h-5 w-5 text-[var(--primary)]" />}>
        {viewingFunder ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Name" value={viewingFunder.name} />
            <ReadOnlyField label="Type" value={formatEnum(viewingFunder.type)} />
            <ReadOnlyField label="Country" value={viewingFunder.country ?? "-"} />
            <ReadOnlyField label="HQ City" value={viewingFunder.hqCity ?? "-"} />
            <ReadOnlyField label="Currency" value={viewingFunder.currencyCode ?? "-"} />
            <ReadOnlyField label="Linked Opportunities" value={String(viewingFunder.opportunitiesCount)} />
            <ReadOnlyField label="Website" value={viewingFunder.website ?? "-"} />
            <ReadOnlyField label="Application URL" value={viewingFunder.applicationUrl ?? "-"} />
            <ReadOnlyField label="Focus Areas" value={viewingFunder.focusAreas.join(", ") || "-"} />
            <ReadOnlyField label="Typical Amount Range (Minor Units)" value={`${viewingFunder.typicalMinAmountMinor ?? "-"} to ${viewingFunder.typicalMaxAmountMinor ?? "-"}`} />
            <ReadOnlyField label="Primary Contact" value={viewingFunder.contacts[0] ? `${viewingFunder.contacts[0].name} (${viewingFunder.contacts[0].email ?? "-"})` : "-"} />
            <ReadOnlyField label="Status" value={viewingFunder.isActive ? "Active" : "Inactive"} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
