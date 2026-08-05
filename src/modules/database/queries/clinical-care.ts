import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { dayRange } from "@/lib/dates";
export {
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-records";
export type {
  UpsertClinicalConsultationRecordInput
} from "@/modules/database/queries/clinical-records";

export type MedicationOption = {
  id: string;
  name: string;
  currentStock: number;
};

/**
 * Medicamentos disponibles para el buscador de receta: ítems de inventario cuya
 * categoría contiene "medicament", activos. Incluye el stock para mostrarlo.
 */
export async function getMedicationOptions(): Promise<MedicationOption[]> {
  return withDatabaseError("getMedicationOptions", async () => {
    return prisma.inventoryItem.findMany({
      where: { active: true, category: { contains: "medicament", mode: "insensitive" } },
      select: { id: true, name: true, currentStock: true },
      orderBy: { name: "asc" }
    });
  });
}

export type PreviousPrescriptionItem = {
  inventoryItemId: string | null;
  medication: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  observations: string | null;
};

/**
 * Medicamentos recetados al paciente en visitas anteriores (todas), sin repetir,
 * para el botón "Repetir receta anterior". Se conserva el más reciente por
 * medicamento.
 */
export async function getPatientPreviousPrescriptionItems(
  patientId: string,
  currentVisitId: string
): Promise<PreviousPrescriptionItem[]> {
  return withDatabaseError("getPatientPreviousPrescriptionItems", async () => {
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId, visitId: { not: currentVisitId } },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { createdAt: "asc" } } }
    });
    const seen = new Set<string>();
    const result: PreviousPrescriptionItem[] = [];
    for (const prescription of prescriptions) {
      for (const item of prescription.items) {
        const key = item.medication.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push({
          inventoryItemId: item.inventoryItemId,
          medication: item.medication,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          observations: item.observations
        });
      }
    }
    return result;
  });
}

/** Ítems de la receta vigente de la visita, para precargar el editor. */
export async function getVisitCurrentPrescriptionItems(
  visitId: string
): Promise<PreviousPrescriptionItem[]> {
  return withDatabaseError("getVisitCurrentPrescriptionItems", async () => {
    const latest = await prisma.prescription.findFirst({
      where: { visitId },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { createdAt: "asc" } } }
    });
    return (latest?.items ?? []).map((item) => ({
      inventoryItemId: item.inventoryItemId,
      medication: item.medication,
      dose: item.dose,
      frequency: item.frequency,
      duration: item.duration,
      observations: item.observations
    }));
  });
}

export type IndicationCatalogOption = {
  id: string;
  text: string;
};

/** Normaliza una indicación para deduplicar en el catálogo (minúsculas, sin dobles espacios). */
function normalizeIndication(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Catálogo de indicaciones frecuentes para el buscador (más usadas primero). */
export async function getIndicationCatalog(): Promise<IndicationCatalogOption[]> {
  return withDatabaseError("getIndicationCatalog", async () => {
    return prisma.indicationCatalogItem.findMany({
      where: { active: true },
      select: { id: true, text: true },
      orderBy: [{ usageCount: "desc" }, { text: "asc" }],
      take: 300
    });
  });
}

/**
 * Registra el uso de las indicaciones de una consulta: por cada línea escrita o
 * elegida, crea la entrada en el catálogo (si es nueva) o suma a su `usageCount`.
 * Así el catálogo se siembra mínimo y crece con el uso. Best-effort.
 */
export async function recordIndicationCatalogUsage(indications?: string | null): Promise<void> {
  if (!indications) return;
  const lines = indications
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const key = normalizeIndication(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  if (unique.length === 0) return;

  await withDatabaseError("recordIndicationCatalogUsage", async () => {
    for (const line of unique) {
      const normalized = normalizeIndication(line);
      await prisma.indicationCatalogItem.upsert({
        where: { normalized },
        create: { text: line, normalized, usageCount: 1 },
        update: { usageCount: { increment: 1 } }
      });
    }
  });
}

export async function getConsultationVisits(
  input: PaginationInput & { branchCode?: string } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getConsultationVisits", async () => {
    const visits = await prisma.visit.findMany({
      where: {
        status: "in_consultation",
        branchCode: input.branchCode
      },
      include: {
        patient: true,
        clinicalConsultation: {
          include: {
            diagnoses: true
          }
        },
        route: true,
        attendingUser: { select: { id: true, name: true, email: true } },
        // Última vez que la visita fue derivada al médico (para mostrar la "llegada"
        // real a consulta, no el check-in original).
        statusHistory: {
          where: { toStatus: "in_consultation" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true }
        }
      },
      skip: pagination.skip,
      take: pagination.take
    });

    // Momento de la última derivación al médico (fallback: check-in).
    const { start, end } = dayRange();
    const withDerivedAt = visits.map((visit) => ({
      ...visit,
      derivedToDoctorAt: visit.statusHistory[0]?.createdAt ?? visit.checkedInAt
    }));
    // Solo el día de atención de hoy (00:00–23:59, hora de Bolivia): los pacientes
    // de días anteriores ya salieron de la lista (atendidos o abandonados).
    const today = withDerivedAt.filter(
      (visit) => visit.derivedToDoctorAt >= start && visit.derivedToDoctorAt < end
    );
    // Recientes primero (orden de cola por última derivación).
    today.sort((a, b) => b.derivedToDoctorAt.getTime() - a.derivedToDoctorAt.getTime());
    return today;
  });
}

/**
 * Pacientes que Recepción derivó al médico pero que no entraron a la consulta
 * dentro de su día (abandono "no atendido"), cerrados hoy. Alimenta la tabla de
 * abandonos de la bandeja de Consultas.
 */
