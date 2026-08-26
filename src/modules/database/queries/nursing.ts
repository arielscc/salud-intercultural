import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { applyInventoryMovement } from "@/modules/database/queries/inventory";

export type CreateVitalSignsRecordInput = {
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
  input: PaginationInput & { branchCode?: string } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getNursingWorkItems", async () => {
    return prisma.visitWorkItem.findMany({
      where: {
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

export async function getNursingWorkItemById(id: string) {
  return withDatabaseError("getNursingWorkItemById", async () => {
    return prisma.visitWorkItem.findUnique({
      where: { id },
      include: {
        createdBy: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        clinicalOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: true,
            nursingApplications: {
              orderBy: { appliedAt: "desc" }
            },
            studies: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        nursingApplications: {
          orderBy: { appliedAt: "desc" },
          include: { responsible: { select: { id: true, name: true, email: true } } }
        },
        studies: {
          orderBy: { createdAt: "desc" }
        },
        nursingWorkItemResults: {
          orderBy: { createdAt: "desc" },
          include: { user: true }
        },
        visit: {
          include: {
            patient: true,
            vitalSigns: {
              orderBy: { recordedAt: "desc" }
            },
            nursingNotes: {
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
export async function getNursingChargeOptions() {
  return withDatabaseError("getNursingChargeOptions", async () => {
    const [catalog, products] = await Promise.all([
      prisma.serviceCatalogItem.findMany({
        where: { active: true, OR: [{ kind: "study" }, { requiresNursing: true }] },
        select: {
          id: true,
          name: true,
          basePriceCents: true,
          packagePriceCents: true,
          ownMaxDiscountCents: true
        },
        orderBy: [{ kind: "asc" }, { name: "asc" }]
      }),
      prisma.inventoryItem.findMany({
        where: { active: true },
        select: { id: true, name: true, salePriceCents: true, maxDiscountCents: true },
        orderBy: { name: "asc" }
      })
    ]);
    return {
      catalog: catalog.map((item) => ({
        id: item.id,
        label: item.name,
        referenceCents: item.packagePriceCents ?? item.basePriceCents,
        capCents: item.ownMaxDiscountCents
      })),
      products: products.map((product) => ({
        id: product.id,
        label: product.name,
        referenceCents: product.salePriceCents,
        capCents: product.maxDiscountCents
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
  userId: string;
  release?: boolean;
}) {
  return withDatabaseError("assignNursingWorkItem", async () => {
    return prisma.$transaction(async (tx) => {
      const workItem = await tx.visitWorkItem.findUniqueOrThrow({
        where: { id: input.workItemId },
        include: { clinicalOrders: true }
      });

      if (input.release) {
        return tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: { assignedToId: null, assignedAt: null }
        });
      }

      const shouldStart =
        workItem.status === "pending" || workItem.status === "acknowledged";
      const updated = await tx.visitWorkItem.update({
        where: { id: input.workItemId },
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
      where: { id: input.id },
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
      const { completeWorkItem, inventoryItemId, quantityUnits, ...rest } = input;
      const application = await tx.nursingApplication.create({
        data: {
          ...rest,
          inventoryItemId,
          quantityUnits,
          appliedAt: input.appliedAt ?? new Date()
        }
      });

      // Si se aplicó un producto del inventario, se descuenta del stock.
      if (inventoryItemId && quantityUnits && quantityUnits > 0) {
        let branchCode: string | undefined;
        if (input.visitId) {
          const visit = await tx.visit.findUnique({
            where: { id: input.visitId },
            select: { branchCode: true }
          });
          branchCode = visit?.branchCode ?? undefined;
        }
        await applyInventoryMovement(tx, {
          itemId: inventoryItemId,
          userId: input.responsibleId,
          branchCode,
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
          where: { id: input.workItemId },
          data: {
            status: "completed",
            completedAt: new Date()
          }
        });

        await tx.nursingWorkItemResult.create({
          data: {
            workItemId: input.workItemId,
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
          where: { id: input.clinicalOrderId },
          data: { status: "completed" }
        });
      }

      return application;
    });
  });
}

/** Productos inyectables del inventario para registrar aplicaciones en Enfermería. */
export async function getInjectableProductOptions(branchCode?: string) {
  return withDatabaseError("getInjectableProductOptions", async () => {
    const items = await prisma.inventoryItem.findMany({
      where: {
        active: true,
        category: { contains: "inyect", mode: "insensitive" }
      },
      select: {
        id: true,
        name: true,
        unit: true,
        branchBalances: {
          where: { branchCode: branchCode ?? "el-alto" },
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

export async function deleteNursingNoteRecord(input: { id: string }) {
  return withDatabaseError("deleteNursingNoteRecord", async () => {
    return prisma.nursingNote.delete({ where: { id: input.id } });
  });
}

export async function getNursingTimelineForPatient(patientId: string) {
  return withDatabaseError("getNursingTimelineForPatient", async () => {
    const [vitalSigns, applications, notes] = await Promise.all([
      prisma.vitalSigns.findMany({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
        take: 8
      }),
      prisma.nursingApplication.findMany({
        where: { patientId },
        orderBy: { appliedAt: "desc" },
        take: 8
      }),
      prisma.nursingNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true }
      })
    ]);

    return { vitalSigns, applications, notes };
  });
}
