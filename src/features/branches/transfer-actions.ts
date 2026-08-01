"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBranchContext } from "@/features/branches/context";
import { inventoryTransferSchema } from "@/features/branches/schemas/transfer.schema";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { createInventoryTransferRecord } from "@/modules/database/queries/inventory";

export async function createInventoryTransferAction(formData: FormData) {
  const parsed = inventoryTransferSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/sigeco/inventario/traslados?error=invalid-transfer");

  await runAuditedAction(
    {
      permission: "inventory_write",
      action: "inventory.transfer.create",
      entityType: "inventory_transfer",
      context: {
        sourceBranchCode: parsed.data.sourceBranchCode,
        destinationBranchCode: parsed.data.destinationBranchCode,
        itemId: parsed.data.itemId,
        quantity: parsed.data.quantity
      }
    },
    async (user) => {
      const { activeBranch, branches } = await getBranchContext(user);
      if (parsed.data.sourceBranchCode !== activeBranch.code) {
        redirect("/sigeco/inventario/traslados?error=branch-mismatch");
      }
      const destinationAllowed = branches.some(
        (branch) =>
          branch.code === parsed.data.destinationBranchCode &&
          branch.assigned &&
          branch.status === "active"
      );
      if (!destinationAllowed) {
        redirect("/sigeco/inventario/traslados?error=branch-denied");
      }
      const transfer = await createInventoryTransferRecord({
        ...parsed.data,
        createdById: user.id
      });
      return auditedResult(transfer, { entityId: transfer.id });
    }
  );

  revalidatePath("/sigeco/inventario");
  revalidatePath("/sigeco/inventario/traslados");
  redirect("/sigeco/inventario/traslados?aviso=transfer-created");
}
