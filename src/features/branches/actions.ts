"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBranchCookieName } from "@/features/branches/policy";
import { getBranchesForUser } from "@/modules/database/queries/branches";
import { requireInternalUser } from "@/modules/permissions";

const changeBranchSchema = z.object({
  branchCode: z.string().trim().min(1).max(80)
});

export async function changeActiveBranchAction(formData: FormData) {
  const user = await requireInternalUser();
  const parsed = changeBranchSchema.safeParse({ branchCode: formData.get("branchCode") });
  if (!parsed.success) return { ok: false as const, message: "Sucursal inválida." };

  const branches = await getBranchesForUser(user.id, user.role);
  const target = branches.find(
    (branch) =>
      branch.code === parsed.data.branchCode && branch.assigned && branch.status === "active"
  );
  if (!target) {
    return { ok: false as const, message: "No tienes acceso a esa sucursal." };
  }

  const cookieStore = await cookies();
  cookieStore.set(activeBranchCookieName, target.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/sigeco"
  });
  revalidatePath("/sigeco", "layout");
  return { ok: true as const, message: `Sucursal activa: ${target.name}.` };
}
