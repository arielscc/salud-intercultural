import { prisma, withDatabaseError } from "@/modules/database";
import { runWithContinuityDatabaseContext } from "@/modules/database/rls-context";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { applyInventoryMovement } from "@/modules/database/queries/inventory";

export type CreateVitalSignsRecordInput = {
  branchCode: string;
  patientId: string;
  visitId?: string;
  recordedById?: string;
  temperatureCelsius?: number;
  systolicPressureMmHg?: number;
  diastolicPressureMmHg?: number;
  heartRateBpm?: number;
  respiratoryRateRpm?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  notes?: string;
  recordedAt?: Date;
};

export type CreateNursingApplicationRecordInput = {
  branchCode: string;
  patientId: string;
  visitId?: string;
  workItemId?: string;
  clinicalOrderId?: string;
  responsibleId?: string;
  inventoryItemId?: string;
  medication: string;
  quantity?: string;
  quantityUnits?: number;
  route?: string;
  appliedAt?: Date;
  notes?: string;
  // Por defecto (true) la aplicación cierra la tarea; en Enfermería se envía false
  // para poder registrar varios inyectables antes de cerrarla manualmente.
  completeWorkItem?: boolean;
};

export async function getNursingWorkItems(
  input: PaginationInput & { branchCode: string }
) {
  const pagination = getPagination(input);

  return withDatabaseError("getNursingWorkItems", async () => {
    return prisma.visitWorkItem.findMany({
      where: {
        branchCode: input.branchCode,
        // Solo visitas activas: las cerradas/abandonadas (p. ej. abandono por
        // superar 1 h en espera) salen de la lista de pacientes a atender.
        visit: {
          branchCode: input.branchCode,
          status: { notIn: ["completed", "left_without_care", "cancelled"] }
        },
        area: "enfermeria",
        status: {
          in: ["pending", "acknowledged", "in_progress", "blocked"]
        }
      },
      include: {
        createdBy: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        clinicalOrders: {
          where: { branchCode: input.branchCode },
          orderBy: { createdAt: "desc" },
          include: {
            doctor: true
          }
        },
        visit: {
          include: {
            patient: true,
            route: true
          }
        }
      },
      // Orden de llegada: los más recientes primero (arriba).
      orderBy: [{ createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getNursingWorkItemById(id: string, branchCode: string) {
  return withDatabaseError("getNursingWorkItemById", async () => {
    return prisma.visitWorkItem.findUnique({
      where: { id_branchCode: { id, branchCode } },
      include: {
        createdBy: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        clinicalOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: true,
            nursingApplications: {
              where: { branchCode },
              orderBy: { appliedAt: "desc" }
            },
            studies: {
              where: { branchCode },
              orderBy: { createdAt: "desc" }
            }
          }
        },
        nursingApplications: {
          where: { branchCode },
          orderBy: { appliedAt: "desc" },
          include: { responsible: { select: { id: true, name: true, email: true } } }
        },
        studies: {
          where: { branchCode },
          orderBy: { createdAt: "desc" }
        },
        nursingWorkItemResults: {
          where: { branchCode },
          orderBy: { createdAt: "desc" },
          include: { user: true }
        },
        visit: {
          include: {
            patient: true,
            vitalSigns: {
              where: { branchCode },
              orderBy: { recordedAt: "desc" }
            },
            nursingNotes: {
              where: { branchCode },
              orderBy: { createdAt: "desc" },
              include: { user: true }
            },
            route: true
          }
        }
      }
    });
  });
}

/**
 * Opciones para la orden de cobro que arma Enfermería al derivar a Administración:
 * estudios y servicios del catálogo que se ejecutan en enfermería, más productos
 * de inventario (p. ej. inyectables adicionales que solicita el paciente).
 */
export async function getNursingChargeOptions(branchCode: string) {
  return withDatabaseError("getNursingChargeOptions", async () => {
    const [catalog, products] = await Promise.all([
      prisma.serviceCatalogItem.findMany({
        where: {
          branchConfigurations: { some: { branchCode, active: true } },
          OR: [{ kind: "study" }, { requiresNursing: true }]
        },
        select: {
          id: true,
          name: true,
          branchConfigurations: {
            where: { branchCode },
            select: {
              basePriceCents: true,
              packagePriceCents: true,
              ownMaxDiscountCents: true
            }
          }
        },
        orderBy: [{ kind: "asc" }, { name: "asc" }]
      }),
      prisma.inventoryItem.findMany({
        where: { branchConfigurations: { some: { branchCode, available: true } } },
        select: {
          id: true,
          name: true,
          branchConfigurations: {
            where: { branchCode },
            select: { salePriceCents: true, maxDiscountCents: true }
          }
        },
        orderBy: { name: "asc" }
      })
    ]);
    return {
      catalog: catalog.map((item) => ({
        id: item.id,
        label: item.name,
        referenceCents:
          item.branchConfigurations[0]!.packagePriceCents ??
          item.branchConfigurations[0]!.basePriceCents,
        capCents: item.branchConfigurations[0]!.ownMaxDiscountCents
      })),
      products: products.map((product) => ({
        id: product.id,
        label: product.name,
        referenceCents: product.branchConfigurations[0]!.salePriceCents,
        capCents: product.branchConfigurations[0]!.maxDiscountCents
      }))
    };
  });
}

/**
 * Asigna (o libera) el responsable que atiende una tarea de enfermería. Al tomar
 * al paciente, si la tarea está pendiente/tomada, pasa a "en proceso" y deja
 * registro. Permite que dos enfermeras trabajen en paralelo sobre pacientes
 * distintos; también permite reasignar (tomar el relevo).
 */
export async function assignNursingWorkItem(input: {
  workItemId: string;
  branchCode: string;
  userId: string;
  release?: boolean;
}) {
  return withDatabaseError("assignNursingWorkItem", async () => {
    return prisma.$transaction(async (tx) => {
      const workItem = await tx.visitWorkItem.findUniqueOrThrow({
        where: {
          id_branchCode: {
            id: input.workItemId,
            branchCode: input.branchCode
          }
        },
        include: { clinicalOrders: true }
      });

      if (input.release) {
        return tx.visitWorkItem.update({
          where: {
            id_branchCode: {
              id: input.workItemId,
              branchCode: input.branchCode
            }
          },
          data: { assignedToId: null, assignedAt: null }
        });
      }

      const shouldStart =
        workItem.status === "pending" || workItem.status === "acknowledged";
      const updated = await tx.visitWorkItem.update({
        where: {
          id_branchCode: {
            id: input.workItemId,
            branchCode: input.branchCode
          }
        },
        data: {
          assignedToId: input.userId,
          assignedAt: new Date(),
          status: shouldStart ? "in_progress" : workItem.status
        }
      });

      if (shouldStart) {
        await tx.nursingWorkItemResult.create({
          data: {
            workItemId: input.workItemId,
            branchCode: input.branchCode,
            clinicalOrderId: workItem.clinicalOrders[0]?.id,
            userId: input.userId,
            status: "in_progress",
            notes: "Tomó al paciente"
          }
        });
      }

      return updated;
    });
  });
}

export async function createVitalSignsRecord(input: CreateVitalSignsRecordInput) {
  return withDatabaseError("createVitalSignsRecord", async () => {
    return prisma.vitalSigns.create({
      data: {
        ...input,
        recordedAt: input.recordedAt ?? new Date()
      }
    });
  });
}

// Edición de un registro de signos vitales (para corregir errores). Los campos en
// blanco se limpian (null); la fecha solo cambia si se envía.
export async function updateVitalSignsRecord(input: {
  id: string;
  branchCode: string;
  temperatureCelsius?: number;
  systolicPressureMmHg?: number;
  diastolicPressureMmHg?: number;
  heartRateBpm?: number;
  respiratoryRateRpm?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  notes?: string;
  recordedAt?: Date;
}) {
  return withDatabaseError("updateVitalSignsRecord", async () => {
    return prisma.vitalSigns.update({
      where: { id: input.id, branchCode: input.branchCode },
      data: {
        temperatureCelsius: input.temperatureCelsius ?? null,
        systolicPressureMmHg: input.systolicPressureMmHg ?? null,
        diastolicPressureMmHg: input.diastolicPressureMmHg ?? null,
        heartRateBpm: input.heartRateBpm ?? null,
        respiratoryRateRpm: input.respiratoryRateRpm ?? null,
        oxygenSaturation: input.oxygenSaturation ?? null,
        weightKg: input.weightKg ?? null,
        heightCm: input.heightCm ?? null,
        notes: input.notes ?? null,
        recordedAt: input.recordedAt ?? undefined
      }
    });
  });
}

export async function createNursingApplicationRecord(input: CreateNursingApplicationRecordInput) {
  return withDatabaseError("createNursingApplicationRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const {
        branchCode,
        completeWorkItem,
        inventoryItemId,
        quantityUnits,
        ...rest
      } = input;
      const application = await tx.nursingApplication.create({
        data: {
          ...rest,
          branchCode,
          inventoryItemId,
          quantityUnits,
          appliedAt: input.appliedAt ?? new Date()
        }
      });

      // Si se aplicó un producto del inventario, se descuenta del stock.
      if (inventoryItemId && quantityUnits && quantityUnits > 0) {
        if (!input.visitId) throw new Error("inventory-branch-required");
        const visit = await tx.visit.findUniqueOrThrow({
          where: {
            id_branchCode: { id: input.visitId, branchCode }
          },
          select: { branchCode: true }
        });
        await applyInventoryMovement(tx, {
          itemId: inventoryItemId,
          userId: input.responsibleId,
          branchCode: visit.branchCode,
          type: "authorized_manual_adjustment",
          quantityDelta: -quantityUnits,
          reason: `Aplicación de enfermería: ${input.medication}`
        });
      }

      // El cierre de la tarea/orden es opcional: en Enfermería se registran varias
      // aplicaciones sin cerrar la tarea (completeWorkItem=false); el cierre
      // ocurre automáticamente en los flujos que sí lo solicitan.
      if (completeWorkItem !== false && input.workItemId) {
        await tx.visitWorkItem.update({
          where: {
            id_branchCode: { id: input.workItemId, branchCode }
          },
          data: {
            status: "completed",
            completedAt: new Date()
          }
        });

        await tx.nursingWorkItemResult.create({
          data: {
            workItemId: input.workItemId,
            branchCode,
            clinicalOrderId: input.clinicalOrderId,
            userId: input.responsibleId,
            status: "completed",
            outcome: input.medication,
            notes: input.notes
          }
        });
      }

      if (completeWorkItem !== false && input.clinicalOrderId) {
        await tx.clinicalOrder.update({
          where: { id_branchCode: { id: input.clinicalOrderId, branchCode } },
          data: { status: "completed" }
        });
      }

      return application;
    });
  });
}

/** Productos inyectables del inventario para registrar aplicaciones en Enfermería. */
export async function getInjectableProductOptions(branchCode: string) {
  return withDatabaseError("getInjectableProductOptions", async () => {
    const items = await prisma.inventoryItem.findMany({
      where: {
        branchConfigurations: { some: { branchCode, available: true } },
        category: { contains: "inyect", mode: "insensitive" }
      },
      select: {
        id: true,
        name: true,
        unit: true,
        branchBalances: {
          where: { branchCode },
          select: { currentStock: true }
        }
      },
      orderBy: { name: "asc" }
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock: item.branchBalances[0]?.currentStock ?? 0
    }));
  });
}

