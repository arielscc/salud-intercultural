import type { VisitPendingType } from "@/generated/prisma/client";

export type VisitPendingSignals = {
  consultation: boolean;
  study: boolean;
  application: boolean;
  payment: boolean;
  delivery: boolean;
  followUp: boolean;
};

const pendingOrder: VisitPendingType[] = [
  "consultation",
  "study",
  "application",
  "payment",
  "delivery",
  "follow_up"
];

export function deriveVisitPendingTypes(
  selected: readonly VisitPendingType[],
  signals: VisitPendingSignals
) {
  const pending = new Set<VisitPendingType>(selected);

  if (signals.consultation) pending.add("consultation");
  if (signals.study) pending.add("study");
  if (signals.application) pending.add("application");
  if (signals.payment) pending.add("payment");
  if (signals.delivery) pending.add("delivery");
  if (signals.followUp) pending.add("follow_up");

  return pendingOrder.filter((type) => pending.has(type));
}
