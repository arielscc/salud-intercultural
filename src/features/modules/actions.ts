"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  ModuleActivationError,
  setModuleActivation
} from "@/modules/database/queries/modules";
import { moduleActivationSchema } from "@/features/modules/schemas/module-activation.schema";

const modulesPath = "/sigeco/modulos";

function redirectActivationError(error: unknown): never {
  if (error instanceof ModuleActivationError) {
    const blockers = error.blockers.join(",");
    redirect(
      `${modulesPath}?error=${error.code}${blockers ? `&faltan=${encodeURIComponent(blockers)}` : ""}`
    );
  }
  throw error;
}

/**
 * Enciende o apaga un módulo. La regla vive en `setModuleActivation`, que
 * comparte con el script de línea de comandos: dependencias duras en los dos
 * sentidos, motivo obligatorio al apagar y un evento en el historial.
 *
 * El nombre de la acción auditada distingue encender de apagar para que
 * Dirección pueda filtrar los apagados en `/sigeco/auditoria`.
 */
export async function setModuleActivationAction(formData: FormData) {
  const parsed = moduleActivationSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!parsed.success) {
    const reasonIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("reason")
    );
    redirect(`${modulesPath}?error=${reasonIssue ? "reason_required" : "invalid"}`);
  }

  const { code, active, reason } = parsed.data;

  try {
    await runAuditedAction(
      {
        permission: "modules_manage",
        action: active ? "module.activate" : "module.deactivate",
        entityType: "module",
        entityId: code,
        context: { module: code }
      },
      async (user) => {
        const activation = await setModuleActivation({
          code,
          active,
          reason,
          actorId: user.id,
          actorRole: user.role
        });

        return auditedResult(activation, {
          entityId: code,
          context: { module: code, status: activation.status }
        });
      }
    );
  } catch (error) {
    redirectActivationError(error);
  }

  // El menú y el aviso del shell viven en el layout: sin revalidarlo, el módulo
  // recién encendido no aparecería hasta la siguiente navegación completa.
  revalidatePath("/sigeco", "layout");
  redirect(`${modulesPath}?aviso=${active ? "modulo-activado" : "modulo-apagado"}`);
}
