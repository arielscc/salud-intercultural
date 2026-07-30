import type {
  FollowUpDomain,
  FollowUpResult,
  FollowUpType,
  InternalRole
} from "@/generated/prisma/client";

export const followUpDomainByType: Record<FollowUpType, FollowUpDomain> = {
  evolution: "clinical",
  return: "clinical",
  treatment_recovery: "clinical",
  administrative: "administrative",
  doctor_call: "clinical"
};

export const followUpResultsByType: Record<
  FollowUpType,
  FollowUpResult[]
> = {
  evolution: [
    "improved",
    "not_improved",
    "worsened",
    "no_answer",
    "wants_return",
    "requires_new_visit",
    "rescheduled",
    "escalated_to_doctor",
    "done",
    "other"
  ],
  return: [
    "wants_return",
    "requires_new_visit",
    "no_answer",
    "rescheduled",
    "treatment_declined",
    "escalated_to_doctor",
    "done",
    "other"
  ],
  treatment_recovery: [
    "treatment_resumed",
    "wants_return",
    "requires_new_visit",
    "treatment_declined",
    "no_answer",
    "rescheduled",
    "escalated_to_doctor",
    "done",
    "other"
  ],
  administrative: [
    "done",
    "no_answer",
    "rescheduled",
    "cancelled",
    "other"
  ],
  doctor_call: [
    "improved",
    "not_improved",
    "worsened",
    "wants_return",
    "requires_new_visit",
    "no_answer",
    "rescheduled",
    "done",
    "other"
  ]
};

export function followUpResultKeepsTaskOpen(result: FollowUpResult) {
  return result === "no_answer" || result === "rescheduled";
}

export function followUpResultCreatesDoctorCall(result: FollowUpResult) {
  return result === "worsened" || result === "escalated_to_doctor";
}

export function canRoleWorkFollowUpType(
  role: InternalRole,
  type: FollowUpType
) {
  if (role === "super_admin") return true;
  if (type === "doctor_call") return role === "medico";
  if (type === "administrative") {
    return ["recepcion", "administracion", "seguimiento"].includes(role);
  }
  return role === "recepcion" || role === "medico";
}

export function canRoleCreateFollowUpType(
  role: InternalRole,
  type: FollowUpType
) {
  if (role === "super_admin" || role === "medico" || role === "recepcion") {
    return true;
  }
  return (
    (role === "administracion" || role === "seguimiento") &&
    type === "administrative"
  );
}
