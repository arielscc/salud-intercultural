"use client";

import { useActionState, useRef, useState } from "react";
import { Building2 } from "lucide-react";
import { ConfirmDialog } from "@/components/internal/ConfirmDialog";
import { changeActiveBranchAction } from "@/features/branches/actions";
import type { InternalRole } from "@/generated/prisma/enums";

type BranchOption = {
  code: string;
  name: string;
  status: "active" | "preparation" | "inactive";
  assigned: boolean;
  isDefault: boolean;
  role: InternalRole;
};

type BranchActionState = { ok: boolean; message: string };

export function BranchSelector({
  activeCode,
  branches
}: {
  activeCode: string;
  branches: BranchOption[];
}) {
  const switchMode = useRef<"switch" | "work" | "consult">("switch");
  const [state, action, pending] = useActionState(
    async (_state: BranchActionState, formData: FormData): Promise<BranchActionState> => {
      formData.set("mode", switchMode.current);
      return changeActiveBranchAction(formData);
    },
    { ok: true, message: "" }
  );
  const [selected, setSelected] = useState(activeCode);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const approvedSubmit = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const activeBranches = branches.filter(
    (branch) => branch.assigned && branch.status === "active"
  );
  const preparationBranch = branches.find((branch) => branch.status === "preparation");

  const selectedBranch = activeBranches.find((branch) => branch.code === selected);
  const activeBranch = activeBranches.find((branch) => branch.code === activeCode);
  const clinicalRotation =
    selectedBranch?.role === "medico" || selectedBranch?.role === "enfermeria";
  const activeIsConsult =
    activeBranch !== undefined &&
    (activeBranch.role === "medico" || activeBranch.role === "enfermeria") &&
    !activeBranch.isDefault;

  function submitWithMode(mode: "switch" | "work" | "consult") {
    switchMode.current = mode;
    approvedSubmit.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Building2 className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
      <form
        ref={formRef}
        action={action}
        onSubmit={(event) => {
          if (selected === activeCode && !activeIsConsult) return;
          if (approvedSubmit.current) {
            approvedSubmit.current = false;
            return;
          }
          event.preventDefault();
          setConfirmOpen(true);
        }}
        className="flex min-w-0 items-center gap-2"
      >
        <label htmlFor="active-branch" className="sr-only">Sucursal activa</label>
        <select
          id="active-branch"
          name="branchCode"
          value={selected}
          disabled={pending || activeBranches.length < 2}
          onChange={(event) => setSelected(event.target.value)}
          className="focus-ring h-9 max-w-[7.5rem] rounded-[8px] border border-border bg-surface px-2 text-xs font-semibold text-text disabled:cursor-default disabled:opacity-100 sm:max-w-[10rem] xl:max-w-[13rem]"
        >
          {activeBranches.map((branch) => (
            <option key={branch.code} value={branch.code}>
              {branch.name}
              {(branch.role === "medico" || branch.role === "enfermeria") &&
              !branch.isDefault
                ? " — solo consulta"
                : ""}
            </option>
          ))}
        </select>
        {selected !== activeCode || activeIsConsult ? (
          <button
            type="submit"
            disabled={pending}
            className="focus-ring min-h-9 rounded-[8px] bg-primary px-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Cambiando…" : activeIsConsult ? "Cambiar modo" : "Cambiar"}
          </button>
        ) : null}
      </form>
      {preparationBranch ? (
        <span className="hidden text-[11px] text-muted xl:inline">
          {preparationBranch.name}: en preparación
        </span>
      ) : null}
      {!state.ok ? <span className="sr-only" role="alert">{state.message}</span> : null}
      {activeBranch &&
      (activeBranch.role === "medico" || activeBranch.role === "enfermeria") &&
      !activeBranch.isDefault ? (
        <span className="hidden text-[11px] font-semibold text-warning sm:inline">
          Solo consulta
        </span>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          clinicalRotation
            ? `¿Cómo quieres entrar a ${selectedBranch?.name ?? "esta sucursal"}?`
            : `Cambiar a ${selectedBranch?.name ?? "otra sucursal"}`
        }
        description={
          <>
            {clinicalRotation ? (
              <>
                <strong>Trabajar aquí</strong> habilita registros en esta sede y deja la
                anterior disponible solo para consulta. <strong>Solo consultar</strong>{" "}
                permite revisar información sin crear ni modificar registros.
              </>
            ) : (
              <>
                El panel dejará de mostrar la operación de{" "}
                {activeBranch?.name ?? "la sede actual"} y cargará la información de{" "}
                {selectedBranch?.name ?? "la sede elegida"}.
              </>
            )}
          </>
        }
        confirmLabel={clinicalRotation ? "Trabajar en esta sucursal" : "Cambiar sucursal"}
        secondaryLabel={clinicalRotation ? "Solo consultar" : undefined}
        confirmVariant="primary"
        onConfirm={() => {
          submitWithMode(clinicalRotation ? "work" : "switch");
        }}
        onSecondary={clinicalRotation ? () => submitWithMode("consult") : undefined}
      />
    </div>
  );
}
