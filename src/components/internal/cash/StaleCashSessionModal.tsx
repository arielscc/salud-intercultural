"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export function StaleCashSessionModal() {
  const [open, setOpen] = useState(true);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="overflow-hidden border-warning/30 p-0">
        <div className="bg-warning/10 px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning ring-8 ring-warning/5">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle className="font-sora text-xl text-text">
                Caja pendiente de regularización
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1 text-sm leading-6 text-text">
                Hay una Caja abierta de una fecha anterior. El cobro no fue registrado
                para evitar mezclar ingresos de distintos días.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            Cierra o regulariza esa Caja antes de operar hoy. Luego vuelve a intentar
            el cobro.
          </p>
        </div>

        <AlertDialogFooter className="px-5 pb-5">
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">
              Cerrar aviso
            </Button>
          </AlertDialogCancel>
          <Link
            href="/sigeco/administracion/caja"
            className={buttonVariants({ variant: "primary" })}
          >
            Ir a Control de Caja
          </Link>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
