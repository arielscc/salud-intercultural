"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/internal/ui/Button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";

/*
 * Form para acciones irreversibles (sigeco-movil, Tarea 4). En movil
 * (< 640 px, evaluado recien al momento del toque con matchMedia) intercepta
 * el submit y pide confirmacion en un bottom sheet modal con la consecuencia
 * explicada; en desktop el submit pasa directo, identico a hoy. Al resolver
 * comparte el toast de exito del patron NoticeForm (Tarea 3).
 */

type ConfirmFormProps = Omit<React.ComponentPropsWithoutRef<"form">, "action"> & {
  action: (formData: FormData) => Promise<void>;
  notice: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
};

export function ConfirmForm({
  action,
  notice,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  children,
  ...props
}: ConfirmFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [open, setOpen] = useState(false);

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    if (window.matchMedia("(max-width: 639px)").matches) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleConfirm() {
    confirmedRef.current = true;
    setOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form {...props} ref={formRef} action={formAction} onSubmit={handleSubmit}>
        {children}
      </form>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="px-5 pt-2">
            <DrawerTitle>{confirmTitle}</DrawerTitle>
            <DrawerDescription>{confirmDescription}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="px-5 pb-6">
            <Button type="button" variant="danger" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
