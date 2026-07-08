import type { InternalLeadStatus, VisitStatus } from "@/generated/prisma/client";
import { leadStatusLabels } from "@/features/crm/labels";
import { visitStatusLabels } from "@/features/patients/labels";
import { cn } from "@/lib/cn";

/*
 * Familias semanticas Marea (docs/design/sigeco-visual-system.md):
 * tint primario = nuevo en el sistema, neutro = en proceso sin urgencia,
 * exito = avance positivo (solido para estados finales), alerta = requiere
 * accion o espera, error = estado final negativo.
 */

function Pill({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

const statusClassName: Record<InternalLeadStatus, string> = {
  new: "bg-surface-soft text-primary-dark",
  contacted: "border border-border bg-background text-muted",
  interested: "bg-success/10 text-success",
  wants_visit: "bg-warning/10 text-warning",
  reminder_pending: "bg-warning/10 text-warning",
  confirmed_attendance: "bg-success/10 text-success",
  no_answer: "bg-warning/10 text-warning",
  discarded: "bg-error/10 text-error",
  converted_to_patient: "bg-success text-white"
};

export function LeadStatusPill({ status, className }: { status: InternalLeadStatus; className?: string }) {
  return <Pill className={cn(statusClassName[status], className)} label={leadStatusLabels[status]} />;
}

const visitStatusClassName: Record<VisitStatus, string> = {
  in_reception: "bg-surface-soft text-primary-dark",
  in_consultation: "bg-success/10 text-success",
  in_nursing: "bg-warning/10 text-warning",
  in_administration: "border border-border bg-background text-muted",
  completed: "bg-success/10 text-success",
  left_without_care: "bg-error/10 text-error",
  cancelled: "bg-error/10 text-error"
};

export function VisitStatusPill({ status, className }: { status: VisitStatus; className?: string }) {
  return (
    <Pill className={cn(visitStatusClassName[status], className)} label={visitStatusLabels[status]} />
  );
}
