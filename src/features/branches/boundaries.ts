import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  BranchContextUnavailableError,
  getBranchContext,
  getBranchSelectionContext,
  type BranchRequestContext
} from "@/features/branches/context";
import { getBranchByCode } from "@/modules/database/queries/branches";

export async function requireBranchPageContext(): Promise<BranchRequestContext> {
  try {
    const context = await getBranchContext();
    if (context.user.mustChangePassword) redirect("/sigeco/cambiar-contrasena");
    return context;
  } catch (error) {
    if (!(error instanceof BranchContextUnavailableError)) throw error;
    if (error.reason === "unauthenticated") redirect("/sigeco/login");
    if (error.reason === "password_change_required") {
      redirect("/sigeco/cambiar-contrasena");
    }
    redirect("/sigeco/seleccionar-sucursal");
  }
}

export async function requireBranchSelectionPageContext() {
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

type BranchApiContextResult =
  | { ok: true; context: BranchRequestContext }
  | { ok: false; response: NextResponse };

export async function getBranchApiContext(): Promise<BranchApiContextResult> {
  try {
    const context = await getBranchContext();
    if (context.user.mustChangePassword) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Debes cambiar tu contraseña." },
          { status: 403 }
        )
      };
    }
    return { ok: true, context };
  } catch (error) {
    if (!(error instanceof BranchContextUnavailableError)) throw error;
    const unauthenticated = error.reason === "unauthenticated";
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: unauthenticated
            ? "Debes iniciar sesión."
            : error.reason === "password_change_required"
              ? "Debes cambiar tu contraseña."
              : "Selecciona una sucursal activa."
        },
        {
          status: unauthenticated
            ? 401
            : error.reason === "password_change_required"
              ? 403
              : 409
        }
      )
    };
  }
}

/** Los documentos y exportaciones usan la misma frontera que las demás APIs. */
export const getBranchExportContext = getBranchApiContext;

export type BranchJobContext = {
  actor: { kind: "system-job"; id: string };
  activeBranch: { code: string; name: string; city: string; department: string };
};

/** Los jobs reciben una sede explícita de configuración interna, nunca un default. */
export async function requireBranchJobContext(input: {
  branchCode: string;
  jobId: string;
}): Promise<BranchJobContext> {
  const branchCode = input.branchCode.trim();
  if (!branchCode || !input.jobId.trim()) {
    throw new BranchContextUnavailableError("active_branch_required");
  }
  const branch = await getBranchByCode(branchCode);
  if (!branch || branch.status !== "active") {
    throw new BranchContextUnavailableError("invalid_active_branch");
  }
  return {
    actor: { kind: "system-job", id: input.jobId },
    activeBranch: branch
  };
}
