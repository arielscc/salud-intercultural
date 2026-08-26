"use client";

import { History, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/internal/ui/Button";
import { Chip } from "@/components/internal/ui/Chip";
import { cn } from "@/lib/cn";

/** Una línea vendida, ya resuelta en el servidor (dinero en centavos). */
export type VisitHistoryLine = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

/** Bloque de líneas del mismo tipo de venta, ej. "Productos" o "Servicios". */
export type VisitHistoryGroup = {
  label: string;
  lines: VisitHistoryLine[];
  totalCents: number;
};

export type VisitHistoryEntry = {
  id: string;
  /** "1ra", "2da", … según la posición cronológica real de la visita. */
  ordinal: string;
  dateLabel: string;
  reason?: string;
  diagnoses: string[];
  treatmentPlan?: string;
  indications?: string;
  groups: VisitHistoryGroup[];
  sessions: { id: string; label: string; detail: string }[];
  prescription: { id: string; label: string; detail?: string }[];
  totalCents: number;
  pendingCents: number;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

/**
 * Resumen de lo que se le hizo y se le cobró al paciente en cada visita anterior.
 * Solo aparece a partir de la segunda visita: en la primera no hay nada que
 * resumir. Es solo lectura; no toca ningún registro.
 */
export function PatientVisitHistoryDialog({
  patientName,
  visits
}: {
  patientName: string;
  visits: VisitHistoryEntry[];
}) {
  if (visits.length === 0) return null;

  const spentCents = visits.reduce((sum, visit) => sum + visit.totalCents, 0);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
          <History className="h-4 w-4" aria-hidden="true" />
          Ver visitas anteriores ({visits.length})
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-surface",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(94vw,680px)]",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[9px] sm:border sm:border-border sm:shadow-2xl"
          )}
        >
          <header className="shrink-0 border-b border-border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="font-sora text-lg font-bold text-text">
                  Visitas anteriores
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {patientName} · {visits.length}{" "}
                  {visits.length === 1 ? "visita previa" : "visitas previas"} · total cobrado{" "}
                  <span className="font-semibold tabular-nums text-text">
                    {formatMoney(spentCents)}
                  </span>
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 shrink-0 px-0 sm:h-9 sm:w-9"
                  title="Cerrar"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-3">
              {visits.map((visit) => (
                <article key={visit.id} className="rounded-[9px] border border-border p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-sora text-sm font-bold text-text">
                        Resumen {visit.ordinal} Visita
                      </h3>
                      <p className="mt-0.5 text-xs tabular-nums text-muted">{visit.dateLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-text">
                        {formatMoney(visit.totalCents)}
                      </p>
                      {visit.pendingCents > 0 ? (
                        <Chip tone="warning" dot>
                          Saldo {formatMoney(visit.pendingCents)}
                        </Chip>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-3 grid gap-1.5 text-sm">
                    {visit.reason ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted">Motivo:</dt>
                        <dd className="min-w-0 text-text">{visit.reason}</dd>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-muted">Diagnóstico:</dt>
                      <dd className="min-w-0 text-text">
                        {visit.diagnoses.length > 0
                          ? visit.diagnoses.join(" · ")
                          : "Sin diagnóstico registrado"}
                      </dd>
                    </div>
                    {visit.treatmentPlan ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted">Plan:</dt>
                        <dd className="min-w-0 text-text">{visit.treatmentPlan}</dd>
                      </div>
                    ) : null}
                    {visit.indications ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted">Indicaciones:</dt>
                        <dd className="min-w-0 text-text">{visit.indications}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {visit.groups.length > 0 ? (
                    <div className="mt-3 grid gap-2 border-t border-border pt-3">
                      {visit.groups.map((group) => (
                        <section key={group.label}>
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                              {group.label}
                            </h4>
                            <span className="text-xs font-semibold tabular-nums text-muted">
                              {formatMoney(group.totalCents)}
                            </span>
                          </div>
                          <ul className="mt-1 grid gap-1">
                            {group.lines.map((line) => (
                              <li
                                key={line.id}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"
                              >
                                <span className="min-w-0 text-text">
                                  {line.description}
                                  {line.quantity > 1 ? (
                                    <span className="text-muted"> × {line.quantity}</span>
                                  ) : null}
                                </span>
                                <span className="tabular-nums text-muted">
                                  {formatMoney(line.totalCents)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
                      No se registró ninguna venta en esta visita.
                    </p>
                  )}

                  {visit.sessions.length > 0 ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Sesiones
                      </h4>
                      <ul className="mt-1 grid gap-1 text-sm">
                        {visit.sessions.map((session) => (
                          <li key={session.id} className="flex flex-wrap justify-between gap-x-3">
                            <span className="min-w-0 text-text">{session.label}</span>
                            <span className="tabular-nums text-muted">{session.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {visit.prescription.length > 0 ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Receta
                      </h4>
                      <ul className="mt-1 grid gap-1 text-sm">
                        {visit.prescription.map((item) => (
                          <li key={item.id}>
                            <span className="text-text">{item.label}</span>
                            {item.detail ? (
                              <span className="text-muted"> · {item.detail}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <footer className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cerrar
              </Button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
