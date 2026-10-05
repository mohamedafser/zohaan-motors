/** ISO 3166-1 alpha-2 → regional-indicator flag emoji. */
export function countryFlag(code: string): string {
  const iso = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return "🏳️";
  return String.fromCodePoint(...[...iso].map((char) => 127397 + char.charCodeAt(0)));
}

export const COUNTRY_REGIONS = ["gcc", "asia", "europe", "americas", "africa", "oceania"] as const;
export type CountryRegion = (typeof COUNTRY_REGIONS)[number];

export type CountryOption = {
  code: string;
  name: string;
  region: CountryRegion;
};

/** Common vehicle origin markets for UAE dealerships. */
export const COUNTRIES: CountryOption[] = [
  { code: "AE", name: "United Arab Emirates", region: "gcc" },
  { code: "SA", name: "Saudi Arabia", region: "gcc" },
  { code: "KW", name: "Kuwait", region: "gcc" },
  { code: "QA", name: "Qatar", region: "gcc" },
  { code: "BH", name: "Bahrain", region: "gcc" },
  { code: "OM", name: "Oman", region: "gcc" },

  { code: "JP", name: "Japan", region: "asia" },
  { code: "KR", name: "South Korea", region: "asia" },
  { code: "CN", name: "China", region: "asia" },
  { code: "IN", name: "India", region: "asia" },
  { code: "TH", name: "Thailand", region: "asia" },
  { code: "ID", name: "Indonesia", region: "asia" },
  { code: "MY", name: "Malaysia", region: "asia" },
  { code: "SG", name: "Singapore", region: "asia" },
  { code: "PH", name: "Philippines", region: "asia" },
  { code: "TR", name: "Turkey", region: "asia" },

  { code: "DE", name: "Germany", region: "europe" },
  { code: "GB", name: "United Kingdom", region: "europe" },
  { code: "FR", name: "France", region: "europe" },
  { code: "IT", name: "Italy", region: "europe" },
  { code: "ES", name: "Spain", region: "europe" },
  { code: "SE", name: "Sweden", region: "europe" },
  { code: "NL", name: "Netherlands", region: "europe" },
  { code: "BE", name: "Belgium", region: "europe" },
  { code: "AT", name: "Austria", region: "europe" },
  { code: "CH", name: "Switzerland", region: "europe" },
  { code: "PL", name: "Poland", region: "europe" },
  { code: "CZ", name: "Czech Republic", region: "europe" },
  { code: "RU", name: "Russia", region: "europe" },

  { code: "US", name: "United States", region: "americas" },
  { code: "CA", name: "Canada", region: "americas" },
  { code: "MX", name: "Mexico", region: "americas" },
  { code: "BR", name: "Brazil", region: "americas" },

  { code: "EG", name: "Egypt", region: "africa" },
  { code: "ZA", name: "South Africa", region: "africa" },
  { code: "MA", name: "Morocco", region: "africa" },

  { code: "AU", name: "Australia", region: "oceania" },
  { code: "NZ", name: "New Zealand", region: "oceania" },
];

export function findCountryByName(name: string | null | undefined): CountryOption | undefined {
  if (!name?.trim()) return undefined;
  const needle = name.trim().toLowerCase();
  return COUNTRIES.find((country) => country.name.toLowerCase() === needle);
}

export type CountrySelectOption = {
  value: string;
  label: string;
  group: string;
  icon: string;
};

export function countrySelectOptions(extraName?: string | null): CountrySelectOption[] {
  const options: CountrySelectOption[] = COUNTRIES.map((country) => ({
    value: country.name,
    label: country.name,
    group: country.region,
    icon: countryFlag(country.code),
  }));

  if (extraName?.trim() && !findCountryByName(extraName)) {
    options.unshift({
      value: extraName.trim(),
      label: extraName.trim(),
      group: "other",
      icon: "🏳️",
    });
  }

  return options;
}
