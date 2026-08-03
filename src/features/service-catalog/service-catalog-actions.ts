"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createServiceCatalogItemRecord,
  findServiceCatalogError,
  setServiceCatalogItemStatusRecord,
  updateServiceCatalogItemRecord,
  updateServiceCatalogOwnThresholdRecord
} from "@/modules/database/queries/service-catalog";
import {
  findInventoryCatalogError,
  updateInventoryItemMaxDiscountRecord
} from "@/modules/database/queries/inventory";
import {
  createServiceCatalogItemSchema,
  inventoryMaxDiscountSchema,
  parseComponents,
  serviceCatalogItemStatusSchema,
  serviceCatalogMoneyToCents,
  serviceCatalogOwnThresholdSchema,
  updateServiceCatalogItemSchema
} from "@/features/service-catalog/schemas/service-catalog.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function withComponents(formData: FormData) {
  return {
    ...parseFormData(formData),
    components: parseComponents(
      formData.getAll("componentInventoryItemId").map(String),
      formData.getAll("componentQuantity").map(String)
    )
  };
}

function redirectCatalogError(error: unknown, pathname: string): never {
  const catalogError = findServiceCatalogError(error);
  if (catalogError) redirect(`${pathname}?error=${catalogError.code}`);
  const inventoryError = findInventoryCatalogError(error);
  if (inventoryError) redirect(`${pathname}?error=${inventoryError.code}`);
  throw error;
}

export async function createServiceCatalogItemAction(formData: FormData) {
  let item;
  try {
    item = await runAuditedAction(
      {
        permission: "service_catalog_write",
        action: "service_catalog.item.create",
        entityType: "service_catalog_item"
      },
      async (user) => {
        const parsed = createServiceCatalogItemSchema.safeParse(withComponents(formData));
        if (!parsed.success) redirect("/sigeco/catalogo/nuevo?error=invalid-item");

        const created = await createServiceCatalogItemRecord({
          code: parsed.data.code,
          name: parsed.data.name,
          description: parsed.data.description,
          category: parsed.data.category,
          kind: parsed.data.kind,
          basePriceCents: serviceCatalogMoneyToCents(parsed.data.basePrice) ?? 0,
          requiresNursing: parsed.data.kind === "study" || parsed.data.requiresNursing,
          supportsSessions: parsed.data.kind === "service" && parsed.data.supportsSessions,
          sessionCount: parsed.data.sessionCount,
          packagePriceCents: serviceCatalogMoneyToCents(parsed.data.packagePrice),
          sessionPriceCents: serviceCatalogMoneyToCents(parsed.data.sessionPrice),
          components: parsed.data.kind === "treatment" ? parsed.data.components : [],
          userId: user.id
        });
        return auditedResult(created, { entityId: created.id });
      }
    );
  } catch (error) {
    redirectCatalogError(error, "/sigeco/catalogo/nuevo");
  }

  revalidatePath("/sigeco/catalogo");
  redirect(`/sigeco/catalogo/${item.id}?aviso=oferta-creada`);
}

