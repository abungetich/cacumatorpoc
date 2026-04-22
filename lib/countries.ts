import isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

isoCountries.registerLocale(enLocale);

const names = Object.values(
  isoCountries.getNames("en", {
    select: "official",
  }),
)
  .map((value) => value.trim())
  .filter(Boolean);

const uniqueSortedNames = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));

export const COUNTRY_OPTIONS = uniqueSortedNames.map((name) => ({
  value: name,
  label: name,
}));
