import type {
  ClinicalOrderType,
  PatientRouteArea,
  Prisma,
  VisitStatus
} from "@/generated/prisma/client";
import type { ConsultationQueueArea } from "@/features/clinical-care/queue";
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

// Categorías de inventario que NO son medicamentos recetables (insumos, descartables).
// Se excluyen del buscador de receta; el resto de lo vendible se considera medicina.
const NON_MEDICATION_CATEGORIES = new Set(["insumos", "descartables"]);

function normalizeCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Medicamentos disponibles para el buscador de receta: ítems de inventario vendibles
 * al paciente (usage sale/both), activos, excluyendo insumos y descartables. Incluye
 * el stock para mostrarlo. El inventario no tiene una categoría única "medicamentos"
 * (usa categorías finas como Antibióticos, Analgésicos, etc.), así que el criterio es
 * por descarte de lo que claramente no es recetable.
 */
export async function getMedicationOptions(
  branchCode: string
): Promise<MedicationOption[]> {
  return withDatabaseError("getMedicationOptions", async () => {
    const balances = await prisma.branchInventoryBalance.findMany({
      where: {
        branchCode,
        item: { active: true, usage: { in: ["sale", "both"] } }
      },
      select: {
        currentStock: true,
        item: { select: { id: true, name: true, category: true } }
      },
      orderBy: { item: { name: "asc" } }
    });
    return balances
      .filter(
        ({ item }) =>
          !NON_MEDICATION_CATEGORIES.has(normalizeCategory(item.category))
      )
      .map(({ item, currentStock }) => ({
        id: item.id,
        name: item.name,
        currentStock
      }));
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
  currentVisitId: string,
  branchCode: string
): Promise<PreviousPrescriptionItem[]> {
  return withDatabaseError("getPatientPreviousPrescriptionItems", async () => {
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId, branchCode, visitId: { not: currentVisitId } },
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
  visitId: string,
  branchCode: string
): Promise<PreviousPrescriptionItem[]> {
  return withDatabaseError("getVisitCurrentPrescriptionItems", async () => {
    const latest = await prisma.prescription.findFirst({
      where: { visitId, branchCode },
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
function normalizeCatalogText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Catálogo de indicaciones frecuentes para el buscador (más usadas primero). */
export async function getIndicationCatalog(
  branchCode: string
): Promise<IndicationCatalogOption[]> {
  return withDatabaseError("getIndicationCatalog", async () => {
    const entries = await prisma.indicationCatalogItemBranch.findMany({
      where: { branchCode, active: true, catalogItem: { active: true } },
      select: { catalogItem: { select: { id: true, text: true } } },
      orderBy: [{ usageCount: "desc" }, { catalogItem: { text: "asc" } }],
      take: 300
    });
    return entries.map((entry) => entry.catalogItem);
  });
}

/**
 * Registra el uso de las indicaciones de una consulta: por cada línea escrita o
 * elegida, crea la entrada en el catálogo (si es nueva) o suma a su `usageCount`.
 * Así el catálogo se siembra mínimo y crece con el uso. Best-effort.
 */
export async function recordIndicationCatalogUsage(
  branchCode: string,
  indications?: string | null
): Promise<void> {
  if (!indications) return;
  const lines = indications
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const key = normalizeCatalogText(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  if (unique.length === 0) return;

  await withDatabaseError("recordIndicationCatalogUsage", async () => {
    for (const line of unique) {
      const normalized = normalizeCatalogText(line);
      const item = await prisma.indicationCatalogItem.upsert({
        where: { normalized },
        create: { text: line, normalized },
        update: {}
      });
      await prisma.indicationCatalogItemBranch.upsert({
        where: {
          catalogItemId_branchCode: { catalogItemId: item.id, branchCode }
        },
        create: { catalogItemId: item.id, branchCode, usageCount: 1 },
        update: { active: true, usageCount: { increment: 1 } }
      });
    }
  });
}

/** Desactiva la sugerencia únicamente en la sede activa. */
export async function deleteIndicationCatalogItem(
  id: string,
  branchCode: string
): Promise<void> {
  await withDatabaseError("deleteIndicationCatalogItem", async () => {
    await prisma.indicationCatalogItemBranch.updateMany({
      where: { catalogItemId: id, branchCode },
      data: { active: false }
    });
  });
}

export type DiagnosisCatalogOption = {
  id: string;
  text: string;
  planTemplate: string | null;
  indicationsTemplate: string | null;
};

/** Catálogo de diagnósticos frecuentes para el buscador (más usados primero). */
export async function getDiagnosisCatalog(
  branchCode: string
): Promise<DiagnosisCatalogOption[]> {
  return withDatabaseError("getDiagnosisCatalog", async () => {
    const entries = await prisma.diagnosisCatalogItemBranch.findMany({
      where: { branchCode, active: true, catalogItem: { active: true } },
      select: { catalogItem: { select: { id: true, text: true, planTemplate: true, indicationsTemplate: true } } },
      orderBy: [{ usageCount: "desc" }, { catalogItem: { text: "asc" } }],
      take: 300
    });
    return entries.map((entry) => entry.catalogItem);
  });
}

/**
 * Registra el uso de los diagnósticos de una consulta (principal y secundario):
 * crea la entrada en el catálogo si es nueva o suma a su `usageCount`. Así el
 * catálogo se siembra mínimo y crece con el uso. Best-effort.
 */
export async function recordDiagnosisCatalogUsage(
  branchCode: string,
  diagnoses: Array<string | null | undefined>
): Promise<void> {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of diagnoses) {
    const text = raw?.trim();
    if (!text) continue;
    const key = normalizeCatalogText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }
  if (unique.length === 0) return;

  await withDatabaseError("recordDiagnosisCatalogUsage", async () => {
    for (const text of unique) {
      const normalized = normalizeCatalogText(text);
      const item = await prisma.diagnosisCatalogItem.upsert({
        where: { normalized },
        create: { text, normalized },
        update: {}
      });
      await prisma.diagnosisCatalogItemBranch.upsert({
        where: {
          catalogItemId_branchCode: { catalogItemId: item.id, branchCode }
        },
        create: { catalogItemId: item.id, branchCode, usageCount: 1 },
        update: { active: true, usageCount: { increment: 1 } }
      });
    }
  });
}

export type ClinicalNoteCatalogOption = {
  id: string;
  text: string;
};

/** Catálogos de hallazgos y observaciones frecuentes (más usados primero). */
export async function getClinicalNoteCatalogs(branchCode: string): Promise<{
  findings: ClinicalNoteCatalogOption[];
  observations: ClinicalNoteCatalogOption[];
}> {
  return withDatabaseError("getClinicalNoteCatalogs", async () => {
    const entries = await prisma.clinicalNoteCatalogItemBranch.findMany({
      where: { branchCode, active: true, catalogItem: { active: true } },
      select: { catalogItem: { select: { id: true, text: true, field: true } } },
      orderBy: [{ usageCount: "desc" }, { catalogItem: { text: "asc" } }],
      take: 600
    });
    const items = entries.map((entry) => entry.catalogItem);
    return {
      findings: items
        .filter((item) => item.field === "finding")
        .map(({ id, text }) => ({ id, text })),
      observations: items
        .filter((item) => item.field === "observation")
        .map(({ id, text }) => ({ id, text }))
    };
  });
}

/**
 * Registra el uso de hallazgos u observaciones de una consulta: por cada línea,
 * crea la entrada en el catálogo del campo indicado (si es nueva) o suma a su
 * `usageCount`. Best-effort.
 */
export async function recordClinicalNoteCatalogUsage(
  branchCode: string,
  field: "finding" | "observation",
  text?: string | null
): Promise<void> {
  if (!text) return;
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of text.split("\n").map((value) => value.trim())) {
    const key = normalizeCatalogText(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  if (unique.length === 0) return;

  await withDatabaseError("recordClinicalNoteCatalogUsage", async () => {
    for (const line of unique) {
      const normalized = normalizeCatalogText(line);
      const item = await prisma.clinicalNoteCatalogItem.upsert({
        where: { field_normalized: { field, normalized } },
        create: { field, text: line, normalized },
        update: {}
      });
      await prisma.clinicalNoteCatalogItemBranch.upsert({
        where: {
          catalogItemId_branchCode: { catalogItemId: item.id, branchCode }
        },
        create: { catalogItemId: item.id, branchCode, usageCount: 1 },
        update: { active: true, usageCount: { increment: 1 } }
      });
    }
  });
}

/**
 * Área desde la que el paciente llegó a consulta en su última derivación. Solo
 * interesan las tres que alimentan la cola del médico.
 */
function derivedFromAreaOf(
  fromStatus: VisitStatus | null | undefined
): ConsultationQueueArea | null {
  if (fromStatus === "in_nursing") return "enfermeria";
  if (fromStatus === "in_administration") return "administracion";
  if (fromStatus === "in_reception") return "recepcion";
  return null;
}

export async function getConsultationVisits(
  input: PaginationInput & { branchCode: string }
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
        // Ventas de la visita: quien ya pagó un servicio entra a la cola con
        // prioridad (vuelve de Administración con el cobro hecho).
        sales: {
          select: { id: true, status: true, paidCents: true, balanceCents: true }
        },
        // Última vez que la visita fue derivada al médico (para mostrar la "llegada"
        // real a consulta, no el check-in original) y desde qué área llegó.
        statusHistory: {
          where: {
            branchCode: input.branchCode,
            toStatus: "in_consultation"
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, fromStatus: true }
        }
      },
      skip: pagination.skip,
      take: pagination.take
    });

    // Momento de la última derivación al médico (fallback: check-in) y área de
    // origen: es lo que distingue una primera llegada de Recepción de un paciente
    // que regresa de Enfermería o de Administración.
    const { start, end } = dayRange();
    const withDerivedAt = visits.map((visit) => ({
      ...visit,
      derivedToDoctorAt: visit.statusHistory[0]?.createdAt ?? visit.checkedInAt,
      derivedFromArea: derivedFromAreaOf(visit.statusHistory[0]?.fromStatus),
      paidCents: visit.sales.reduce((total, sale) => total + sale.paidCents, 0)
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

export async function getConsultationDailyVisits(
  input: PaginationInput & { branchCode: string }
) {
  const pagination = getPagination(input);
  const { start, end } = dayRange();

  return withDatabaseError("getConsultationDailyVisits", async () => {
    return prisma.visit.findMany({
      where: {
        branchCode: input.branchCode,
        checkedInAt: { gte: start, lt: end }
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            internalCode: true,
            phone: true
          }
        },
        route: true,
        attendingUser: { select: { id: true, name: true, email: true } },
        clinicalConsultation: {
          select: {
            id: true,
            status: true,
            finalizedAt: true
          }
        },
        sales: {
          select: {
            id: true,
            status: true,
            paidCents: true,
            balanceCents: true
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { checkedInAt: "desc" },
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getActiveVisitsOutsideConsultation(branchCode: string) {
  return withDatabaseError("getActiveVisitsOutsideConsultation", async () => {
    return prisma.visit.findMany({
      where: {
        branchCode,
        status: {
          in: ["in_reception", "in_nursing", "in_administration"]
        },
        route: {
          currentArea: { not: "medico" },
          active: true
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            internalCode: true,
            phone: true
          }
        },
        route: true
      },
      orderBy: { checkedInAt: "desc" },
      take: 30
    });
  });
}

/**
 * Pacientes que Recepción derivó al médico pero que no entraron a la consulta
 * dentro de su día (abandono "no atendido"), cerrados hoy. Alimenta la tabla de
 * abandonos de la bandeja de Consultas.
 */
export async function getConsultationAbandonedToday(branchCode: string) {
  return withDatabaseError("getConsultationAbandonedToday", async () => {
    const { start, end } = dayRange();
    const discontinuations = await prisma.visitDiscontinuation.findMany({
      where: {
        branchCode,
        area: "medico",
        reason: "no_show",
        createdAt: { gte: start, lt: end },
        visit: { branchCode }
      },
      orderBy: { createdAt: "desc" },
      include: {
        visit: {
          include: {
            patient: { select: { id: true, fullName: true, internalCode: true, phone: true } }
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
  branchCode: string;
  userId: string;
  release?: boolean;
}) {
  return withDatabaseError("assignConsultationVisit", async () => {
    return prisma.visit.update({
      where: {
        id_branchCode: { id: input.visitId, branchCode: input.branchCode }
      },
      data: input.release
        ? { attendingUserId: null, attendingAt: null }
        : { attendingUserId: input.userId, attendingAt: new Date() }
    });
  });
}

export async function getClinicalVisitById(visitId: string, branchCode: string) {
  return withDatabaseError("getClinicalVisitById", async () => {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, branchCode },
      include: {
        patient: {
          include: {
            branchRecords: { where: { branchCode }, take: 1 },
            consents: {
              where: { purpose: "follow_up", branchCode },
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
              where: { branchCode },
              orderBy: [{ kind: "asc" }, { createdAt: "asc" }]
            },
            treatmentPlans: {
              where: { branchCode },
              orderBy: { createdAt: "desc" }
            },
            versions: {
              where: { branchCode },
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
          where: { branchCode },
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          include: {
            items: true
          }
        },
        clinicalEvolutions: {
          where: { branchCode },
          orderBy: { createdAt: "desc" }
        },
        clinicalNotes: {
          where: { branchCode },
          orderBy: { createdAt: "desc" }
        },
        clinicalOrders: {
          where: { branchCode },
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
          where: { branchCode },
          orderBy: { createdAt: "desc" }
        },
        treatmentProposalOutcomes: {
          where: { branchCode },
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
    if (!visit) return null;
    const { branchRecords, ...patient } = visit.patient;
    const localRecord = branchRecords[0];
    return {
      ...visit,
      patient: {
        ...patient,
        allergies: localRecord?.allergies ?? null,
        relevantHistory: localRecord?.relevantHistory ?? null,
        currentMedication: localRecord?.currentMedication ?? null
      }
    };
  });
}

/**
 * Historial de visitas anteriores del paciente para la consulta (Tarea 6):
 * consultas previas (1..n reconsultas), lo vendido y su costo, sesiones y la
 * última receta. Solo lectura; no altera registros previos.
 */
export class ClinicalContinuityAccessError extends Error {
  constructor(
    public readonly code:
      | "MEDICAL_ROLE_REQUIRED"
      | "PATIENT_VISIT_REQUIRED"
      | "CONTINUITY_CONSENT_REQUIRED"
      | "REMOTE_HISTORY_NOT_FOUND"
      | "CONTINUITY_ACCESS_INVALID"
  ) {
    super(code);
    this.name = "ClinicalContinuityAccessError";
  }
}

export function findClinicalContinuityAccessError(error: unknown) {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof ClinicalContinuityAccessError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

const continuityAccessDurationMs = 15 * 60 * 1_000;

export async function createClinicalContinuityAccess(input: {
  patientId: string;
  visitId: string;
  doctorId: string;
  branchCode: string;
  reason: string;
}) {
  return withDatabaseError("createClinicalContinuityAccess", async () => {
    const [membership, visit, consent, remoteBranches] = await Promise.all([
      prisma.internalUserBranch.findUnique({
        where: {
          userId_branchCode: {
            userId: input.doctorId,
            branchCode: input.branchCode
          }
        },
        select: { role: true, active: true, user: { select: { active: true } } }
      }),
      prisma.visit.findUnique({
        where: {
          id_branchCode: { id: input.visitId, branchCode: input.branchCode }
        },
        select: { patientId: true }
      }),
      prisma.patientConsent.findFirst({
        where: {
          patientId: input.patientId,
          purpose: "clinical_continuity"
        },
        orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
        select: { decision: true }
      }),
      prisma.visit.findMany({
        where: {
          patientId: input.patientId,
          branchCode: { not: input.branchCode },
          clinicalConsultation: { isNot: null }
        },
        distinct: ["branchCode"],
        select: { branchCode: true }
      })
    ]);

    if (!membership?.active || !membership.user.active || membership.role !== "medico") {
      throw new ClinicalContinuityAccessError("MEDICAL_ROLE_REQUIRED");
    }
    if (
      input.reason.trim().length < 10 || input.reason.trim().length > 500 ||
      !visit ||
      visit.patientId !== input.patientId
    ) {
      throw new ClinicalContinuityAccessError("PATIENT_VISIT_REQUIRED");
    }
    if (consent?.decision !== "granted") {
      throw new ClinicalContinuityAccessError("CONTINUITY_CONSENT_REQUIRED");
    }
    const consultedBranchCodes = remoteBranches.map((entry) => entry.branchCode);
    if (consultedBranchCodes.length === 0) {
      throw new ClinicalContinuityAccessError("REMOTE_HISTORY_NOT_FOUND");
    }

    return prisma.clinicalContinuityAccess.create({
      data: {
        patientId: input.patientId,
        visitId: input.visitId,
        doctorId: input.doctorId,
        branchCode: input.branchCode,
        reason: input.reason.trim(),
        consultedBranchCodes,
        expiresAt: new Date(Date.now() + continuityAccessDurationMs)
      }
    });
  });
}

export async function getPatientConsultationHistory(input: {
  patientId: string;
  excludeVisitId: string;
  branchCode: string;
  doctorId?: string;
  continuityAccessId?: string;
}) {
  return withDatabaseError("getPatientConsultationHistory", async () => {
    let visibleBranchCodes = [input.branchCode];
    let crossBranch = false;
    if (input.continuityAccessId && input.doctorId) {
      const access = await prisma.clinicalContinuityAccess.findFirst({
        where: {
          id: input.continuityAccessId,
          patientId: input.patientId,
          visitId: input.excludeVisitId,
          doctorId: input.doctorId,
          branchCode: input.branchCode,
          expiresAt: { gt: new Date() },
          doctorMembership: { active: true, role: "medico", user: { active: true } },
          visit: { patientId: input.patientId }
        },
        select: { consultedBranchCodes: true }
      });
      const consent = access ? await prisma.patientConsent.findFirst({
        where: { patientId: input.patientId, purpose: "clinical_continuity" },
        orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
        select: { decision: true }
      }) : null;
      if (access && consent?.decision === "granted") {
        visibleBranchCodes = [
        input.branchCode,
        ...access.consultedBranchCodes.filter(
          (code) => code !== input.branchCode
        )
      ];
        crossBranch = true;
      }
    }
    const where = {
      patientId: input.patientId,
      branchCode: { in: visibleBranchCodes },
      id: { not: input.excludeVisitId },
      OR: [
        { clinicalConsultation: { isNot: null } },
        { branchCode: input.branchCode, sales: { some: {} } },
        { branchCode: input.branchCode, serviceSessionPackages: { some: {} } }
      ]
    } satisfies Prisma.VisitWhereInput;
    // El historial conserva la cronología completa del paciente seleccionado.
    const [visits, totalCount] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          clinicalConsultation: {
            include: {
              doctor: { select: { name: true } },
              diagnoses: {
                orderBy: [{ kind: "asc" }, { createdAt: "asc" }]
              }
            }
          },
          branch: { select: { code: true, name: true } },
          clinicalEvolutions: { orderBy: { createdAt: "asc" } },
          clinicalNotes: { orderBy: { createdAt: "asc" } },
          clinicalOrders: { orderBy: { createdAt: "asc" } },
          prescriptions: {
            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
            include: { items: { orderBy: { createdAt: "asc" } } },
            take: 1
          },
          sales: {
            where: { branchCode: input.branchCode },
            include: { items: { orderBy: { createdAt: "asc" } } },
            orderBy: { createdAt: "desc" }
          },
          serviceSessionPackages: {
            where: { originVisit: { branchCode: input.branchCode } },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.visit.count({ where })
    ]);
    return { visits, totalCount, crossBranch };
  });
}

export async function createClinicalOrderRecord(input: {
  visitId: string;
  branchCode: string;
  doctorId?: string;
  type: ClinicalOrderType;
  targetArea: PatientRouteArea;
  title: string;
  details?: string;
}) {
  return withDatabaseError("createClinicalOrderRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({
        where: {
          id_branchCode: { id: input.visitId, branchCode: input.branchCode }
        },
        select: { patientId: true }
      });

      const workItem = await tx.visitWorkItem.create({
        data: {
          visitId: input.visitId,
          branchCode: input.branchCode,
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
          branchCode: input.branchCode,
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
