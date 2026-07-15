"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addInventoryEntryRecord,
  createInventoryAdjustmentRecord,
  createInventoryItemRecord
} from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";
import {
  createInventoryItemSchema,
  inventoryAdjustmentSchema,
  inventoryEntrySchema
} from "@/features/inventory/schemas/inventory.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createInventoryItemAction(formData: FormData) {
  const user = await requirePermission("inventory_write");
  const parsed = createInventoryItemSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/inventario?error=invalid-item");
  }

  const item = await createInventoryItemRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  redirect(`/sigeco/inventario/${item.id}?aviso=producto-creado`);
}

export async function addInventoryEntryAction(formData: FormData) {
  const user = await requirePermission("inventory_write");
  const parsed = inventoryEntrySchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/inventario?error=invalid-entry");
  }

  await addInventoryEntryRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${parsed.data.itemId}`);
}

export async function createInventoryAdjustmentAction(formData: FormData) {
  const user = await requirePermission("inventory_adjust");
  const parsed = inventoryAdjustmentSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/inventario?error=invalid-adjustment");
  }

  await createInventoryAdjustmentRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${parsed.data.itemId}`);
}
