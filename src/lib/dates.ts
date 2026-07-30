import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, format, isValid, parse, startOfDay, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

/*
 * Manejo central de fechas y horas. Todos los timestamps se guardan en UTC
 * (asi los devuelve Prisma) y se muestran siempre en hora boliviana, sin
 * depender de la zona horaria del servidor donde corra la app. Las fechas
 * "solo dia" (fecha de nacimiento) se guardan como medianoche UTC y se
 * leen/escriben con los helpers *DateOnly* para no correrse un dia.
 */
export const APP_TIME_ZONE = "America/La_Paz";

function inAppZone(date: Date) {
  return new TZDate(date, APP_TIME_ZONE);
}

/** "13 jul 2026, 14:30" — formato estandar para tablas y timelines. */
export function formatDateTime(date: Date) {
  return format(inAppZone(date), "d MMM yyyy, HH:mm", { locale: es });
}

/** "13 jul 2026" */
export function formatDate(date: Date) {
  return format(inAppZone(date), "d MMM yyyy", { locale: es });
}

/** "13 jul 2026" para columnas PostgreSQL DATE, sin convertir zona horaria. */
export function formatDateOnly(date: Date) {
  const parsed = parse(date.toISOString().slice(0, 10), "yyyy-MM-dd", new Date());
  return format(parsed, "d MMM yyyy", { locale: es });
}

/** "14:30" */
export function formatTime(date: Date) {
  return format(inAppZone(date), "HH:mm", { locale: es });
}

/** "domingo, 13 de julio de 2026" (en minusculas, como el locale). */
export function formatLongDate(date: Date) {
  return format(inAppZone(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "julio de 2026" a partir de un string "yyyy-MM-dd" (fecha sin hora). */
export function formatMonthYearFromDateOnly(value: string) {
  const parsed = parse(value.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(parsed) ? format(parsed, "MMMM 'de' yyyy", { locale: es }) : null;
}

/** Date "solo dia" (medianoche UTC) -> "yyyy-MM-dd" para inputs de fecha. */
export function toDateOnlyString(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Fecha actual en Bolivia como "yyyy-MM-dd", para campos de día operativo. */
export function todayDateOnly(date: Date = new Date()) {
  return format(inAppZone(date), "yyyy-MM-dd");
}

/** Fecha boliviana actual representada como PostgreSQL DATE para filtros Prisma. */
export function todayDatabaseDate(date: Date = new Date()) {
  return new Date(`${todayDateOnly(date)}T00:00:00.000Z`);
}

/** Limites del dia boliviano que contiene `date`, como instantes UTC. */
export function dayRange(date: Date = new Date()) {
  const start = startOfDay(inAppZone(date));
  return { start: new Date(start.getTime()), end: new Date(addDays(start, 1).getTime()) };
}

/** Convierte límites yyyy-MM-dd en un rango de instantes de la zona boliviana. */
export function dateOnlyRange(from?: string, to?: string) {
  const parseBoundary = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    const date = new TZDate(year, month - 1, day, 0, 0, 0, APP_TIME_ZONE);
    return Number.isNaN(date.getTime()) ? undefined : new Date(date.getTime());
  };
  const start = parseBoundary(from);
  const endDay = parseBoundary(to);
  return { start, end: endDay ? new Date(addDays(endDay, 1).getTime()) : undefined };
}

/** Limites del mes boliviano que contiene `date`, como instantes UTC. */
export function monthRange(date: Date = new Date()) {
  const start = startOfMonth(inAppZone(date));
  return { start: new Date(start.getTime()), end: new Date(addMonths(start, 1).getTime()) };
}
