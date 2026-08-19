import type { PatientRouteArea } from "@/generated/prisma/client";

/** Áreas desde las que un paciente puede llegar a la cola del médico. */
export type ConsultationQueueArea = Extract<
  PatientRouteArea,
  "recepcion" | "enfermeria" | "administracion"
>;

export type ConsultationQueueVisit = {
  attendingUserId: string | null;
  attendingAt: Date | null;
  /** Última vez que la visita pasó a "en consulta". */
  derivedToDoctorAt: Date;
  derivedFromArea: ConsultationQueueArea | null;
  /** Total ya cobrado en la visita (cualquier venta). */
  paidCents: number;
};

/**
 * La visita sigue esperando al médico si nadie la tomó todavía o si la volvieron
 * a derivar después de que un médico la tomó: es el caso del paciente que fue a
 * Enfermería o a Administración y regresa a consulta. Sin esta segunda condición
 * el paciente que vuelve desaparece de la cola, porque conserva su médico a cargo.
 */
export function isWaitingForDoctor(visit: ConsultationQueueVisit) {
  if (!visit.attendingUserId || !visit.attendingAt) return true;
  return visit.derivedToDoctorAt.getTime() > visit.attendingAt.getTime();
}

/**
 * Paciente que ya avanzó en su ruta: vuelve de Enfermería o Administración, o ya
 * pagó un servicio de esta visita. Va antes que una primera llegada de Recepción.
 */
export function isPriorityVisit(visit: ConsultationQueueVisit) {
  return (
    visit.derivedFromArea === "enfermeria" ||
    visit.derivedFromArea === "administracion" ||
    visit.paidCents > 0
  );
}

/**
 * Orden de la cola para un médico concreto: primero lo suyo (el paciente que él
 * venía atendiendo y regresa), luego los prioritarios y, dentro de cada grupo,
 * la derivación más reciente arriba.
 */
export function sortConsultationQueue<T extends ConsultationQueueVisit>(
  visits: T[],
  doctorId: string
): T[] {
  return [...visits].sort((a, b) => {
    const mine =
      Number(b.attendingUserId === doctorId) - Number(a.attendingUserId === doctorId);
    if (mine !== 0) return mine;
    const priority = Number(isPriorityVisit(b)) - Number(isPriorityVisit(a));
    if (priority !== 0) return priority;
    return b.derivedToDoctorAt.getTime() - a.derivedToDoctorAt.getTime();
  });
}