export async function createNursingNoteRecord(input: {
  branchCode: string;
  patientId: string;
  visitId?: string;
  userId?: string;
  note: string;
}) {
  return withDatabaseError("createNursingNoteRecord", async () => {
    return prisma.nursingNote.create({
      data: input
    });
  });
}

export async function deleteNursingNoteRecord(input: { id: string; branchCode: string }) {
  return withDatabaseError("deleteNursingNoteRecord", async () => {
    return prisma.nursingNote.deleteMany({ where: { id: input.id, branchCode: input.branchCode } });
  });
}

export async function getNursingTimelineForPatient(patientId: string, branchCode: string) {
  return withDatabaseError("getNursingTimelineForPatient", async () => {
    const [vitalSigns, applications, notes] = await Promise.all([
      prisma.vitalSigns.findMany({
        where: { patientId, branchCode },
        orderBy: { recordedAt: "desc" },
        take: 8
      }),
      prisma.nursingApplication.findMany({
        where: { patientId, branchCode },
        orderBy: { appliedAt: "desc" },
        take: 8
      }),
      prisma.nursingNote.findMany({
        where: { patientId, branchCode },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true }
      })
    ]);

    return { vitalSigns, applications, notes };
  });
}

export class NursingContinuityAccessError extends Error {
  constructor(
    public readonly code:
      | "NURSING_ROLE_REQUIRED"
      | "PATIENT_VISIT_REQUIRED"
      | "CONTINUITY_CONSENT_REQUIRED"
      | "REMOTE_HISTORY_NOT_FOUND"
  ) {
    super(code);
    this.name = "NursingContinuityAccessError";
  }
}

