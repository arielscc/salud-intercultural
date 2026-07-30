export type DuplicateIdentity = {
  fullName: string;
  phone: string;
  secondaryPhone?: string | null;
  birthDate?: Date | null;
};

export type DuplicateMatchSignals = {
  phoneMatch: boolean;
  nameMatch: boolean;
  birthDateMatch: boolean;
  score: number;
  isCandidate: boolean;
};

export function normalizePatientPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length >= 8) {
    return digits.slice(-8);
  }

  return digits;
}

export function normalizePatientName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "es"))
    .join(" ");
}

export function sameDateOnly(first?: Date | null, second?: Date | null) {
  if (!first || !second) return false;

  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate()
  );
}

export function duplicateMatchSignals(
  first: DuplicateIdentity,
  second: DuplicateIdentity
): DuplicateMatchSignals {
  const firstPhones = [first.phone, first.secondaryPhone]
    .filter((phone): phone is string => Boolean(phone))
    .map(normalizePatientPhone)
    .filter((phone) => phone.length >= 7);
  const secondPhones = [second.phone, second.secondaryPhone]
    .filter((phone): phone is string => Boolean(phone))
    .map(normalizePatientPhone)
    .filter((phone) => phone.length >= 7);
  const firstName = normalizePatientName(first.fullName);
  const secondName = normalizePatientName(second.fullName);
  const phoneMatch = firstPhones.some((phone) => secondPhones.includes(phone));
  const nameMatch =
    firstName.length >= 4 &&
    secondName.length >= 4 &&
    firstName === secondName;
  const birthDateMatch = sameDateOnly(first.birthDate, second.birthDate);
  const score =
    (phoneMatch ? 70 : 0) +
    (nameMatch ? 20 : 0) +
    (birthDateMatch ? 30 : 0);

  return {
    phoneMatch,
    nameMatch,
    birthDateMatch,
    score,
    isCandidate: phoneMatch || (nameMatch && birthDateMatch)
  };
}

export function patientPairKey(firstPatientId: string, secondPatientId: string) {
  return [firstPatientId, secondPatientId].sort().join(":");
}
