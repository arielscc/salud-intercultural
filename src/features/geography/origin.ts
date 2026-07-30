export type GeographicOriginValue = {
  city: string;
  department: string;
  country: string;
};

export const BOLIVIA_COUNTRY = "Bolivia";

export const boliviaDepartments = [
  "La Paz",
  "Cochabamba",
  "Santa Cruz",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando"
] as const;

export const commonCountries = [
  BOLIVIA_COUNTRY,
  "Perú",
  "Chile",
  "Argentina",
  "Brasil"
] as const;

export const geographicPlaces = [
  { city: "El Alto", department: "La Paz", country: BOLIVIA_COUNTRY },
  { city: "La Paz", department: "La Paz", country: BOLIVIA_COUNTRY },
  { city: "Cochabamba", department: "Cochabamba", country: BOLIVIA_COUNTRY },
  { city: "Santa Cruz de la Sierra", department: "Santa Cruz", country: BOLIVIA_COUNTRY },
  { city: "Oruro", department: "Oruro", country: BOLIVIA_COUNTRY },
  { city: "Viacha", department: "La Paz", country: BOLIVIA_COUNTRY },
  { city: "Achocalla", department: "La Paz", country: BOLIVIA_COUNTRY },
  { city: "Patacamaya", department: "La Paz", country: BOLIVIA_COUNTRY },
  { city: "Copacabana", department: "La Paz", country: BOLIVIA_COUNTRY },
  { city: "Sacaba", department: "Cochabamba", country: BOLIVIA_COUNTRY },
  { city: "Quillacollo", department: "Cochabamba", country: BOLIVIA_COUNTRY },
  { city: "Sucre", department: "Chuquisaca", country: BOLIVIA_COUNTRY },
  { city: "Potosí", department: "Potosí", country: BOLIVIA_COUNTRY },
  { city: "Tarija", department: "Tarija", country: BOLIVIA_COUNTRY },
  { city: "Trinidad", department: "Beni", country: BOLIVIA_COUNTRY },
  { city: "Cobija", department: "Pando", country: BOLIVIA_COUNTRY }
] as const satisfies readonly GeographicOriginValue[];

export const frequentGeographicPlaces = geographicPlaces.slice(0, 5);

const cityAliases: Record<string, string> = {
  cbba: "Cochabamba",
  cochabamba: "Cochabamba",
  scz: "Santa Cruz de la Sierra",
  "santa cruz": "Santa Cruz de la Sierra",
  "santa cruz de la sierra": "Santa Cruz de la Sierra"
};

const countryAliases: Record<string, string> = {
  bol: BOLIVIA_COUNTRY,
  bolivia: BOLIVIA_COUNTRY,
  peru: "Perú",
  perú: "Perú",
  chile: "Chile",
  argentina: "Argentina",
  brasil: "Brasil",
  brazil: "Brasil"
};

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function comparisonKey(value: string) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

export function findGeographicPlace(city: string) {
  const key = comparisonKey(city);
  const alias = cityAliases[key];
  const normalizedKey = comparisonKey(alias ?? city);

  return geographicPlaces.find(
    (place) => comparisonKey(place.city) === normalizedKey
  );
}

export function normalizeGeographicOrigin(
  value: GeographicOriginValue
): GeographicOriginValue {
  const place = findGeographicPlace(value.city);

  if (place) return { ...place };

  const countryKey = comparisonKey(value.country);
  const normalizedCountry =
    countryAliases[countryKey] ?? cleanText(value.country);
  const departmentKey = comparisonKey(value.department);
  const normalizedDepartment =
    boliviaDepartments.find(
      (department) => comparisonKey(department) === departmentKey
    ) ?? cleanText(value.department);

  return {
    city: cleanText(value.city),
    department: normalizedDepartment,
    country: normalizedCountry
  };
}

export function isCompleteGeographicOrigin(value: GeographicOriginValue) {
  const normalized = normalizeGeographicOrigin(value);

  return (
    normalized.city.length >= 2 &&
    normalized.country.length >= 2 &&
    (normalized.country !== BOLIVIA_COUNTRY ||
      normalized.department.length >= 2)
  );
}

export function geographicOriginsMatch(
  first: GeographicOriginValue,
  second: GeographicOriginValue
) {
  const normalizedFirst = normalizeGeographicOrigin(first);
  const normalizedSecond = normalizeGeographicOrigin(second);

  return (
    comparisonKey(normalizedFirst.city) === comparisonKey(normalizedSecond.city) &&
    comparisonKey(normalizedFirst.department) ===
      comparisonKey(normalizedSecond.department) &&
    comparisonKey(normalizedFirst.country) ===
      comparisonKey(normalizedSecond.country)
  );
}

export function geographicOriginLabel(
  value: {
    city?: string | null;
    department?: string | null;
    country?: string | null;
  }
) {
  return [value.city, value.department, value.country]
    .map((part) => cleanText(part))
    .filter(Boolean)
    .join(" · ");
}
