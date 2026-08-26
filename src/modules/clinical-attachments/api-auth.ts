import type { InternalPermission } from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { appendAuditEvent } from "@/modules/audit/service";
import { getCurrentInternalUser } from "@/modules/permissions";

export class ClinicalAttachmentApiAccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
    this.name = "ClinicalAttachmentApiAccessError";
  }
}

export async function requireClinicalAttachmentApiAccess(input: {
  request: Request;
  permission: InternalPermission;
  action: string;
  attachmentId?: string;
}) {
  const user = await getCurrentInternalUser();

  if (!user) {
    await appendAuditEvent({
      action: input.action,
      entityType: "clinical_attachment",
      entityId: input.attachmentId,
      result: "denied",
      context: { reason: "unauthenticated" }
    });
    throw new ClinicalAttachmentApiAccessError(401);
  }

  const actor = { id: user.id, role: user.role };
  const requestOrigin = input.request.headers.get("origin");
  const expectedOrigin = new URL(input.request.url).origin;
  const denialReason = user.mustChangePassword
    ? "password_change_required"
    : !requestOrigin || requestOrigin !== expectedOrigin
      ? "cross_origin_request"
      : !roleHasPermission(user.role, input.permission)
        ? "missing_permission"
        : null;

  if (denialReason) {
    await appendAuditEvent({
      actor,
      action: input.action,
      entityType: "clinical_attachment",
      entityId: input.attachmentId,
      result: "denied",
      context: { reason: denialReason }
    });
    throw new ClinicalAttachmentApiAccessError(403);
  }

  return actor;
}
