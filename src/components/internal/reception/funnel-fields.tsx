"use client";

import { differenceInYears, isValid, parse } from "date-fns";

// Re-exportado desde su nueva ubicación global para no romper imports previos.
export { ChipOption } from "@/components/internal/ChipOption";

/*
 * Piezas compartidas entre el funnel de recepcion y la edicion de ficha:
 * los mismos chips y helpers para que ambas pantallas se sientan iguales.
 */

export const NO_KNOWN_ALLERGIES = "Ninguna conocida";
export const cityChips = ["El Alto", "La Paz"] as const;

export type CityChoice = "" | (typeof cityChips)[number] | "otra";

export function cityStateFrom(city: string | null | undefined): {
  choice: CityChoice;
  other: string;
} {
  if (!city) return { choice: "", other: "" };
  if ((cityChips as readonly string[]).includes(city)) {
    return { choice: city as (typeof cityChips)[number], other: "" };
  }
  return { choice: "otra", other: city };
}

export function calculateAge(birthDate: string) {
  if (!birthDate) return null;
  // Corre en el navegador: fecha y "hoy" en la zona horaria de quien edita.
  const date = parse(birthDate, "yyyy-MM-dd", new Date());
  if (!isValid(date)) return null;
  const age = differenceInYears(new Date(), date);
  return age >= 0 && age < 130 ? age : null;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

