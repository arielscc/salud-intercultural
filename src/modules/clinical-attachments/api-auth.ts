import type { InternalPermission } from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { appendAuditEvent } from "@/modules/audit/service";
import { getBranchApiContext } from "@/features/branches/boundaries";

export class ClinicalAttachmentApiAccessError extends Error {
  constructor(public readonly status: 401 | 403 | 409) {
    super(status === 401 ? "UNAUTHENTICATED" : status === 409 ? "BRANCH_REQUIRED" : "FORBIDDEN");
    this.name = "ClinicalAttachmentApiAccessError";
  }
}

export async function requireClinicalAttachmentApiAccess(input: {
  request: Request;
  permission: InternalPermission;
  action: string;
  attachmentId?: string;
}) {
  const branchAccess = await getBranchApiContext();
  if (!branchAccess.ok) {
    await appendAuditEvent({
      action: input.action,
      entityType: "clinical_attachment",
      entityId: input.attachmentId,
      result: "denied",
      context: { reason: branchAccess.response.status === 409 ? "active_branch_required" : "unauthenticated" }
    });
    throw new ClinicalAttachmentApiAccessError(
      branchAccess.response.status === 409
        ? 409
        : branchAccess.response.status === 401
          ? 401
          : 403
    );
  }

  const { user, operationalRole, activeBranch } = branchAccess.context;
  const actor = {
    id: user.id,
    role: operationalRole,
    branchCode: activeBranch.code
  };
  const requestOrigin = input.request.headers.get("origin");
  const expectedOrigin = new URL(input.request.url).origin;
  const denialReason = user.mustChangePassword
    ? "password_change_required"
    : !requestOrigin || requestOrigin !== expectedOrigin
      ? "cross_origin_request"
    : !roleHasPermission(operationalRole, input.permission)
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
