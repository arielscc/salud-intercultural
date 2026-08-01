import { Field, internalInputClassName } from "@/components/internal/Field";
import { Button } from "@/components/internal/ui/Button";
import { saveReminderRuleVersionAction } from "@/features/supervised-reminders/actions";
import {
  minuteToTime,
  reminderChannelLabels,
  reminderEventLabels,
  reminderTemplatePlaceholders
} from "@/features/supervised-reminders/policy";

type Owner = { id: string; name: string | null; email: string };

type RuleDefaults = {
  ruleId: string;
  name: string;
  event: "visit_completed" | "treatment_accepted" | "visit_discontinued";
  channel: "call" | "whatsapp";
  templateBody: string;
  delayDays: number;
  lookbackDays: number;
  windowStartMinute: number;
  windowEndMinute: number;
  weekdays: number[];
  ownerId: string;
  enabled: boolean;
};

const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function ReminderRuleForm({
  owners,
  defaults
}: {
  owners: Owner[];
  defaults?: RuleDefaults;
}) {
  const preferredOwner =
    owners.find((owner) =>
      (owner.name ?? "").toLocaleLowerCase("es").includes("marlen")
    ) ?? owners[0];
  const selectedDays = defaults?.weekdays ?? [1, 2, 3, 4, 5, 6];

  return (
    <form action={saveReminderRuleVersionAction} className="grid gap-4">
      {defaults ? <input type="hidden" name="ruleId" value={defaults.ruleId} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nombre de la regla">
          <input
            className={internalInputClassName}
            name="name"
            defaultValue={defaults?.name ?? ""}
            placeholder="Ej.: Control después de consulta"
            required
          />
        </Field>
        <Field label="Responsable de revisar y contactar">
          <select
            className={internalInputClassName}
            name="ownerId"
            defaultValue={defaults?.ownerId ?? preferredOwner?.id ?? ""}
            required
          >
            <option value="">Seleccionar responsable</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name ?? owner.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Evento que prepara el recordatorio">
          <select
            className={internalInputClassName}
            name="event"
            defaultValue={defaults?.event ?? "visit_completed"}
          >
            {Object.entries(reminderEventLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-[9px] bg-surface-soft p-3 text-sm text-text">
          <strong className="block">Tipo de seguimiento automático</strong>
          Evolución para visita completada, retorno para tratamiento aceptado y
          recuperación para visita interrumpida.
        </div>
        <Field label="Canal permitido">
          <select
            className={internalInputClassName}
            name="channel"
            defaultValue={defaults?.channel ?? "whatsapp"}
          >
            {Object.entries(reminderChannelLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Días después del evento">
          <input
            className={internalInputClassName}
            name="delayDays"
            type="number"
            min={0}
            max={90}
            defaultValue={defaults?.delayDays ?? 1}
            required
          />
        </Field>
        <Field label="Revisar eventos de los últimos días">
          <input
            className={internalInputClassName}
            name="lookbackDays"
            type="number"
            min={1}
            max={90}
            defaultValue={defaults?.lookbackDays ?? 30}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <input
              className={internalInputClassName}
              name="windowStart"
              type="time"
              defaultValue={minuteToTime(defaults?.windowStartMinute ?? 540)}
              required
            />
          </Field>
          <Field label="Hasta">
            <input
              className={internalInputClassName}
              name="windowEnd"
              type="time"
              defaultValue={minuteToTime(defaults?.windowEndMinute ?? 1080)}
              required
            />
          </Field>
        </div>
      </div>

      <Field label="Texto que el personal revisará antes de contactar">
        <textarea
          className={`${internalInputClassName} min-h-28 py-3`}
          name="templateBody"
          defaultValue={
            defaults?.templateBody ??
            "Hola {{paciente}}, le escribimos de {{clinica}} para saber cómo se encuentra después de su atención del {{fecha}}."
          }
          required
        />
      </Field>
      <p className="-mt-2 text-xs text-muted">
        Campos disponibles: {reminderTemplatePlaceholders.join(", ")}.
      </p>

      <fieldset className="grid gap-2">
        <legend className="text-[13px] font-medium text-text">Días permitidos</legend>
        <div className="flex flex-wrap gap-2">
          {weekdayLabels.map((label, value) => (
            <label
              key={label}
              className="flex min-h-10 items-center gap-2 rounded-[9px] border border-border px-3 text-sm"
            >
              <input
                type="checkbox"
                name="weekdays"
                value={value}
                defaultChecked={selectedDays.includes(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-[9px] bg-surface-soft p-3 text-sm text-text">
        <input
          className="mt-0.5"
          type="checkbox"
          name="enabled"
          defaultChecked={defaults?.enabled ?? false}
        />
        <span>
          <strong className="block">Regla activa</strong>
          Solo prepara candidatos. Ningún mensaje o llamada sale sin revisión humana.
        </span>
      </label>

      <Button type="submit" disabled={owners.length === 0}>
        {defaults ? "Guardar como nueva versión" : "Crear primera versión"}
      </Button>
    </form>
  );
}
