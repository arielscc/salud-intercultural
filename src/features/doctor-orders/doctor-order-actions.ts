"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  findDoctorOrderError,
  findDoctorOrderNursingError,
  releaseDoctorOrderToNursing,
  saveDoctorOrder,
  type DoctorOrderLineInput
} from "@/modules/database/queries/doctor-orders";
import {
  doctorOrderMoneyToCents,
  doctorOrderSchema,
  itemTypeForSource,
  parseDoctorOrderLines
} from "@/features/doctor-orders/schemas/doctor-order.schema";

export async function saveDoctorOrderAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  const consultaPath = `/sigeco/consultas/${encodeURIComponent(visitId)}`;
  try {
    await runAuditedAction(
      {
        permission: "clinical_write",
        action: "doctor_order.save",
        entityType: "doctor_order",
        context: { visitId: visitId || undefined }
      },
      async (user) => {
        const parsed = doctorOrderSchema.safeParse({
          visitId,
          intent: formData.get("intent") ?? "save",
          indications: formData.get("indications") ?? "",
          lines: parseDoctorOrderLines(formData)
        });
        if (!parsed.success) redirect(`${consultaPath}?error=pedido-invalido`);

        const lines: DoctorOrderLineInput[] = parsed.data.lines.map((line) => ({
          source: line.source,
          itemType: itemTypeForSource(line.source),
          catalogItemId: line.source === "product" ? undefined : line.catalogItemId,
          inventoryItemId: line.source === "product" ? line.inventoryItemId : undefined,
          description: line.description,
          unitPriceCents: doctorOrderMoneyToCents(line.unitPrice),
          discountCents: doctorOrderMoneyToCents(line.discount),
          quantity: line.quantity,
          sessionCount: line.sessionCount,
          notes: line.notes
        }));

        const submit = parsed.data.intent === "submit";
        const order = await saveDoctorOrder({
          visitId: parsed.data.visitId,
          doctorId: user.id,
          indications: parsed.data.indications,
          lines,
          submit
        });
        return auditedResult(order, {
          entityId: order.id,
          context: { status: order.status, lineCount: order.lines.length }
        });
      }
    );
  } catch (error) {
    const orderError = findDoctorOrderError(error);
    if (orderError) redirect(`${consultaPath}?error=${orderError.code}`);
    throw error;
  }

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/consultas");
  revalidatePath(consultaPath);
  revalidatePath("/sigeco/administracion");
  redirect(`${consultaPath}?aviso=pedido-guardado`);
}

export async function releaseDoctorOrderToNursingAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const doctorOrderId = String(formData.get("doctorOrderId") ?? "");
  const target = workItemId ? `/sigeco/administracion/${workItemId}` : "/sigeco/administracion";
  await runAuditedAction(
    {
      permission: "visits_update",
      action: "doctor_order.nursing.release",
      entityType: "doctor_order",
      entityId: doctorOrderId || undefined,
      context: { workItemId: workItemId || undefined }
    },
    async (user) => {
      if (!doctorOrderId) redirect(`${target}?error=invalid-order`);
      try {
        const nursing = await releaseDoctorOrderToNursing({
          doctorOrderId,
          userId: user.id
        });
        return auditedResult(nursing, {
          entityId: doctorOrderId,
          context: { nursingWorkItemId: nursing?.id }
        });
      } catch (error) {
        const nursingError = findDoctorOrderNursingError(error);
        if (nursingError?.code === "payment-required") {
          redirect(`${target}?error=pago-pendiente`);
        }
        if (nursingError) redirect(`${target}?error=${nursingError.code}`);
        throw error;
      }
    }
  );

  revalidatePath("/sigeco/administracion");
  revalidatePath("/sigeco/enfermeria");
  revalidatePath("/sigeco/consultas");
  redirect("/sigeco/administracion?aviso=paciente-enviado-enfermeria");
}
