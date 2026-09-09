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

const changeBranchSchema = z.object({
  branchCode: z.string().trim().regex(/^[a-z0-9-]{2,80}$/)
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
    branchCode: String(formData.get("branchCode") ?? "")
  });
  const target = parsed.success
    ? selectionContext.selectableBranches.find(
        (branch) => branch.code === parsed.data.branchCode
      )
    : undefined;

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
    context: { branchCode: target.code, branchName: target.name }
  });

  // Invalida el árbol RSC y todo dato precargado bajo SIGECO antes de que la
  // siguiente respuesta se renderice con la cookie nueva.
  revalidatePath("/sigeco", "layout");
  return { ok: true, message: `Sucursal activa: ${target.name}.` };
}

export async function changeActiveBranchAction(formData: FormData) {
  return setRequestedBranch(formData);
}

export async function selectRequiredBranchAction(formData: FormData) {
  const result = await setRequestedBranch(formData);
  if (!result.ok) redirect("/sigeco/seleccionar-sucursal?error=no-disponible");
  redirect("/sigeco");
}
