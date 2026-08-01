"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelFeedbackRequestSchema,
  createFeedbackRequestSchema,
  updateFeedbackCaseSchema
} from "@/features/patient-feedback/schema";
import {
  createFeedbackAccessToken,
  hashFeedbackAccessToken
} from "@/features/patient-feedback/token";
import { absoluteUrl } from "@/lib/seo";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  cancelPatientFeedbackRequest,
  createPatientFeedbackRequest,
  PatientFeedbackError,
  updatePatientFeedbackCase
} from "@/modules/database/queries/patient-feedback";

const feedbackPath = "/sigeco/opiniones";

export type CreateFeedbackRequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  link?: string;
  rotated?: boolean;
};

const initialCreateFeedbackRequestState: CreateFeedbackRequestState = {
  status: "idle"
};

export { initialCreateFeedbackRequestState };

function findFeedbackError(error: unknown): PatientFeedbackError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof PatientFeedbackError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

export async function createFeedbackRequestAction(
  _state: CreateFeedbackRequestState,
  formData: FormData
): Promise<CreateFeedbackRequestState> {
  const parsed = createFeedbackRequestSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    return { status: "error", message: "Revisa la visita, responsable y vencimiento." };
  }

  const token = createFeedbackAccessToken();
  try {
    const result = await runAuditedAction(
      {
        permission: "feedback_manage",
        action: "patient_feedback.request.create",
        entityType: "patient_feedback_request"
      },
      async (user) => {
        const created = await createPatientFeedbackRequest({
          data: parsed.data,
          createdById: user.id,
          tokenHash: hashFeedbackAccessToken(token)
        });
        return auditedResult(created, {
          entityId: created.request.id,
          context: {
            visitId: parsed.data.visitId,
            deliveryChannel: parsed.data.deliveryChannel,
            rotated: created.rotated
          }
        });
      }
    );
    revalidatePath(feedbackPath);
    return {
      status: "success",
      message: result.rotated
        ? "Se reemplazó el enlace anterior. Cópialo ahora."
        : "Enlace creado. Cópialo ahora; SIGECO no guarda el token original.",
      link: absoluteUrl(`/encuesta/${token}`),
      rotated: result.rotated
    };
  } catch (error) {
    const feedbackError = findFeedbackError(error);
    if (!feedbackError) throw error;
    return {
      status: "error",
      message:
        feedbackError?.code === "CONSENT_REQUIRED"
          ? "WhatsApp requiere autorización vigente para encuestas. Registra primero el consentimiento del paciente."
          : feedbackError?.code === "ALREADY_SUBMITTED"
            ? "Esta visita ya tiene una respuesta registrada."
            : feedbackError?.code === "INVALID_OWNER"
              ? "El responsable debe ser Dirección o super administrador activo."
              : "No se pudo crear el enlace. Verifica que la visita esté cerrada."
    };
  }
}

export async function updateFeedbackCaseAction(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  await runAuditedAction(
    {
      permission: "feedback_manage",
      action: "patient_feedback.case.update",
      entityType: "patient_feedback_case",
      entityId: caseId || undefined
    },
    async (user) => {
      const parsed = updateFeedbackCaseSchema.safeParse(
        Object.fromEntries(formData.entries())
      );
      if (!parsed.success) redirect(`${feedbackPath}?error=invalid-case`);
      const updated = await updatePatientFeedbackCase({
        data: parsed.data,
        actorId: user.id
      });
      return auditedResult(updated, {
        entityId: updated.id,
        context: {
          status: updated.status,
          severity: updated.severity,
          classification: updated.classification,
          ownerId: updated.ownerId
        }
      });
    }
  );
  revalidatePath(feedbackPath);
  redirect(`${feedbackPath}?aviso=case-updated`);
}

export async function cancelFeedbackRequestAction(formData: FormData) {
  const parsed = cancelFeedbackRequestSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) redirect(`${feedbackPath}?error=invalid-request`);
  await runAuditedAction(
    {
      permission: "feedback_manage",
      action: "patient_feedback.request.cancel",
      entityType: "patient_feedback_request",
      entityId: parsed.data.requestId
    },
    async () => {
      const cancelled = await cancelPatientFeedbackRequest({ data: parsed.data });
      return auditedResult(cancelled, {
        entityId: cancelled.id,
        context: { status: cancelled.status }
      });
    }
  );
  revalidatePath(feedbackPath);
  redirect(`${feedbackPath}?aviso=request-cancelled`);
}
