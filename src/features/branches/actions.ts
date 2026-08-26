"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBranchCookieName } from "@/features/branches/policy";
import { getBranchesForUser } from "@/modules/database/queries/branches";
import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";

const changeBranchSchema = z.object({
  branchCode: z.string().trim().min(1).max(80)
});

export async function changeActiveBranchAction(formData: FormData) {
  const requestedBranchCode = String(formData.get("branchCode") ?? "");

  return runAuditedAction(
    {
      permission: "internal_access",
      action: "branch.active.change",
      entityType: "clinic_branch",
      entityId: requestedBranchCode || undefined
    },
    async (user) => {
      const parsed = changeBranchSchema.safeParse({ branchCode: requestedBranchCode });
      if (!parsed.success) denyAuditedAction("invalid_branch");

      const branches = await getBranchesForUser(user.id, user.role);
      const target = branches.find(
        (branch) =>
          branch.code === parsed.data.branchCode &&
          branch.assigned &&
          branch.status === "active"
      );
      if (!target) denyAuditedAction("branch_not_assigned");

      const cookieStore = await cookies();
      cookieStore.set(activeBranchCookieName, target.code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/sigeco"
      });
      revalidatePath("/sigeco", "layout");
      return auditedResult(
        { ok: true as const, message: `Sucursal activa: ${target.name}.` },
        { entityId: target.code, context: { branchName: target.name } }
      );
    }
  );
}