export function findNursingContinuityAccessError(error: unknown) {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof NursingContinuityAccessError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

export async function createNursingContinuityAccess(input: {
  patientId: string;
  visitId: string;
  nurseId: string;
  branchCode: string;
  reason: string;
}) {
  return withDatabaseError("createNursingContinuityAccess", async () => {
    const [membership, visit, consent, remoteBranches] = await Promise.all([
      prisma.internalUserBranch.findUnique({
        where: { userId_branchCode: { userId: input.nurseId, branchCode: input.branchCode } },
        select: { role: true, active: true, user: { select: { active: true } } }
      }),
      prisma.visit.findUnique({
        where: { id_branchCode: { id: input.visitId, branchCode: input.branchCode } },
        select: { patientId: true }
      }),
      prisma.patientConsent.findFirst({
        where: { patientId: input.patientId, purpose: "clinical_continuity" },
        orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
        select: { decision: true }
      }),
      prisma.clinicBranch.findMany({
        where: {
          code: { not: input.branchCode },
          status: "active",
          visits: { some: { patientId: input.patientId } }
        },
        select: { code: true }
      })
    ]);
    if (!membership?.active || !membership.user.active || membership.role !== "enfermeria") {
      throw new NursingContinuityAccessError("NURSING_ROLE_REQUIRED");
    }
    if (!visit || visit.patientId !== input.patientId || input.reason.trim().length < 10 || input.reason.trim().length > 500) {
      throw new NursingContinuityAccessError("PATIENT_VISIT_REQUIRED");
    }
    if (consent?.decision !== "granted") {
      throw new NursingContinuityAccessError("CONTINUITY_CONSENT_REQUIRED");
    }
    const consultedBranchCodes = remoteBranches.map(({ code }) => code);
    if (consultedBranchCodes.length === 0) {
      throw new NursingContinuityAccessError("REMOTE_HISTORY_NOT_FOUND");
    }
    return prisma.nursingContinuityAccess.create({
      data: {
        patientId: input.patientId,
        visitId: input.visitId,
        nurseId: input.nurseId,
        branchCode: input.branchCode,
        reason: input.reason.trim(),
        consultedBranchCodes,
        expiresAt: new Date(Date.now() + 15 * 60 * 1_000)
      }
    });
  });
}

export async function getNursingContinuityHistory(input: {
  patientId: string;
  visitId: string;
  nurseId: string;
  branchCode: string;
  accessId?: string;
}) {
  const accessId = input.accessId;
  if (!accessId) return { visits: [], active: false };
  return runWithContinuityDatabaseContext(accessId, () =>
    getNursingContinuityHistoryWithContext({ ...input, accessId })
  );
}

async function getNursingContinuityHistoryWithContext(input: {
  patientId: string;
  visitId: string;
  nurseId: string;
  branchCode: string;
  accessId: string;
}) {
  return withDatabaseError("getNursingContinuityHistory", async () => {
    const access = await prisma.nursingContinuityAccess.findFirst({
      where: {
        id: input.accessId,
        patientId: input.patientId,
        visitId: input.visitId,
        nurseId: input.nurseId,
        branchCode: input.branchCode,
        expiresAt: { gt: new Date() },
        nurseMembership: { active: true, role: "enfermeria", user: { active: true } }
      },
      select: { consultedBranchCodes: true }
    });
    const consent = access ? await prisma.patientConsent.findFirst({
      where: { patientId: input.patientId, purpose: "clinical_continuity" },
      orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
      select: { decision: true }
    }) : null;
    if (!access || consent?.decision !== "granted") return { visits: [], active: false };
    const visits = await prisma.visit.findMany({
      where: {
        patientId: input.patientId,
        branchCode: { in: access.consultedBranchCodes },
        id: { not: input.visitId }
      },
      select: {
        id: true,
        checkedInAt: true,
        branch: { select: { code: true, name: true } },
        vitalSigns: { orderBy: { recordedAt: "asc" } },
        nursingApplications: { orderBy: { appliedAt: "asc" } },
        nursingNotes: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
        serviceSessionUses: { orderBy: { appliedAt: "asc" }, include: { package: { select: { serviceName: true } } } },
        clinicalOrders: {
          where: { targetArea: "enfermeria" },
          orderBy: { createdAt: "asc" },
          select: { id: true, type: true, title: true, details: true, status: true }
        },
        studies: {
          where: { clinicalOrder: { targetArea: "enfermeria" } },
          select: {
            id: true,
            title: true,
            attachments: {
              where: { status: "available" },
              select: {
                id: true,
                label: true,
                contentType: true,
                sizeBytes: true,
                scanStatus: true,
                createdAt: true,
                visitId: true,
                studyId: true,
                uploadedBy: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }]
    });
    return { visits, active: true };
  });
}
