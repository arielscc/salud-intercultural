"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addInventoryEntryRecord,
  createSupplierRecord,
  createInventoryAdjustmentRecord,
  createInventoryItemRecord,
  findInventoryCatalogError,
  setInventoryItemStatusRecord,
  setSupplierStatusRecord,
  updateInventoryItemRecord,
  updateInventoryItemSuppliersRecord,
  updateSupplierRecord
} from "@/modules/database/queries/inventory";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createInventoryItemSchema,
  createSupplierSchema,
  inventoryItemStatusSchema,
  inventoryItemSuppliersSchema,
  inventoryMoneyToCents,
  inventoryAdjustmentSchema,
  inventoryEntrySchema,
  supplierStatusSchema,
  updateInventoryItemSchema,
  updateSupplierSchema
} from "@/features/inventory/schemas/inventory.schema";
import { getBranchContext } from "@/features/branches/context";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function redirectCatalogError(error: unknown, pathname: string): never {
  const catalogError = findInventoryCatalogError(error);
  if (catalogError) {
    redirect(`${pathname}?error=${catalogError.code}`);
  }
  throw error;
}

export async function createInventoryItemAction(formData: FormData) {
  let item;
  try {
    item = await runAuditedAction(
      {
        permission: "inventory_write",
        action: "inventory.item.create",
        entityType: "inventory_item"
      },
      async (user) => {
        const { activeBranch } = await getBranchContext(user);
        const parsed = createInventoryItemSchema.safeParse(parseFormData(formData));

        if (!parsed.success) {
          redirect("/sigeco/inventario/nuevo?error=invalid-item");
        }

        const created = await createInventoryItemRecord({
          ...parsed.data,
          salePriceCents: inventoryMoneyToCents(parsed.data.salePrice),
          referenceCostCents: inventoryMoneyToCents(parsed.data.referenceCost),
          userId: user.id,
          branchCode: activeBranch.code
        });
        return auditedResult(created, { entityId: created.id });
      }
    );
  } catch (error) {
    redirectCatalogError(error, "/sigeco/inventario/nuevo");
  }

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/inventario");
  redirect(`/sigeco/inventario/${item.id}?aviso=producto-creado`);
}

export async function updateInventoryItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "inventory_write",
        action: "inventory.item.update",
        entityType: "inventory_item",
        entityId: itemId || undefined
      },
      async (user) => {
        const parsed = updateInventoryItemSchema.safeParse(parseFormData(formData));
        if (!parsed.success) {
          redirect(`/sigeco/inventario/${itemId}/editar?error=invalid-item`);
        }
        const updated = await updateInventoryItemRecord({
          ...parsed.data,
          salePriceCents: inventoryMoneyToCents(parsed.data.salePrice),
          referenceCostCents: inventoryMoneyToCents(parsed.data.referenceCost),
          userId: user.id
        });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/inventario/${itemId}/editar`);
  }

  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${itemId}`);
  redirect(`/sigeco/inventario/${itemId}?aviso=producto-actualizado`);
}

export async function setInventoryItemStatusAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "inventory_write",
        action: "inventory.item.status.update",
        entityType: "inventory_item",
        entityId: itemId || undefined
      },
      async (user) => {
        const parsed = inventoryItemStatusSchema.safeParse(parseFormData(formData));
        if (!parsed.success) redirect(`/sigeco/inventario/${itemId}?error=invalid-status`);
        const updated = await setInventoryItemStatusRecord({ ...parsed.data, userId: user.id });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { active: updated.active, revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/inventario/${itemId}`);
  }

  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${itemId}`);
  redirect(`/sigeco/inventario/${itemId}?aviso=estado-producto-actualizado`);
}

export async function updateInventoryItemSuppliersAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const raw = {
    ...parseFormData(formData),
    supplierIds: formData.getAll("supplierIds").map(String)
  };
  try {
    await runAuditedAction(
      {
        permission: "suppliers_write",
        action: "inventory.item.suppliers.update",
        entityType: "inventory_item",
        entityId: itemId || undefined
      },
      async (user) => {
        const parsed = inventoryItemSuppliersSchema.safeParse(raw);
        if (!parsed.success) redirect(`/sigeco/inventario/${itemId}?error=invalid-suppliers`);
        const updated = await updateInventoryItemSuppliersRecord({
          ...parsed.data,
          userId: user.id
        });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { supplierCount: parsed.data.supplierIds.length }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/inventario/${itemId}`);
  }

  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${itemId}`);
  redirect(`/sigeco/inventario/${itemId}?aviso=proveedores-actualizados`);
}

export async function createSupplierAction(formData: FormData) {
  let supplier;
  try {
    supplier = await runAuditedAction(
      {
        permission: "suppliers_write",
        action: "inventory.supplier.create",
        entityType: "supplier"
      },
      async (user) => {
        const parsed = createSupplierSchema.safeParse(parseFormData(formData));
        if (!parsed.success) redirect("/sigeco/inventario/proveedores/nuevo?error=invalid-supplier");
        const created = await createSupplierRecord({ ...parsed.data, userId: user.id });
        return auditedResult(created, { entityId: created.id });
      }
    );
  } catch (error) {
    redirectCatalogError(error, "/sigeco/inventario/proveedores/nuevo");
  }

  revalidatePath("/sigeco/inventario/proveedores");
  redirect(`/sigeco/inventario/proveedores/${supplier.id}?aviso=proveedor-creado`);
}

export async function updateSupplierAction(formData: FormData) {
  const supplierId = String(formData.get("supplierId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "suppliers_write",
        action: "inventory.supplier.update",
        entityType: "supplier",
        entityId: supplierId || undefined
      },
      async (user) => {
        const parsed = updateSupplierSchema.safeParse(parseFormData(formData));
        if (!parsed.success) {
          redirect(`/sigeco/inventario/proveedores/${supplierId}/editar?error=invalid-supplier`);
        }
        const updated = await updateSupplierRecord({ ...parsed.data, userId: user.id });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/inventario/proveedores/${supplierId}/editar`);
  }

  revalidatePath("/sigeco/inventario/proveedores");
  revalidatePath(`/sigeco/inventario/proveedores/${supplierId}`);
  redirect(`/sigeco/inventario/proveedores/${supplierId}?aviso=proveedor-actualizado`);
}

export async function setSupplierStatusAction(formData: FormData) {
  const supplierId = String(formData.get("supplierId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "suppliers_write",
        action: "inventory.supplier.status.update",
        entityType: "supplier",
        entityId: supplierId || undefined
      },
      async (user) => {
        const parsed = supplierStatusSchema.safeParse(parseFormData(formData));
        if (!parsed.success) {
          redirect(`/sigeco/inventario/proveedores/${supplierId}?error=invalid-status`);
        }
        const updated = await setSupplierStatusRecord({ ...parsed.data, userId: user.id });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { active: updated.active, revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/inventario/proveedores/${supplierId}`);
  }

  revalidatePath("/sigeco/inventario/proveedores");
  revalidatePath(`/sigeco/inventario/proveedores/${supplierId}`);
  redirect(`/sigeco/inventario/proveedores/${supplierId}?aviso=estado-proveedor-actualizado`);
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
      const { activeBranch } = await getBranchContext(user);
      const parsed = inventoryEntrySchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/inventario?error=invalid-entry");
      }

      const movement = await addInventoryEntryRecord({
        ...parsed.data,
        userId: user.id,
        branchCode: activeBranch.code
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
      const { activeBranch } = await getBranchContext(user);
      const parsed = inventoryAdjustmentSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/inventario?error=invalid-adjustment");
      }

      const adjustment = await createInventoryAdjustmentRecord({
        ...parsed.data,
        userId: user.id,
        branchCode: activeBranch.code
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
