"use client";

import { useActionState, useState } from "react";
import { Building2 } from "lucide-react";
import { changeActiveBranchAction } from "@/features/branches/actions";

type BranchOption = {
  code: string;
  name: string;
  status: "active" | "preparation" | "inactive";
  assigned: boolean;
};

type BranchActionState = { ok: boolean; message: string };

export function BranchSelector({
  activeCode,
  branches
}: {
  activeCode: string;
  branches: BranchOption[];
}) {
  const [state, action, pending] = useActionState(
    async (_state: BranchActionState, formData: FormData): Promise<BranchActionState> =>
      changeActiveBranchAction(formData),
    { ok: true, message: "" }
  );
  const [selected, setSelected] = useState(activeCode);

  const activeBranches = branches.filter(
    (branch) => branch.assigned && branch.status === "active"
  );
  const preparationBranch = branches.find((branch) => branch.status === "preparation");

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Building2 className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
      <form
        action={action}
        onSubmit={(event) => {
          if (selected === activeCode) return;
          const branch = activeBranches.find((option) => option.code === selected);
          if (!window.confirm(`¿Cambiar la operación activa a ${branch?.name ?? "esta sucursal"}?`)) {
            event.preventDefault();
            setSelected(activeCode);
          }
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
            <option key={branch.code} value={branch.code}>{branch.name}</option>
          ))}
        </select>
        {selected !== activeCode ? (
          <button
            type="submit"
            disabled={pending}
            className="focus-ring min-h-9 rounded-[8px] bg-primary px-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Cambiando…" : "Cambiar"}
          </button>
        ) : null}
      </form>
      {preparationBranch ? (
        <span className="hidden text-[11px] text-muted xl:inline">
          {preparationBranch.name}: en preparación
        </span>
      ) : null}
      {!state.ok ? <span className="sr-only" role="alert">{state.message}</span> : null}
    </div>
  );
}
