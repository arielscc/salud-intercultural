import { TZDate } from "@date-fns/tz";
import { APP_TIME_ZONE } from "@/lib/dates";

/*
 * birthDate se guarda como medianoche UTC (viene de un input "yyyy-MM-dd"),
 * asi que sus componentes se leen en UTC y se comparan contra la fecha
 * actual en hora boliviana, sin importar donde corra el servidor.
 */
export function calculateAgeFromDate(birthDate: Date | null | undefined) {
  if (!birthDate) return null;
  const now = new TZDate(Date.now(), APP_TIME_ZONE);
  let age = now.getFullYear() - birthDate.getUTCFullYear();
  const monthDelta = now.getMonth() - birthDate.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}
