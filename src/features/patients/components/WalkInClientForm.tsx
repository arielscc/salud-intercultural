"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserRoundSearch } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card } from "@/components/internal/ui/Card";
import { buttonVariants } from "@/components/internal/ui/Button";
import {
  registerWalkInClientAction,
  type WalkInClientResult
} from "@/features/patients/actions";
import { cn } from "@/lib/cn";

/**
 * Alta mínima de un cliente de mostrador.
 *
 * Antes de crear una ficha nueva, el servidor busca parecidas por nombre y
 * teléfono. Si encuentra alguna, se muestran acá en lugar de viajar por la URL:
 * son nombres y teléfonos de personas. Quien registra decide si usa la ficha
 * encontrada o confirma que es alguien distinto.
 */
export function WalkInClientForm() {
  const router = useRouter();
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [result, formAction] = useActionState<WalkInClientResult | null, FormData>(
    registerWalkInClientAction,
    null
  );

  useEffect(() => {
    if (result?.status === "created") {
      toast.success("Cliente registrado");
      router.push(`/sigeco/administracion/clientes/${result.patientId}`);
    }
  }, [result, router]);

  const duplicates = result?.status === "duplicates" ? result.matches : [];

  return (
    <form action={formAction} className="grid gap-4">
      {result?.status === "invalid" ? (
        <p className="rounded-[9px] border border-error/30 bg-error/5 px-3 py-2 text-sm font-semibold text-error">
          {result.message}
        </p>
      ) : null}

      {duplicates.length > 0 ? (
        <Card className="border-warning/30 bg-warning/10">
          <div className="flex items-start gap-2.5">
            <UserRoundSearch className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">
                Ya hay {duplicates.length === 1 ? "una ficha parecida" : "fichas parecidas"}
              </p>
              <p className="mt-1 text-sm text-muted">
                Si es la misma persona, usa su ficha para no partir su historial en
                dos.
              </p>
            </div>
          </div>
          <ul className="mt-3 grid gap-2">
            {duplicates.map((match) => (
              <li
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text">
                    {match.fullName}
                  </span>
                  <span className="block text-xs tabular-nums text-muted">
                    {match.phone} · {match.internalCode}
                  </span>
                </span>
                <Link
                  href={`/sigeco/administracion/clientes/${match.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Usar esta ficha
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Field label="Nombre completo *">
        <input
          name="fullName"
          required
          minLength={2}
          maxLength={160}
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Nombre y apellidos"
          className={internalInputClassName}
        />
      </Field>

      <Field label="Teléfono *">
        <input
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="Ej. 70000000"
          className={internalInputClassName}
        />
      </Field>

      <Field label="Teléfono alternativo">
        <input
          name="secondaryPhone"
          inputMode="tel"
          maxLength={30}
          className={internalInputClassName}
        />
      </Field>

      <Field label="Observación">
        <input
          name="generalObservations"
          maxLength={500}
          placeholder="Algo que convenga recordar de este cliente"
          className={internalInputClassName}
        />
      </Field>

      <input
        type="hidden"
        name="confirmDuplicate"
        value={confirmDuplicate ? "true" : "false"}
      />

      <div className="grid gap-2 sm:flex sm:justify-end">
        <Link
          href="/sigeco/administracion/clientes"
          className={cn(buttonVariants({ variant: "outline" }), "sm:order-1")}
        >
          Cancelar
        </Link>
        <SubmitButton
          className="sm:order-2"
          onClick={() => setConfirmDuplicate(duplicates.length > 0)}
        >
          {duplicates.length > 0 ? "Registrar de todos modos" : "Registrar cliente"}
        </SubmitButton>
      </div>
    </form>
  );
}
