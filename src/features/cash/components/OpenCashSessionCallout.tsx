import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { InternalRole } from "@/generated/prisma/client";
import { buttonVariants } from "@/components/internal/ui/Button";
import { openCashSessionAction } from "@/features/cash/actions";
import { OpenCashSessionDialog } from "@/features/cash/components/OpenCashSessionDialog";
import { defaultCashRegisterName } from "@/features/cash/policy";
import { canUse, type ModuleAccessState } from "@/features/modules/access";
import { formatDateOnly, todayDateOnly } from "@/lib/dates";
import {
  getCashOpenState,
  getCashPersonnel
} from "@/modules/database/queries/cash";
import { cn } from "@/lib/cn";

type OpenCashSessionCalloutProps = {
  user: { id: string; role: InternalRole };
  moduleAccess: ModuleAccessState;
  branch: { code: string; name: string };
  /** Ruta del cobro al que se vuelve después de abrir la Caja. */
  returnTo: string;
  /** El cobro ya fue rechazado por falta de Caja: se abre el modal de una vez. */
  blocked?: boolean;
  className?: string;
};

/**
 * Aviso de Caja en las pantallas de cobro. Si no hay Caja del día abierta,
 * explica por qué no se puede cobrar y ofrece abrirla en un modal sin perder
 * el cobro en curso. No renderiza nada cuando la Caja ya está operativa.
 */
export async function OpenCashSessionCallout({
  user,
  moduleAccess,
  branch,
  returnTo,
  blocked = false,
  className
}: OpenCashSessionCalloutProps) {
  const state = await getCashOpenState(branch.code);
  if (state.canOperate && !blocked) return null;

  // Con Caja suspendida no se abre una sesión nueva, ni siquiera con permiso.
  const canOpen = canUse(user.role, moduleAccess, "cash_sessions_open");
  const box = cn(
    "rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm",
    className
  );

  if (state.staleOpenSession) {
    return (
      <div className={box} role="alert">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Hay una Caja abierta de una fecha anterior.
        </p>
        <p className="mt-1 text-text">
          {state.staleOpenSession.registerName} quedó abierta el{" "}
          {formatDateOnly(state.staleOpenSession.businessDate)}. No se registró
          ningún cobro. Ciérrala o regularízala antes de cobrar hoy.
        </p>
        <Link
          href="/sigeco/administracion/caja"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
        >
          Ir a Control de Caja
        </Link>
      </div>
    );
  }

  if (state.activeSession?.status === "pending_approval") {
    return (
      <div className={box} role="alert">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          La Caja está esperando la aprobación del cierre.
        </p>
        <p className="mt-1 text-text">
          No se puede registrar el cobro hasta que Dirección apruebe el cierre
          {state.requiresExceptionalOpen ? "" : " o se abra una Caja nueva"}.
        </p>
        <Link
          href="/sigeco/administracion/caja"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
        >
          Ir a Control de Caja
        </Link>
      </div>
    );
  }

  if (state.canOperate) {
    // El cobro se rechazó, pero la Caja ya quedó abierta (aquí o en otra
    // pantalla): solo hay que repetir el cobro.
    return (
      <div className={box} role="status">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          El cobro anterior no se registró.
        </p>
        <p className="mt-1 text-text">
          La Caja de hoy ya está abierta. Vuelve a registrar el cobro para
          completarlo.
        </p>
      </div>
    );
  }

  if (!canOpen) {
    return (
      <div className={box} role="alert">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Primero debe abrirse la Caja de hoy.
        </p>
        <p className="mt-1 text-text">
          No se registró ningún cobro. Pide a Administración que abra la Caja del
          día y vuelve a intentar.
        </p>
      </div>
    );
  }

  const personnel = await getCashPersonnel(branch.code);
  const responsibles = personnel.filter(
    (person) => person.role === "administracion" || person.role === "super_admin"
  );
  const businessDate = todayDateOnly();

  return (
    <div className={box} role="alert">
      <p className="flex items-center gap-2 font-semibold text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {state.requiresExceptionalOpen
          ? "Hoy ya se cerró la Caja."
          : "Primero debes abrir la Caja de hoy."}
      </p>
      <p className="mt-1 text-text">
        {state.requiresExceptionalOpen
          ? "Para cobrar después del cierre necesitas una Caja excepcional con motivo. Ábrela aquí mismo y sigue con el cobro."
          : blocked
            ? "No se registró ningún cobro. Abre la Caja aquí mismo y vuelve a registrar el cobro sin salir de esta pantalla."
            : "Todavía no hay una Caja abierta, así que los cobros de esta pantalla no se van a registrar. Ábrela antes de cobrar."}
      </p>
      <div className="mt-3">
        <OpenCashSessionDialog
          action={openCashSessionAction}
          branchCode={branch.code}
          branchName={branch.name}
          registerName={defaultCashRegisterName}
          businessDate={businessDate}
          businessDateLabel={formatDateOnly(new Date(`${businessDate}T00:00:00.000Z`))}
          responsibles={responsibles}
          defaultResponsibleId={
            responsibles.some((person) => person.id === user.id) ? user.id : ""
          }
          requiresExceptionalOpen={state.requiresExceptionalOpen}
          returnTo={returnTo}
          idempotencyKey={randomUUID()}
          defaultOpen={blocked}
        />
      </div>
    </div>
  );
}
