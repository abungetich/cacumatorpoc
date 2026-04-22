import type {
  GrantCurrencySettingRow,
  GrantFunderRow,
  GrantFunderType,
  GrantSourceSettingRow,
} from "@/lib/api-types";

export const tabItems = [
  { id: "funders", label: "Funders" },
  { id: "sources", label: "Sources" },
  { id: "currencies", label: "Currencies" },
  { id: "scoring", label: "Scoring" },
] as const;

export type ActiveGrantSettingsTab = (typeof tabItems)[number]["id"];

export const funderTypeOptions: GrantFunderType[] = ["FOUNDATION", "GOVERNMENT", "CORPORATE", "NGO", "MULTILATERAL", "OTHER"];

export type FunderFormState = {
  name: string;
  type: GrantFunderType;
  website: string;
  country: string;
  hqCity: string;
  focusAreas: string;
  typicalMinAmountMinor: string;
  typicalMaxAmountMinor: string;
  currencyCode: string;
  applicationUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
  isActive: boolean;
};

export const emptyFunderForm: FunderFormState = {
  name: "",
  type: "FOUNDATION",
  website: "",
  country: "",
  hqCity: "",
  focusAreas: "",
  typicalMinAmountMinor: "",
  typicalMaxAmountMinor: "",
  currencyCode: "USD",
  applicationUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactRole: "",
  isActive: true,
};

export type SourceFormState = {
  code: string;
  label: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

export const emptySourceForm: SourceFormState = {
  code: "",
  label: "",
  description: "",
  sortOrder: "100",
  isActive: true,
};

export type CurrencyFormState = {
  code: string;
  label: string;
  symbol: string;
  minorUnit: string;
  sortOrder: string;
  isDefault: boolean;
  isActive: boolean;
};

export const emptyCurrencyForm: CurrencyFormState = {
  code: "",
  label: "",
  symbol: "",
  minorUnit: "2",
  sortOrder: "100",
  isDefault: false,
  isActive: true,
};

export type ScoringFormState = {
  timelineWeight: number;
  amountWeight: number;
  areaWeight: number;
  eligibilityWeight: number;
  readinessWeight: number;
};

export function formatEnum(value: string) {
  return value.replaceAll("_", " ");
}

export function toFunderForm(item: GrantFunderRow): FunderFormState {
  const primaryContact = item.contacts.find((contact) => contact.isPrimary) ?? item.contacts[0];
  return {
    name: item.name,
    type: item.type,
    website: item.website ?? "",
    country: item.country ?? "",
    hqCity: item.hqCity ?? "",
    focusAreas: item.focusAreas.join(", "),
    typicalMinAmountMinor: item.typicalMinAmountMinor ?? "",
    typicalMaxAmountMinor: item.typicalMaxAmountMinor ?? "",
    currencyCode: item.currencyCode ?? "USD",
    applicationUrl: item.applicationUrl ?? "",
    contactName: primaryContact?.name ?? "",
    contactEmail: primaryContact?.email ?? "",
    contactPhone: primaryContact?.phone ?? "",
    contactRole: primaryContact?.role ?? "",
    isActive: item.isActive,
  };
}

export function toSourceForm(item: GrantSourceSettingRow): SourceFormState {
  return {
    code: item.code,
    label: item.label,
    description: item.description ?? "",
    sortOrder: String(item.sortOrder),
    isActive: item.isActive,
  };
}

export function toCurrencyForm(item: GrantCurrencySettingRow): CurrencyFormState {
  return {
    code: item.code,
    label: item.label,
    symbol: item.symbol ?? "",
    minorUnit: String(item.minorUnit),
    sortOrder: String(item.sortOrder),
    isDefault: item.isDefault,
    isActive: item.isActive,
  };
}

export function funderTypePill(type: GrantFunderType) {
  if (type === "FOUNDATION") return "bg-purple-100 text-purple-800";
  if (type === "GOVERNMENT") return "bg-emerald-100 text-emerald-800";
  if (type === "CORPORATE") return "bg-sky-100 text-sky-800";
  if (type === "NGO") return "bg-amber-100 text-amber-800";
  if (type === "MULTILATERAL") return "bg-indigo-100 text-indigo-800";
  return "bg-slate-100 text-slate-700";
}

export function scoringTotal(form: ScoringFormState) {
  return form.timelineWeight + form.amountWeight + form.areaWeight + form.eligibilityWeight + form.readinessWeight;
}

export function defaultScoringForm(): ScoringFormState {
  return {
    timelineWeight: 20,
    amountWeight: 20,
    areaWeight: 30,
    eligibilityWeight: 20,
    readinessWeight: 10,
  };
}