export async function updateServiceCatalogItemAction(formData: FormData) {
  const catalogItemId = String(formData.get("catalogItemId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "service_catalog_write",
        action: "service_catalog.item.update",
        entityType: "service_catalog_item",
        entityId: catalogItemId || undefined
      },
      async (user) => {
        const parsed = updateServiceCatalogItemSchema.safeParse(withComponents(formData));
        if (!parsed.success) {
          redirect(`/sigeco/catalogo/${catalogItemId}/editar?error=invalid-item`);
        }
        const updated = await updateServiceCatalogItemRecord({
          catalogItemId: parsed.data.catalogItemId,
          expectedRevision: parsed.data.expectedRevision,
          name: parsed.data.name,
          description: parsed.data.description,
          category: parsed.data.category,
          basePriceCents: serviceCatalogMoneyToCents(parsed.data.basePrice) ?? 0,
          requiresNursing: parsed.data.requiresNursing,
          supportsSessions: parsed.data.supportsSessions,
          sessionCount: parsed.data.sessionCount,
          packagePriceCents: serviceCatalogMoneyToCents(parsed.data.packagePrice),
          sessionPriceCents: serviceCatalogMoneyToCents(parsed.data.sessionPrice),
          components: parsed.data.components,
          changeReason: parsed.data.changeReason,
          userId: user.id
        });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/catalogo/${catalogItemId}/editar`);
  }

  revalidatePath("/sigeco/catalogo");
  revalidatePath(`/sigeco/catalogo/${catalogItemId}`);
  redirect(`/sigeco/catalogo/${catalogItemId}?aviso=oferta-actualizada`);
}

export async function setServiceCatalogItemStatusAction(formData: FormData) {
  const catalogItemId = String(formData.get("catalogItemId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "service_catalog_write",
        action: "service_catalog.item.status.update",
        entityType: "service_catalog_item",
        entityId: catalogItemId || undefined
      },
      async (user) => {
        const parsed = serviceCatalogItemStatusSchema.safeParse(parseFormData(formData));
        if (!parsed.success) redirect(`/sigeco/catalogo/${catalogItemId}?error=invalid-status`);
        const updated = await setServiceCatalogItemStatusRecord({ ...parsed.data, userId: user.id });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { active: updated.active, revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/catalogo/${catalogItemId}`);
  }

  revalidatePath("/sigeco/catalogo");
  revalidatePath(`/sigeco/catalogo/${catalogItemId}`);
  redirect(`/sigeco/catalogo/${catalogItemId}?aviso=estado-actualizado`);
}

export async function updateServiceCatalogThresholdAction(formData: FormData) {
  const catalogItemId = String(formData.get("catalogItemId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "discount_threshold_manage",
        action: "service_catalog.item.threshold.update",
        entityType: "service_catalog_item",
        entityId: catalogItemId || undefined
      },
      async (user) => {
        const parsed = serviceCatalogOwnThresholdSchema.safeParse(parseFormData(formData));
        if (!parsed.success) redirect(`/sigeco/catalogo/${catalogItemId}?error=invalid-threshold`);
        const updated = await updateServiceCatalogOwnThresholdRecord({
          catalogItemId: parsed.data.catalogItemId,
          expectedRevision: parsed.data.expectedRevision,
          ownMaxDiscountCents: serviceCatalogMoneyToCents(parsed.data.maxDiscount) ?? 0,
          changeReason: parsed.data.changeReason,
          userId: user.id
        });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { ownMaxDiscountCents: updated.ownMaxDiscountCents, revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/catalogo/${catalogItemId}`);
  }

  revalidatePath("/sigeco/catalogo");
  revalidatePath(`/sigeco/catalogo/${catalogItemId}`);
  redirect(`/sigeco/catalogo/${catalogItemId}?aviso=umbral-actualizado`);
}

export async function updateInventoryItemMaxDiscountAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "discount_threshold_manage",
        action: "inventory.item.max_discount.update",
        entityType: "inventory_item",
        entityId: itemId || undefined
      },
      async (user) => {
        const parsed = inventoryMaxDiscountSchema.safeParse(parseFormData(formData));
        if (!parsed.success) redirect(`/sigeco/inventario/${itemId}?error=invalid-threshold`);
        const updated = await updateInventoryItemMaxDiscountRecord({
          itemId: parsed.data.itemId,
          expectedRevision: parsed.data.expectedRevision,
          maxDiscountCents: serviceCatalogMoneyToCents(parsed.data.maxDiscount) ?? 0,
          changeReason: parsed.data.changeReason,
          userId: user.id
        });
        return auditedResult(updated, {
          entityId: updated.id,
          context: { maxDiscountCents: updated.maxDiscountCents, revision: updated.revision }
        });
      }
    );
  } catch (error) {
    redirectCatalogError(error, `/sigeco/inventario/${itemId}`);
  }

  revalidatePath("/sigeco/inventario");
  revalidatePath(`/sigeco/inventario/${itemId}`);
  redirect(`/sigeco/inventario/${itemId}?aviso=umbral-actualizado`);
}
