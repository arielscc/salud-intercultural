import "server-only";

import { prisma } from "@/modules/database";

type BranchOwnershipInput = {
  entityType: string;
  entityId: string;
  branchCode: string;
};

/**
 * Verificación previa para las entidades operativas que hoy reciben un ID en
 * las Server Actions. `null` significa que el tipo es global o que su contrato
 * de tenencia se implementará en una tarea de dominio posterior.
 *
 * Solo devuelve existencia dentro de la sede activa. Por diseño no consulta
 * primero por ID global, así que un ID inexistente y uno de otra sede son
 * indistinguibles para quien hace la petición.
 */
export async function branchOwnedEntityExists(
  input: BranchOwnershipInput
): Promise<boolean | null> {
  const where = { id: input.entityId, branchCode: input.branchCode };

  switch (input.entityType) {
    case "visit":
      return Boolean(await prisma.visit.findFirst({ where, select: { id: true } }));
    case "sale":
      return Boolean(await prisma.sale.findFirst({ where, select: { id: true } }));
    case "purchase":
      return Boolean(await prisma.purchase.findFirst({ where, select: { id: true } }));
    case "cash_session":
      return Boolean(await prisma.cashSession.findFirst({ where, select: { id: true } }));
    case "cash_movement":
      return Boolean(await prisma.cashMovement.findFirst({ where, select: { id: true } }));
    case "follow_up_task":
      return Boolean(await prisma.followUpTask.findFirst({ where, select: { id: true } }));
    case "inventory_lot":
      return Boolean(await prisma.inventoryLot.findFirst({ where, select: { id: true } }));
    case "inventory_transfer":
      return Boolean(
        await prisma.inventoryTransfer.findFirst({
          where: {
            id: input.entityId,
            sourceBranchCode: input.branchCode
          },
          select: { id: true }
        })
      );
    case "work_item":
      return Boolean(
        await prisma.visitWorkItem.findFirst({
          where: {
            id: input.entityId,
            visit: { branchCode: input.branchCode }
          },
          select: { id: true }
        })
      );
    case "doctor_order":
      return Boolean(
        await prisma.doctorOrder.findFirst({
          where: {
            id: input.entityId,
            visit: { branchCode: input.branchCode }
          },
          select: { id: true }
        })
      );
    case "generated_document":
      return Boolean(
        await prisma.generatedDocument.findFirst({
          where: {
            id: input.entityId,
            OR: [
              { visit: { branchCode: input.branchCode } },
              { sale: { branchCode: input.branchCode } }
            ]
          },
          select: { id: true }
        })
      );
    default:
      return null;
  }
}
