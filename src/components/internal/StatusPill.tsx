import type { InternalLeadStatus } from "@/generated/prisma/client";
import { leadStatusLabels } from "@/features/crm/labels";
import { cn } from "@/lib/cn";

const statusClassName: Record<InternalLeadStatus, string> = {
  new: "border-primary/25 bg-primary/10 text-primary-dark",
  contacted: "border-secondary/25 bg-secondary/10 text-secondary",
  interested: "border-success/25 bg-success/10 text-success",
  wants_visit: "border-accent/25 bg-accent/10 text-accent",
  reminder_pending: "border-accent/30 bg-accent/10 text-accent",
  confirmed_attendance: "border-success/30 bg-success/10 text-success",
  no_answer: "border-muted/25 bg-muted/10 text-muted",
  discarded: "border-error/25 bg-error/10 text-error",
  converted_to_patient: "border-primary/30 bg-primary/10 text-primary-dark"
};

export function LeadStatusPill({ status, className }: { status: InternalLeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-bold",
        statusClassName[status],
        className
      )}
    >
      {leadStatusLabels[status]}
    </span>
  );
}
