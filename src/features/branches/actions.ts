"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BranchContextUnavailableError,
  getBranchSelectionContext
} from "@/features/branches/context";
import { activeBranchCookieName } from "@/features/branches/policy";
import { appendAuditEvent } from "@/modules/audit/service";
import { setClinicalWorkingBranch } from "@/modules/database/queries/branches";

const changeBranchSchema = z.object({
  branchCode: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  mode: z.enum(["switch", "work", "consult"]).default("switch")
});

type BranchActionState = { ok: boolean; message: string };

async function resolveSelectionContext() {
  try {
    return await getBranchSelectionContext();
  } catch (error) {
    if (!(error instanceof BranchContextUnavailableError)) throw error;
    if (error.reason === "password_change_required") {
      redirect("/sigeco/cambiar-contrasena");
    }
    redirect("/sigeco/login");
  }
}

async function setRequestedBranch(formData: FormData): Promise<BranchActionState> {
  const selectionContext = await resolveSelectionContext();
  const parsed = changeBranchSchema.safeParse({
    branchCode: String(formData.get("branchCode") ?? ""),
    mode: String(formData.get("mode") ?? "switch")
  });
  if (!parsed.success) {
    await appendAuditEvent({
      actor: { id: selectionContext.user.id },
      action: "branch.active.change",
      entityType: "clinic_branch",
      result: "denied",
      context: { reason: "invalid_branch_request" }
    });
    return { ok: false, message: "La sucursal no está disponible para esta cuenta." };
  }
  const target = selectionContext.selectableBranches.find(
    (branch) => branch.code === parsed.data.branchCode
  );

  if (!target) {
    await appendAuditEvent({
      actor: { id: selectionContext.user.id },
      action: "branch.active.change",
      entityType: "clinic_branch",
      result: "denied",
      context: { reason: "branch_not_assigned" }
    });
    return { ok: false, message: "La sucursal no está disponible para esta cuenta." };
  }

  const isClinicalRotation = target.role === "medico" || target.role === "enfermeria";
  if (
    (!isClinicalRotation && parsed.data.mode !== "switch") ||
    (isClinicalRotation && parsed.data.mode === "switch" && !target.isDefault)
  ) {
    await appendAuditEvent({
      actor: { id: selectionContext.user.id },
      action: "branch.active.change",
      entityType: "clinic_branch",
      entityId: target.code,
      result: "denied",
      context: { branchCode: target.code, reason: "branch_mode_required" }
    });
    return {
      ok: false,
      message: "Elige si trabajarás en esta sucursal o si solo deseas consultarla."
    };
  }

  const workingChange =
    parsed.data.mode === "work"
      ? await setClinicalWorkingBranch({
          userId: selectionContext.user.id,
          branchCode: target.code
        })
      : null;

  const cookieStore = await cookies();
  cookieStore.set(activeBranchCookieName, target.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/sigeco"
  });

  await appendAuditEvent({
    actor: { id: selectionContext.user.id, role: target.role },
    action: "branch.active.change",
    entityType: "clinic_branch",
    entityId: target.code,
    result: "success",
    context: {
      branchCode: target.code,
      branchName: target.name,
      accessMode: parsed.data.mode,
      previousWorkingBranchCode: workingChange?.previousBranchCode
    }
  });

  // Invalida el árbol RSC y todo dato precargado bajo SIGECO antes de que la
  // siguiente respuesta se renderice con la cookie nueva.
  revalidatePath("/sigeco", "layout");
  return {
    ok: true,
    message:
      parsed.data.mode === "consult"
        ? `Consultando ${target.name}.`
        : `Sucursal de trabajo: ${target.name}.`
  };
}

export async function changeActiveBranchAction(formData: FormData) {
  return setRequestedBranch(formData);
}

export async function selectRequiredBranchAction(formData: FormData) {
  const result = await setRequestedBranch(formData);
  if (!result.ok) redirect("/sigeco/seleccionar-sucursal?error=no-disponible");
  redirect("/sigeco");
}
