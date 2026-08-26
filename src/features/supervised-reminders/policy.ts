import { TZDate } from "@date-fns/tz";
import type {
  FollowUpType,
  SupervisedReminderChannel,
  SupervisedReminderEvent
} from "@/generated/prisma/client";
import { APP_TIME_ZONE, formatDate } from "@/lib/dates";

export const reminderEventType = {
  visit_completed: "evolution",
  treatment_accepted: "return",
  visit_discontinued: "treatment_recovery"
} as const satisfies Record<SupervisedReminderEvent, FollowUpType>;

export const reminderEventLabels: Record<SupervisedReminderEvent, string> = {
  visit_completed: "Visita completada",
  treatment_accepted: "Tratamiento aceptado",
  visit_discontinued: "Visita interrumpida"
};

export const reminderChannelLabels: Record<
  SupervisedReminderChannel,
  string
> = {
  call: "Llamada",
  whatsapp: "WhatsApp"
};

export const reminderTemplatePlaceholders = [
  "{{paciente}}",
  "{{fecha}}",
  "{{tipo}}",
  "{{clinica}}"
] as const;

export function normalizeReminderRuleKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function renderReminderTemplate(
  body: string,
  input: { patientName: string; eventAt: Date; typeLabel: string }
) {
  return body
    .replaceAll("{{paciente}}", input.patientName)
    .replaceAll("{{fecha}}", formatDate(input.eventAt))
    .replaceAll("{{tipo}}", input.typeLabel)
    .replaceAll("{{clinica}}", "Clínica de Medicina Natural")
    .trim();
}

export function parseTimeToMinute(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function minuteToTime(value: number) {
  const safe = Math.max(0, Math.min(1439, value));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60
  ).padStart(2, "0")}`;
}

function atMinute(date: TZDate, minute: number) {
  date.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return date;
}

export function scheduleSupervisedReminder(input: {
  eventAt: Date;
  delayDays: number;
  windowStartMinute: number;
  windowEndMinute: number;
  weekdays: number[];
}) {
  const allowedDays = new Set(input.weekdays);
  const target = new TZDate(input.eventAt, APP_TIME_ZONE);
  target.setDate(target.getDate() + input.delayDays);

  if (input.delayDays > 0) {
    atMinute(target, input.windowStartMinute);
  } else {
    const currentMinute = target.getHours() * 60 + target.getMinutes();
    if (currentMinute < input.windowStartMinute) {
      atMinute(target, input.windowStartMinute);
    } else if (currentMinute >= input.windowEndMinute) {
      target.setDate(target.getDate() + 1);
      atMinute(target, input.windowStartMinute);
    }
  }

  let guard = 0;
  while (!allowedDays.has(target.getDay()) && guard < 7) {
    target.setDate(target.getDate() + 1);
    atMinute(target, input.windowStartMinute);
    guard += 1;
  }
  if (!allowedDays.has(target.getDay())) {
    throw new Error("REMINDER_RULE_HAS_NO_ALLOWED_WEEKDAY");
  }
  return new Date(target.getTime());
}

export function reminderDeduplicationKey(input: {
  ruleKey: string;
  sourceEvent: SupervisedReminderEvent;
  sourceId: string;
}) {
  return `${input.ruleKey}:${input.sourceEvent}:${input.sourceId}`;
}
