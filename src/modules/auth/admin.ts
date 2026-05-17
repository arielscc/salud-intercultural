import config from "@payload-config";
import { getPayload, type TypedUser } from "payload";

export type AdminRole = "admin" | "editor";

export type AdminSession =
  | {
      ok: true;
      role: AdminRole;
      user: TypedUser & { role?: AdminRole };
    }
  | {
      ok: false;
      reason: "unauthenticated" | "unauthorized";
    };

export function isAdminRole(role: unknown): role is AdminRole {
  return role === "admin" || role === "editor";
}

export async function getAdminSession(headers: Headers): Promise<AdminSession> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers });

  if (!user) {
    return {
      ok: false,
      reason: "unauthenticated"
    };
  }

  const role = (user as { role?: unknown }).role;

  if (!isAdminRole(role)) {
    return {
      ok: false,
      reason: "unauthorized"
    };
  }

  return {
    ok: true,
    role,
    user: user as TypedUser & { role?: AdminRole }
  };
}
