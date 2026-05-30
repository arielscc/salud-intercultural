import { notFound } from "next/navigation";
import type { FollowUpAttemptMethod, FollowUpStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { createFollowUpAttemptAction } from "@/features/follow-ups/actions";
import { followUpAttemptMethodLabels, followUpStatusLabels } from "@/features/follow-ups/labels";
import { getFollowUpTaskById } from "@/modules/database/queries/follow-ups";
import { requirePermission } from "@/modules/permissions";

const methodOptions = Object.entries(followUpAttemptMethodLabels) as Array<[FollowUpAttemptMethod, string]>;
const resultOptions = ([
  "done",
  "improved",
  "not_improved",
  "no_answer",
  "wants_return",
  "requires_new_visit",
  "requires_doctor_call",
  "cancelled"
] as FollowUpStatus[]).map((status) => [status, followUpStatusLabels[status]] as [FollowUpStatus, string]);

type FollowUpDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function FollowUpDetailPage({ params }: FollowUpDetailPageProps) {
  await requirePermission("followups_read");
  const { taskId } = await params;
  const task = await getFollowUpTaskById(taskId);

  if (!task) notFound();

  const phone = task.patient?.phone ?? task.lead?.phone;
  const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
  const whatsappHref = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : undefined;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-sm font-semibold text-muted">{task.patient?.internalCode ?? "Lead"}</p>
        <h2 className="font-sora text-2xl font-bold">{name}</h2>
        <p className="mt-1 text-sm text-muted">{task.title}</p>
        <p className="mt-2 text-sm font-semibold text-muted">
          {followUpStatusLabels[task.status]} · {task.dueAt.toLocaleString("es-BO")}
        </p>
        <div className="mt-4 flex gap-2">
          {phone ? (
            <a href={`tel:${phone}`} className="focus-ring rounded-xl border border-border px-4 py-2 text-sm font-bold">
              Llamar
            </a>
          ) : null}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="focus-ring rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
              WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <form action={createFollowUpAttemptAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="taskId" value={task.id} />
        <h3 className="font-sora text-lg font-bold">Registrar contacto</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Método">
            <select className={internalInputClassName} name="method" defaultValue="call">
              {methodOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Resultado">
            <select className={internalInputClassName} name="result" defaultValue="done">
              {resultOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notas">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="notes" />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Guardar seguimiento
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Historial</h3>
        <div className="grid gap-3">
          {task.attempts.map((attempt) => (
            <article key={attempt.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{followUpStatusLabels[attempt.result]}</p>
              <p className="text-sm text-muted">
                {followUpAttemptMethodLabels[attempt.method]} · {attempt.contactedAt.toLocaleString("es-BO")}
              </p>
              {attempt.notes ? <p className="mt-1 text-sm text-muted">{attempt.notes}</p> : null}
            </article>
          ))}
          {task.attempts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin intentos registrados.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
