"use client";

import { useState, useTransition } from "react";
import { RotateCcw, X } from "lucide-react";
import { ConfirmDialog } from "@/components/internal/ConfirmDialog";
import {
  annulPrescriptionDocumentAction,
  restorePrescriptionDocumentAction
} from "@/features/generated-documents/actions";

/**
 * Anula o vuelve a habilitar una versión de receta emitida. Los documentos son
 * evidencia append-only: anular solo la marca (no borra) y deja de imprimirse;
 * habilitar la reactiva. La confirmación usa el ConfirmDialog global (sin motivo)
 * y la server action se invoca programáticamente (el contenido va en un portal,
 * donde un `<form action>` no envía bien su FormData).
 */
export function AnnulPrescriptionButton({
  visitId,
  documentId,
  version,
  annulled
}: {
  visitId: string;
  documentId: string;
  version: number;
  annulled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    const formData = new FormData();
    formData.set("visitId", visitId);
    formData.set("documentId", documentId);
    const action = annulled
      ? restorePrescriptionDocumentAction
      : annulPrescriptionDocumentAction;
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={
          annulled ? `Habilitar versión ${version}` : `Anular versión ${version}`
        }
        title={annulled ? "Habilitar versión" : "Anular versión"}
        disabled={pending}
        onClick={() => setOpen(true)}
        className={
          annulled
            ? "focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary-dark transition hover:bg-primary/10 disabled:opacity-50"
            : "focus-ring flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-error/10 hover:text-error disabled:opacity-50"
        }
      >
        {annulled ? (
          <>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Habilitar
          </>
        ) : (
          <X className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={annulled ? `Habilitar versión ${version}` : `Anular versión ${version}`}
        description={
          annulled
            ? "La versión volverá a estar activa y podrá imprimirse de nuevo."
            : "La versión se conserva como evidencia, pero quedará marcada como anulada y no podrá imprimirse."
        }
        confirmLabel={annulled ? "Habilitar" : "Anular versión"}
        confirmVariant={annulled ? "primary" : "danger"}
        onConfirm={run}
      />
    </>
  );
}