export async function getConsultationAbandonedToday(branchCode?: string) {
  return withDatabaseError("getConsultationAbandonedToday", async () => {
    const { start, end } = dayRange();
    const discontinuations = await prisma.visitDiscontinuation.findMany({
      where: {
        area: "medico",
        reason: "no_show",
        createdAt: { gte: start, lt: end },
        visit: { branchCode }
      },
      orderBy: { createdAt: "desc" },
      include: {
        visit: {
          include: {
            patient: { select: { fullName: true, internalCode: true, phone: true } }
          }
        }
      }
    });
    return discontinuations;
  });
}

/**
 * Toma (o libera) la atención de una visita en consulta. Al tomarla, registra el
 * médico a cargo; varios médicos pueden atender pacientes distintos en paralelo.
 */
export async function assignConsultationVisit(input: {
  visitId: string;
  userId: string;
  release?: boolean;
}) {
  return withDatabaseError("assignConsultationVisit", async () => {
    return prisma.visit.update({
      where: { id: input.visitId },
      data: input.release
        ? { attendingUserId: null, attendingAt: null }
        : { attendingUserId: input.userId, attendingAt: new Date() }
    });
  });
}

export async function getClinicalVisitById(visitId: string) {
  return withDatabaseError("getClinicalVisitById", async () => {
    return prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          include: {
            consents: {
              where: { purpose: "follow_up" },
              orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
              take: 1
            }
          }
        },
        route: {
          include: {
            steps: {
              orderBy: { startedAt: "desc" }
            }
          }
        },
        attendingUser: { select: { id: true, name: true, email: true } },
        clinicalConsultation: {
          include: {
            finalizedBy: {
              select: { id: true, name: true, email: true }
            },
            diagnoses: {
              orderBy: [{ kind: "asc" }, { createdAt: "asc" }]
            },
            treatmentPlans: {
              orderBy: { createdAt: "desc" }
            },
            versions: {
              orderBy: { version: "desc" },
              select: {
                id: true,
                version: true,
                kind: true,
                correctionType: true,
                correctionReason: true,
                createdAt: true,
                author: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        prescriptions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          include: {
            items: true
          }
        },
        clinicalEvolutions: {
          orderBy: { createdAt: "desc" }
        },
        clinicalNotes: {
          orderBy: { createdAt: "desc" }
        },
        clinicalOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            workItem: true
          }
        },
        studies: {
          orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
          include: {
            recordedBy: true,
            attachments: {
              where: { status: "available" },
              select: {
                id: true,
                label: true,
                contentType: true,
                sizeBytes: true,
                createdAt: true
              }
            }
          }
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" }
        },
        nursingApplications: {
          orderBy: { appliedAt: "desc" },
          include: {
            responsible: { select: { name: true, email: true } },
            inventoryItem: { select: { name: true } }
          }
        },
        // Sesiones aplicadas en esta visita (sueroterapia, ozonoterapia, etc.).
        serviceSessionUses: {
          orderBy: { appliedAt: "desc" },
          include: {
            package: { select: { serviceName: true } },
            appliedBy: { select: { name: true, email: true } }
          }
        },
        nursingNotes: {
          orderBy: { createdAt: "desc" },
          include: { user: true }
        },
        workItems: {
          orderBy: { createdAt: "desc" }
        },
        treatmentProposalOutcomes: {
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
          include: {
            doctor: true,
            administrationOrder: {
              include: {
                workItem: {
                  include: {
                    sales: {
                      include: { payments: true },
                      orderBy: { createdAt: "desc" }
                    }
                  }
                }
              }
            },
            followUpTask: true
          }
        }
      }
    });
  });
}

/**
 * Historial de visitas anteriores del paciente para la consulta (Tarea 6):
 * consultas previas (1..n reconsultas), lo vendido y su costo, sesiones y la
 * última receta. Solo lectura; no altera registros previos.
 */
export async function getPatientConsultationHistory(patientId: string, excludeVisitId: string) {
  return withDatabaseError("getPatientConsultationHistory", async () => {
    return prisma.visit.findMany({
      where: {
        patientId,
        id: { not: excludeVisitId },
        OR: [
          { clinicalConsultation: { isNot: null } },
          { sales: { some: {} } },
          { serviceSessionPackages: { some: {} } }
        ]
      },
      include: {
        clinicalConsultation: {
          include: {
            diagnoses: { orderBy: [{ kind: "asc" }, { createdAt: "asc" }] }
          }
        },
        prescriptions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          include: { items: true },
          take: 1
        },
        sales: {
          include: { items: true },
          orderBy: { createdAt: "desc" }
        },
        serviceSessionPackages: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }],
      take: 20
    });
  });
}

export async function createClinicalOrderRecord(input: {
  visitId: string;
  doctorId?: string;
  type: ClinicalOrderType;
  targetArea: PatientRouteArea;
  title: string;
  details?: string;
}) {
  return withDatabaseError("createClinicalOrderRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({
        where: { id: input.visitId },
        select: { patientId: true }
      });

      const workItem = await tx.visitWorkItem.create({
        data: {
          visitId: input.visitId,
          createdById: input.doctorId,
          area: input.targetArea,
          status: "pending",
          title: input.title,
          description: input.details
        }
      });

      return tx.clinicalOrder.create({
        data: {
          visitId: input.visitId,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          workItemId: workItem.id,
          type: input.type,
          targetArea: input.targetArea,
          title: input.title,
          details: input.details
        }
      });
    });
  });
}
