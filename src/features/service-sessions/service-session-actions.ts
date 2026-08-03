"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  consumeServiceSession,
  findServiceSessionError
} from "@/modules/database/queries/service-sessions";

export async function consumeServiceSessionAction(formData: FormData) {
  const packageId = String(formData.get("packageId") ?? "");
  const visitId = String(formData.get("visitId") ?? "");
  const workItemId = String(formData.get("workItemId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const target = workItemId
    ? `/sigeco/enfermeria/${workItemId}`
    : "/sigeco/enfermeria";

  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "service_session.consume",
      entityType: "service_session_package",
      entityId: packageId || undefined,
      context: { visitId: visitId || undefined }
    },
    async (user) => {
      if (!packageId) redirect(`${target}?error=sesion-invalida`);
      try {
        const pkg = await consumeServiceSession({
          packageId,
          visitId: visitId || undefined,
          userId: user.id,
          notes: notes.length > 0 ? notes : undefined
        });
        return auditedResult(pkg, {
          entityId: pkg.id,
          context: { sessionsUsed: pkg.sessionsUsed, totalSessions: pkg.totalSessions }
        });
      } catch (error) {
        const sessionError = findServiceSessionError(error);
        if (sessionError) redirect(`${target}?error=${sessionError.code}`);
        throw error;
      }
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  redirect(`${target}?aviso=sesion-registrada`);
}
