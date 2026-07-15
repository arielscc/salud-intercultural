"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

/*
 * Form que envuelve una server action que revalida sin redirigir y confirma
 * con un toast al completarse (sigeco-movil, Tarea 3). Si la action redirige
 * (exito con destino propio o error con `?error=`), el toast no se dispara:
 * el aviso lo maneja la pagina destino via ActionNotice.
 */

type NoticeFormProps = Omit<React.ComponentPropsWithoutRef<"form">, "action"> & {
  action: (formData: FormData) => Promise<void>;
  notice: string;
};

export function NoticeForm({ action, notice, children, ...props }: NoticeFormProps) {
  const [doneAt, formAction] = useActionState(
    async (_previous: number | null, formData: FormData) => {
      await action(formData);
      return Date.now();
    },
    null
  );

  useEffect(() => {
    if (doneAt) toast.success(notice);
  }, [doneAt, notice]);

  return (
    <form {...props} action={formAction}>
      {children}
    </form>
  );
}
