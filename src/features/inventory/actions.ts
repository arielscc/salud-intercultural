"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addInventoryEntryRecord,
  createInventoryAdjustmentRecord,
  createInventoryItemRecord
} from "@/modules/database/queries/inventory";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createInventoryItemSchema,
  inventoryAdjustmentSchema,
  inventoryEntrySchema
} from "@/features/inventory/schemas/inventory.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createInventoryItemAction(formData: FormData) {
  const item = await runAuditedAction(
    {
      permission: "inventory_write",
      action: "inventory.item.create",
      entityType: "inventory_item"
    },
    async (user) => {
      const parsed = createInventoryItemSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/inventario?error=invalid-item");
      }

      const created = await createInventoryItemRecord({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(created, { entityId: created.id });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  redirect(`/sigeco/inventario/${item.id}?aviso=producto-creado`);
}

export async function addInventoryEntryAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  await runAuditedAction(
    {
      permission: "inventory_write",
      action: "inventory.entry.create",
      entityType: "inventory_item",
      entityId: itemId || undefined
    },
    async (user) => {
      const parsed = inventoryEntrySchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/inventario?error=invalid-entry");
      }

      const movement = await addInventoryEntryRecord({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(movement, {
        entityId: parsed.data.itemId,
        context: { movementId: movement.id, quantity: parsed.data.quantity }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${itemId}`);
}

export async function createInventoryAdjustmentAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  await runAuditedAction(
    {
      permission: "inventory_adjust",
      action: "inventory.adjustment.create",
      entityType: "inventory_item",
      entityId: itemId || undefined
    },
    async (user) => {
      const parsed = inventoryAdjustmentSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/inventario?error=invalid-adjustment");
      }

      const adjustment = await createInventoryAdjustmentRecord({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(adjustment, {
        entityId: parsed.data.itemId,
        context: { movementId: adjustment.id, quantityDelta: parsed.data.quantityDelta }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${itemId}`);
}
